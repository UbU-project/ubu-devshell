// Real operator instrument, never executed by checks. Tests inject all effects.
import { requestJson, loopbackUrl, TransportError } from './loopback-json.mjs';
import { PublicReport, registryFigures, responseCause, REPORT_ROUTES } from './live-rehearsal-report.mjs';
import { RehearsalFault, failureLine, finishFailure, writePublicArtifact, startupBuffer } from './live-rehearsal-diagnostics.mjs';
import { collectJudgments, privateStrings } from './live-rehearsal-questions.mjs';
import { validAuthoringInputs, routineBody, ADVISORY_LIMIT } from './live-rehearsal-contract.mjs';
import { PrivateRenderer } from './live-rehearsal-private.mjs';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import * as fileSystem from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';

export function liveConfig(env, endpoints, {preflight=false}={}) {
  const required=['UBU_DB_PATH','UBU_GOOGLE_CALENDAR_ID','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_REHEARSAL_INPUTS','UBU_PLANNING_WORKER_PYTHON','UBU_PLANNER_STRATEGY',...(!preflight?['UBU_REHEARSAL_BINARY']:[])];
  const missing=required.filter(key=>typeof env[key]!=='string'||!env[key]);
  if(missing.length)throw new RehearsalFault('required_configuration_missing',{variables:missing});
  const relative=['UBU_DB_PATH','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_PLANNING_WORKER_PYTHON','UBU_REHEARSAL_BINARY'].filter(key=>env[key]&&!env[key].startsWith('/'));
  if(relative.length)throw new RehearsalFault('absolute_path_required',{variables:relative});
  if (env.UBU_CALENDAR_MOCK_EVENTS) throw new RehearsalFault('mock_configuration_refused');
  if(!['greedy','chunked'].includes(env.UBU_PLANNER_STRATEGY))throw new RehearsalFault('configuration_file_required',{variable:'UBU_PLANNER_STRATEGY',check:'greedy or chunked'});
  const port = Number(env.UBU_ORCHESTRATOR_PORT ?? endpoints.DEFAULT_ORCHESTRATOR_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RehearsalFault('invalid_port');
  let inputs = {};
  try { inputs = env.UBU_REHEARSAL_INPUTS ? JSON.parse(env.UBU_REHEARSAL_INPUTS) : {}; } catch { throw new RehearsalFault('invalid_private_inputs',{field:'inputs',rule:'json_required'}); }
  const inputFault=validAuthoringInputs(inputs);
  if(inputFault)throw new RehearsalFault('invalid_private_inputs',inputFault);
  if(inputs.subjects?.length!==1)throw new RehearsalFault('invalid_private_inputs',{field:'subjects',rule:'one_subject_required'});
  if(!inputs.mutations?.some(mutation=>
    ['set_fact','set_numeric','increment_numeric','decrement_numeric','add_membership','append_event_marker'].includes(mutation?.operation)
    && typeof mutation?.target==='string'&&['facts','numeric_values','set_memberships','event_markers'].includes(mutation.target.split('.')[0])
    && mutation.target.split('.')[1]===inputs.subjects[0]))throw new RehearsalFault('invalid_private_inputs',{field:'mutations',rule:'subject_mutation_write_required'});
  return { store:env.UBU_DB_PATH, calendar:env.UBU_GOOGLE_CALENDAR_ID, port, inputs };
}
export async function validateFiles(config,env,fs=fileSystem) {
  for(const [variable,mode,check] of [
    ['UBU_GOOGLE_CREDENTIALS_PATH',constants.R_OK,'readable regular file'],
    ['UBU_REHEARSAL_BINARY',constants.X_OK,'executable regular file'],
    ['UBU_PLANNING_WORKER_PYTHON',constants.X_OK,'executable regular file']
  ]) {
    if(variable==='UBU_REHEARSAL_BINARY'&&!env[variable])continue; // launcher-generated unless explicitly supplied
    try {if(!(await fs.stat(env[variable])).isFile())throw new Error();}
    catch {throw new RehearsalFault('configuration_file_required',{variable,check:'stat'});}
    try {await fs.access(env[variable],mode);}
    catch {throw new RehearsalFault('configuration_file_required',{variable,check});}
  }
  const variable='UBU_GOOGLE_TOKEN_CACHE_PATH';
  let token;
  try {token=await fs.stat(env[variable]);}
  catch(error){if(error.code!=='ENOENT')throw new RehearsalFault('token_unavailable',{variable,check:'stat'});}
  if(token) {
    if(!token.isFile())throw new RehearsalFault('configuration_file_required',{variable,check:'stat'});
    try {await fs.access(env[variable],constants.R_OK|constants.W_OK);}
    catch {throw new RehearsalFault('token_unavailable',{variable,check:'readable/writable regular file'});}
  } else {
    try {await fs.access(dirname(env[variable]),constants.W_OK);}
    catch {throw new RehearsalFault('token_unavailable',{variable,check:'writable parent'});}
  }
  for(const path of [config.store,config.store+'-wal',config.store+'-shm']) {
    let exists;
    try {exists=await fs.lstat(path);}
    catch(error){if(error.code!=='ENOENT')throw new RehearsalFault('configuration_file_required',{variable:'UBU_DB_PATH',check:'stat'});}
    if(exists)throw new RehearsalFault('fresh_store_required',{store:config.store});
  }
  try {await fs.access(dirname(config.store),constants.W_OK);}
  catch {throw new RehearsalFault('configuration_file_required',{variable:'UBU_DB_PATH',check:'writable parent'});}
}

// Only the operator CLI uses these live effects. Tests inject metadata readers.
function probeBudget(env) {
  const raw=env.UBU_PLANNING_WORKER_PROBE_TIMEOUT_MS;
  const timeout=raw===undefined?30000:/^[0-9]+$/.test(raw)&&Number(raw)>=1&&Number(raw)<=30000?Number(raw):null;
  if(timeout===null)throw new RehearsalFault('configuration_file_required',{variable:'UBU_PLANNING_WORKER_PROBE_TIMEOUT_MS',check:'probe budget 1 to 30000'});
  return timeout;
}
async function workerEnvironment(env) {
  const timeout=probeBudget(env);
  const root=fileURLToPath(new URL('../../ubu-planning-kernel/gpu-advisory/src',import.meta.url));
  return new Promise((resolve,reject)=>{
    const child=spawn(env.UBU_PLANNING_WORKER_PYTHON,['-c','import json; from ubu_planning_worker.main import framework_environment; print(json.dumps(framework_environment()))'],{env:{...env,PYTHONPATH:root,PYTHONDONTWRITEBYTECODE:'1'},stdio:['ignore','pipe','ignore']});
    let text='',settled=false;
    const fail=()=>{if(!settled){settled=true;clearTimeout(timer);child.kill('SIGKILL');reject(new RehearsalFault('configuration_file_required',{variable:'UBU_PLANNING_WORKER_PYTHON',check:'worker module and pinned torch'}));}};
    const timer=setTimeout(fail,timeout);
    child.once('error',fail);child.stdout.on('data',chunk=>{text+=chunk.toString('utf8');if(Buffer.byteLength(text)>65536)fail();});
    child.once('close',code=>{if(settled)return;clearTimeout(timer);if(code!==0){fail();return;}try{const facts=JSON.parse(text);settled=true;resolve(facts);}catch{fail();}});
  });
}
export async function checkInputs({env,endpoints:e,fs=fileSystem,
  queryModels=endpoint=>requestJson(endpoint,'GET','/api/tags',undefined,{allowedPorts:new Set([Number(new URL(endpoint).port)]),timeoutMs:10000}),
  probeWorker=workerEnvironment}) {
  const config=liveConfig(env,e,{preflight:true});
  probeBudget(env);
  await validateFiles(config,env,fs);
  const settings=new Map((config.inputs.settings??[]).map(item=>[item.name,item.value]));
  for(const name of ['advisory.endpoint','advisory.model'])if(!settings.has(name))throw new RehearsalFault('advisory_run_failed',{action:'advisory_readiness',check:name==='advisory.model'?'model configured':'endpoint configured'});
  let result;try{result=await queryModels(settings.get('advisory.endpoint'));}catch{throw new RehearsalFault('advisory_run_failed',{action:'advisory_readiness',check:'endpoint answers'});}
  if(result?.status!==200)throw new RehearsalFault('advisory_run_failed',{action:'advisory_readiness',...responseCause(result),check:'endpoint answers'});
  const model=settings.get('advisory.model'),canonical=model.slice(model.lastIndexOf('/')+1).includes(':')?model:model+':latest';
  if(!Array.isArray(result.data?.models)||!result.data.models.some(entry=>[entry?.name,entry?.model].some(name=>name===model||name===canonical)))throw new RehearsalFault('advisory_run_failed',{action:'advisory_readiness',check:'model present'});
  let facts;try{facts=await probeWorker(env);}catch(error){if(error instanceof RehearsalFault)throw error;throw new RehearsalFault('configuration_file_required',{variable:'UBU_PLANNING_WORKER_PYTHON',check:'worker module and pinned torch'});}
  if(facts?.importable!==true||facts.version!=='2.6.0+cpu'||facts.import_warning_count!==0)throw new RehearsalFault('configuration_file_required',{variable:'UBU_PLANNING_WORKER_PYTHON',check:'worker module and pinned torch'});
  return {torchVersion:facts.version};
}
export async function bindForwarder(server,port) {
  try {await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',yes);});}
  catch {throw new RehearsalFault('orchestrator_port_unavailable',{port});}
}
export async function runActions({ endpoints:e, inputs={}, call, approve=async()=>false, observe=()=>{} }) {
  const inputFault=validAuthoringInputs(inputs);
  if(inputFault)throw new RehearsalFault('invalid_private_inputs',inputFault);
  const results=[];
  const cause=label=>responseCause(results.findLast(record=>record.label===label)?.result);
  async function action(label,method,path,body,expected=200) {
    let result;
    try { result=await call(method,path,body); }
    catch(error) {
      if(error instanceof RehearsalFault&&error.code==='interrupted')throw error;
      result={status:null,data:null,error:error instanceof TransportError?error.code:'connection_or_response_failure'};
    }
    if (result.status !== expected && !result.error) result.error='unexpected_status';
    const record={ label,method,route:path,result,...(['vocabulary','precondition'].includes(label)?{requestLimit:body.limit}:{}),...(label==='registry'?{subjects:inputs.subjects}:{}) }; results.push(record);observe(record);
    if(result.error)throw new RehearsalFault('action_request_failed',{action:label,...responseCause(result),check:result.error});
    if(label==='session'&&result.data?.enabled!==true)throw new RehearsalFault('calendar_session_unavailable',{action:label,...responseCause(result)});
    if(['vocabulary','precondition'].includes(label)&&result.data?.status!=='ok')throw new RehearsalFault('advisory_run_failed',{action:label,...responseCause(result)});
    return result.data;
  }
  const setting=(name)=>e.SETTING_PUT_PATH.replace('{name}',encodeURIComponent(name));
  if (inputs.routine) await action('routine','POST',e.OBJECTIVE_CREATE_PATH,routineBody(inputs.routine,e.OBJECTIVE_SCHEMA_VERSION),201);
  else observe({label:'routine',skip:'private_input_missing'});
  for (const item of inputs.settings ?? []) {
    const label=item.name.startsWith('calendar.color.')?'colour_setting':item.name.startsWith('advisory.')?'advisory_setting':item.name.startsWith('planning.')?'planning_setting':'subject_setting';
    await action(label,'PUT',setting(item.name),{schema_version:e.SETTING_SCHEMA_VERSION,value:item.value});
  }
  await action('session','POST',e.GOOGLE_CALENDAR_SESSION_PATH,{schema_version:e.DESKTOP_SESSION_SCHEMA_VERSION});
  await action('capture','POST',e.CALENDAR_CAPTURE_PATH,{schema_version:e.CALENDAR_CAPTURE_SCHEMA_VERSION,export_mode:'live'});
  await action('plan','POST',e.PLANNING_GENERATE_PATH,{schema_version:e.PLANNING_SCHEMA_VERSION,request:null});
  await action('risk_read','GET',REPORT_ROUTES.risk);
  await action('human_complete','GET',REPORT_ROUTES.humanComplete);
  await action('time_by_category','GET',`${e.TIME_BY_CATEGORY_PATH}?schema_version=${encodeURIComponent(e.TIME_BY_CATEGORY_SCHEMA_VERSION)}`);
  const preview=await action('preview','GET',e.CALENDAR_PREVIEW_PATH);
  if(!preview?.preview_id||preview.stale!==false)throw new RehearsalFault('preview_unavailable',{action:'preview',...cause('preview')});
  let confirmed=false;
  try {confirmed=await approve(preview) === true;} catch(error) {if(error instanceof RehearsalFault&&error.code==='interrupted')throw error;throw new RehearsalFault('approval_interrupted',{action:'approval'});}
  if (confirmed) {
    await action('approval','POST',e.CALENDAR_APPROVE_PATH,{schema_version:e.CALENDAR_APPROVAL_SCHEMA_VERSION,preview_id:preview.preview_id,authority_source:'user',export_mode:'live'});
  } else observe({label:'approval',skip:preview?'operator_did_not_approve_or_preview_stale':'preview_unavailable'});
  await action('universe_before','GET',e.UNIVERSE_STATE_PATH);
  for (const subject of inputs.subjects ?? []) {
    if (typeof subject !== 'string') {observe({label:'subject',skip:'invalid_private_input'});continue;}
    await action('subject','PUT',setting(`universe.subject.${subject}`),{schema_version:e.SETTING_SCHEMA_VERSION,value:true});
  }
  if (Array.isArray(inputs.mutations) && inputs.mutations.length) {
    await action('authoring','PATCH',e.UNIVERSE_STATE_PATH,{schema_version:e.UNIVERSE_STATE_SCHEMA_VERSION,mutations:inputs.mutations});
  } else observe({label:'authoring',skip:'private_input_missing'});
  if (inputs.task && inputs.precondition) {
    const list=await action('task_lookup','GET',`${e.TASK_LIST_PATH}?schema_version=${encodeURIComponent(e.TASK_READ_SCHEMA_VERSION)}&status=active`);
    const chosen=(Array.isArray(list?.tasks)?list.tasks:[]).filter(t=>t && typeof t.task_id==='string' && !t.is_routine_occurrence && (inputs.task.id ? t.task_id===inputs.task.id : typeof inputs.task.title==='string' && t.title===inputs.task.title));
    if (chosen.length===1) {
      const path=e.TASK_PATH.replace('{task_id}',encodeURIComponent(chosen[0].task_id));
      const current=await action('task_read','GET',path);
      if (current && !current.is_routine_occurrence && Number.isInteger(current.version)) {
        if (current.payload?.preconditions?.all_of || current.payload?.preconditions?.any_of) observe({label:'requirement',skip:'existing_tree_preserved'});
        else {
          const saved=await action('requirement','PATCH',path,{schema_version:e.TASK_CAPTURE_SCHEMA_VERSION,expected_version:current.version,preconditions:inputs.precondition});
          if(saved) await action('requirement_readback','GET',path);
        }
      } else throw new RehearsalFault('task_unavailable',{action:'requirement',...cause('task_read')});
    } else throw new RehearsalFault('task_selector_unavailable',{action:'requirement',...cause('task_lookup')});
  } else observe({label:'requirement',skip:'private_input_missing'});
  if(inputs.subjects?.length) {
    const registry=await action('registry','GET',e.SETTINGS_LIST_PATH);
    if(!registryFigures(registry,inputs.subjects))throw new RehearsalFault('subject_registry_unavailable',{action:'registry',...cause('registry')});
  } else observe({label:'registry',skip:'private_input_missing'});
  for (const producer of ['vocabulary','precondition']) {
    await action(producer,'POST',e.ADVISORY_RUN_PATH,{schema_version:e.ADVISORY_RUN_SCHEMA_VERSION,producer,limit:ADVISORY_LIMIT});
  }
  await action('queue','GET',e.ADVISORY_QUEUE_PATH);
  return results;
}
export function routeTemplate(path,e) {
  let pathname;
  try { pathname=new URL(path,'http://127.0.0.1').pathname; } catch {return 'unlabelled_existing_route';}
  if(Object.values(REPORT_ROUTES).includes(pathname))return pathname;
  for (const [key,template] of Object.entries(e)) {
    if (!key.endsWith('_PATH') || typeof template!=='string') continue;
    const pattern=template.split(/\{[^}]+\}/).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[^/]+');
    if (new RegExp(`^${pattern}$`).test(pathname)) return template;
  }
  return 'unlabelled_existing_route';
}
export function createForwarder({base,port,endpoints:e,fetchImpl=globalThis.fetch,observe=()=>{}}) {
  return async (request,response)=>{
    let bytes=0;const chunks=[];
    try {
      if (!request.url?.startsWith('/') || request.url.startsWith('//')) throw new Error('invalid_path');
      for await (const chunk of request) {bytes+=chunk.length;if(bytes>1024*1024) throw new Error('request_too_large');chunks.push(chunk);}
      const raw=Buffer.concat(chunks).toString('utf8');
      // Preserve exact UI request/response bytes. No response renderer or API.
      const headers={'Content-Type':'application/json',Accept:'application/json'};
      for(const name of ['content-type','accept','origin','access-control-request-method','access-control-request-headers']) {
        const value=request.headers?.[name];if(typeof value==='string')headers[name]=value;
      }
      const upstream=await fetchImpl(loopbackUrl(base,request.url,new Set([port])),{method:request.method,redirect:'error',headers,...(raw?{body:raw}:{}),signal:AbortSignal.timeout(650000)});
      const reader=upstream.body?.getReader();let text;
      if (reader) {
        let size=0;const parts=[];try {for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>16*1024*1024)throw new Error('response_too_large');parts.push(next.value);}} finally {await reader.cancel().catch(()=>{});}
        text=Buffer.concat(parts).toString('utf8');
      } else {text=await upstream.text();if(Buffer.byteLength(text)>16*1024*1024)throw new Error('response_too_large');}
      let data=null,body=null;try{data=text?JSON.parse(text):null;}catch{}
      try{body=raw?JSON.parse(raw):null;}catch{}
      const route=routeTemplate(request.url,e);
      // Observe copies in memory; never print a request, URL parameter or body.
      try {observe({method:request.method,route,identity:new URL(request.url,base).pathname,body,result:{status:upstream.status,data}},true);} catch {}
      for (const name of ['content-type','access-control-allow-origin','access-control-allow-headers','access-control-allow-methods','etag']) {
        const value=upstream.headers.get(name);if(value)response.setHeader(name,value);
      }
      response.writeHead(upstream.status);response.end(text);
    } catch {try {observe({method:request.method,route:routeTemplate(request.url,e),result:{status:502,data:null,error:'forwarding_failed'}},true);} catch {}response.writeHead(502,{'Content-Type':'application/json'});response.end('{"error":"rehearsal_forwarding_failed"}');}
  };
}
async function freePort(){const server=net.createServer();await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes);});const port=server.address().port;await new Promise(yes=>server.close(yes));return port;}
export async function cli(env=process.env,args=process.argv.slice(2)) {
  if(args.length===1&&args[0]==='--check-inputs') {
    try {
      const ui=env.UI_DIR?pathToFileURL(`${env.UI_DIR}/src/api/endpoints.ts`):new URL('../../ubu-ui/src/api/endpoints.ts',import.meta.url);
      const ready=await checkInputs({env,endpoints:await import(ui.href)});
      console.log('PRIVATE worker torch version: '+JSON.stringify(ready.torchVersion));
      console.log('Pre-flight passed. No rehearsal, build, state/calendar write or copy-back replacement occurred.');
    } catch(error) {console.error(failureLine(error).trimEnd());process.exitCode=1;}
    return;
  }
  if (args.length) throw new RehearsalFault('unsupported_argument');
  if (!process.stdin.isTTY) throw new RehearsalFault('terminal_required');
  const ui=env.UI_DIR ? pathToFileURL(`${env.UI_DIR}/src/api/endpoints.ts`) : new URL('../../ubu-ui/src/api/endpoints.ts',import.meta.url);
  const e=await import(ui.href),config=liveConfig(env,e);
  // Only metadata checks; secret file contents and paths never enter diagnosis.
  await validateFiles(config,env);
  // Establish the public sink before any live effect; replace it on every exit.
  await writePublicArtifact('rehearsal_in_progress: run not complete. Remedy: wait for completion or its named refusal.\n',{env});
  const readline=createInterface({input:process.stdin,output:process.stdout});
  const inputAbort=new AbortController();
  const question=async prompt=>{try{return await readline.question(prompt,{signal:inputAbort.signal});}catch{throw new RehearsalFault(inputAbort.signal.aborted?'interrupted':'approval_interrupted');}};
  let child,server,report;let stopping=false,stopPromise;
  const stderr=startupBuffer([env.UBU_GOOGLE_CREDENTIALS_PATH,env.UBU_GOOGLE_TOKEN_CACHE_PATH]);
  const stop=()=>stopPromise ??= (async()=>{
    stopping=true;
    readline.close();
    if(server?.listening){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    if(child?.pid && child.exitCode===null && child.signalCode===null){
      await new Promise(resolve=>{child.once('exit',()=>{clearTimeout(timer);resolve();});
        const timer=setTimeout(()=>{child.kill('SIGKILL');},2000);child.kill('SIGTERM');});
    }
  })();
  // Runtime-only cleanup: tests never execute cli or install signal handlers.
  const interrupted=()=>{inputAbort.abort();void stop();};
  try {
    process.once('SIGINT',interrupted);process.once('SIGTERM',interrupted);
    report=new PublicReport(e);
    const ready=await checkInputs({env,endpoints:e});
    console.log('PRIVATE worker torch version: '+JSON.stringify(ready.torchVersion));
    console.log(`store: ${JSON.stringify(config.store)}\ncalendar: ${JSON.stringify(config.calendar)}\nSecond invocation is a second rehearsal. Reset the calendar yourself before starting.`);
    if(await question('Type live to confirm these destinations and the calendar reset prerequisite: ')!=='live')throw new RehearsalFault('startup_confirmation_declined');
    const backendPort=await freePort(),base=`http://127.0.0.1:${backendPort}`;
    const privateView=new PrivateRenderer({credentialPaths:[env.UBU_GOOGLE_CREDENTIALS_PATH,env.UBU_GOOGLE_TOKEN_CACHE_PATH]});
    const observe=(record,forwarded)=>{report.observe(record,forwarded);if(!forwarded)privateView.observe(record);};
    server=http.createServer(createForwarder({base,port:backendPort,endpoints:e,observe}));
    await bindForwarder(server,config.port);
    try {child=spawn(env.UBU_REHEARSAL_BINARY,[],{cwd:env.ORCHESTRATOR_DIR ?? fileURLToPath(new URL('../../ubu-orchestrator',import.meta.url)),env:{...env,UBU_ORCHESTRATOR_PORT:String(backendPort),HOST:'127.0.0.1',BIND_ADDR:'127.0.0.1'},stdio:['ignore','ignore','pipe']});
    child.stderr?.on('data',stderr.add);
    await new Promise((yes,no)=>{child.once('spawn',yes);child.once('error',()=>no(new RehearsalFault('owned_startup_failed')));});
    } catch {throw new RehearsalFault('owned_startup_failed',{variables:['UBU_REHEARSAL_BINARY','ORCHESTRATOR_DIR']});}
    const deadline=Date.now()+60000;
    for(;;){if(stopping)throw new RehearsalFault('interrupted');if(child.exitCode!==null||child.signalCode!==null)throw new RehearsalFault('owned_orchestrator_unavailable');try{const health=await requestJson(base,'GET',e.HEALTH_PATH,undefined,{allowedPorts:new Set([backendPort]),timeoutMs:1000});if(health.status!==200)throw new Error('health_unavailable');
      // Startup diagnosis is bounded/private and captured only before health.
      // After health, capture/advice can contain operator content: discard it.
      child.stderr?.removeListener('data',stderr.add);child.stderr?.resume();stderr.clear();break;}catch{if(Date.now()>deadline)throw new RehearsalFault('startup_timeout');await new Promise(resolve=>setTimeout(resolve,100));}}
    const call=async(method,path,body)=>{
      if(inputAbort.signal.aborted)throw new RehearsalFault('interrupted');
      try{return await requestJson(base,method,path,body,{allowedPorts:new Set([backendPort])});}
      catch(error){if(inputAbort.signal.aborted)throw new RehearsalFault('interrupted');throw error;}
    };
      await runActions({endpoints:e,inputs:config.inputs,call,observe,approve:async preview=>{
        console.log('Decide from the private Plan and exact preview operations printed above.');
        return await question('Type approve to WRITE this preview to the real calendar, or anything else to decline: ')==='approve';
      }});

    console.log('Three public judgment sentences follow. Do not paste a title, name, condition, fact key/value/row, credential or token. Describe your judgment in your own words.');
    const answers=await collectJudgments(prompt=>question(prompt),{withheld:[...privateView.knownContent,...privateStrings([config.inputs,env.UBU_GOOGLE_CREDENTIALS_PATH,env.UBU_GOOGLE_TOKEN_CACHE_PATH,env.UBU_REHEARSAL_BINARY])]});
    const path=await writePublicArtifact(report.render(answers)+'\n',{env});
    console.log('Copy-back file: '+JSON.stringify(path));
  } catch(error) {
    if(['owned_startup_failed','owned_orchestrator_unavailable','startup_timeout'].includes(error?.code)&&stderr.lines())console.error('PRIVATE STARTUP STDERR — your local diagnosis; never paste:\n'+stderr.lines());
    await finishFailure(error,{env,report});process.exitCode=1;
  } finally {stderr.clear();process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);await stop();}
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  cli().catch(async error=>{await finishFailure(error);process.exitCode=1;});
}
