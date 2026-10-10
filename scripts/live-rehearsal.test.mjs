import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as e from '../../ubu-ui/src/api/endpoints.ts';
import { liveConfig, runActions, createForwarder, routeTemplate, validateFiles, bindForwarder, checkInputs } from './live-rehearsal.mjs';
import { requestJson, loopbackUrl } from './loopback-json.mjs';
import { mulberry32, shuffle, rankingStatements } from './synthetic-ranking.mjs';
const secret=()=>randomUUID();
const owned='http://127.0.0.1:54321',ports=new Set([54321]);
function flow({failure,tree=false,approve=false,ranking,observation,failPreferenceAt,mutate=()=>{}}={}) {
  const id=secret(),name=secret(),target=secret(),records=[],calls=[];
  const inputs={routine:{title:name},subjects:['invented_'+secret().replaceAll('-','')],mutations:[{operation:'set_fact',target,payload:true}],task:{id},precondition:{target,predicate:'equals',expected:true}};
  const responses={
    task_list:{tasks:[{task_id:id,title:name,placement:'planned',is_routine_occurrence:false},{task_id:secret(),title:secret(),placement:'planned',is_routine_occurrence:false},{task_id:secret(),title:secret(),placement:'static',is_routine_occurrence:false}]},
    capture:{captured:4,updated:3,unchanged:2,skipped:1,moved:5,resized:6,diagnostics:[{code:'capture_colour_absent',message:secret()},{code:'capture_colour_absent',message:secret()},{code:'capture_stale_export',message:secret()}]},
    plan:{status:'admitted',plan:{steps:[{summary:secret(),static_anchor:true},{summary:secret(),static_anchor:false},{summary:secret(),static_anchor:false}]},unplaced_tasks:[{summary:secret(),reason:secret()}],blocked_tasks:[],invalid_tasks:[],diagnostics:[{code:'static_task_collision',message:secret()}],risk_report:{level:'high',findings:[{category:'deadline_risk',severity:'high',blocking:true,detail:secret()},{category:'unplaced_work',severity:'medium',blocking:false,detail:secret()}]}},
    preview:{preview_id:secret(),stale:false,matching_placements:8,diagnostics:[],operations:[{kind:'update',static_anchor:false,event:{summary:secret(),start_at:'2026-10-07T10:00:00Z',end_at:'2026-10-07T11:00:00Z',color_id:null,transparent:false,reminders_minutes:[5,10]}},{kind:'create',static_anchor:true,event:{summary:secret(),start_at:'2026-10-07T12:00:00Z',end_at:'2026-10-07T13:00:00Z',color_id:'8',transparent:true,reminders_minutes:[]}},{kind:'delete',summary:secret()}]},
    approval:{status:'partial',diagnostics:[],operation_results:[{status:'applied'},{status:'applied'},{status:'failed'},{status:'skipped'}]},
    universe_before:{facts:{[secret()]:true,[secret()]:false},numeric_values:{[secret()]:17},set_memberships:{[secret()]:[secret(),secret()],[secret()]:[]},event_markers:{[secret()]:[secret()]}},
    vocabulary:{status:'ok',candidates_enqueued:3,selected:[{id:secret(),title:secret()},{id:secret(),title:secret()}],diagnostics:[{code:'advisory_task_skipped',message:secret()},{code:'advisory_task_skipped',message:secret()}]},
    precondition:{status:'ok',candidates_enqueued:1,selected:[{id:secret(),title:secret()}],diagnostics:[{code:'advisory_task_skipped',message:secret()}]},
    queue:{candidates:[{candidate:{normalized_proposal:{target:secret()}}},{candidate:{normalized_proposal:{target:secret()}}}]},
    session:{accepted:true,enabled:true},
    registry:{settings:[{name:'universe.subject.'+inputs.subjects[0],value:true,version:1,subject_metadata:{minted_at:'2026-10-06T08:00:00Z',references:{universe_state_keys:2,fact_provenance_keys:3,task_precondition_targets:4}}}]}
  };
  if(ranking!==undefined)inputs.ranking=ranking;
  if(observation!==undefined)inputs.observation=observation;
  responses.observation={source_kind:"live_observation",dimension_count:3,observed_at:"2026-06-10T09:00:00Z",snapshot_id:secret()};
  responses.plan.task_priorities=responses.task_list.tasks.map(task=>({task_id:task.task_id,bucket_count:0,value:0.1}));
  responses.preference_fault={diagnostics:[{code:'preference_unknown_task',message:name+' '+id}]};
  mutate(responses);
  let saved=false,preferences=0;
  const call=async(method,path,body)=>{
    calls.push({method,path,body});
    if(path===failure)throw new Error(secret());
    let data={};
    const label=Object.entries({capture:e.CALENDAR_CAPTURE_PATH,plan:e.PLANNING_GENERATE_PATH,preview:e.CALENDAR_PREVIEW_PATH,approval:e.CALENDAR_APPROVE_PATH,queue:e.ADVISORY_QUEUE_PATH,session:e.GOOGLE_CALENDAR_SESSION_PATH,observation:e.AFFECT_OBSERVATION_PATH}).find(([,route])=>route===path)?.[0];
    if(label)data=responses[label];
    if(path===e.UNIVERSE_STATE_PATH&&method==='GET')data=responses.universe_before;
    if(path===e.SETTINGS_LIST_PATH)data=responses.registry;
    if(path===e.ADVISORY_RUN_PATH)data=responses[body.producer];
    if(path.startsWith(e.TASK_LIST_PATH+'?'))data=responses.task_list;
    if(path===e.PREFERENCE_CREATE_PATH){if(++preferences===failPreferenceAt)return {status:400,data:responses.preference_fault};data={preference_id:secret(),version:1};}
    if(path===e.TASK_PATH.replace('{task_id}',id)){
      if(method==='PATCH')saved=true;
      data={version:7,payload:{preconditions:tree?{all_of:[inputs.precondition]}:saved?inputs.precondition:undefined}};
    }
    return {status:[e.OBJECTIVE_CREATE_PATH,e.PREFERENCE_CREATE_PATH,e.AFFECT_OBSERVATION_PATH].includes(path)?201:200,data};
  };
  return {inputs,calls,records,responses,run:()=>runActions({endpoints:e,inputs,call,approve:async()=>approve,observe:r=>records.push(r)})};
}
test('owned transport rejects off-host and alternate ports before effects',async()=>{
  for(const path of ['https://example.invalid','//example.invalid','/\\example.invalid']) assert.throws(()=>loopbackUrl(owned,path,ports));
  assert.throws(()=>loopbackUrl(owned,'/',new Set([1])));
  let invoked=false;
  await assert.rejects(requestJson(owned,'GET','//example.invalid',undefined,{allowedPorts:ports,fetchImpl:async()=>{invoked=true;}}));
  assert.equal(invoked,false);
});
test('JSON transport preserves status; sanitizes malformed, connection and oversized outcomes',async()=>{
  const result=await requestJson(owned,'GET','/health',undefined,{allowedPorts:ports,fetchImpl:async()=>new Response('{"ok":true}',{status:201})});
  assert.deepEqual(result.data,{ok:true});assert.equal(result.status,201);
  const canary=secret();
  for(const fetchImpl of [async()=>{throw new Error(canary);},async()=>new Response(canary),async()=>({status:200,text:async()=> 'x'.repeat(17*1024*1024)})]) {
    await assert.rejects(requestJson(owned,'GET','/health',undefined,{allowedPorts:ports,fetchImpl}),error=>!error.message.includes(canary));
  }
});
test('actions follow document order with separate explicit approval and versioned leaf PATCH',async()=>{
  const f=flow({approve:true,ranking:{seed:7,layers:2},observation:{energy:7,stress:3,mood_intensity:3}});await f.run();
  assert.deepEqual(f.records.filter(r=>r.label!=='ranking').map(r=>r.label),['routine','session','capture','ranking_lookup','ranking_statement','observation','plan','risk_read','human_complete','time_by_category','preview','approval','universe_before','subject','authoring','task_lookup','task_read','requirement','requirement_readback','registry','vocabulary','precondition','queue']);
  const patch=f.calls.find(c=>c.method==='PATCH'&&c.path.startsWith('/task/'));
  assert.deepEqual(patch.body,{schema_version:e.TASK_CAPTURE_SCHEMA_VERSION,expected_version:7,preconditions:f.inputs.precondition});
  assert.equal(Object.keys(patch.body).length,3);
});
test('failed capture stops before later producers and writes',async()=>{
  const f=flow({failure:e.CALENDAR_CAPTURE_PATH});await assert.rejects(f.run(),error=>error.code==='action_request_failed');
  assert(!f.calls.some(c=>c.path===e.CALENDAR_APPROVE_PATH));
  assert(f.records.find(r=>r.label==='capture').result.error);
  assert(!f.records.find(r=>r.label==='precondition'));
});
test('missing private authoring stays skipped; existing trees are preserved',async()=>{
  const f=flow({tree:true});await f.run();
  assert.equal(f.records.find(r=>r.label==='requirement').skip,'existing_tree_preserved');
  assert(!f.calls.some(c=>c.method==='PATCH'&&c.path.startsWith('/task/')));
  const records=[];await runActions({endpoints:e,call:async()=>({status:200,data:{enabled:true,stale:false,preview_id:secret(),status:'ok'}}),observe:r=>records.push(r)});
  for(const label of ['routine','authoring','requirement'])assert.equal(records.find(r=>r.label===label).skip,'private_input_missing');
});
test('stale or absent preview never asks for approval; interrupted approval stops',async()=>{
  for(const data of [{stale:true,preview_id:secret()},{}]) {
    let asked=false;const calls=[];
    await assert.rejects(runActions({endpoints:e,call:async(m,p)=>{calls.push(p);return {status:200,data:{enabled:true,...data}};},approve:async()=>{asked=true;return true;}}),error=>error.code==='preview_unavailable');
    assert.equal(asked,false);assert(!calls.includes(e.CALENDAR_APPROVE_PATH));
  }
  let end=false;await assert.rejects(runActions({endpoints:e,call:async(m,p)=>{if(p===e.ADVISORY_QUEUE_PATH)end=true;return {status:200,data:{enabled:true,stale:false,preview_id:secret()}};},approve:async()=>{throw Error(secret());}}),error=>error.code==='approval_interrupted');
  assert(!end);
});
test('configuration has no path/calendar defaults and refuses mock or malformed private inputs',()=>{
  assert.throws(()=>liveConfig({},e));
  const env=Object.fromEntries(['UBU_DB_PATH','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_REHEARSAL_BINARY'].map(k=>[k,'/'+secret()]));env.UBU_GOOGLE_CALENDAR_ID=secret();
  env.UBU_PLANNING_WORKER_PYTHON='/synthetic-worker';env.UBU_PLANNER_STRATEGY='greedy';
  env.UBU_REHEARSAL_INPUTS=JSON.stringify({subjects:['synthetic_shelf'],mutations:[{operation:'set_fact',target:'facts.synthetic_shelf.ready',payload:true}]});
  assert.equal(liveConfig(env,e).port,Number(e.DEFAULT_ORCHESTRATOR_PORT));
  for(const extra of [{UBU_CALENDAR_MOCK_EVENTS:'x'},{UBU_REHEARSAL_INPUTS:'{'},{UBU_REHEARSAL_INPUTS:'{"subjects":{}}'},{UBU_ORCHESTRATOR_PORT:'0'}])assert.throws(()=>liveConfig({...env,...extra},e));
});
const req=(url,body='',method='POST')=>({url,method,async *[Symbol.asyncIterator](){if(body)yield Buffer.from(body);}});
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(status){this.status=status;},end(body){this.body=body;}});
test('optional UI proxy forwards the same response once, preserves CORS, redacts dynamic route parameters',async()=>{
  const canary=secret(),raw=JSON.stringify({message:canary}),observations=[];let count=0,received;
  const handler=createForwarder({base:owned,port:54321,endpoints:e,fetchImpl:async(url,init)=>{count++;received=init.body;return new Response(raw,{status:409,headers:{'access-control-allow-origin':'*'}});},observe:r=>observations.push(r)});
  const response=res();await handler(req('/task/'+canary,raw,'PATCH'),response);
  assert.equal(count,1);assert.equal(received,raw);assert.equal(response.body,raw);assert.equal(response.status,409);assert.equal(response.headers['access-control-allow-origin'],'*');
  assert.equal(observations[0].route,e.TASK_PATH);assert(!observations[0].route.includes(canary));
  assert.equal(routeTemplate('/setting/'+canary,e),e.SETTING_PUT_PATH);
});
test('optional UI proxy rejects external URL spellings and forwards despite observer failures',async()=>{
  let calls=0;const handler=createForwarder({base:owned,port:54321,endpoints:e,fetchImpl:async()=>{calls++;return new Response('{}');},observe:()=>{throw Error(secret());}});
  for(const url of ['//example.invalid','/\\example.invalid','https://example.invalid']) {const response=res();await handler(req(url),response);assert.equal(response.status,502);}
  assert.equal(calls,0);const response=res();await handler(req('/health','', 'GET'),response);assert.equal(response.status,200);
});

