// Public projection: never serialize an API object, arbitrary string, or key.
import { GOVERNED_SUBJECTS, validSubject } from './live-rehearsal-contract.mjs';
const count=v=>Number.isSafeInteger(v)&&v>=0?v:'unavailable';
const length=v=>Array.isArray(v)?v.length:'unavailable';
const collection=(body,key)=>!Object.hasOwn(body,key)?`missing_${key}`:Array.isArray(body[key])?body[key].length:`invalid_${key}`;
const flag=v=>typeof v==='boolean'?v:'unavailable';
const choice=(v,allowed)=>allowed.includes(v)?v:'withheld_or_unavailable';
const kinds=['create','update','delete'];
export const RESPONSE_STATUSES=Object.freeze(['ok','unconfigured','failed','malformed_result','queue_full','applied','partial','refused','skipped','observed','drifted','rejected','admitted','timeout','worker_error','cancelled','active','completed','moot']);
const statuses=RESPONSE_STATUSES;
const levels=['low','medium','high'];
const categories=['deadline_risk','dependency_fragility','worker_bottleneck','stale_affect','affect_margin','destructive_pressure','post_plan_depletion','low_coverage','skeleton_failure','routine_triage','unplaced_work'];
// Closed vocabulary: an unexpected server code is counted but its text withheld.
import codeNames from './live-rehearsal-codes.json' with {type:'json'};
const codes=new Set(codeNames);
export function histogram(rows,key,allowed) {
  if(!Array.isArray(rows))return 'unavailable';
  const bins={};for(const row of rows){const code=allowed.has(row?.[key])?row[key]:'withheld_unknown';bins[code]=(bins[code]??0)+1;}return bins;
}
const diagnostics=v=>histogram(v,'code',codes);
export const REPORT_ROUTES=Object.freeze({risk:'/reports/risk',humanComplete:'/reports/human-complete'});
// Exact producer marker, verified against Rust; never emit suggestion text.
export const BOOTSTRAP_AFFECT_MARKER='Record how you are feeling: no affect Snapshot covers this Plan, so its affect margin, stretch pressure and post-plan state are a stand-in and not a measurement.';
export function affectFigureKind(quality) {
  if(!Array.isArray(quality?.revision_suggestions))return 'unavailable';
  return quality.revision_suggestions[0]===BOOTSTRAP_AFFECT_MARKER?'stand_in':'not_marked_as_stand_in';
}
// A fault retains only the same closed response metadata as the public block.
export function responseCause(result) {
  return {
    ...(Number.isSafeInteger(result?.status)&&result.status>=100&&result.status<=599?{status:result.status}:{}),
    ...(statuses.includes(result?.data?.status)?{response_status:result.data.status}:{}),
    ...(Array.isArray(result?.data?.diagnostics)?{diagnostic_codes:diagnostics(result.data.diagnostics)}:{})
  };
}
export const CERTIFICATION_FIELDS=Object.freeze(['task_index','slot_mask','start_time_offsets','duration_samples','piece_index','piece_count','validity_mask','dependency_slack','dependency_feasibility','hard_constraint_feasibility','rejection_codes','omissions','failure']);
const certificationPrefix='planning_gpu_fallback_certification_failed_';
// Parse only messages attached to a known field code. Construct a fresh public
// object; the private expected/actual values and arbitrary keys never pass through.
export function certificationLocations(rows) {
  if(!Array.isArray(rows))return [];
  return rows.filter(row=>codes.has(row?.code)&&row.code.startsWith(certificationPrefix)&&CERTIFICATION_FIELDS.includes(row.code.slice(certificationPrefix.length))).map(row=>{
    const field=row.code.slice(certificationPrefix.length);let data;
    try {data=JSON.parse(row.message);} catch {return {field,location:'unavailable'};}
    const bounded=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
    const candidate= data?.candidate_index,slot=data?.slot_index;
    const position=CERTIFICATION_FIELDS.indexOf(field);
    const validPosition=position<6?bounded(candidate,16)&&(slot===null||bounded(slot,256)):position<11?bounded(candidate,16)&&slot===null:candidate===null&&slot===null;
    if(data?.field!==field||!validPosition||!bounded(data?.diverging_fields,13)||data.diverging_fields<1)return {field,location:'unavailable'};
    return {field,candidate_index:candidate,slot_index:slot,diverging_fields:data.diverging_fields};
  });
}
const stamp=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v)?v:'withheld_or_unavailable';
export function safeOperation(op) {
  const row={kind:choice(op?.kind,kinds),static_anchor:flag(op?.static_anchor)};
  if(op?.kind==='create'||op?.kind==='update') Object.assign(row,{
    'event.start_at':stamp(op.event?.start_at),'event.end_at':stamp(op.event?.end_at),
    'event.color_id':op.event?.color_id===null?null:choice(op.event?.color_id,Array.from({length:11},(_,i)=>String(i+1))),
    'event.transparent':flag(op.event?.transparent),
    'event.reminders_minutes.count':length(op.event?.reminders_minutes)
  });
  return row;
}
export function previewLines(preview,route) {
  const ops=preview?.operations;
  return [
    `GET ${route} stale: ${flag(preview?.stale)}; matching_placements: ${count(preview?.matching_placements)}`,
    `GET ${route} operations: ${length(ops)} (client-computed cardinality); operations[].kind: ${JSON.stringify(histogram(ops,'kind',new Set(kinds)))} (client-computed histogram)`,
    ...(Array.isArray(ops)?ops.map((op,i)=>`GET ${route} operations[${i}]: ${JSON.stringify(safeOperation(op))}; event.reminders_minutes.count is client-computed; summary/task_id/external_id withheld`):[])
  ];
}
export function registryFigures(data, subjects=[]) {
  if (!Array.isArray(data?.settings)) return null;
  const rows=data.settings.filter(row=>typeof row?.name==='string'&&row.value===true&&row.name.startsWith('universe.subject.')&&validSubject(row.name.slice('universe.subject.'.length)));
  const selected=[];
  for(const root of subjects) {
    const matches=rows.filter(row=>row.name==='universe.subject.'+root), refs=matches[0]?.subject_metadata?.references;
    if(!validSubject(root)||matches.length!==1||!refs||![refs.universe_state_keys,refs.fact_provenance_keys,refs.task_precondition_targets].every(v=>Number.isSafeInteger(v)&&v>=0))return null;
    selected.push({universe_state_keys:refs.universe_state_keys,fact_provenance_keys:refs.fact_provenance_keys,task_precondition_targets:refs.task_precondition_targets});
  }
  return {governed:GOVERNED_SUBJECTS.length,provisional:new Set(rows.map(row=>row.name)).size,selected};
}
// Deliberate rehearsal selection; Static Tasks can be ranked by the server.
export function rankingTasks(data) {
  const rows=data?.tasks;
  if(!Array.isArray(rows)||!rows.every(row=>row&&typeof row.task_id==='string'&&row.task_id.length>0&&typeof row.title==='string'&&['static','planned'].includes(row.placement)&&typeof row.is_routine_occurrence==='boolean')||new Set(rows.map(row=>row.task_id)).size!==rows.length)return null;
  return rows.filter(row=>row.placement==='planned'&&row.is_routine_occurrence===false);
}
function priorityFigures(data) {
  const rows=data.task_priorities,unavailable={bucket_count:'unavailable',ranked:'unavailable',unranked:'unavailable'};
  if(!Array.isArray(rows))return unavailable;
  const bounded=v=>Number.isInteger(v)&&v>=0&&v<=4294967295;
  if(!rows.every(row=>row&&typeof row==='object'&&!Array.isArray(row)&&bounded(row.bucket_count)&&(!Object.hasOwn(row,'bucket')||row.bucket===null||bounded(row.bucket)&&row.bucket<row.bucket_count)))return unavailable;
  const counts=new Set(rows.map(row=>row.bucket_count)),ranked=rows.filter(row=>Object.hasOwn(row,'bucket')&&row.bucket!==null).length;
  return {bucket_count:counts.size===1?rows[0].bucket_count:'unavailable',ranked,unranked:rows.length-ranked};
}
const sources={capture:['POST','CALENDAR_CAPTURE_PATH'],plan:['POST','PLANNING_GENERATE_PATH'],preview:['GET','CALENDAR_PREVIEW_PATH'],approval:['POST','CALENDAR_APPROVE_PATH'],universe_before:['GET','UNIVERSE_STATE_PATH'],authoring:['PATCH','UNIVERSE_STATE_PATH'],requirement:['PATCH','TASK_PATH'],requirement_readback:['GET','TASK_PATH'],vocabulary:['POST','ADVISORY_RUN_PATH'],precondition:['POST','ADVISORY_RUN_PATH'],risk:['POST','PLANNING_GENERATE_PATH'],risk_read:['GET',REPORT_ROUTES.risk],human_complete:['GET',REPORT_ROUTES.humanComplete],time_by_category:['GET','TIME_BY_CATEGORY_PATH'],queue:['GET','ADVISORY_QUEUE_PATH'],routine:['POST','OBJECTIVE_CREATE_PATH'],session:['POST','GOOGLE_CALENDAR_SESSION_PATH'],subject:['PUT','SETTING_PUT_PATH'],registry:['GET','SETTINGS_LIST_PATH'],colour_setting:['PUT','SETTING_PUT_PATH'],advisory_setting:['PUT','SETTING_PUT_PATH'],planning_setting:['PUT','SETTING_PUT_PATH'],subject_setting:['PUT','SETTING_PUT_PATH']};
Object.assign(sources,{ranking_lookup:['GET','TASK_LIST_PATH'],ranking_statement:['POST','PREFERENCE_CREATE_PATH'],ranking:['POST','PREFERENCE_CREATE_PATH']});
const settingFamilies={colour_setting:'calendar.color',advisory_setting:'advisory',planning_setting:'planning',subject_setting:'universe.subject'};
const safeSkips=new Set(['private_input_missing','no_eligible_tasks','unsupported_private_setting','invalid_private_input','existing_tree_preserved','task_unavailable','task_selector_missing_or_ambiguous','operator_did_not_approve_or_preview_stale','preview_unavailable']);
export class PublicReport {
  constructor(endpoints) {this.e=endpoints;this.rows=new Map();this.decisions=[];this.attempts=[];this.ranking=null;this.rankingAttempts=[];this.rankedTaskIds=new Set();}
  observe(record,forwarded=false) {
    const e=this.e;let label=record.label;
    if(forwarded){
      // UI reads/writes never replace the driver's observed action snapshots.
      if(!['ADVISORY_ADMIT_PATH','ADVISORY_REJECT_PATH'].some(k=>record.route===e[k]))return;
      const route=record.route,status=count(record.result?.status);
      this.decisions.push(`${record.method} ${route} HTTP: ${status}; private decision body/response withheld`);
      return;
    }
    if(!Object.hasOwn(sources,label))return;
    const [method,key]=sources[label],route=key.startsWith('/')?key:e[key],r=record.result,d=r?.data;
    if(label==='ranking') {
      if(record.skip)this.rows.set(label,[`${method} ${route} ranking outcome: ${safeSkips.has(record.skip)?record.skip:'unavailable'}`,`${method} ${route}: unavailable; action not observed`]);
      else this.ranking={seed:Number.isInteger(record.seed)&&record.seed>=0&&record.seed<=4294967295?record.seed:'unavailable',layers:Number.isInteger(record.layers)&&record.layers>=1&&record.layers<=64?record.layers:'unavailable',buckets:length(record.buckets)};
      return;
    }
    if(label==='ranking_statement') {
      this.rankingAttempts.push(count(r?.status));
      if(r?.status===201&&!r.error)for(const id of [record.statement?.task_a,record.statement?.task_b])if(typeof id==='string')this.rankedTaskIds.add(id);
    }
    const family=label==='ranking_lookup'?' ranking_lookup':settingFamilies[label]?` family=${settingFamilies[label]}`:'';
    const lines=[`${method} ${route}${family} HTTP: ${count(r?.status)}; outcome: ${record.skip?(safeSkips.has(record.skip)?record.skip:'unavailable'):r?.error?'transport_or_status_failure':'response_observed'}`];
    if(label==='plan')this.rows.set('risk',[`${method} ${route}: unavailable; action not observed`]);
    if(record.skip || r?.error || !Number.isInteger(r?.status) || r.status<200 || r.status>=300) {
      lines.push(`${method} ${route}: unavailable; action not observed`);
      this.attempts.push(`${method} ${route} HTTP: ${count(r?.status)}; ${label}`);
      this.rows.set(label,lines);return;
    }
    if(d&&typeof d==='object') {
      if(label==='ranking_lookup')lines.push(`${method} ${route} ranking_lookup tasks: ${length(d.tasks)}; eligible (placement=planned, not occurrence): ${length(rankingTasks(d))} (client-computed cardinalities; ids/titles withheld)`);
      if(!['capture','plan','vocabulary','precondition'].includes(label)&&Array.isArray(d.diagnostics))lines.push(`${method} ${route} diagnostics[].code: ${JSON.stringify(diagnostics(d.diagnostics))} (client-computed histogram; messages withheld)`);
      if(label==='capture') {
        for(const key of ['captured','updated','unchanged','skipped','moved','resized'])lines.push(`${method} ${route} ${key}: ${count(d[key])}`);
        lines.push(`${method} ${route} diagnostics[].code: ${JSON.stringify(diagnostics(d.diagnostics))} (client-computed histogram; messages withheld)`);
        lines.push(`${method} ${route} diagnostics[].code == capture_colour_absent: ${Array.isArray(d.diagnostics)?d.diagnostics.filter(x=>x?.code==='capture_colour_absent').length:'unavailable'} (client-computed diagnostic-entry count)`);
      }
      if(label==='plan') {
        const steps=d.plan?.steps;
        lines.push(`${method} ${route} status: ${choice(d.status,['candidate','admitted','rejected','superseded','planned','no_plan','ok','failed'])}`,
          `${method} ${route} diagnostics[].code: ${JSON.stringify(diagnostics(d.diagnostics))} (client-computed histogram; messages withheld)`,
          `${method} ${route} plan.steps: ${length(steps)} (client-computed cardinality); plan.steps[].static_anchor: ${JSON.stringify(histogram(steps,'static_anchor',new Set([true,false])))} (client-computed histogram)`);
        for(const field of ['unplaced_tasks','blocked_tasks','invalid_tasks']) lines.push(`${method} ${route} ${field}: ${collection(d,field)} (client-computed cardinality; titles/ids/reasons/explanations/alternatives withheld)`);
        const priorities=priorityFigures(d);
        lines.push(`${method} ${route} task_priorities: ${collection(d,'task_priorities')} (client-computed cardinality); bucket_count: ${priorities.bucket_count}; ranked: ${priorities.ranked}; unranked: ${priorities.unranked} (client-computed from the rows' shared bucket_count and bucket presence; values withheld); ranking_input: ${record.rankingSupplied===true?'synthetic_stand_in':record.rankingSupplied===false?'not_supplied':'unavailable'}`);
        lines.push(`${method} ${route} engine_provenance.backend_kind: ${choice(d.engine_provenance?.backend_kind,['cpu_reference','gpu_worker','mobile_cpu','mobile_gpu'])}`);
        for(const location of certificationLocations(d.diagnostics))lines.push(`${method} ${route} diagnostics[].message certification metadata: ${JSON.stringify(location)} (closed field; zero-based indices; values withheld)`);
        const risk=[];
        risk.push(`${method} ${route} risk_report.level: ${choice(d.risk_report?.level,levels)}; risk_report.findings: ${length(d.risk_report?.findings)} (client-computed cardinality)`);
        if(Array.isArray(d.risk_report?.findings)) d.risk_report.findings.forEach((f,i)=>risk.push(`${method} ${route} risk_report.findings[${i}]: ${JSON.stringify({category:choice(f?.category,categories),severity:choice(f?.severity,levels),blocking:flag(f?.blocking)})}; detail/subject_ref withheld`));
        this.rows.set('risk',risk);
        const q=d.human_complete_plan_quality;
        lines.push(`${method} ${route} human_complete_plan_quality checkpoint_coverage: ${choice(q?.checkpoint_coverage,['adequate','sparse','absent'])}; failure_pattern: ${choice(q?.failure_pattern,['none','wrong_estimates','missing_dependencies','stale_affect','interruption','overload','changed_objective'])}; violated_dimensions.count: ${q&&typeof q==='object'?(Object.hasOwn(q,'violated_dimensions')?length(q.violated_dimensions):0):'unavailable'} (client-computed cardinality; omitted empty list uses the server default); affect_figures: ${affectFigureKind(q)}; numeric affect values and revision_suggestions withheld`);
      }
      if(label==='preview') {
        lines.push(...previewLines(d,route));
        const op=Array.isArray(d.operations)?d.operations.find(op=>op.kind==='update'&&op.static_anchor===false):null;
        lines.push(`${method} ${route} operations[] first kind=update, static_anchor=false: ${op?JSON.stringify(safeOperation(op)):'unavailable'}; private contents and UI gesture explanation withheld`);
      }
      if(label==='approval') lines.push(`${method} ${route} status: ${choice(d.status,statuses)}; operation_results: ${length(d.operation_results)} (client-computed cardinality); operation_results[].status: ${JSON.stringify(histogram(d.operation_results,'status',new Set(['applied','failed','skipped'])))} (client-computed histogram; operation_id/message withheld)`);
      if(label==='universe_before') for(const field of ['facts','numeric_values','set_memberships','event_markers'])lines.push(`${method} ${route} ${field}: ${d[field]&&typeof d[field]==='object'&&!Array.isArray(d[field])?Object.keys(d[field]).length:'unavailable'} (client-computed entry cardinality; no keys/values/rows)`);
      if(label==='registry') {
        const figures=registryFigures(d,record.subjects);
        if(figures) {
          lines.push(`${method} ${route} governed_subjects: ${figures.governed} (client-computed governed vocabulary cardinality); provisional_subjects: ${figures.provisional} (client-computed effective registry cardinality)`);
          figures.selected.forEach((refs,i)=>lines.push(`${method} ${route} supplied provisional root[${i+1}] references: ${JSON.stringify(refs)} (server-computed counts; root/key/value/target strings withheld)`));
          lines.push(`${method} ${route} ratification_condition: ${figures.provisional===0?'satisfied_for_now':'outstanding'} (client-computed; evaluated at the switch, not banked)`);
        }
      }
      if(['authoring','requirement','subject'].includes(label))lines.push(`${method} ${route} write response observed; content withheld`);
      if(label==='requirement_readback')lines.push(`${method} ${route} payload.preconditions present: ${d.payload?flag(d.payload.preconditions!=null):'unavailable'}; AST/words withheld; terminal rendering stays private`);
      if(['vocabulary','precondition'].includes(label))lines.push(`${method} ${route} producer=${label}: status: ${choice(d.status,statuses)}; candidates_enqueued: ${count(d.candidates_enqueued)}; selected_tasks: ${length(d.selected)} (client-computed cardinality of selected[] Tasks; ids/titles withheld); request.limit: ${count(record.requestLimit)}`,
        `${method} ${route} producer=${label} diagnostics[].code: ${JSON.stringify(diagnostics(d.diagnostics))} (client-computed histogram; messages withheld)`,
        `${method} ${route} producer=${label} diagnostics[].code == advisory_task_skipped: ${Array.isArray(d.diagnostics)?d.diagnostics.filter(x=>x?.code==='advisory_task_skipped').length:'unavailable'} (client-computed diagnostic-entry count; aggregate notes are not Task counts)`);
      if(label==='queue')lines.push(`${method} ${route} candidates: ${length(d.candidates)} (client-computed cardinality; names/conditions/ids/titles withheld; proposal words stay on the private screen)`);
      if(label==='risk_read') {
        lines.push(`${method} ${route} level: ${choice(d.level,levels)}; findings.count: ${length(d.findings)} (client-computed cardinality)`);
        if(Array.isArray(d.findings))d.findings.forEach((finding,i)=>lines.push(`${method} ${route} findings[${i}]: ${JSON.stringify({category:choice(finding?.category,categories),severity:choice(finding?.severity,levels),blocking:flag(finding?.blocking)})}; detail/subject_ref withheld`));
      }
      if(label==='human_complete') {
        lines.push(`${method} ${route} completed_tasks: ${count(d.completed_tasks)}; task_statuses.count: ${length(d.task_statuses)} (client-computed cardinality); notes withheld`);
        if(Array.isArray(d.task_statuses))d.task_statuses.forEach((row,i)=>lines.push(`${method} ${route} task_statuses[${i}]: ${JSON.stringify({status:choice(row?.status,['active','completed','failed','moot']),count:count(row?.count)})}`));
      }
      if(label==='time_by_category') {
        lines.push(`${method} ${route} total_seconds: ${count(d.total_seconds)}; categories.count: ${length(d.categories)}; unmeasured.count: ${length(d.unmeasured)} (client-computed cardinalities; names/titles/ids/reasons withheld)`);
        if(Array.isArray(d.categories))d.categories.forEach((row,i)=>lines.push(`${method} ${route} categories[${i}]: ${JSON.stringify(Object.fromEntries(['seconds','static_seconds','completed_seconds','task_count'].map(key=>[key,count(row?.[key])])))}; category name withheld`));
      }
      if(label==='session')for(const field of ['accepted','enabled'])lines.push(`${method} ${route} ${field}: ${flag(d[field])}`);
    }
    this.attempts.push(`${method} ${route} HTTP: ${count(r?.status)}; ${label}`);
    this.rows.set(label,lines);
  }
  render(answers=[]) {
    if(this.ranking) {
      const {seed,layers,buckets}=this.ranking;
      this.rows.set('ranking',[`POST ${this.e.PREFERENCE_CREATE_PATH} ranking: seed ${seed}; layers requested ${layers}; buckets ${buckets}; ranked Tasks ${this.rankedTaskIds.size}; statements attempted ${this.rankingAttempts.length}; HTTP 201: ${this.rankingAttempts.filter(status=>status===201).length} (operator-chosen integers and client-computed counts; Preference ids withheld); source: synthetic_stand_in`]);
    }
    const section=(n,labels)=>[`${n}.`,...labels.flatMap(label=>this.rows.get(label)??[`${sources[label][0]} ${sources[label][1].startsWith('/')?sources[label][1]:this.e[sources[label][1]]}: unavailable; action not observed`])];
    return ['BEGIN LIVE REHEARSAL COPY-BACK',
      ...section(1,['capture']),...section(2,['ranking_lookup','ranking','plan']),
      ...section(3,['risk','risk_read','human_complete','time_by_category']),...section(4,['preview']),...section(5,['approval']),...section(6,['universe_before']),...section(7,['subject','authoring','requirement','requirement_readback','registry']),...section(8,['vocabulary','precondition','queue']),...this.decisions,
      '9. Operator judgments (deliberate public sentences; never API data):',...Array.from({length:3},(_,i)=>`answer ${i+1}: ${typeof answers[i]==='string'?JSON.stringify(answers[i]):'unavailable'}`),
      'Additional action outcomes:',...['routine','session',...Object.keys(settingFamilies)].flatMap(label=>this.rows.get(label)??[]),
      'Observed action attempts (no replay):',...this.attempts,
      'Reset completeness: unverifiable. capture_stale_export diagnoses stamped leftovers; plan collision codes are observations, not proof of reset.',
      'Withheld from this file: placement gesture prose, saved requirement words, proposal/replacement words, vocabulary names, Task/event ids/titles/notes, diagnostic messages and risk detail.',
      'END LIVE REHEARSAL COPY-BACK'].join('\n');
  }
}
