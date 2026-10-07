import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as e from '../../ubu-ui/src/api/endpoints.ts';
import { liveConfig, runActions, createForwarder, routeTemplate, validateFiles, bindForwarder } from './live-rehearsal.mjs';
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
const {RehearsalFault,REMEDIES,failureLine,writePublicArtifact,finishFailure,startupBuffer,shellPath}=await import('./live-rehearsal-diagnostics.mjs');
const fakeEnv=()=>Object.fromEntries(['UBU_DB_PATH','UBU_GOOGLE_CALENDAR_ID','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_REHEARSAL_BINARY'].map(key=>[key,'/'+secret()]));
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