const {PublicReport,previewLines}=await import('./live-rehearsal-report.mjs');
test('public report withholds nested content and unknown codes, labels every computed count',()=>{
  const canary=secret(),report=new PublicReport(e);
  const record=(label,data)=>report.observe({label,result:{status:200,data}});
  record('capture',{captured:4,updated:0,moved:0,resized:0,unchanged:1,skipped:2,diagnostics:[{code:'capture_colour_absent',message:canary},{code:canary,message:canary}]});
  record('plan',{status:'ok',plan:{steps:[{static_anchor:true,summary:canary},{static_anchor:false,summary:canary}]},diagnostics:[],unplaced_tasks:[{title:canary,reason:canary}],blocked_tasks:[],invalid_tasks:[],risk_report:{level:'medium',findings:[{category:'unplaced_work',severity:'medium',blocking:false,detail:canary,subject_ref:canary}]}});
  record('preview',{stale:false,matching_placements:0,operations:[{kind:'update',static_anchor:false,event:{summary:canary,external_id:canary,task_id:canary,start_at:'2026-10-06T10:00:00Z',end_at:'2026-10-06T11:00:00Z',color_id:null,transparent:false,reminders_minutes:[]}}]});
  record('approval',{status:'applied',operation_results:[{status:'applied',message:canary}]});
  record('universe_before',{facts:{[canary]:canary},numeric_values:{},set_memberships:{[canary]:[canary,canary]},event_markers:{}});
  for(const label of ['vocabulary','precondition'])record(label,{status:'ok',candidates_enqueued:3,selected:[{id:canary,title:canary}],diagnostics:[{code:'advisory_task_skipped',message:canary}]});
  record('queue',{candidates:[{candidate:{proposal:canary}}]});
  const output=report.render();assert(!output.includes(canary));
  assert(output.includes('facts: 1 (client-computed'));assert(output.includes('set_memberships: 1 (client-computed'));
  assert(output.includes('withheld_unknown'));assert(output.includes('risk_report.findings[0]'));assert(output.includes('producer=vocabulary'));assert(output.includes('producer=precondition'));
  assert(output.indexOf('3.')>output.indexOf('unplaced_tasks'));assert(output.indexOf('risk_report.level')>output.indexOf('3.'));
});
test('each automatic producer retains its own observed selection snapshot',async()=>{
  const f=flow({approve:true});await f.run();const report=new PublicReport(e);
  for(const record of f.records)report.observe(record);
  const output=report.render();assert(output.includes('producer=vocabulary diagnostics[].code == advisory_task_skipped: 2'));assert(output.includes('producer=precondition diagnostics[].code == advisory_task_skipped: 1'));
});
test('unknown enums, strings in counts, malformed fields and errors cannot enter public output',()=>{
  const canary=secret(),report=new PublicReport(e);
  report.observe({label:'vocabulary',skip:canary,result:{status:canary,error:canary,data:{status:canary,candidates_enqueued:canary,selected:canary,diagnostics:[{code:canary,message:canary}]}}});
  const preview={stale:canary,matching_placements:canary,operations:[{kind:canary,event:{summary:canary}},{kind:'update',static_anchor:canary,event:{start_at:canary,end_at:canary,color_id:canary,reminders_minutes:canary,transparent:canary}}]};
  assert(!previewLines(preview,e.CALENDAR_PREVIEW_PATH).join('\n').includes(canary));
  assert(!report.render().includes(canary));
});
test('visual UI reads cannot overwrite driver snapshots; explicit decisions report only route and status',()=>{
  const report=new PublicReport(e),canary=secret();
  report.observe({label:'capture',result:{status:200,data:{captured:7}}});
  report.observe({method:'POST',route:e.CALENDAR_CAPTURE_PATH,result:{status:200,data:{captured:8}}},true);
  report.observe({method:'POST',route:e.ADVISORY_REJECT_PATH,body:{reason:canary},result:{status:200,data:{message:canary}}},true);
  assert(report.render().includes('captured: 7'));assert(!report.render().includes('captured: 8'));assert(!report.render().includes(canary));
});
const {QUESTIONS,collectJudgments,privateStrings}=await import('./live-rehearsal-questions.mjs');
test('three judgments are asked at the end in order and included in the single block',async()=>{
  const seen=[],answers=await collectJudgments(async prompt=>{seen.push(prompt);return 'The choice suits me.';});
  assert.equal(QUESTIONS.length,3);assert.deepEqual(seen,QUESTIONS.map(q=>`${q}\nYour public judgment sentence: `));
  assert.equal(answers.length,3);const output=new PublicReport(e).render(answers);
  assert.equal(output.split('BEGIN LIVE REHEARSAL COPY-BACK').length,2);assert.equal(output.split('The choice suits me.').length,4);
});
test('known private content and empty judgments stop with a public reason; question errors propagate',async()=>{
  const canary=secret(),withheld=privateStrings({nested:[canary]});
  await assert.rejects(collectJudgments(async()=>canary,{withheld}),error=>error.code==='judgment_private_content');
  await assert.rejects(collectJudgments(async()=>''),error=>error.code==='judgment_unanswered');
  await assert.rejects(collectJudgments(async()=>{throw new RehearsalFault('interrupted');}),error=>error.code==='interrupted');
});
test('public enum vocabulary preserves actual admitted plans and worker failure/timeout statuses',()=>{
  const report=new PublicReport(e);
  report.observe({label:'plan',result:{status:200,data:{status:'admitted'}}});
  report.observe({label:'vocabulary',result:{status:200,data:{status:'timeout'}}});
  report.observe({label:'precondition',result:{status:200,data:{status:'worker_error'}}});
  const output=report.render();for(const status of ['admitted','timeout','worker_error'])assert(output.includes('status: '+status));
});
test('requirement readback records only the driver Task, never unrelated UI reads',async()=>{
  const f=flow({approve:true});await f.run();const report=new PublicReport(e);
  for(const record of f.records)report.observe(record);
  report.observe({method:'GET',route:e.TASK_PATH,identity:secret(),result:{status:200,data:{payload:{}}}},true);
  assert(report.render().includes('payload.preconditions present: true'));
});
test('optional UI proxy preserves actual UI preflight headers and prevents redirect forwarding',async()=>{
  let received;const handler=createForwarder({base:owned,port:54321,endpoints:e,fetchImpl:async(url,init)=>{received=init;return new Response(null,{status:204});}});
  const request=req('/calendar/current','', 'OPTIONS');request.headers={origin:'http://localhost:1420','access-control-request-method':'GET','access-control-request-headers':'content-type'};
  const response=res();await handler(request,response);
  assert.equal(response.status,204);assert.equal(received.headers.origin,request.headers.origin);assert.equal(received.headers['access-control-request-method'],'GET');assert.equal(received.redirect,'error');
});
test('malformed Task lists stop with a selector diagnosis',async()=>{
  for(const tasks of [{},[null],['untrusted']]){
    const calls=[];await assert.rejects(runActions({endpoints:e,inputs:{task:{id:secret()},precondition:{target:secret()}},call:async(m,p)=>{calls.push(p);return {status:200,data:{tasks,enabled:true,stale:false,preview_id:secret()}};}}),error=>error.code==='task_selector_unavailable');
    assert.equal(calls.filter(p=>p===e.ADVISORY_RUN_PATH).length,0);
  }
});

