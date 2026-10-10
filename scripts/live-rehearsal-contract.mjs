// Driver input rules. The source agreement check asserts these against Rust.
export const SETTING_NAMES = Object.freeze([
  'advisory.model','advisory.endpoint','advisory.timeout_ms',
  'advisory.review_seed_days','advisory.review_ceiling_days','planning.gpu_enabled'
]);
export const SETTING_PREFIXES = Object.freeze(['calendar.color.','universe.subject.']);
export const RESERVED_SUBJECTS = Object.freeze(['facts','numeric_values','set_memberships','event_markers','affect']);
export const GOVERNED_SUBJECTS = Object.freeze(['operator','project','github','affect','relationship']);
export const REVIEW_DEFAULTS = Object.freeze({seed:7,ceiling:365});
export const SETTING_VALUE_RULES = Object.freeze({timeoutMin:5000,timeoutMax:3600000,reviewMin:1,reviewMax:365,rootBytes:64});
export const ADVISORY_LIMIT = 25;
// Rust str::trim uses Unicode White_Space, which differs from JS trim.
const blank=value=>typeof value==='string'&&/^[\u0009-\u000d \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]*$/.test(value);
export function validSubject(root) {
  return typeof root==='string'&&root.length<=SETTING_VALUE_RULES.rootBytes&&/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(root)
    &&!RESERVED_SUBJECTS.includes(root)&&!GOVERNED_SUBJECTS.includes(root);
}
// Closed rule identities contain no supplied names or values.
export const INPUT_RULES = Object.freeze([
  'json_required','object_required','array_required','setting_object_required',
  'setting_name_required','setting_name_supported','subject_root_valid','subject_true_required',
  'colour_category_nonblank','colour_id_1_to_11','boolean_required',
  'timeout_ms_5000_to_3600000','review_days_1_to_365','text_nonblank','loopback_origin',
  'review_seed_le_ceiling','subject_unique','one_subject_required','subject_mutation_write_required',
  'ranking_object_required','ranking_seed_u32','ranking_layers_1_to_64',
  'observation_object_required','observation_value_0_to_10'
]);
function settingFault(name,value) {
  const fault=(field,rule)=>({field,rule});
  if(typeof name!=='string')return fault('name','setting_name_required');
  if(name.startsWith(SETTING_PREFIXES[1])) {
    if(!validSubject(name.slice(SETTING_PREFIXES[1].length)))return fault('name','subject_root_valid');
    return value===true?null:fault('value','subject_true_required');
  }
  if(name.startsWith(SETTING_PREFIXES[0])) {
    if(blank(name.slice(SETTING_PREFIXES[0].length)))return fault('name','colour_category_nonblank');
    return typeof value==='string'&&/^(?:[1-9]|10|11)$/.test(value)?null:fault('value','colour_id_1_to_11');
  }
  if(!SETTING_NAMES.includes(name))return fault('name','setting_name_supported');
  if(name==='planning.gpu_enabled')return typeof value==='boolean'?null:fault('value','boolean_required');
  if(name==='advisory.timeout_ms')return Number.isSafeInteger(value)&&value>=SETTING_VALUE_RULES.timeoutMin&&value<=SETTING_VALUE_RULES.timeoutMax?null:fault('value','timeout_ms_5000_to_3600000');
  if(['advisory.review_seed_days','advisory.review_ceiling_days'].includes(name))return Number.isSafeInteger(value)&&value>=SETTING_VALUE_RULES.reviewMin&&value<=SETTING_VALUE_RULES.reviewMax?null:fault('value','review_days_1_to_365');
  if(typeof value!=='string'||blank(value))return fault('value','text_nonblank');
  if(name==='advisory.endpoint') {
    const match=/^http:\/\/127\.0\.0\.1:([0-9]+)$/.exec(value);
    if(!match||Number(match[1])===0||Number(match[1])>65535)return fault('value','loopback_origin');
  }
  return null;
}
export function validSetting(name,value) {return settingFault(name,value)===null;}
// null is success; a refusal is a safe structural field plus a closed rule.
export function validAuthoringInputs(inputs) {
  if(!inputs||typeof inputs!=='object'||Array.isArray(inputs))return {field:'inputs',rule:'object_required'};
  if(Object.hasOwn(inputs,'observation')) {
    const observation=inputs.observation,dimensions=['energy','stress','mood_intensity'];
    if(!observation||typeof observation!=='object'||Array.isArray(observation)||Object.keys(observation).some(key=>!dimensions.includes(key)))return {field:'observation',rule:'observation_object_required'};
    for(const name of dimensions)if(typeof observation[name]!=='number'||!Number.isFinite(observation[name])||observation[name]<0||observation[name]>10)return {field:`observation.${name}`,rule:'observation_value_0_to_10'};
  }
  if(Object.hasOwn(inputs,'ranking')) {
    const ranking=inputs.ranking;
    if(!ranking||typeof ranking!=='object'||Array.isArray(ranking)||Object.keys(ranking).some(key=>!['seed','layers'].includes(key)))return {field:'ranking',rule:'ranking_object_required'};
    if(!Number.isInteger(ranking.seed)||ranking.seed<0||ranking.seed>4294967295)return {field:'ranking.seed',rule:'ranking_seed_u32'};
    if(!Number.isInteger(ranking.layers)||ranking.layers<1||ranking.layers>64)return {field:'ranking.layers',rule:'ranking_layers_1_to_64'};
  }
  for(const key of ['settings','subjects','mutations'])if(inputs[key]!==undefined&&!Array.isArray(inputs[key]))return {field:key,rule:'array_required'};
  let {seed,ceiling}=REVIEW_DEFAULTS;
  const subjects=new Set();
  for(const [index,item] of (inputs.settings??[]).entries()) {
    const field=`settings[${index}]`;
    if(!item||typeof item!=='object'||Array.isArray(item))return {field,rule:'setting_object_required'};
    const fault=settingFault(item.name,item.value);
    if(fault)return {field:`${field}.${fault.field}`,rule:fault.rule};
    if(item.name==='advisory.review_seed_days')seed=item.value;
    if(item.name==='advisory.review_ceiling_days')ceiling=item.value;
    if(seed>ceiling)return {field:`${field}.value`,rule:'review_seed_le_ceiling'};
    if(item.name.startsWith(SETTING_PREFIXES[1])) {
      if(subjects.has(item.name))return {field:`${field}.name`,rule:'subject_unique'};
      subjects.add(item.name);
    }
  }
  for(const [index,root] of (inputs.subjects??[]).entries()) {
    if(!validSubject(root))return {field:`subjects[${index}]`,rule:'subject_root_valid'};
    if(subjects.has(SETTING_PREFIXES[1]+root))return {field:`subjects[${index}]`,rule:'subject_unique'};
    subjects.add(SETTING_PREFIXES[1]+root);
  }
  return null;
}
export function routineBody(input,schema_version) {
  // Select the UI creation fields explicitly, never arbitrary root fields.
  const {title,description,recurrence,routine_instance_template:template}=input;
  const body={schema_version,mode:'evergreen',title};
  if(description!==undefined)body.description=description;
  if(recurrence!==undefined)body.recurrence=recurrence;
  if(template!==undefined) {
    const tags=template.tags??[];
    const category=template.category_tag;
    body.routine_instance_template={...template,
      title:typeof template.title==='string'&&template.title.trim()?template.title.trim():typeof title==='string'?title.trim():title,
      tags:category&&!tags.includes(category)?[category,...tags]:tags,
      reminder_minutes:template.reminder_minutes??[]};
  }
  return body;
}
