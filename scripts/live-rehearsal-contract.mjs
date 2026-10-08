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
export function validSetting(name,value) {
  if(typeof name!=='string')return false;
  if(name.startsWith(SETTING_PREFIXES[1]))return validSubject(name.slice(SETTING_PREFIXES[1].length))&&value===true;
  if(name.startsWith(SETTING_PREFIXES[0]))return !blank(name.slice(SETTING_PREFIXES[0].length))&&typeof value==='string'&&/^(?:[1-9]|10|11)$/.test(value);
  if(!SETTING_NAMES.includes(name))return false;
  if(name==='planning.gpu_enabled')return typeof value==='boolean';
  if(name==='advisory.timeout_ms')return Number.isSafeInteger(value)&&value>=SETTING_VALUE_RULES.timeoutMin&&value<=SETTING_VALUE_RULES.timeoutMax;
  if(['advisory.review_seed_days','advisory.review_ceiling_days'].includes(name))return Number.isSafeInteger(value)&&value>=SETTING_VALUE_RULES.reviewMin&&value<=SETTING_VALUE_RULES.reviewMax;
  if(typeof value!=='string'||blank(value))return false;
  if(name==='advisory.endpoint') {
    const match=/^http:\/\/127\.0\.0\.1:([0-9]+)$/.exec(value);
    return !!match&&Number(match[1])>0&&Number(match[1])<=65535;
  }
  return true;
}
export function validAuthoringInputs(inputs) {
  if(!inputs||typeof inputs!=='object'||Array.isArray(inputs))return false;
  for(const key of ['settings','subjects','mutations'])if(inputs[key]!==undefined&&!Array.isArray(inputs[key]))return false;
  let {seed,ceiling}=REVIEW_DEFAULTS;
  const subjects=new Set();
  for(const item of inputs.settings??[]) {
    if(!item||!validSetting(item.name,item.value))return false;
    if(item.name==='advisory.review_seed_days')seed=item.value;
    if(item.name==='advisory.review_ceiling_days')ceiling=item.value;
    if(seed>ceiling)return false;
    if(item.name.startsWith(SETTING_PREFIXES[1])) {
      if(subjects.has(item.name))return false;
      subjects.add(item.name);
    }
  }
  for(const root of inputs.subjects??[]) {
    if(!validSubject(root)||subjects.has(SETTING_PREFIXES[1]+root))return false;
    subjects.add(SETTING_PREFIXES[1]+root);
  }
  return true;
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