function fields(output) {
  const lines=output.split('Observed action attempts (no replay):')[0].split('\n');
  return (marker,expected)=>{
    const matches=lines.filter(line=>line.includes(marker));assert.equal(matches.length,1,marker);
    const tail=matches[0].slice(matches[0].indexOf(marker)+marker.length);
    const actual=tail.startsWith('{')?JSON.parse(tail.slice(0,tail.indexOf('}')+1)):tail.split(/[; ]/)[0];
    assert.deepEqual(actual,typeof expected==='object'?expected:String(expected),marker);
  };
}
async function projected(options) {
  const f=flow({approve:true,...options});try{await f.run();}catch(error){if(!options?.failure)throw error;}const report=new PublicReport(e);
  for(const record of f.records)report.observe(record);
  return {f,report,output:report.render()};
}
test('B projection reports each injected count, cardinality, histogram and enum field in groups 1–8',async()=>{
  const {f,output}=await projected(),r=f.responses,check=fields(output);
  assert(!output.includes('mode:'));
  for(const key of ['captured','updated','unchanged','skipped','moved','resized'])check(`POST ${e.CALENDAR_CAPTURE_PATH} ${key}: `,r.capture[key]);
  check(`POST ${e.CALENDAR_CAPTURE_PATH} diagnostics[].code: `,{capture_colour_absent:2,capture_stale_export:1});
  check(`POST ${e.CALENDAR_CAPTURE_PATH} diagnostics[].code == capture_colour_absent: `,r.capture.diagnostics.filter(d=>d.code==='capture_colour_absent').length);
  check(`POST ${e.PLANNING_GENERATE_PATH} status: `,r.plan.status);
  check(`POST ${e.PLANNING_GENERATE_PATH} diagnostics[].code: `,{static_task_collision:1});
  check(`POST ${e.PLANNING_GENERATE_PATH} plan.steps: `,r.plan.plan.steps.length);
  check('plan.steps[].static_anchor: ',{true:1,false:2});
  for(const key of ['unplaced_tasks','blocked_tasks','invalid_tasks'])check(`POST ${e.PLANNING_GENERATE_PATH} ${key}: `,r.plan[key].length);
  check('risk_report.level: ',r.plan.risk_report.level);check('risk_report.findings: ',r.plan.risk_report.findings.length);
  for(const [i,finding] of r.plan.risk_report.findings.entries())check(`risk_report.findings[${i}]: `,{category:finding.category,severity:finding.severity,blocking:finding.blocking});
  check(`GET ${e.CALENDAR_PREVIEW_PATH} stale: `,r.preview.stale);check('matching_placements: ',r.preview.matching_placements);
  check(`GET ${e.CALENDAR_PREVIEW_PATH} operations: `,r.preview.operations.length);check('operations[].kind: ',{update:1,create:1,delete:1});
  for(const [i,op] of r.preview.operations.entries()) {
    const expected={kind:op.kind,static_anchor:op.static_anchor??'unavailable'};
    if(op.event)Object.assign(expected,{'event.start_at':op.event.start_at,'event.end_at':op.event.end_at,'event.color_id':op.event.color_id,'event.transparent':op.event.transparent,'event.reminders_minutes.count':op.event.reminders_minutes.length});
    check(`operations[${i}]: `,expected);
    if(i===0)check('operations[] first kind=update, static_anchor=false: ',expected);
  }
  check(`GET ${e.CALENDAR_PREVIEW_PATH} diagnostics[].code: `,{});
  check(`POST ${e.CALENDAR_APPROVE_PATH} status: `,r.approval.status);check('operation_results: ',r.approval.operation_results.length);check('operation_results[].status: ',{applied:2,failed:1,skipped:1});
  check(`POST ${e.CALENDAR_APPROVE_PATH} diagnostics[].code: `,{});
  for(const key of ['facts','numeric_values','set_memberships','event_markers'])check(`GET ${e.UNIVERSE_STATE_PATH} ${key}: `,Object.keys(r.universe_before[key]).length);
  check(`PUT ${e.SETTING_PUT_PATH} HTTP: `,200);check(`PATCH ${e.UNIVERSE_STATE_PATH} HTTP: `,200);check(`PATCH ${e.TASK_PATH} HTTP: `,200);check(`GET ${e.TASK_PATH} HTTP: `,200);check('payload.preconditions present: ',true);
  for(const producer of ['vocabulary','precondition']) {
    const body=r[producer],marker=`POST ${e.ADVISORY_RUN_PATH} producer=${producer}`;
    check(`${marker}: status: `,body.status);
    const line=output.split('\n').find(line=>line.startsWith(`${marker}: status:`));
    assert.equal(Number(line.match(/candidates_enqueued: (\d+)/)[1]),body.candidates_enqueued);assert.equal(Number(line.match(/selected_tasks: (\d+)/)[1]),body.selected.length);
    check(`${marker} diagnostics[].code: `,{advisory_task_skipped:body.diagnostics.length});check(`${marker} diagnostics[].code == advisory_task_skipped: `,body.diagnostics.length);
  }
  check(`GET ${e.ADVISORY_QUEUE_PATH} candidates: `,r.queue.candidates.length);
});
test('B changing one injected field changes only the lines fed by that field',async()=>{
  const before=(await projected()).output.split('\n');
  const cases=[
    [r=>r.capture.captured++,['POST '+e.CALENDAR_CAPTURE_PATH+' captured:']],
    [r=>r.preview.matching_placements++,['GET '+e.CALENDAR_PREVIEW_PATH+' stale:']],
    [r=>r.vocabulary.candidates_enqueued++,['POST '+e.ADVISORY_RUN_PATH+' producer=vocabulary:']],
    [r=>r.plan.risk_report.findings[0].severity='low',['POST '+e.PLANNING_GENERATE_PATH+' risk_report.findings[0]:']],
    [r=>r.capture.diagnostics.push({code:'capture_colour_absent',message:secret()}),['POST '+e.CALENDAR_CAPTURE_PATH+' diagnostics[].code:', 'POST '+e.CALENDAR_CAPTURE_PATH+' diagnostics[].code == capture_colour_absent:']]
  ];
  for(const [mutate,prefixes] of cases){const after=(await projected({mutate})).output.split('\n');assert.equal(after.length,before.length);
    const changed=after.filter((line,i)=>line!==before[i]);assert.equal(changed.length,prefixes.length);
    for(const prefix of prefixes)assert(changed.some(line=>line.startsWith(prefix)),prefix);
  }
});
test('B failed, skipped and unreached actions each retain explicit unavailable lines',async()=>{
  const failed=await projected({failure:e.CALENDAR_CAPTURE_PATH});assert(failed.output.includes(`POST ${e.CALENDAR_CAPTURE_PATH}: unavailable; action not observed`));
  const report=new PublicReport(e);report.observe({label:'requirement',skip:'private_input_missing'});
  const output=report.render();for(const [method,route] of [['PATCH',e.TASK_PATH],['POST',e.CALENDAR_CAPTURE_PATH],['GET',e.CALENDAR_PREVIEW_PATH],['POST',e.ADVISORY_RUN_PATH]])assert(output.includes(`${method} ${route}: unavailable; action not observed`));
});
test('B unknown enum/code entries are withheld and remain included in cardinalities',async()=>{
  const canary=secret();const {output}=await projected({mutate:r=>{r.plan.risk_report.level=canary;r.capture.diagnostics.push({code:canary,message:canary});r.preview.operations.push({kind:canary});r.approval.operation_results.push({status:canary});}});
  const check=fields(output);check('risk_report.level: ','withheld_or_unavailable');check('operations: ',4);check('operations[].kind: ',{update:1,create:1,delete:1,withheld_unknown:1});check('operation_results: ',5);check('operation_results[].status: ',{applied:2,failed:1,skipped:1,withheld_unknown:1});check(`POST ${e.CALENDAR_CAPTURE_PATH} diagnostics[].code: `,{capture_colour_absent:2,capture_stale_export:1,withheld_unknown:1});assert(!output.includes(canary));
});
const {RehearsalFault,REMEDIES,failureLine,writePublicArtifact,finishFailure,startupBuffer,shellPath}=await import('./live-rehearsal-diagnostics.mjs');
const fakeEnv=()=>({...Object.fromEntries(['UBU_DB_PATH','UBU_GOOGLE_CALENDAR_ID','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_REHEARSAL_BINARY','UBU_PLANNING_WORKER_PYTHON'].map(key=>[key,'/'+secret()])),UBU_PLANNER_STRATEGY:'greedy',UBU_REHEARSAL_INPUTS:JSON.stringify({subjects:['synthetic_shelf'],mutations:[{operation:'set_fact',target:'facts.synthetic_shelf.ready',payload:true}]})});
const absent=()=>Object.assign(new Error(secret()),{code:'ENOENT'});
function fakeFiles({present=[],badStat,badAccess,writeFails=false}={}) {
  const writes=[],moves=[];
  return {writes,moves,
    async stat(path){if(path===badStat)throw Error(secret());return {isFile:()=>true};},
    async lstat(path){if(present.includes(path))return {isFile:()=>true};throw absent();},
    async access(path){if(path===badAccess)throw Error(secret());},
    async writeFile(path,text,options){if(writeFails)throw Error(secret());writes.push({path,text,options});},
    async rename(from,to){moves.push({from,to});},async rm(){}
  };
}
test('C missing/relative variables are named without exposing their values',()=>{
  const env=fakeEnv();delete env.UBU_GOOGLE_CREDENTIALS_PATH;
  assert.throws(()=>liveConfig(env,e),error=>failureLine(error).includes('UBU_GOOGLE_CREDENTIALS_PATH'));
  env.UBU_GOOGLE_CREDENTIALS_PATH=secret();assert.throws(()=>liveConfig(env,e),error=>error.code==='absolute_path_required'&&!failureLine(error).includes(env.UBU_GOOGLE_CREDENTIALS_PATH));
});
test('C file refusals name variable/check; all three SQLite files prevent a fresh run',async()=>{
  const env=fakeEnv(),config=liveConfig(env,e);
  for(const variable of ['UBU_GOOGLE_CREDENTIALS_PATH','UBU_REHEARSAL_BINARY','UBU_GOOGLE_TOKEN_CACHE_PATH'])await assert.rejects(validateFiles(config,env,fakeFiles({badStat:env[variable]})),error=>failureLine(error).includes(variable)&&!failureLine(error).includes(env[variable]));
  for(const suffix of ['','-wal','-shm'])await assert.rejects(validateFiles(config,env,fakeFiles({present:[config.store+suffix]})),error=>{
    const line=failureLine(error);assert(line.includes('rm -f -- '+[config.store,config.store+'-wal',config.store+'-shm'].map(shellPath).join(' ')));return error.code==='fresh_store_required';
  });
  await validateFiles(config,env,fakeFiles());
});
test('C token and store parent permission failures retain public variable names',async()=>{
  const env=fakeEnv(),config=liveConfig(env,e),fs=fakeFiles();
  fs.stat=async path=>{if(path===env.UBU_GOOGLE_TOKEN_CACHE_PATH)throw absent();return {isFile:()=>true};};fs.access=async path=>{if(path==='/')throw Error(secret());};
  await assert.rejects(validateFiles(config,env,fs),error=>error.code==='token_unavailable'&&failureLine(error).includes('writable parent'));
  const other=fakeFiles({badAccess:'/'});await assert.rejects(validateFiles(config,env,other),error=>failureLine(error).includes('UBU_DB_PATH'));
});
test('C port refusal names the port and the three listeners to stop, not raw socket errors',async()=>{
  const handlers={},canary=secret();const server={once(name,callback){handlers[name]=callback;},listen(){handlers.error(Error(canary));}};
  await assert.rejects(bindForwarder(server,54321),error=>{const line=failureLine(error);return line.includes('54321')&&line.includes('acceptance.sh')&&line.includes('run-live.sh')&&!line.includes(canary);});
});
test('C each known reason has a remedy; unknown error content is never made public',()=>{
  for(const code of Object.keys(REMEDIES)){const line=failureLine(new RehearsalFault(code));assert(line.startsWith(code+': '));assert(line.includes('Remedy: '));assert.equal(line.split('\n').length,2);}
  const canary=secret();assert(!failureLine(Error(canary)).includes(canary));assert(!failureLine(new RehearsalFault('required_configuration_missing',{variables:[canary]})).includes(canary));
});
test('C startup stderr is bounded, secret-path scrubbed, then permanently dropped at health',()=>{
  const canary=secret(),buffer=startupBuffer([canary],128);buffer.add('x'.repeat(200));buffer.add('\n'+canary+'\nlocal startup error');assert(!buffer.lines().includes(canary));assert(buffer.lines().includes('local startup error'));
  buffer.clear();buffer.add(secret());assert.equal(buffer.lines(),'');
});
test('C success and refusal replace the same public artifact atomically with owner-only permissions',async()=>{
  const fs=fakeFiles(),env={UBU_REHEARSAL_OUTPUT:secret()},cwd='/tmp/'+secret();
  const success=await writePublicArtifact('BEGIN LIVE REHEARSAL COPY-BACK\nEND LIVE REHEARSAL COPY-BACK\n',{env,cwd,fs});
  const refusal=await finishFailure(new RehearsalFault('terminal_required'),{env,cwd,fs,print:()=>{}});
  assert.equal(success,refusal);assert.equal(fs.writes.length,2);assert.equal(fs.writes[0].options.mode,0o600);assert.equal(fs.writes[0].options.flag,'wx');assert(fs.writes[1].text.startsWith('terminal_required:'));
  assert.equal(fs.moves.length,2);
});
test('C public artifact cannot overwrite credential/token/store paths; unwritable destinations are diagnosed',async()=>{
  const env=fakeEnv();env.UBU_REHEARSAL_OUTPUT=env.UBU_GOOGLE_TOKEN_CACHE_PATH;
  await assert.rejects(writePublicArtifact('public',{env,fs:fakeFiles()}),error=>error.code==='copy_back_unwritable');
  const prints=[];const result=await finishFailure(new RehearsalFault('terminal_required'),{fs:fakeFiles({writeFails:true}),print:text=>prints.push(text)});
  assert.equal(result,null);assert(prints.some(line=>line.startsWith('copy_back_unwritable:')));
});
const {PrivateRenderer,conditionWords,PRIVATE_BANNER}=await import('./live-rehearsal-private.mjs');
test('D private title, condition word, diagnostic message and risk detail never reach public render',()=>{
  const title=secret(),word=secret(),message=secret(),detail=secret(),screen=[],privateView=new PrivateRenderer({print:text=>screen.push(text)}),report=new PublicReport(e);
  const records=[
    {label:'plan',result:{status:200,data:{status:'admitted',plan:{steps:[{summary:title,start_at:'2026-10-07T10:00:00Z',end_at:'2026-10-07T11:00:00Z',static_anchor:false}]},diagnostics:[{code:'static_task_collision',message}],risk_report:{level:'high',findings:[{category:'deadline_risk',severity:'high',blocking:true,detail}]}}}},
    {label:'requirement_readback',result:{status:200,data:{payload:{preconditions:{target:word,predicate:'equals',expected:true}}}}},
    {label:'queue',result:{status:200,data:{candidates:[{candidate:{candidate_kind:'universe_target',normalized_proposal:{target:word}}},{candidate:{candidate_kind:'precondition',normalized_proposal:{target:word,predicate:'absent'}}}]}}}
  ];
  for(const record of records){report.observe(record);const before=report.render();privateView.observe(record);assert.equal(report.render(),before);}
  const output=report.render();for(const canary of [title,word,message,detail]){assert(screen.join('\n').includes(canary));assert(!output.includes(canary));assert(privateView.knownContent.has(canary));}
  assert(screen.includes(PRIVATE_BANNER));
});
test('D private condition rendering preserves nested meaning and existing numeric vocabulary',()=>{
  const target=secret(),numeric='numeric_values.'+secret();
  assert.equal(conditionWords({target,predicate:'equals',expected:'x'}),target+' is "x"');
  assert.equal(conditionWords({target,predicate:'member_of',expected:[1,2]}),target+' is one of [1,2]');
  assert.equal(conditionWords({all_of:[{target,predicate:'absent'},{any_of:[{target:numeric,predicate:'at_least',expected:7},{target:numeric,predicate:'less_than',expected:9}]}]}),`(${target} is not set and (${numeric} is at least 7 or ${numeric} is less than 9))`);
});
test('D preview summaries/windows and excluded-work explanations are privately visible before approval',()=>{
  const canary=secret(),screen=[],renderer=new PrivateRenderer({print:text=>screen.push(text)});
  renderer.observe({label:'plan',result:{data:{plan:{steps:[]},unplaced_tasks:[{summary:canary,reason:'outside_allowed_window',explanation:canary,safe_alternatives:[{label:canary,resulting_change_summary:canary}]}]}}});
  renderer.observe({label:'preview',result:{data:{operations:[{kind:'delete',summary:canary},{kind:'update',static_anchor:false,event:{summary:canary,start_at:'2026-10-07T10:00:00Z',end_at:'2026-10-07T11:00:00Z'}}]}}});
  assert(screen.some(line=>line.includes('outside_allowed_window')));assert(screen.some(line=>line.includes('delete: '+canary)));assert(screen.some(line=>line.includes('Dynamic')&&line.includes('10:00')));
});
test('final transport faults retain a safe specific diagnosis and no private exception text',async()=>{
  const {TransportError}=await import('./loopback-json.mjs');let fault;
  try {await runActions({endpoints:e,call:async()=>{throw new TransportError('invalid_json');}});}catch(error){fault=error;}
  assert(failureLine(fault).includes('invalid_json'));assert(failureLine(fault).includes('action: session'));
});
test('private API error messages are visible on screen and credential path spellings are scrubbed',()=>{
  const path='/'+secret()+'"'+secret(),message=secret(),screen=[],privateView=new PrivateRenderer({credentialPaths:[path],print:text=>screen.push(text)}),report=new PublicReport(e);
  const record={label:'capture',result:{status:400,error:'unexpected_status',data:{error:message+' '+JSON.stringify(path)}}};
  report.observe(record);privateView.observe(record);assert(screen.join('\n').includes(message));assert(!screen.join('\n').includes(JSON.stringify(path).slice(1,-1)));assert(!report.render().includes(message));
});
test('public artifact filesystem smoke overwrites only its file, uses 0600 and leaves no temporary transcript',async()=>{
  const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');
  const cwd=await fs.mkdtemp(path.join(os.tmpdir(),'ubu-public-artifact-'));
  try {
    const first=await writePublicArtifact('BEGIN LIVE REHEARSAL COPY-BACK\nEND LIVE REHEARSAL COPY-BACK\n',{cwd});
    await finishFailure(new RehearsalFault('terminal_required'),{cwd,print:()=>{}});
    assert.equal(await fs.readFile(first,'utf8'),failureLine(new RehearsalFault('terminal_required')));
    assert.equal((await fs.stat(first)).mode&0o777,0o600);
    assert.deepEqual(await fs.readdir(cwd),['live-rehearsal-copy-back.txt']);
  }finally{await fs.rm(cwd,{recursive:true,force:true});}
});

