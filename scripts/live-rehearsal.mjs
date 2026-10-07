// Real operator instrument, never executed by checks. Tests inject all effects.
import { requestJson, loopbackUrl } from './loopback-json.mjs';
import { PublicReport } from './live-rehearsal-report.mjs';
import { RehearsalFault, finishFailure, writePublicArtifact, startupBuffer } from './live-rehearsal-diagnostics.mjs';
import { collectJudgments, privateStrings } from './live-rehearsal-questions.mjs';
import { PrivateRenderer } from './live-rehearsal-private.mjs';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import * as fileSystem from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';

export function liveConfig(env, endpoints) {
  const required=['UBU_DB_PATH','UBU_GOOGLE_CALENDAR_ID','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_REHEARSAL_BINARY'];
  const missing=required.filter(key=>typeof env[key]!=='string'||!env[key]);
  if(missing.length)throw new RehearsalFault('required_configuration_missing',{variables:missing});
  const relative=required.filter(key=>key!=='UBU_GOOGLE_CALENDAR_ID'&&!env[key].startsWith('/'));
  if(relative.length)throw new RehearsalFault('absolute_path_required',{variables:relative});
  if (env.UBU_CALENDAR_MOCK_EVENTS) throw new RehearsalFault('mock_configuration_refused');
  const port = Number(env.UBU_ORCHESTRATOR_PORT ?? endpoints.DEFAULT_ORCHESTRATOR_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RehearsalFault('invalid_port');
  let inputs = {};
  try { inputs = env.UBU_REHEARSAL_INPUTS ? JSON.parse(env.UBU_REHEARSAL_INPUTS) : {}; } catch { throw new RehearsalFault('invalid_private_inputs'); }
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) throw new RehearsalFault('invalid_private_inputs');
  for (const key of ['settings','subjects','mutations']) if (inputs[key] !== undefined && !Array.isArray(inputs[key])) throw new RehearsalFault('invalid_private_inputs');
  return { store:env.UBU_DB_PATH, calendar:env.UBU_GOOGLE_CALENDAR_ID, port, inputs };
}
export async function validateFiles(config,env,fs=fileSystem) {
  for(const [variable,mode,check] of [
    ['UBU_GOOGLE_CREDENTIALS_PATH',constants.R_OK,'readable regular file'],
    ['UBU_REHEARSAL_BINARY',constants.X_OK,'executable regular file']
  ]) {
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
export async function bindForwarder(server,port) {
  try {await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',yes);});}
  catch {throw new RehearsalFault('orchestrator_port_unavailable',{port});}
}
export async function runActions({ endpoints:e, inputs={}, call, approve=async()=>false, observe=()=>{} }) {
  const results=[];
  async function action(label,method,path,body,expected=200) {
    let result;
    try { result=await call(method,path,body); }
    catch { result={status:null,data:null,error:'connection_or_response_failure'}; }
    if (result.status !== expected && !result.error) result.error='unexpected_status';
    const record={ label,method,route:path,result }; results.push(record);observe(record);
    if(result.error)throw new RehearsalFault('action_request_failed',{action:label,status:result.status});
    if(label==='session'&&result.data?.enabled!==true)throw new RehearsalFault('calendar_session_unavailable',{action:label});
    if(['vocabulary','precondition'].includes(label)&&result.data?.status!=='ok')throw new RehearsalFault('advisory_run_failed',{action:label});
    return result.data;
  }
  const setting=(name)=>e.SETTING_PUT_PATH.replace('{name}',encodeURIComponent(name));
  if (inputs.routine) await action('routine','POST',e.OBJECTIVE_CREATE_PATH,{...inputs.routine,schema_version:e.OBJECTIVE_SCHEMA_VERSION},201);
  else observe({label:'routine',skip:'private_input_missing'});
  for (const item of inputs.settings ?? []) {
    if (!item || typeof item.name!=='string' || !/^(calendar\.color\.[a-z_]+|advisory\.(enabled|endpoint|model|timeout_ms))$/.test(item.name)) {observe({label:'colour_setting',skip:'unsupported_private_setting'});continue;}
    await action('colour_setting','PUT',setting(item.name),{schema_version:e.SETTING_SCHEMA_VERSION,value:item.value});
  }
  await action('session','POST',e.GOOGLE_CALENDAR_SESSION_PATH,{schema_version:e.DESKTOP_SESSION_SCHEMA_VERSION,enabled:true});
  await action('capture','POST',e.CALENDAR_CAPTURE_PATH,{schema_version:e.CALENDAR_CAPTURE_SCHEMA_VERSION,export_mode:'live'});
  await action('plan','POST',e.PLANNING_GENERATE_PATH,{schema_version:e.PLANNING_SCHEMA_VERSION,request:null});
  const preview=await action('preview','GET',e.CALENDAR_PREVIEW_PATH);
  if(!preview?.preview_id||preview.stale!==false)throw new RehearsalFault('preview_unavailable',{action:'preview'});
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
      } else throw new RehearsalFault('task_unavailable',{action:'requirement'});
    } else throw new RehearsalFault('task_selector_unavailable',{action:'requirement'});
  } else observe({label:'requirement',skip:'private_input_missing'});
  for (const producer of ['vocabulary','precondition']) {
    await action(producer,'POST',e.ADVISORY_RUN_PATH,{schema_version:e.ADVISORY_RUN_SCHEMA_VERSION,producer,limit:25});
  }
  await action('queue','GET',e.ADVISORY_QUEUE_PATH);
  return results;
}
export function routeTemplate(path,e) {
  let pathname;
  try { pathname=new URL(path,'http://127.0.0.1').pathname; } catch {return 'unlabelled_existing_route';}
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
  let child,server;let stopping=false,stopPromise;
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
    console.log(`store: ${JSON.stringify(config.store)}\ncalendar: ${JSON.stringify(config.calendar)}\nSecond invocation is a second rehearsal. Reset the calendar yourself before starting.`);
    if(await question('Type live to confirm these destinations and the calendar reset prerequisite: ')!=='live')throw new RehearsalFault('startup_confirmation_declined');
    const backendPort=await freePort(),base=`http://127.0.0.1:${backendPort}`;
    const report=new PublicReport(e);
    const privateView=new PrivateRenderer({credentialPaths:[env.UBU_GOOGLE_CREDENTIALS_PATH,env.UBU_GOOGLE_TOKEN_CACHE_PATH]});
    const observe=(record,forwarded)=>{report.observe(record,forwarded);if(!forwarded)privateView.observe(record);};
    server=http.createServer(createForwarder({base,port:backendPort,endpoints:e,observe}));
    await bindForwarder(server,config.port);
    child=spawn(env.UBU_REHEARSAL_BINARY,[],{cwd:env.ORCHESTRATOR_DIR ?? fileURLToPath(new URL('../../ubu-orchestrator',import.meta.url)),env:{...env,UBU_ORCHESTRATOR_PORT:String(backendPort),HOST:'127.0.0.1',BIND_ADDR:'127.0.0.1'},stdio:['ignore','ignore','pipe']});
    child.stderr.on('data',stderr.add);
    await new Promise((yes,no)=>{child.once('spawn',yes);child.once('error',()=>no(new RehearsalFault('owned_startup_failed')));});
    process.once('SIGINT',interrupted);process.once('SIGTERM',interrupted);
    const deadline=Date.now()+60000;
    for(;;){if(stopping)throw new RehearsalFault('interrupted');if(child.exitCode!==null||child.signalCode!==null)throw new RehearsalFault('owned_orchestrator_unavailable');try{const health=await requestJson(base,'GET',e.HEALTH_PATH,undefined,{allowedPorts:new Set([backendPort]),timeoutMs:1000});if(health.status!==200)throw new Error('health_unavailable');
      // Startup diagnosis is bounded/private and captured only before health.
      // After health, capture/advice can contain operator content: discard it.
      child.stderr.removeListener('data',stderr.add);child.stderr.resume();stderr.clear();break;}catch{if(Date.now()>deadline)throw new RehearsalFault('startup_timeout');await new Promise(resolve=>setTimeout(resolve,100));}}
    const call=(method,path,body)=>requestJson(base,method,path,body,{allowedPorts:new Set([backendPort])});
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
    throw error;
  } finally {stderr.clear();process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);await stop();}
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  cli().catch(async error=>{await finishFailure(error);process.exitCode=1;});
}
