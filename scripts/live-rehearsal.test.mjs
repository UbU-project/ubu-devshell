import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as e from '../../ubu-ui/src/api/endpoints.ts';
import { liveConfig, runActions, createForwarder, routeTemplate } from './live-rehearsal.mjs';
import { requestJson, loopbackUrl } from './loopback-json.mjs';
const secret=()=>randomUUID();
const owned='http://127.0.0.1:54321',ports=new Set([54321]);
function flow({failure,tree=false,approve=false}={}) {
  const id=secret(),name=secret(),target=secret(),records=[],calls=[];
  const inputs={routine:{title:name},mutations:[{operation:'set_fact',target,payload:true}],task:{id},precondition:{target,predicate:'equals',expected:true}};
  const call=async(method,path,body)=>{
    calls.push({method,path,body});
    if(path===failure)throw new Error(secret());
    let data={};
    if(path===e.CALENDAR_PREVIEW_PATH)data={preview_id:secret(),stale:false};
    if(path.startsWith(e.TASK_LIST_PATH+'?'))data={tasks:[{task_id:id,title:name,is_routine_occurrence:false}]};
    if(path===e.TASK_PATH.replace('{task_id}',id))data={version:7,payload:{preconditions:tree?{all_of:[inputs.precondition]}:undefined}};
    return {status:path===e.OBJECTIVE_CREATE_PATH?201:200,data};
  };
  return {inputs,calls,records,run:()=>runActions({endpoints:e,inputs,call,approve:async()=>approve,observe:r=>records.push(r)})};
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
  assert.deepEqual(f.records.map(r=>r.label),['routine','session','capture','plan','preview','approval','universe_before','authoring','task_lookup','task_read','requirement','requirement_readback','vocabulary','precondition','queue']);
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
test('comparison proxy forwards the same response once, preserves CORS, redacts dynamic route parameters',async()=>{
  const canary=secret(),raw=JSON.stringify({message:canary}),observations=[];let count=0,received;
  const handler=createForwarder({base:owned,port:54321,endpoints:e,fetchImpl:async(url,init)=>{count++;received=init.body;return new Response(raw,{status:409,headers:{'access-control-allow-origin':'*'}});},observe:r=>observations.push(r)});
  const response=res();await handler(req('/task/'+canary,raw,'PATCH'),response);
  assert.equal(count,1);assert.equal(received,raw);assert.equal(response.body,raw);assert.equal(response.status,409);assert.equal(response.headers['access-control-allow-origin'],'*');
  assert.equal(observations[0].route,e.TASK_PATH);assert(!observations[0].route.includes(canary));
  assert.equal(routeTemplate('/setting/'+canary,e),e.SETTING_PUT_PATH);
});
test('comparison rejects external URL spellings and forwards despite observer failures',async()=>{
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
test('comparison records independent producer selection snapshots and freezes pre-authoring state',()=>{
  const report=new PublicReport(e,{compare:true});
  const record=(method,route,data,body)=>report.observe({method,route,body,result:{status:200,data}},true);
  record('GET',e.UNIVERSE_STATE_PATH,{facts:{},numeric_values:{},set_memberships:{},event_markers:{}});
  record('PATCH',e.UNIVERSE_STATE_PATH,{});record('GET',e.UNIVERSE_STATE_PATH,{facts:{[secret()]:true}});
  for(const [producer,n] of [['vocabulary',3],['precondition',1]])record('POST',e.ADVISORY_RUN_PATH,{status:'ok',candidates_enqueued:0,selected:[],diagnostics:Array.from({length:n},()=>({code:'advisory_task_skipped',message:secret()}))},{producer});
  const output=report.render();assert(output.includes('facts: 0 (client-computed'));assert(output.includes('producer=vocabulary diagnostics[].code == advisory_task_skipped: 3'));assert(output.includes('producer=precondition diagnostics[].code == advisory_task_skipped: 1'));
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