const {validSetting,validSubject,validAuthoringInputs,routineBody,ADVISORY_LIMIT,INPUT_RULES}=await import('./live-rehearsal-contract.mjs');
const {checkSourceAgreement,assertSettingsAgreement,emittedCodes,assertCodesAgreement}=await import('./check-live-rehearsal-contract.mjs');
const {readFile}=await import('node:fs/promises');
test('A and C current source agrees with the settings gate, validation fingerprints and closed code file',async()=>{
  const result=await checkSourceAgreement();assert.equal(result.settings,6);assert.equal(result.prefixes,2);assert(result.codes>100);
});
test('A source additions, removals, aliases, prefixes and reserved roots fail agreement',async()=>{
  const source=await readFile(new URL('../../ubu-orchestrator/src/services/setting_authoring.rs',import.meta.url),'utf8');
  const subjects=await readFile(new URL('../../ubu-orchestrator/src/services/subject_vocabulary.rs',import.meta.url),'utf8');
  for(const change of [s=>s.replace('"advisory.model" |','"advisory.invented" | "advisory.model" |'),
    s=>s.replace('"advisory.model" |',''),s=>s.replace('"advisory.timeout_ms"','"advisory.invented_timeout"'),
    s=>s.replace('"calendar.color."','"invented.colour."')])assert.throws(()=>assertSettingsAgreement(change(source),subjects));
  assert.throws(()=>assertSettingsAgreement(source,subjects.replace('"universe.subject."','"invented.subject."')));
  assert.throws(()=>assertSettingsAgreement(source,subjects.replace('"facts",','"invented_reserved",')));
});
test('A all setting families enforce their Rust value, endpoint and root rules',()=>{
  for(const [name,value] of [['advisory.model','invented-model'],['advisory.endpoint','http://127.0.0.1:11434'],
    ['advisory.timeout_ms',5000],['advisory.timeout_ms',3600000],['planning.gpu_enabled',true],['planning.gpu_enabled',false],
    ['advisory.review_seed_days',1],['advisory.review_ceiling_days',365],['calendar.color.invented category-2','11'],
    ['calendar.color.\ufeff','1'],['universe.subject.invented_subject_2',true]])assert(validSetting(name,value),name);
  for(const [name,value] of [['advisory.enabled',true],['advisory.model','\u0085'],['advisory.endpoint','http://localhost:1'],
    ['advisory.endpoint','http://127.0.0.1:0'],['advisory.endpoint','http://127.0.0.1:65536'],['advisory.endpoint','http://127.0.0.1:1/path'],
    ['advisory.endpoint','https://127.0.0.1:1'],['advisory.timeout_ms',4999],['advisory.timeout_ms',3600001],
    ['advisory.timeout_ms','5000'],['planning.gpu_enabled',1],['advisory.review_seed_days',1.5],['advisory.review_ceiling_days',366],
    ['calendar.color.\u0085','1'],['calendar.color.invented',1],['calendar.color.invented','12'],
    ['universe.subject.invented_subject',false]])assert(!validSetting(name,value),name);
  for(const root of ['facts','numeric_values','set_memberships','event_markers','affect','operator','project','github','relationship','Invented','invented__root','invented_','2invented','é','a'.repeat(65)])assert(!validSubject(root),root);
  assert(validSubject('a'.repeat(64)));
});
test('A review pairs follow supplied order and fresh-store defaults; duplicate subjects are refused',()=>{
  assert.equal(validAuthoringInputs({settings:[{name:'advisory.review_seed_days',value:1},{name:'advisory.review_ceiling_days',value:1}]}),null);
  assert(validAuthoringInputs({settings:[{name:'advisory.review_ceiling_days',value:1}]}));
  assert(validAuthoringInputs({settings:[{name:'advisory.review_ceiling_days',value:10},{name:'advisory.review_seed_days',value:11}]}));
  assert(validAuthoringInputs({settings:[{name:'universe.subject.invented',value:true}],subjects:['invented']}));
});
test('A unsupported supplied setting stops before any action and never exposes private input',async()=>{
  let calls=0;const canary=secret();
  await assert.rejects(runActions({endpoints:e,inputs:{settings:[{name:'advisory.enabled',value:canary}]},call:async()=>{calls++;}}),error=>error.code==='invalid_private_inputs'&&!failureLine(error).includes(canary));
  assert.equal(calls,0);
});
test('B routine composition fixes mode/category, supplies the third title field and preserves genuine values',()=>{
  const input={title:'Invented routine',mode:'one_time',schema_version:'invented',private_extra:secret(),
    recurrence:{timezone:'UTC',rule:{kind:'daily'}},routine_instance_template:{nominal_start:'23:00:00',duration_estimate:{type:'fixed',seconds:3600},placement:'static',category_tag:'invented'}};
  const body=routineBody(input,e.OBJECTIVE_SCHEMA_VERSION);
  assert.equal(body.mode,'evergreen');assert.equal(body.schema_version,e.OBJECTIVE_SCHEMA_VERSION);assert(!Object.hasOwn(body,'private_extra'));
  assert.equal(body.routine_instance_template.title,input.title);assert.deepEqual(body.routine_instance_template.tags,['invented']);assert.deepEqual(body.routine_instance_template.reminder_minutes,[]);
  assert.equal(body.routine_instance_template.duration_estimate,input.routine_instance_template.duration_estimate);assert.equal(body.recurrence,input.recurrence);
  assert(!Object.hasOwn(input.routine_instance_template,'tags'));
  input.routine_instance_template.tags=['invented','other'];input.routine_instance_template.title='Invented occurrence';
  assert.deepEqual(routineBody(input,'v').routine_instance_template.tags,['invented','other']);assert.equal(routineBody(input,'v').routine_instance_template.title,'Invented occurrence');
});
test('C code extraction covers constants, helpers, batches, branches and forwarded enums without messages',()=>{
  const canary='invented_private_'+secret().replaceAll('-','');
  const next='pub enum NextActionDiagnosticCode { NoReadyTask }';
  const source=`const INVENTED_CODE: &str = "invented_constant";
    fn refusal(code: &str, message: &str) {} fn go() {
      refusal(INVENTED_CODE,"${canary}");
      DiagnosticBody { code: "invented-dotted.code", message: "${canary}" };
      DiagnosticBody { code: if flag { "invented_branch_one" } else { "invented_branch_two" }, message: "${canary}" };
      let (code, message) = ("invented_tuple", "${canary}");
      let items = vec![("invented_batch", format!("{:?}", [("${canary}", 17)]))];
      AppError::bad_request_diagnostics("${canary}", items);
      json!({"code":"invented_json", "message":"${canary}"});
      DiagnosticBody { code: value["code"].into(), message: "${canary}" };
    } #[cfg(test)] mod tests { fn unused() { DiagnosticBody { code:"invented_test_only",message:"x" }; } }`;
  const actual=emittedCodes([next,source],'pub enum DiagnosticCode { SkeletonFailure }');
  assert.deepEqual(actual,['SkeletonFailure','invented-dotted.code','invented_batch','invented_branch_one','invented_branch_two','invented_constant','invented_json','invented_tuple','no_ready_task']);
  assert.throws(()=>assertCodesAgreement(actual,actual.filter(code=>code!=='invented_batch')));
  assert.throws(()=>assertCodesAgreement(actual,[...actual,'invented_stale_code']));
  assert.throws(()=>emittedCodes([next,'DiagnosticBody {code:format!("invented_{}", input),message:"x"}'],'pub enum DiagnosticCode { SkeletonFailure }'));
});
test('C newly known diagnostics stay named while genuinely unknown codes and all messages stay withheld',()=>{
  const report=new PublicReport(e),canary=secret();
  report.observe({label:'plan',result:{status:200,data:{diagnostics:[{code:'duration_model_observed',message:canary},{code:'SkeletonFailure',message:canary},{code:canary,message:canary}]}}});
  const output=report.render();assert(output.includes('"duration_model_observed":1'));assert(output.includes('"SkeletonFailure":1'));assert(output.includes('"withheld_unknown":1'));assert(!output.includes(canary));
});
test('D empty, missing and malformed planning collections have distinct named results',()=>{
  for(const field of ['blocked_tasks','invalid_tasks','unplaced_tasks'])for(const [value,expected] of [[[],0],[undefined,`missing_${field}`],[null,`invalid_${field}`]]) {
    const report=new PublicReport(e),data={};if(value!==undefined)data[field]=value;
    report.observe({label:'plan',result:{status:200,data}});assert(report.render().includes(`${field}: ${expected} (client-computed`));
  }
});
test('D producer selection is labelled as Tasks and carries the actual request limit',async()=>{
  const f=flow();await f.run();const report=new PublicReport(e);for(const record of f.records)report.observe(record);
  for(const producer of ['vocabulary','precondition']) {
    const record=f.records.find(r=>r.label===producer);assert.equal(record.requestLimit,ADVISORY_LIMIT);
    const line=report.render().split('\n').find(line=>line.includes(`producer=${producer}:`));assert(line.includes('selected_tasks:'));assert(line.includes(`request.limit: ${ADVISORY_LIMIT}`));
  }
});

