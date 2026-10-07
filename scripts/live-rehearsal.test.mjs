import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as e from '../../ubu-ui/src/api/endpoints.ts';
import { liveConfig, runActions, createForwarder, routeTemplate } from './live-rehearsal.mjs';
import { requestJson, loopbackUrl } from './loopback-json.mjs';
const secret=()=>randomUUID();
const owned='http://127.0.0.1:54321',ports=new Set([54321]);
function flow({failure,tree=false,approve=false,mutate=()=>{}}={}) {
  const id=secret(),name=secret(),target=secret(),records=[],calls=[];
  const inputs={routine:{title:name},subjects:[secret()],mutations:[{operation:'set_fact',target,payload:true}],task:{id},precondition:{target,predicate:'equals',expected:true}};
  const responses={
    capture:{captured:4,updated:3,unchanged:2,skipped:1,moved:5,resized:6,diagnostics:[{code:'capture_colour_absent',message:secret()},{code:'capture_colour_absent',message:secret()},{code:'capture_stale_export',message:secret()}]},
    plan:{status:'admitted',plan:{steps:[{summary:secret(),static_anchor:true},{summary:secret(),static_anchor:false},{summary:secret(),static_anchor:false}]},unplaced_tasks:[{summary:secret(),reason:secret()}],blocked_tasks:[],invalid_tasks:[],diagnostics:[{code:'static_task_collision',message:secret()}],risk_report:{level:'high',findings:[{category:'deadline_risk',severity:'high',blocking:true,detail:secret()},{category:'unplaced_work',severity:'medium',blocking:false,detail:secret()}]}},
    preview:{preview_id:secret(),stale:false,matching_placements:8,diagnostics:[],operations:[{kind:'update',static_anchor:false,event:{summary:secret(),start_at:'2026-10-07T10:00:00Z',end_at:'2026-10-07T11:00:00Z',color_id:null,transparent:false,reminders_minutes:[5,10]}},{kind:'create',static_anchor:true,event:{summary:secret(),start_at:'2026-10-07T12:00:00Z',end_at:'2026-10-07T13:00:00Z',color_id:'8',transparent:true,reminders_minutes:[]}},{kind:'delete',summary:secret()}]},
    approval:{status:'partial',diagnostics:[],operation_results:[{status:'applied'},{status:'applied'},{status:'failed'},{status:'skipped'}]},
    universe_before:{facts:{[secret()]:true,[secret()]:false},numeric_values:{[secret()]:17},set_memberships:{[secret()]:[secret(),secret()],[secret()]:[]},event_markers:{[secret()]:[secret()]}},
    vocabulary:{status:'ok',candidates_enqueued:3,selected:[{id:secret(),title:secret()},{id:secret(),title:secret()}],diagnostics:[{code:'advisory_task_skipped',message:secret()},{code:'advisory_task_skipped',message:secret()}]},
    precondition:{status:'ok',candidates_enqueued:1,selected:[{id:secret(),title:secret()}],diagnostics:[{code:'advisory_task_skipped',message:secret()}]},
    queue:{candidates:[{candidate:{normalized_proposal:{target:secret()}}},{candidate:{normalized_proposal:{target:secret()}}}]},
    session:{accepted:true,enabled:true}
  };
  mutate(responses);
  let saved=false;
  const call=async(method,path,body)=>{
    calls.push({method,path,body});
    if(path===failure)throw new Error(secret());
    let data={};
    const label=Object.entries({capture:e.CALENDAR_CAPTURE_PATH,plan:e.PLANNING_GENERATE_PATH,preview:e.CALENDAR_PREVIEW_PATH,approval:e.CALENDAR_APPROVE_PATH,queue:e.ADVISORY_QUEUE_PATH,session:e.GOOGLE_CALENDAR_SESSION_PATH}).find(([,route])=>route===path)?.[0];
    if(label)data=responses[label];
    if(path===e.UNIVERSE_STATE_PATH&&method==='GET')data=responses.universe_before;
    if(path===e.ADVISORY_RUN_PATH)data=responses[body.producer];
    if(path.startsWith(e.TASK_LIST_PATH+'?'))data={tasks:[{task_id:id,title:name,is_routine_occurrence:false}]};
    if(path===e.TASK_PATH.replace('{task_id}',id)){
      if(method==='PATCH')saved=true;
      data={version:7,payload:{preconditions:tree?{all_of:[inputs.precondition]}:saved?inputs.precondition:undefined}};
    }
    return {status:path===e.OBJECTIVE_CREATE_PATH?201:200,data};
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
  const f=flow({approve:true});await f.run();
  assert.deepEqual(f.records.map(r=>r.label),['routine','session','capture','plan','preview','approval','universe_before','subject','authoring','task_lookup','task_read','requirement','requirement_readback','vocabulary','precondition','queue']);
  const patch=f.calls.find(c=>c.method==='PATCH'&&c.path.startsWith('/task/'));
  assert.deepEqual(patch.body,{schema_version:e.TASK_CAPTURE_SCHEMA_VERSION,expected_version:7,preconditions:f.inputs.precondition});
  assert.equal(Object.keys(patch.body).length,3);
});
test('decline cannot write; failed capture does not suppress later producers',async()=>{
  const f=flow({failure:e.CALENDAR_CAPTURE_PATH});await f.run();
  assert(!f.calls.some(c=>c.path===e.CALENDAR_APPROVE_PATH));
  assert(f.records.find(r=>r.label==='capture').result.error);
  assert(f.records.find(r=>r.label==='precondition'));
});
test('missing private authoring stays skipped; existing trees are preserved',async()=>{
  const f=flow({tree:true});await f.run();
  assert.equal(f.records.find(r=>r.label==='requirement').skip,'existing_tree_preserved');
  assert(!f.calls.some(c=>c.method==='PATCH'&&c.path.startsWith('/task/')));
  const records=[];await runActions({endpoints:e,call:async()=>({status:200,data:{}}),observe:r=>records.push(r)});
  for(const label of ['routine','authoring','requirement'])assert.equal(records.find(r=>r.label===label).skip,'private_input_missing');
});
test('stale or absent preview never asks for approval; thrown approval still continues',async()=>{
  for(const data of [{stale:true,preview_id:secret()},{}]) {
    let asked=false;const calls=[];
    await runActions({endpoints:e,call:async(m,p)=>{calls.push(p);return {status:200,data};},approve:async()=>{asked=true;return true;}});
    assert.equal(asked,false);assert(!calls.includes(e.CALENDAR_APPROVE_PATH));
  }
  let end=false;await runActions({endpoints:e,call:async(m,p)=>{if(p===e.ADVISORY_QUEUE_PATH)end=true;return {status:200,data:{stale:false,preview_id:secret()}};},approve:async()=>{throw Error(secret());}});
  assert(end);
});
test('configuration has no path/calendar defaults and refuses mock or malformed private inputs',()=>{
  assert.throws(()=>liveConfig({},e));
  const env=Object.fromEntries(['UBU_DB_PATH','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_REHEARSAL_BINARY'].map(k=>[k,'/'+secret()]));env.UBU_GOOGLE_CALENDAR_ID=secret();
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
test('four judgments are asked at the end in order and included in the single block',async()=>{
  const seen=[],answers=await collectJudgments(async prompt=>{seen.push(prompt);return 'The choice suits me.';});
  assert.equal(QUESTIONS.length,4);assert.deepEqual(seen,QUESTIONS.map(q=>`${q}\nYour public judgment sentence: `));
  assert.equal(answers.length,4);const output=new PublicReport(e).render(answers);
  assert.equal(output.split('BEGIN LIVE REHEARSAL COPY-BACK').length,2);assert.equal(output.split('The choice suits me.').length,5);
});
test('known private configuration in a judgment is withheld, and interruptions/empty answers remain results',async()=>{
  const canary=secret(),withheld=privateStrings({nested:[canary]});let n=0;
  const answers=await collectJudgments(async()=>{n++;if(n===1)return canary;if(n===2)throw Error(canary);if(n===3)return '';return 'The layout fits.';},{withheld});
  assert(!answers.join('\n').includes(canary));assert.deepEqual(answers.slice(1),['unanswered','unanswered','The layout fits.']);
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
test('malformed Task lists report unavailable selection and still reach both producers',async()=>{
  for(const tasks of [{},[null],['untrusted']]){
    const calls=[],records=[];await runActions({endpoints:e,inputs:{task:{id:secret()},precondition:{target:secret()}},call:async(m,p)=>{calls.push(p);return {status:200,data:{tasks}};},observe:r=>records.push(r)});
    assert.equal(records.find(r=>r.label==='requirement').skip,'task_selector_missing_or_ambiguous');assert.equal(calls.filter(p=>p===e.ADVISORY_RUN_PATH).length,2);
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
  const f=flow({approve:true,...options});await f.run();const report=new PublicReport(e);
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
    assert.equal(Number(line.match(/candidates_enqueued: (\d+)/)[1]),body.candidates_enqueued);assert.equal(Number(line.match(/selected: (\d+)/)[1]),body.selected.length);
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
