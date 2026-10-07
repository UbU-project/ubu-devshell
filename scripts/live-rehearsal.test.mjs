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