test('P76 registry projection reports two tiers and the supplied roots counts without names or metadata content',async()=>{
  const f=flow();const canary=secret();
  f.responses.registry.settings[0].subject_metadata.references.extra=canary;
  f.responses.registry.settings[0].subject_metadata.minted_at=canary;
  f.responses.registry.settings.push({name:'universe.subject.workbench',value:true},{name:'universe.subject.invalid-root',value:true},{name:'universe.subject.operator',value:true},{name:'universe.subject.shelf',value:false});
  await f.run();const report=new PublicReport(e),privateLines=[];
  const privateView=new PrivateRenderer({print:line=>privateLines.push(line)});
  for(const record of f.records){report.observe(record);privateView.observe(record);}
  const output=report.render();
  assert(output.includes('governed_subjects: 5'));assert(output.includes('provisional_subjects: 2'));
  assert(output.includes('"universe_state_keys":2,"fact_provenance_keys":3,"task_precondition_targets":4'));
  assert(output.includes('ratification_condition: outstanding'));
  for(const privateText of [f.inputs.subjects[0],canary,'workbench','invalid-root','universe.subject.'])assert(!output.includes(privateText));
  assert(privateLines.join('\n').includes('Provisional subject '+f.inputs.subjects[0]));
  assert(privateView.knownContent.has(f.inputs.subjects[0]));
});
test('P76 changing one server reference count changes only its public count line',async()=>{
  const before=(await projected()).output.split('\n');
  for(const field of ['universe_state_keys','fact_provenance_keys','task_precondition_targets']) {
    const after=(await projected({mutate:r=>r.registry.settings[0].subject_metadata.references[field]++})).output.split('\n');
    const changed=after.filter((line,i)=>line!==before[i]);
    assert.equal(changed.length,1);assert(changed[0].startsWith(`GET ${e.SETTINGS_LIST_PATH} supplied provisional root[1] references:`));
  }
});
test('P76 missing or invalid registry metadata stops before advisory calls rather than inventing a count',async()=>{
  for(const mutate of [r=>delete r.registry.settings,r=>r.registry.settings=[],r=>delete r.registry.settings[0].subject_metadata,r=>r.registry.settings[0].subject_metadata.references.task_precondition_targets=-1,r=>r.registry.settings[0].subject_metadata.references.task_precondition_targets='private_count_canary',r=>r.registry.settings.push(r.registry.settings[0])]) {
    const f=flow({mutate});await assert.rejects(f.run(),error=>error.code==='subject_registry_unavailable');
    assert(!f.calls.some(call=>call.path===e.ADVISORY_RUN_PATH));
  }
});
test('P76 the live configuration requires one explicit root and subsequent authoring under it',()=>{
  const env=fakeEnv();assert(liveConfig(env,e));
  for(const inputs of [{},{subjects:[]},{subjects:['synthetic_shelf','synthetic_kettle']},{subjects:['synthetic_shelf'],mutations:[{operation:'set_fact',target:'facts.synthetic_kettle.ready',payload:true}]},{subjects:['synthetic_shelf'],mutations:[{operation:'clear_fact',target:'facts.synthetic_shelf.ready'}]}]) {
    assert.throws(()=>liveConfig({...env,UBU_REHEARSAL_INPUTS:JSON.stringify(inputs)},e),error=>error.code==='invalid_private_inputs');
  }
});
test('P76 every Setting family has its own driver and public label',async()=>{
  const f=flow();f.inputs.settings=[{name:'calendar.color.synthetic',value:'1'},{name:'advisory.model',value:'synthetic-model'},{name:'planning.gpu_enabled',value:true},{name:'universe.subject.workbench',value:true}];
  await f.run();assert.deepEqual(f.records.slice(1,5).map(record=>record.label),['colour_setting','advisory_setting','planning_setting','subject_setting']);
  const report=new PublicReport(e);for(const record of f.records)report.observe(record);
  const output=report.render();for(const family of ['calendar.color','advisory','planning','universe.subject'])assert(output.includes(`family=${family} HTTP: 200`));
  assert(!output.includes('planning.gpu_enabled'));assert(!output.includes('synthetic-model'));assert(!output.includes('workbench'));
});
test('P76 an empty effective registry is satisfied only for now and neither admits nor retires anything',()=>{
  const report=new PublicReport(e);report.observe({label:'registry',subjects:[],result:{status:200,data:{settings:[]}}});
  const output=report.render();assert(output.includes('provisional_subjects: 0'));assert(output.includes('ratification_condition: satisfied_for_now'));assert(output.includes('evaluated at the switch, not banked'));
});

test('P77 structural input faults identify fields before any action',async()=>{
  for(const [inputs,field,rule] of [
    [null,'inputs','object_required'],[[],'inputs','object_required'],
    [{settings:{}},'settings','array_required'],[{subjects:{}},'subjects','array_required'],
    [{mutations:{}},'mutations','array_required'],[{settings:[null]},'settings[0]','setting_object_required']
  ]) {
    assert.deepEqual(validAuthoringInputs(inputs),{field,rule});
    let calls=0;
    await assert.rejects(runActions({endpoints:e,inputs,call:async()=>{calls++;}}),error=>{
      const line=failureLine(error);return line.includes('field: '+field)&&line.includes('rule: '+rule)&&line.includes('Remedy:');
    });assert.equal(calls,0);
  }
});
test('P77 Setting refusals distinguish name and value rules without disclosing either',()=>{
  const canary=secret();
  for(const [name,value,field,rule] of [
    [null,canary,'name','setting_name_required'],[canary,canary,'name','setting_name_supported'],
    ['universe.subject.'+canary,true,'name','subject_root_valid'],['universe.subject.synthetic_p77',canary,'value','subject_true_required'],
    ['calendar.color.\u0085',canary,'name','colour_category_nonblank'],['calendar.color.'+canary,canary,'value','colour_id_1_to_11'],
    ['planning.gpu_enabled',canary,'value','boolean_required'],['advisory.timeout_ms',canary,'value','timeout_ms_5000_to_3600000'],
    ['advisory.review_seed_days',canary,'value','review_days_1_to_365'],['advisory.model','\u0085','value','text_nonblank'],
    ['advisory.endpoint',canary,'value','loopback_origin']
  ]) {
    const fault=validAuthoringInputs({settings:[{name:'planning.gpu_enabled',value:true},{name,value}]});
    assert.deepEqual(fault,{field:'settings[1].'+field,rule});
    const line=failureLine(new RehearsalFault('invalid_private_inputs',fault));
    assert(line.includes('field: settings[1].'+field));assert(line.includes('rule: '+rule));assert(!line.includes(canary));
  }
});
test('P77 review ordering and duplicate roots name the specific failing array entry',()=>{
  for(const [inputs,field,rule] of [
    [{settings:[{name:'advisory.review_ceiling_days',value:1}]},'settings[0].value','review_seed_le_ceiling'],
    [{settings:[{name:'universe.subject.synthetic_p77',value:true},{name:'universe.subject.synthetic_p77',value:true}]},'settings[1].name','subject_unique'],
    [{subjects:['synthetic_p77','synthetic_p77']},'subjects[1]','subject_unique'],
    [{subjects:['invalid-root']},'subjects[0]','subject_root_valid'],
    [{settings:[{name:'universe.subject.synthetic_p77',value:true}],subjects:['synthetic_p77']},'subjects[0]','subject_unique']
  ])assert.deepEqual(validAuthoringInputs(inputs),{field,rule});
});
test('P77 live JSON and required root/write faults retain precise safe context',()=>{
  const env=fakeEnv();
  for(const [raw,field,rule] of [
    ['{','inputs','json_required'],['null','inputs','object_required'],
    [JSON.stringify({}),'subjects','one_subject_required'],
    [JSON.stringify({subjects:['synthetic_p77']}),'mutations','subject_mutation_write_required'],
    [JSON.stringify({subjects:['synthetic_p77'],mutations:[{operation:'clear_fact',target:'facts.synthetic_p77.ready'}]}),'mutations','subject_mutation_write_required']
  ])assert.throws(()=>liveConfig({...env,UBU_REHEARSAL_INPUTS:raw},e),error=>{
    assert.deepEqual(error.context,{field,rule});const line=failureLine(error);
    return error.code==='invalid_private_inputs'&&line.includes('field: '+field)&&line.includes('rule: '+rule);
  });
});
test('P77 public refusal context refuses arbitrary fields and rule strings',()=>{
  const canary=secret();
  for(const field of [canary,'settings[2].'+canary,'subjects['+canary+']','mutations.'+canary]) {
    const line=failureLine(new RehearsalFault('invalid_private_inputs',{field,rule:canary}));assert(!line.includes(canary));
  }
  const line=failureLine(new RehearsalFault('invalid_private_inputs',{field:'settings[2].value',rule:'boolean_required',value:canary,name:canary}));
  assert(line.includes('settings[2].value'));assert(line.includes('boolean_required'));assert(!line.includes(canary));
});
test('P77 all environment facts and both interpreter sources remain closed while details stay private',()=>{
  const facts=['python_unavailable','interpreter_start_failed','module_root_unavailable','module_package_unavailable','probe_budget_invalid','probe_timed_out','probe_failed','torch_unavailable','torch_version_mismatch'];
  const sources=['planning_worker_python_environment_variable','planning_worker_python3_fallback'];
  for(const source of sources) {
    const interpreter=secret(),version=secret(),screen=[];
    const diagnostics=[{code:source,message:`interpreter=${interpreter}; version=${version}`},...facts.map(fact=>({code:'planning_gpu_fallback_'+fact,message:interpreter}))];
    const record={label:'plan',result:{status:200,data:{diagnostics}}};
    const report=new PublicReport(e),privateView=new PrivateRenderer({print:line=>screen.push(line)});
    report.observe(record);privateView.observe(record);const output=report.render();
    for(const code of [source,...facts.map(fact=>'planning_gpu_fallback_'+fact)])assert(output.includes(`"${code}":1`));
    assert(!output.includes('withheld_unknown'));assert(!output.includes(interpreter));assert(!output.includes(version));
    assert(screen.join('\n').includes(interpreter));assert(screen.join('\n').includes(version));
  }
});

