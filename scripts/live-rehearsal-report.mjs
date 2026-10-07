// Public projection: never serialize an API object, arbitrary string, or key.
const count=v=>Number.isSafeInteger(v)&&v>=0?v:'unavailable';
const length=v=>Array.isArray(v)?v.length:'unavailable';
const flag=v=>typeof v==='boolean'?v:'unavailable';
const choice=(v,allowed)=>allowed.includes(v)?v:'withheld_or_unavailable';
const kinds=['create','update','delete'];
const statuses=['ok','unconfigured','failed','malformed_result','queue_full','applied','partial','refused','skipped','observed','drifted','rejected','admitted','timeout','worker_error','cancelled'];
const levels=['low','medium','high'];
const categories=['deadline_risk','dependency_fragility','worker_bottleneck','stale_affect','affect_margin','destructive_pressure','post_plan_depletion','low_coverage','skeleton_failure','routine_triage','unplaced_work'];
// Closed vocabulary: an unexpected server code is counted but its text withheld.
const codes=new Set(['capture_occupancy_only','capture_event_not_ownable','capture_colour_ambiguous','capture_owned_drift','capture_unrecorded_event','advisory_result_too_large','advisory_http_failed','advisory_transport_unavailable','capture_colour_absent','capture_stale_export','capture_event_invalid','capture_all_day_unsupported','capture_recurring_unsupported','capture_colour_unmapped','capture_colour_collision','routine_occurrence_overlaps_commitment','static_task_collision','calendar_event_retained','calendar_preview_stale','calendar_preview_missing','calendar_session_disabled','advisory_task_skipped','advisory_unconfigured','advisory_connection_failed','advisory_timeout','advisory_http_error','advisory_empty_response','advisory_malformed_result','precondition_queue_full','precondition_no_task','precondition_no_facts','precondition_missing_targets','precondition_proposal_refused','vocabulary_queue_full','vocabulary_no_task','vocabulary_proposal_refused','vocabulary_value_required','vocabulary_admission_refused','universe_mutation_invalid','universe_mutations_empty','version_conflict','unknown_schema_version','missing_schema_version']);
export function histogram(rows,key,allowed) {
  if(!Array.isArray(rows))return 'unavailable';
  const bins={};for(const row of rows){const code=allowed.has(row?.[key])?row[key]:'withheld_unknown';bins[code]=(bins[code]??0)+1;}return bins;
}
const diagnostics=v=>histogram(v,'code',codes);
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
const sources={capture:['POST','CALENDAR_CAPTURE_PATH'],plan:['POST','PLANNING_GENERATE_PATH'],preview:['GET','CALENDAR_PREVIEW_PATH'],approval:['POST','CALENDAR_APPROVE_PATH'],universe_before:['GET','UNIVERSE_STATE_PATH'],authoring:['PATCH','UNIVERSE_STATE_PATH'],requirement:['PATCH','TASK_PATH'],requirement_readback:['GET','TASK_PATH'],vocabulary:['POST','ADVISORY_RUN_PATH'],precondition:['POST','ADVISORY_RUN_PATH'],risk:['POST','PLANNING_GENERATE_PATH'],queue:['GET','ADVISORY_QUEUE_PATH'],routine:['POST','OBJECTIVE_CREATE_PATH'],session:['POST','GOOGLE_CALENDAR_SESSION_PATH'],subject:['PUT','SETTING_PUT_PATH'],colour_setting:['PUT','SETTING_PUT_PATH']};
const safeSkips=new Set(['private_input_missing','unsupported_private_setting','invalid_private_input','existing_tree_preserved','task_unavailable','task_selector_missing_or_ambiguous','operator_did_not_approve_or_preview_stale','preview_unavailable']);
export class PublicReport {
  constructor(endpoints) {this.e=endpoints;this.rows=new Map();this.decisions=[];this.attempts=[];}
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
    const [method,key]=sources[label],route=e[key],r=record.result,d=r?.data;
    const lines=[`${method} ${route} HTTP: ${count(r?.status)}; outcome: ${record.skip?(safeSkips.has(record.skip)?record.skip:'unavailable'):r?.error?'transport_or_status_failure':'response_observed'}`];
    if(label==='plan')this.rows.set('risk',[`${method} ${route}: unavailable; action not observed`]);
    if(record.skip || r?.error || !Number.isInteger(r?.status) || r.status<200 || r.status>=300) {
      lines.push(`${method} ${route}: unavailable; action not observed`);
      this.attempts.push(`${method} ${route} HTTP: ${count(r?.status)}; ${label}`);
      this.rows.set(label,lines);return;
    }
    if(d&&typeof d==='object') {
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
        for(const field of ['unplaced_tasks','blocked_tasks','invalid_tasks']) lines.push(`${method} ${route} ${field}: ${length(d[field])} (client-computed cardinality; titles/ids/reasons/explanations/alternatives withheld)`);
        const risk=[];
        risk.push(`${method} ${route} risk_report.level: ${choice(d.risk_report?.level,levels)}; risk_report.findings: ${length(d.risk_report?.findings)} (client-computed cardinality)`);
        if(Array.isArray(d.risk_report?.findings)) d.risk_report.findings.forEach((f,i)=>risk.push(`${method} ${route} risk_report.findings[${i}]: ${JSON.stringify({category:choice(f?.category,categories),severity:choice(f?.severity,levels),blocking:flag(f?.blocking)})}; detail/subject_ref withheld`));
        this.rows.set('risk',risk);
      }
      if(label==='preview') {
        lines.push(...previewLines(d,route));
        const op=Array.isArray(d.operations)?d.operations.find(op=>op.kind==='update'&&op.static_anchor===false):null;
        lines.push(`${method} ${route} operations[] first kind=update, static_anchor=false: ${op?JSON.stringify(safeOperation(op)):'unavailable'}; private contents and UI gesture explanation withheld`);
      }
      if(label==='approval') lines.push(`${method} ${route} status: ${choice(d.status,statuses)}; operation_results: ${length(d.operation_results)} (client-computed cardinality); operation_results[].status: ${JSON.stringify(histogram(d.operation_results,'status',new Set(['applied','failed','skipped'])))} (client-computed histogram; operation_id/message withheld)`);
      if(label==='universe_before') for(const field of ['facts','numeric_values','set_memberships','event_markers'])lines.push(`${method} ${route} ${field}: ${d[field]&&typeof d[field]==='object'&&!Array.isArray(d[field])?Object.keys(d[field]).length:'unavailable'} (client-computed entry cardinality; no keys/values/rows)`);
      if(['authoring','requirement','subject'].includes(label))lines.push(`${method} ${route} write response observed; content withheld`);
      if(label==='requirement_readback')lines.push(`${method} ${route} payload.preconditions present: ${d.payload?flag(d.payload.preconditions!=null):'unavailable'}; AST/PreconditionWords withheld; words are UI-only`);
      if(['vocabulary','precondition'].includes(label))lines.push(`${method} ${route} producer=${label}: status: ${choice(d.status,statuses)}; candidates_enqueued: ${count(d.candidates_enqueued)}; selected: ${length(d.selected)} (client-computed cardinality; ids/titles withheld)`,
        `${method} ${route} producer=${label} diagnostics[].code: ${JSON.stringify(diagnostics(d.diagnostics))} (client-computed histogram; messages withheld)`,
        `${method} ${route} producer=${label} diagnostics[].code == advisory_task_skipped: ${Array.isArray(d.diagnostics)?d.diagnostics.filter(x=>x?.code==='advisory_task_skipped').length:'unavailable'} (client-computed diagnostic-entry count; aggregate notes are not Task counts)`);
      if(label==='queue')lines.push(`${method} ${route} candidates: ${length(d.candidates)} (client-computed cardinality; names/conditions/ids/titles withheld; proposal words are UI-only)`);
      if(label==='session')for(const field of ['accepted','enabled'])lines.push(`${method} ${route} ${field}: ${flag(d[field])}`);
    }
    this.attempts.push(`${method} ${route} HTTP: ${count(r?.status)}; ${label}`);
    this.rows.set(label,lines);
  }
  render(answers=[]) {
    const section=(n,labels)=>[`${n}.`,...labels.flatMap(label=>this.rows.get(label)??[`${sources[label][0]} ${this.e[sources[label][1]]}: unavailable; action not observed`])];
    return ['BEGIN LIVE REHEARSAL COPY-BACK',
      ...section(1,['capture']),...section(2,['plan']),
      ...section(3,['risk']),...section(4,['preview']),...section(5,['approval']),...section(6,['universe_before']),...section(7,['subject','authoring','requirement','requirement_readback']),...section(8,['vocabulary','precondition','queue']),...this.decisions,
      '9. Operator judgments (deliberate public sentences; never API data):',...answers.map((a,i)=>`answer ${i+1}: ${typeof a==='string'?JSON.stringify(a):'unavailable'}`),
      'Additional action outcomes:',...['routine','session','colour_setting'].flatMap(label=>this.rows.get(label)??[]),
      'Observed action attempts (no replay):',...this.attempts,
      'Reset completeness: unverifiable. capture_stale_export diagnoses stamped leftovers; plan collision codes are observations, not proof of reset.',
      'UI-only/withheld: placement gesture prose, saved requirement words, proposal/replacement words, vocabulary names, Task/event ids/titles/notes, diagnostic messages and risk detail.',
      'END LIVE REHEARSAL COPY-BACK'].join('\n');
  }
}