const {certificationLocations,CERTIFICATION_FIELDS}=await import('./live-rehearsal-report.mjs');
test('P78 closed certification fields and bounds agree with the kernel declaration',async()=>{
  const source=await readFile(new URL('../../ubu-planning-kernel/crates/ubu-planning-worker/src/stage1.rs',import.meta.url),'utf8');
  const body=/pub struct StageOutput\s*\{([^}]+)\}/.exec(source)[1];
  assert.deepEqual([...body.matchAll(/pub\s+([a-z_]+)\s*:/g)].map(m=>m[1]),CERTIFICATION_FIELDS);
  assert.equal(Number(/pub const MAX_CANDIDATES: usize = (\d+)/.exec(source)[1]),16);
  assert.equal(Number(/pub const MAX_PLANNING_TASKS: usize = (\d+)/.exec(source)[1]),256);
});
test('P78 every certification field retains code, indices and count while values remain private',()=>{
  for(const [index,field] of CERTIFICATION_FIELDS.entries()) {
    const expected=secret(),actual=secret(),candidate_index=index<11?3:null,slot_index=index<6?120:null;
    const code='planning_gpu_fallback_certification_failed_'+field;
    const metadata={field,candidate_index,slot_index,diverging_fields:4,expected,actual,extra:secret()};
    const record={label:'plan',result:{status:200,data:{diagnostics:[{code,message:JSON.stringify(metadata)}]}}};
    const report=new PublicReport(e),screen=[],view=new PrivateRenderer({print:line=>screen.push(line)});
    report.observe(record);view.observe(record);const output=report.render();
    assert(output.includes(`"${code}":1`));assert(!output.includes('withheld_unknown'));
    assert.deepEqual(certificationLocations(record.result.data.diagnostics),[{field,candidate_index,slot_index,diverging_fields:4}]);
    assert(output.includes('"diverging_fields":4'));assert(!output.includes(expected));assert(!output.includes(actual));assert(!output.includes(metadata.extra));
    assert(screen.join('\n').includes(expected));assert(screen.join('\n').includes(actual));
  }
});
test('P78 malformed or inconsistent certification metadata never manufactures a location',()=>{
  const field='task_index',code='planning_gpu_fallback_certification_failed_'+field,valid={field,candidate_index:0,slot_index:0,diverging_fields:1};
  for(const message of ['private-message',JSON.stringify({}),...[
    {field:secret()},{candidate_index:secret()},{candidate_index:-1},{candidate_index:17},{slot_index:257},{slot_index:secret()},{diverging_fields:0},{diverging_fields:14},{diverging_fields:secret()}
  ].map(change=>JSON.stringify({...valid,...change}))])assert.deepEqual(certificationLocations([{code,message}]),[{field,location:'unavailable'}]);
  assert.deepEqual(certificationLocations([{code:secret(),message:JSON.stringify(valid)}]),[]);
  assert.deepEqual(certificationLocations([{code,message:JSON.stringify({...valid,candidate_index:16,slot_index:null})}]),[{field,candidate_index:16,slot_index:null,diverging_fields:1}]);
});
test('P78 one-field metadata changes alter only their dependent public location line',()=>{
  function project(metadata){const report=new PublicReport(e);report.observe({label:'plan',result:{status:200,data:{diagnostics:[{code:'planning_gpu_fallback_certification_failed_duration_samples',message:JSON.stringify(metadata)}]}}});return report.render().split('\n');}
  const base={field:'duration_samples',candidate_index:1,slot_index:2,diverging_fields:3,expected:secret(),actual:secret()};
  const original=project(base);
  for(const field of ['candidate_index','slot_index','diverging_fields']) {
    const changed=project({...base,[field]:base[field]+1});const indices=original.flatMap((line,i)=>line===changed[i]?[]:[i]);
    assert.equal(indices.length,1);assert(original[indices[0]].includes('certification metadata:'));
  }
  assert.deepEqual(project({...base,expected:secret(),actual:secret()}),original);
});
test('P78 existing backend provenance is a closed public projection with private version/device withheld',()=>{
  for(const kind of ['cpu_reference','gpu_worker','mobile_cpu','mobile_gpu',secret()]) {
    const version=secret(),device=secret(),report=new PublicReport(e);
    report.observe({label:'plan',result:{status:200,data:{engine_provenance:{backend_kind:kind,framework_version:version,device_summary:device}}}});
    const output=report.render();assert(output.includes('engine_provenance.backend_kind: '+(['cpu_reference','gpu_worker','mobile_cpu','mobile_gpu'].includes(kind)?kind:'withheld_or_unavailable')));
    assert(!output.includes(version));assert(!output.includes(device));
  }
});

test('P80 a late failure preserves completed capture, planning and approval before the fault',async()=>{
  const canary=secret(),f=flow({approve:true,mutate:r=>{r.vocabulary.status='failed';r.vocabulary.diagnostics=[{code:'advisory_http_failed',message:canary}];}});
  let fault;try{await f.run();}catch(error){fault=error;}
  assert.equal(fault.code,'advisory_run_failed');
  const report=new PublicReport(e);for(const record of f.records)report.observe(record);
  const fs=fakeFiles();await finishFailure(fault,{report,fs,env:{UBU_REHEARSAL_OUTPUT:'/synthetic-copy-back'},print:()=>{}});
  const text=fs.writes[0].text;
  assert(text.startsWith('BEGIN LIVE REHEARSAL COPY-BACK'));
  assert(text.includes(`${e.CALENDAR_CAPTURE_PATH} captured: 4`));
  assert(text.includes('plan.steps: 3'));assert(text.includes('operation_results: 4'));
  assert(text.includes('producer=vocabulary: status: failed'));
  assert(text.includes(`${e.ADVISORY_RUN_PATH}: unavailable; action not observed`));
  for(let i=1;i<=3;i++)assert(text.includes(`answer ${i}: unavailable`));
  assert(text.indexOf('END LIVE REHEARSAL COPY-BACK')<text.lastIndexOf('advisory_run_failed:'));
  assert(text.includes('response status: failed'));assert(text.includes('"advisory_http_failed":1'));
  assert(!text.includes(canary));assert(!JSON.stringify(fault.context).includes(canary));
});
test('P80 response causes and failure context withhold arbitrary status, codes and messages',async()=>{
  const {responseCause}=await import('./live-rehearsal-report.mjs');const canary=secret();
  const cause=responseCause({status:200,data:{status:canary,diagnostics:[{code:canary,message:canary},{code:'advisory_http_failed',message:canary}]}});
  assert.deepEqual(cause,{status:200,diagnostic_codes:{withheld_unknown:1,advisory_http_failed:1}});
  const line=failureLine(new RehearsalFault('advisory_run_failed',{...cause,response_status:canary,diagnostic_codes:{[canary]:2,advisory_http_failed:1},message:canary}));
  assert(!line.includes(canary));assert(line.includes('"advisory_http_failed":1'));
});

function readyEnv() {
  const env=fakeEnv(),inputs=JSON.parse(env.UBU_REHEARSAL_INPUTS);
  inputs.settings=[{name:'advisory.endpoint',value:'http://127.0.0.1:11434'},{name:'advisory.model',value:'synthetic-model:latest'}];
  env.UBU_REHEARSAL_INPUTS=JSON.stringify(inputs);return env;
}
const readyWorker=async()=>({importable:true,version:'2.6.0+cpu',import_warning_count:0});
test('P80 pre-flight checks the final private model setting and worker without writes or a binary build',async()=>{
  const env=readyEnv();delete env.UBU_REHEARSAL_BINARY;const fs=fakeFiles(),calls=[];
  const inputs=JSON.parse(env.UBU_REHEARSAL_INPUTS);inputs.settings.push({name:'advisory.model',value:'synthetic-final'});env.UBU_REHEARSAL_INPUTS=JSON.stringify(inputs);
  const facts=await checkInputs({env,endpoints:e,fs,queryModels:async endpoint=>{calls.push(endpoint);return {status:200,data:{models:[{name:'synthetic-final:latest'}]}};},probeWorker:async()=>{calls.push('worker');return readyWorker();}});
  assert.deepEqual(calls,['http://127.0.0.1:11434','worker']);assert.equal(facts.torchVersion,'2.6.0+cpu');assert.equal(fs.writes.length,0);assert.equal(fs.moves.length,0);
});
test('P80 pre-flight refuses each absent or exported-empty required variable before live effects',async()=>{
  const required=['UBU_DB_PATH','UBU_GOOGLE_CALENDAR_ID','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_REHEARSAL_INPUTS','UBU_PLANNING_WORKER_PYTHON','UBU_PLANNER_STRATEGY'];
  for(const variable of required)for(const value of [undefined,'']) {
    const env={...readyEnv(),[variable]:value};let effects=0;
    await assert.rejects(checkInputs({env,endpoints:e,fs:fakeFiles(),queryModels:async()=>{effects++;},probeWorker:async()=>{effects++;}}),error=>error.code==='required_configuration_missing'&&failureLine(error).includes(variable));
    assert.equal(effects,0);
  }
});
test('P80 pre-flight stops at one model readiness cause and withholds model/error strings',async()=>{
  const canary=secret();
  for(const [queryModels,check] of [[async()=>{throw Error(canary);},'endpoint answers'],[async()=>({status:503,data:{error:canary}}),'endpoint answers'],[async()=>({status:200,data:{models:[{name:canary}]}}),'model present']]) {
    let probes=0;await assert.rejects(checkInputs({env:readyEnv(),endpoints:e,fs:fakeFiles(),queryModels,probeWorker:async()=>{probes++;}}),error=>{const line=failureLine(error);return line.includes(check)&&!line.includes(canary);});assert.equal(probes,0);
  }
  const env=readyEnv(),inputs=JSON.parse(env.UBU_REHEARSAL_INPUTS);inputs.settings=[];env.UBU_REHEARSAL_INPUTS=JSON.stringify(inputs);
  await assert.rejects(checkInputs({env,endpoints:e,fs:fakeFiles(),queryModels:async()=>{throw Error('must not query');},probeWorker:readyWorker}),error=>failureLine(error).includes('endpoint configured'));
});
test('P80 pre-flight requires a quiet compatible worker and a fresh writable store',async()=>{
  for(const facts of [{importable:false,version:null,import_warning_count:0},{importable:true,version:secret(),import_warning_count:0},{importable:true,version:'2.6.0+cpu',import_warning_count:1}]) {
    await assert.rejects(checkInputs({env:readyEnv(),endpoints:e,fs:fakeFiles(),queryModels:async()=>({status:200,data:{models:[{model:'synthetic-model:latest'}]}}),probeWorker:async()=>facts}),error=>failureLine(error).includes('worker module and pinned torch'));
  }
  const env=readyEnv();let calls=0;
  await assert.rejects(checkInputs({env,endpoints:e,fs:fakeFiles({present:[env.UBU_DB_PATH+'-wal']}),queryModels:async()=>{calls++;},probeWorker:async()=>{calls++;}}),error=>error.code==='fresh_store_required');assert.equal(calls,0);
  for(const value of ['', '0', '30001', 'synthetic-invalid'])await assert.rejects(checkInputs({env:{...readyEnv(),UBU_PLANNING_WORKER_PROBE_TIMEOUT_MS:value},endpoints:e,fs:fakeFiles(),queryModels:async()=>{throw Error('must not query');},probeWorker:readyWorker}),error=>failureLine(error).includes('probe budget 1 to 30000'));
});

test('P80 all response-backed sibling refusals retain HTTP and diagnostic counts; approval exceptions invent none',async()=>{
  const branches=[
    ['session','calendar_session_unavailable',{enabled:false}],
    ['vocabulary','advisory_run_failed',{status:'worker_error'}],
    ['precondition','advisory_run_failed',{status:'malformed_result'}],
    ['preview','preview_unavailable',{stale:true}],
    ['task_read','task_unavailable',{version:null,is_routine_occurrence:true}],
    ['task_lookup','task_selector_unavailable',{tasks:[]}],
    ['registry','subject_registry_unavailable',{settings:[]}]
  ];
  const canary=secret();
  for(const [failing,code,override] of branches) {
    let last;
    const data={enabled:true,preview_id:'synthetic-preview',stale:false,status:'ok',version:1,payload:{},tasks:[{task_id:'synthetic-task',is_routine_occurrence:false}],settings:[{name:'universe.subject.synthetic_p80',value:true,subject_metadata:{references:{universe_state_keys:0,fact_provenance_keys:0,task_precondition_targets:0}}}]};
    const call=async(method,path,body)=>{
      last=path===e.GOOGLE_CALENDAR_SESSION_PATH?'session':path===e.CALENDAR_PREVIEW_PATH?'preview':path===e.SETTINGS_LIST_PATH?'registry':path===e.ADVISORY_RUN_PATH?body.producer:path.startsWith(e.TASK_LIST_PATH+'?')?'task_lookup':path===e.TASK_PATH.replace('{task_id}','synthetic-task')?'task_read':null;
      return {status:200,data:last===failing?{...data,...override,diagnostics:[{code:'advisory_http_failed',message:canary},{code:canary,message:canary}]}:data};
    };
    await assert.rejects(runActions({endpoints:e,inputs:{subjects:['synthetic_p80'],task:{id:'synthetic-task'},precondition:{target:'facts.synthetic_p80.ready',predicate:'absent'}},call,approve:async()=>false}),error=>{
      assert.equal(error.code,code);assert.equal(error.context.status,200);assert.deepEqual(error.context.diagnostic_codes,{advisory_http_failed:1,withheld_unknown:1});
      assert(!JSON.stringify(error.context).includes(canary));return true;
    });
  }
  await assert.rejects(runActions({endpoints:e,call:async()=>({status:200,data:{enabled:true,stale:false,preview_id:'synthetic-preview'}}),approve:async()=>{throw Error(canary);}}),error=>{
    assert.equal(error.code,'approval_interrupted');assert.deepEqual(error.context,{action:'approval'});return true;
  });
});
test('P80 report routes remain existing paths and the stand-in marker agrees exactly with its producer',async()=>{
  const {REPORT_ROUTES,BOOTSTRAP_AFFECT_MARKER}=await import('./live-rehearsal-report.mjs');
  const spec=JSON.parse(await readFile(new URL('../../ubu-orchestrator/openapi/openapi.generated.json',import.meta.url),'utf8'));
  for(const route of [...Object.values(REPORT_ROUTES),e.TIME_BY_CATEGORY_PATH])assert(spec.paths[route]?.get);
  assert.equal(Object.keys(spec.paths).length,57);
  const source=await readFile(new URL('../../ubu-orchestrator/src/reports/planning_analysis.rs',import.meta.url),'utf8');
  const block=/const RECORD_AFFECT_SUGGESTION: &str = concat!\(([\s\S]*?)\);/.exec(source)[1];
  assert.equal([...block.matchAll(/"(?:\\.|[^"\\])*"/g)].map(m=>JSON.parse(m[0])).join(''),BOOTSTRAP_AFFECT_MARKER);
  assert(source.includes('suggestions.insert(0, RECORD_AFFECT_SUGGESTION.to_owned())'));
});
test('P80 closed report projection retains enums and counts while withholding all prose, names and affect values',async()=>{
  const {BOOTSTRAP_AFFECT_MARKER,affectFigureKind}=await import('./live-rehearsal-report.mjs');
  const canary=secret(),report=new PublicReport(e),q={checkpoint_coverage:'adequate',failure_pattern:'wrong_estimates',violated_dimensions:[canary],affect_margin:12.3456789,revision_suggestions:[BOOTSTRAP_AFFECT_MARKER,canary]};
  report.observe({label:'plan',result:{status:200,data:{human_complete_plan_quality:q}}});
  report.observe({label:'risk_read',result:{status:200,data:{level:'high',findings:[{category:'deadline_risk',severity:'high',blocking:true,detail:canary,subject_ref:canary}]}}});
  report.observe({label:'human_complete',result:{status:200,data:{completed_tasks:3,task_statuses:[{status:'completed',count:3}],notes:[canary]}}});
  report.observe({label:'time_by_category',result:{status:200,data:{total_seconds:120,categories:[{category:canary,seconds:120,static_seconds:90,completed_seconds:30,task_count:2}],unmeasured:[{task_id:canary,title:canary,reason:canary}]}}});
  const output=report.render();assert(output.includes('checkpoint_coverage: adequate'));assert(output.includes('failure_pattern: wrong_estimates'));assert(output.includes('violated_dimensions.count: 1'));assert(output.includes('affect_figures: stand_in'));
  assert(output.includes('/reports/risk level: high'));assert(output.includes('/reports/human-complete completed_tasks: 3'));assert(output.includes('total_seconds: 120'));assert(output.includes('unmeasured.count: 1'));
  assert(!output.includes(canary));assert(!output.includes(BOOTSTRAP_AFFECT_MARKER));assert(!output.includes('12.3456789'));
  assert.equal(affectFigureKind({revision_suggestions:[canary]}),'not_marked_as_stand_in');assert.equal(affectFigureKind({}),'unavailable');
});

test('P81 seeded ranking is deterministic, listing-order independent and does not mutate inputs',()=>{
  const ids=Array.from({length:12},(_,i)=>`invented-rank-${i}`),before=[...ids];
  const first=rankingStatements(ids,{seed:7,layers:4});
  assert.deepEqual(rankingStatements(ids,{seed:7,layers:4}),first);
  assert.deepEqual(rankingStatements([...ids].reverse(),{seed:7,layers:4}),first);
  assert.notDeepEqual(rankingStatements(ids,{seed:8,layers:4}).statements,first.statements);
  assert.deepEqual(ids,before);
  assert.deepEqual(shuffle(ids,mulberry32(7)),shuffle([...ids].reverse(),mulberry32(7)));
  for(const seed of [0,7,4294967295]){const random=mulberry32(seed);for(let i=0;i<100;i++){const value=random();assert(value>=0&&value<1);}}
});
test('P81 balanced buckets produce exactly the within-bucket chains and adjacent first-member edges',()=>{
  for(const [n,layers] of [[0,1],[1,64],[2,1],[2,64],[7,3],[12,4],[10,64],[65,64]]) {
    const ids=Array.from({length:n},(_,i)=>`invented-rank-${String(i).padStart(2,'0')}`),{buckets,statements}=rankingStatements(ids,{seed:7,layers});
    assert.equal(buckets.length,Math.min(n,layers));assert.equal(statements.length,Math.max(0,n-1));
    assert.deepEqual(buckets.flat().sort(),ids);
    if(buckets.length)assert(Math.max(...buckets.map(b=>b.length))-Math.min(...buckets.map(b=>b.length))<=1);
    const expected=[];
    for(const bucket of buckets)for(let i=1;i<bucket.length;i++)expected.push({task_a:bucket[i-1],task_b:bucket[i],order:'a_indifferent_to_b'});
    for(let p=1;p<buckets.length;p++)expected.push({task_a:buckets[p-1][0],task_b:buckets[p][0],order:'a_preferred_to_b'});
    assert.deepEqual(statements,expected);
    for(const statement of statements){assert(ids.includes(statement.task_a));assert(ids.includes(statement.task_b));assert.notEqual(statement.task_a,statement.task_b);}
  }
});
test('P81 ranking has exactly three safe input rules and pre-flight rejects it before effects',async()=>{
  const cases=[
    ...[null,[],true,'private', {seed:7,layers:4,private:secret()}].map(ranking=>[ranking,'ranking','ranking_object_required']),
    ...[undefined,-1,4294967296,1.5,'7',NaN,Infinity].map(seed=>[{seed,layers:4},'ranking.seed','ranking_seed_u32']),
    ...[undefined,0,65,1.5,'4',NaN,Infinity].map(layers=>[{seed:7,layers},'ranking.layers','ranking_layers_1_to_64'])
  ];
  for(const [ranking,field,rule] of cases) {
    assert.deepEqual(validAuthoringInputs({ranking}),{field,rule});
    const env=readyEnv(),inputs=JSON.parse(env.UBU_REHEARSAL_INPUTS);inputs.ranking=ranking;env.UBU_REHEARSAL_INPUTS=JSON.stringify(inputs);
    let effects=0;
    await assert.rejects(checkInputs({env,endpoints:e,fs:fakeFiles(),queryModels:async()=>{effects++;},probeWorker:async()=>{effects++;}}),error=>error.code==='invalid_private_inputs'&&failureLine(error).includes('field: '+field)&&failureLine(error).includes('rule: '+rule));
    assert.equal(effects,0);
  }
  for(const seed of [0,4294967295])for(const layers of [1,64])assert.equal(validAuthoringInputs({ranking:{seed,layers}}),null);
});
test('P81 ranking admits only planned non-occurrences, prints titles privately and counts each attempt',async()=>{
  const f=flow({ranking:{seed:7,layers:2},mutate:r=>r.task_list.tasks.push({task_id:secret(),title:secret(),placement:'planned',is_routine_occurrence:true})});
  await f.run();
  const eligible=f.responses.task_list.tasks.filter(task=>task.placement==='planned'&&!task.is_routine_occurrence),expected=rankingStatements(eligible.map(task=>task.task_id),f.inputs.ranking);
  const sent=f.calls.filter(call=>call.path===e.PREFERENCE_CREATE_PATH);
  assert.deepEqual(sent.map(call=>call.body),expected.statements.map(statement=>({schema_version:e.PREFERENCE_SCHEMA_VERSION,...statement})));
  const lookup=f.records.find(r=>r.label==='ranking_lookup');assert.equal(lookup.route,`${e.TASK_LIST_PATH}?schema_version=${encodeURIComponent(e.TASK_READ_SCHEMA_VERSION)}&status=active`);
  const screen=[],view=new PrivateRenderer({print:line=>screen.push(line)}),report=new PublicReport(e);
  for(const record of f.records){report.observe(record);view.observe(record);}
  const output=report.render(),summary=output.split('\n').find(line=>line.startsWith('POST /preference ranking:'));
  assert.equal(output.split('\n').find(line=>line.startsWith('GET /tasks ranking_lookup HTTP:')),'GET /tasks ranking_lookup HTTP: 200; outcome: response_observed');
  assert(output.includes('ranking_lookup tasks: 4; eligible (placement=planned, not occurrence): 2'));
  assert(summary.includes('seed 7; layers requested 2; buckets 2; ranked Tasks 2; statements attempted 1; HTTP 201: 1'));
  assert(summary.endsWith('source: synthetic_stand_in'));
  assert.equal(output.split('Observed action attempts (no replay):')[1].split('\n').filter(line=>line.includes('; ranking_statement')).length,1);
  assert(screen.includes('Synthetic ranking (seed 7), best first:'));
  for(const task of eligible){assert(screen.some(line=>line.includes(task.title)));assert(view.knownContent.has(task.title));}
  for(const task of f.responses.task_list.tasks)for(const value of [task.title,task.task_id])assert(!output.includes(value));
  for(const row of f.records.filter(r=>r.label==='ranking_statement'))assert(!output.includes(row.result.data.preference_id));
  await assert.rejects(collectJudgments(async()=>eligible[0].title,{withheld:[...view.knownContent]}),error=>error.code==='judgment_private_content');
});
test('P81 a refused ranking statement retains partial counts and its closed cause before stopping',async()=>{
  const f=flow({ranking:{seed:7,layers:2},failPreferenceAt:2,mutate:r=>r.task_list.tasks.push({task_id:secret(),title:secret(),placement:'planned',is_routine_occurrence:false})});
  let fault;try{await f.run();}catch(error){fault=error;}
  assert.equal(fault?.code,'action_request_failed');const line=failureLine(fault);
  assert(line.includes('action: ranking_statement'));assert(line.includes('HTTP 400'));assert(line.includes('"preference_unknown_task":1'));
  assert(!f.calls.some(call=>call.path===e.PLANNING_GENERATE_PATH));
  const report=new PublicReport(e);f.records.forEach(record=>report.observe(record));const output=report.render();
  assert(output.includes('ranked Tasks 2; statements attempted 2; HTTP 201: 1'));
  assert.equal(output.split('Observed action attempts (no replay):')[1].split('\n').filter(row=>row.includes('; ranking_statement')).length,2);
  assert(output.includes('POST /planning/generate: unavailable; action not observed'));
  for(const task of f.responses.task_list.tasks)for(const value of [task.title,task.task_id]){assert(!output.includes(value));assert(!line.includes(value));}
});
test('P81 absent ranking preserves real unranked priority rows; zero and one eligible Task are honest',async()=>{
  const f=flow();await f.run();const report=new PublicReport(e);f.records.forEach(record=>report.observe(record));const output=report.render();
  assert(!f.records.some(record=>record.label==='ranking_lookup'||record.label==='ranking_statement'));
  assert(output.includes('ranking outcome: private_input_missing'));assert(output.includes('GET /tasks: unavailable; action not observed'));
  assert(output.includes('task_priorities: 3 (client-computed cardinality); bucket_count: 0; ranked: 0; unranked: 3'));
  assert(!output.includes('missing_task_priorities'));assert(output.includes('ranking_input: not_supplied'));
  for(const n of [0,1]) {
    const f=flow({ranking:{seed:7,layers:5},mutate:r=>{r.task_list.tasks=r.task_list.tasks.filter(task=>task.placement==='planned').slice(0,n);r.plan.task_priorities=r.task_list.tasks.map(task=>({task_id:task.task_id,bucket_count:0,value:0.1}));}});
    delete f.inputs.task;delete f.inputs.precondition;await f.run();
    const report=new PublicReport(e);f.records.forEach(record=>report.observe(record));const output=report.render();
    assert(!f.calls.some(call=>call.path===e.PREFERENCE_CREATE_PATH));
    if(n===0)assert(output.includes('ranking outcome: no_eligible_tasks'));
    else {assert(output.includes('buckets 1; ranked Tasks 0; statements attempted 0; HTTP 201: 0'));assert(output.includes('bucket_count: 0; ranked: 0; unranked: 1'));}
  }
});
test('P81 malformed ranking lists stop before preference or planning writes',async()=>{
  const row={task_id:secret(),title:secret(),placement:'planned',is_routine_occurrence:false};
  for(const tasks of [undefined,{},[null],[row,row],[{...row,placement:'private'}],[{...row,is_routine_occurrence:undefined}],[{...row,task_id:null}]]) {
    const f=flow({ranking:{seed:7,layers:4},mutate:r=>{r.task_list.tasks=tasks;}});
    await assert.rejects(f.run(),error=>error.code==='action_request_failed'&&failureLine(error).includes('action: ranking_lookup')&&failureLine(error).includes('invalid JSON/field shape'));
    assert(!f.calls.some(call=>[e.PREFERENCE_CREATE_PATH,e.PLANNING_GENERATE_PATH].includes(call.path)));
  }
});
test('P81 priority projection uses the shared bucket count and distinguishes absent, empty and malformed rows',()=>{
  const canary=secret(),line=rows=>{const report=new PublicReport(e);report.observe({label:'plan',result:{status:200,data:rows}});return report.render().split('\n').find(line=>line.startsWith('POST /planning/generate task_priorities:'));};
  const rows=[{task_id:canary,bucket_count:4,bucket:0,value:0.314159265358},{task_id:canary,bucket_count:4,bucket:3,value:0.271828182845},{task_id:canary,bucket_count:4},{task_id:canary,bucket_count:4,bucket:null}];
  const observed=line({task_priorities:rows});assert(observed.includes('task_priorities: 4 (client-computed cardinality); bucket_count: 4; ranked: 2; unranked: 2'));assert(!observed.includes(canary));assert(!observed.includes('0.314159265358'));assert(!observed.includes('0.271828182845'));
  assert(line({}).includes('task_priorities: missing_task_priorities'));
  assert(line({task_priorities:[]}).includes('task_priorities: 0 (client-computed cardinality); bucket_count: unavailable; ranked: 0; unranked: 0'));
  assert(line({task_priorities:null}).includes('task_priorities: invalid_task_priorities'));
  assert(line({task_priorities:rows.map((row,i)=>i===0?{...row,bucket_count:5}:row)}).includes('bucket_count: unavailable; ranked: 2; unranked: 2'));
  assert(line({task_priorities:[{bucket_count:canary,bucket:canary}]}).includes('bucket_count: unavailable; ranked: unavailable; unranked: unavailable'));
});
test('P81 changing one observed ranking field changes only the public lines it feeds',async()=>{
  const f=flow({ranking:{seed:7,layers:2}});await f.run();
  const render=records=>{const report=new PublicReport(e);records.forEach(record=>report.observe(record));return report.render().split('Observed action attempts (no replay):')[0].split('\n');};
  const before=render(f.records),cases=[
    [rows=>rows.filter(r=>r.label==='ranking').forEach(r=>r.seed++),'POST /preference ranking:'],
    [rows=>rows.filter(r=>r.label==='ranking').forEach(r=>r.layers++),'POST /preference ranking:'],
    [rows=>rows.filter(r=>r.label==='ranking').forEach(r=>r.buckets.push([])),'POST /preference ranking:'],
    [rows=>rows.find(r=>r.label==='ranking_lookup').result.data.tasks.push({task_id:secret(),title:secret(),placement:'static',is_routine_occurrence:false}),'GET /tasks ranking_lookup tasks:'],
    [rows=>rows.find(r=>r.label==='plan').result.data.task_priorities.forEach(row=>row.bucket_count=3),'POST /planning/generate task_priorities:'],
    [rows=>{const row=rows.find(r=>r.label==='plan').result.data.task_priorities[0];row.bucket_count=1;row.bucket=0;},'POST /planning/generate task_priorities:']
  ];
  for(const [mutate,prefix] of cases){const rows=structuredClone(f.records);mutate(rows);const after=render(rows);assert.equal(after.length,before.length);const changed=after.filter((line,i)=>line!==before[i]);assert.equal(changed.length,1);assert(changed[0].startsWith(prefix));}
});

test('P82 observation has exactly two safe rules and stops before effects with a structural field',async()=>{
  const valid={energy:7,stress:3,mood_intensity:3},canary=secret();
  const cases=[...[null,[],true,canary,{...valid,[canary]:canary}].map(observation=>[observation,'observation','observation_object_required'])];
  for(const name of Object.keys(valid))for(const value of [undefined,-1,11,'7',NaN,Infinity])cases.push([{...valid,[name]:value},`observation.${name}`,'observation_value_0_to_10']);
  for(const [observation,field,rule] of cases){
    assert.deepEqual(validAuthoringInputs({observation}),{field,rule});
    let called=false;await assert.rejects(runActions({endpoints:e,inputs:{observation},call:async()=>{called=true;}}),error=>{
      const line=failureLine(error);assert(line.includes('field: '+field));assert(line.includes('rule: '+rule));assert(!line.includes(canary));assert(!line.includes(JSON.stringify(observation)));return error.code==='invalid_private_inputs';
    });assert.equal(called,false);
  }
  for(const value of [0,10,7.25])assert.equal(validAuthoringInputs({observation:{energy:value,stress:value,mood_intensity:value}}),null);
  assert.deepEqual(INPUT_RULES.filter(rule=>rule.startsWith('observation_')),['observation_object_required','observation_value_0_to_10']);
});
test('P82 pre-flight refuses an invalid observation without calling any live effect',async()=>{
  const env=readyEnv(),inputs=JSON.parse(env.UBU_REHEARSAL_INPUTS);inputs.observation={energy:7,stress:11,mood_intensity:3};env.UBU_REHEARSAL_INPUTS=JSON.stringify(inputs);
  const effects=[];await assert.rejects(checkInputs({env,endpoints:e,fs:fakeFiles(),queryModels:async()=>effects.push('call'),probeWorker:async()=>effects.push('probe')}),error=>error.code==='invalid_private_inputs'&&failureLine(error).includes('field: observation.stress'));
  assert.deepEqual(effects,[]);
});
test('P82 recording uses the exact body between ranking and planning and prints the three values privately once',async()=>{
  const observation={energy:7.123456789,stress:3.234567891,mood_intensity:3.345678912},f=flow({ranking:{seed:7,layers:2},observation});await f.run();
  const index=f.calls.findIndex(call=>call.path===e.AFFECT_OBSERVATION_PATH);
  assert.equal(f.calls[index-1].path,e.PREFERENCE_CREATE_PATH);assert.equal(f.calls[index+1].path,e.PLANNING_GENERATE_PATH);
  assert.deepEqual(f.calls[index],{method:'POST',path:e.AFFECT_OBSERVATION_PATH,body:{schema_version:e.AFFECT_OBSERVATION_SCHEMA_VERSION,...observation}});
  const screen=[],view=new PrivateRenderer({print:line=>screen.push(line)}),report=new PublicReport(e);f.records.forEach(record=>{view.observe(record);report.observe(record);});
  const output=report.render(),lines=output.split('\n');
  assert(lines.includes('POST /affect/observation HTTP: 201; outcome: response_observed'));
  assert(lines.includes('POST /affect/observation observation: dimensions 3; source_kind: live_observation (closed value; values and observed_at withheld)'));
  assert(lines.indexOf(lines.find(line=>line.startsWith('POST /preference ranking:')))<lines.indexOf('POST /affect/observation HTTP: 201; outcome: response_observed'));
  for(const value of Object.values(observation)){const text=String(value);assert.equal(screen.filter(line=>line.includes(text)).length,1);assert(!output.includes(text));assert(!view.knownContent.has(text));}
  assert(!output.includes(f.responses.observation.observed_at));assert(!output.includes(f.responses.observation.snapshot_id));
});
test('P82 observation public projection depends only on status, server count and the closed server source',()=>{
  const record={label:'observation',observation:{energy:7.123456789,stress:3.234567891,mood_intensity:3.345678912},result:{status:201,data:{dimension_count:3,source_kind:'live_observation',observed_at:secret(),snapshot_id:secret()}}};
  const render=row=>{const report=new PublicReport(e);report.observe(row);return report.render().split('Observed action attempts (no replay):')[0].split('\n');},before=render(record);
  for(const change of [row=>row.result.data.dimension_count=2,row=>row.result.data.source_kind='bootstrap_default_profile']){const row=structuredClone(record);change(row);const after=render(row),changed=after.filter((line,i)=>line!==before[i]);assert.equal(changed.length,1);assert(changed[0].startsWith('POST /affect/observation observation:'));}
  for(const change of [row=>row.observation.energy=2,row=>row.result.data.observed_at=secret(),row=>row.result.data.snapshot_id=secret()]){const row=structuredClone(record);change(row);assert.deepEqual(render(row),before);}
  const canary=secret(),row=structuredClone(record);row.result.data.source_kind=canary;row.result.data.dimension_count=canary;
  const output=render(row).join('\n');assert(!output.includes(canary));assert(output.includes('dimensions unavailable; source_kind: withheld_or_unavailable'));
  const statusRow=structuredClone(record);statusRow.result.status=200;const changed=render(statusRow).filter((line,i)=>line!==before[i]);assert.equal(changed.length,1);assert(changed[0].startsWith('POST /affect/observation HTTP:'));
});
test('P82 an absent observation stays unavailable and preserves the Plan stand-in marker',async()=>{
  const {BOOTSTRAP_AFFECT_MARKER}=await import('./live-rehearsal-report.mjs');
  const f=flow({mutate:r=>r.plan.human_complete_plan_quality={revision_suggestions:[BOOTSTRAP_AFFECT_MARKER]}});await f.run();
  assert(!f.calls.some(call=>call.path===e.AFFECT_OBSERVATION_PATH));
  const report=new PublicReport(e);f.records.forEach(record=>report.observe(record));const output=report.render();
  assert(output.includes('POST /affect/observation: unavailable; action not observed'));assert(output.includes('affect_figures: stand_in'));
  const live=flow({observation:{energy:7,stress:3,mood_intensity:3},mutate:r=>r.plan.human_complete_plan_quality={revision_suggestions:[]}});await live.run();
  const liveReport=new PublicReport(e);live.records.forEach(record=>liveReport.observe(record));assert(liveReport.render().includes('affect_figures: not_marked_as_stand_in'));
});
test('P82 a refused observation stops before planning and exposes only a closed cause',async()=>{
  const f=flow({observation:{energy:7.123456789,stress:3,mood_intensity:3},failure:e.AFFECT_OBSERVATION_PATH});
  await assert.rejects(f.run(),error=>error.code==='action_request_failed'&&failureLine(error).includes('action: observation')&&!failureLine(error).includes('7.123456789'));
  assert(!f.calls.some(call=>call.path===e.PLANNING_GENERATE_PATH));
});
