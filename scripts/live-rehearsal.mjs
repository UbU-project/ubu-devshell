// Real operator instrument, never executed by checks. Tests inject all effects.
import { requestJson, loopbackUrl } from './loopback-json.mjs';
import { PublicReport, previewLines } from './live-rehearsal-report.mjs';
import { collectJudgments, privateStrings } from './live-rehearsal-questions.mjs';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';

export function liveConfig(env, endpoints) {
  for (const key of ['UBU_DB_PATH','UBU_GOOGLE_CALENDAR_ID','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_REHEARSAL_BINARY']) {
    if (typeof env[key] !== 'string' || !env[key]) throw new Error('required_configuration_missing');
  }
  for (const key of ['UBU_DB_PATH','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_REHEARSAL_BINARY']) {
    if (!env[key].startsWith('/')) throw new Error('absolute_path_required');
  }
  if (env.UBU_CALENDAR_MOCK_EVENTS) throw new Error('mock_configuration_refused');
  const port = Number(env.UBU_ORCHESTRATOR_PORT ?? endpoints.DEFAULT_ORCHESTRATOR_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('invalid_port');
  let inputs = {};
  try { inputs = env.UBU_REHEARSAL_INPUTS ? JSON.parse(env.UBU_REHEARSAL_INPUTS) : {}; } catch { throw new Error('invalid_private_inputs'); }
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) throw new Error('invalid_private_inputs');
  for (const key of ['settings','subjects','mutations']) if (inputs[key] !== undefined && !Array.isArray(inputs[key])) throw new Error('invalid_private_inputs');
  return { store:env.UBU_DB_PATH, calendar:env.UBU_GOOGLE_CALENDAR_ID, port, inputs };
}
export async function runActions({ endpoints:e, inputs={}, call, approve=async()=>false, observe=()=>{} }) {
  const results=[];
  async function action(label,method,path,body,expected=200) {
    let result;
    try { result=await call(method,path,body); }
    catch { result={status:null,data:null,error:'connection_or_response_failure'}; }
    if (result.status !== expected && !result.error) result.error='unexpected_status';
    const record={ label,method,route:path,result }; results.push(record);observe(record); return result.error ? null : result.data;
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
  let confirmed=false;
  if (preview?.preview_id && preview.stale === false) {try {confirmed=await approve(preview) === true;} catch {}}
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
    const chosen=(list?.tasks ?? []).filter(t=>!t.is_routine_occurrence && (inputs.task.id ? t.task_id===inputs.task.id : typeof inputs.task.title==='string' && t.title===inputs.task.title));
    if (chosen.length===1) {
      const path=e.TASK_PATH.replace('{task_id}',encodeURIComponent(chosen[0].task_id));
      const current=await action('task_read','GET',path);
      if (current && !current.is_routine_occurrence && Number.isInteger(current.version)) {
        if (current.payload?.preconditions?.all_of || current.payload?.preconditions?.any_of) observe({label:'requirement',skip:'existing_tree_preserved'});
        else {
          const saved=await action('requirement','PATCH',path,{schema_version:e.TASK_CAPTURE_SCHEMA_VERSION,expected_version:current.version,preconditions:inputs.precondition});
          if(saved) await action('requirement_readback','GET',path);
        }
      } else observe({label:'requirement',skip:'task_unavailable'});
    } else observe({label:'requirement',skip:'task_selector_missing_or_ambiguous'});
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
      const upstream=await fetchImpl(loopbackUrl(base,request.url,new Set([port])),{method:request.method,redirect:'error',headers:{'Content-Type':'application/json',Accept:'application/json'},...(raw?{body:raw}:{}),signal:AbortSignal.timeout(650000)});
      const reader=upstream.body?.getReader();let text;
      if (reader) {
        let size=0;const parts=[];try {for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>16*1024*1024)throw new Error('response_too_large');parts.push(next.value);}} finally {await reader.cancel().catch(()=>{});}
        text=Buffer.concat(parts).toString('utf8');
      } else {text=await upstream.text();if(Buffer.byteLength(text)>16*1024*1024)throw new Error('response_too_large');}
      let data=null,body=null;try{data=text?JSON.parse(text):null;}catch{}
      try{body=raw?JSON.parse(raw):null;}catch{}
      const route=routeTemplate(request.url,e);
      // Observe copies in memory; never print a request, URL parameter or body.
      try {observe({method:request.method,route,body,result:{status:upstream.status,data}},true);} catch {}
      for (const name of ['content-type','access-control-allow-origin','access-control-allow-headers','access-control-allow-methods','etag']) {
        const value=upstream.headers.get(name);if(value)response.setHeader(name,value);
      }
      response.writeHead(upstream.status);response.end(text);
    } catch {try {observe({method:request.method,route:routeTemplate(request.url,e),result:{status:502,data:null,error:'forwarding_failed'}},true);} catch {}response.writeHead(502,{'Content-Type':'application/json'});response.end('{"error":"rehearsal_forwarding_failed"}');}
  };
}
async function freePort(){const server=net.createServer();await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes);});const port=server.address().port;await new Promise(yes=>server.close(yes));return port;}
export async function cli(env=process.env,args=process.argv.slice(2)) {
  if (args.length>1 || args.some(a=>a!=='--compare')) throw new Error('unsupported_argument');
  if (!process.stdin.isTTY) throw new Error('terminal_required');
  const ui=env.UI_DIR ? pathToFileURL(`${env.UI_DIR}/src/api/endpoints.ts`) : new URL('../../ubu-ui/src/api/endpoints.ts',import.meta.url);
  const e=await import(ui.href),config=liveConfig(env,e);
  // Validate only file metadata, not OAuth contents, and never log these paths.
  await access(env.UBU_GOOGLE_CREDENTIALS_PATH,constants.R_OK);await access(env.UBU_REHEARSAL_BINARY,constants.X_OK);
  try {await access(env.UBU_GOOGLE_TOKEN_CACHE_PATH,constants.R_OK|constants.W_OK);} catch(error) {
    if(error.code!=='ENOENT') throw new Error('token_unavailable');
    await access(dirname(env.UBU_GOOGLE_TOKEN_CACHE_PATH),constants.W_OK);
  }
  await access(dirname(config.store),constants.W_OK);
  try {await stat(config.store);throw new Error('fresh_store_required');} catch(error){if(error.code!=='ENOENT')throw new Error('fresh_store_required');}
  const readline=createInterface({input:process.stdin,output:process.stdout});
  let child,server;let stopping=false,stopPromise;
  const stop=()=>stopPromise ??= (async()=>{
    stopping=true;
    readline.close();
    if(server?.listening){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    if(child?.pid && child.exitCode===null && child.signalCode===null){
      await new Promise(resolve=>{child.once('exit',()=>{clearTimeout(timer);resolve();});
        const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},2000);child.kill('SIGTERM');});
    }
  })();
  // Runtime-only cleanup: tests never execute cli or install signal handlers.
  const interrupted=()=>{void stop();};
  try {
    console.log(`store: ${config.store}\ncalendar: ${config.calendar}\nSecond invocation is a second rehearsal. Reset the calendar yourself before starting.`);
    if(await readline.question('Type live to confirm these destinations and the calendar reset prerequisite: ')!=='live')return;
    const backendPort=await freePort(),base=`http://127.0.0.1:${backendPort}`;
    const report=new PublicReport(e,{compare:args.includes('--compare')});
    const observe=(record,forwarded)=>report.observe(record,forwarded);
    server=http.createServer(createForwarder({base,port:backendPort,endpoints:e,observe}));
    await new Promise((yes,no)=>{server.once('error',no);server.listen(config.port,'127.0.0.1',yes);});
    child=spawn(env.UBU_REHEARSAL_BINARY,[],{cwd:env.ORCHESTRATOR_DIR ?? fileURLToPath(new URL('../../ubu-orchestrator',import.meta.url)),env:{...env,UBU_ORCHESTRATOR_PORT:String(backendPort),HOST:'127.0.0.1',BIND_ADDR:'127.0.0.1'},stdio:'ignore'});
    await new Promise((yes,no)=>{child.once('spawn',yes);child.once('error',()=>no(new Error('owned_startup_failed')));});
    process.once('SIGINT',interrupted);process.once('SIGTERM',interrupted);
    const deadline=Date.now()+60000;
    for(;;){if(child.exitCode!==null || stopping)throw new Error('owned_orchestrator_unavailable');try{const health=await requestJson(base,'GET',e.HEALTH_PATH,undefined,{allowedPorts:new Set([backendPort]),timeoutMs:1000});if(health.status!==200)throw new Error('health_unavailable');break;}catch{if(Date.now()>deadline)throw new Error('startup_timeout');await new Promise(resolve=>setTimeout(resolve,100));}}
    const call=(method,path,body)=>requestJson(base,method,path,body,{allowedPorts:new Set([backendPort])});
    if(args.includes('--compare')) {
      console.log('Comparison: perform the appendix UI actions once through this forwarding port. Do not run a second orchestrator or repeat the driver actions. Finish manual reading before returning here.');
      await readline.question('Press Enter after the manual comparison readings are complete: ');
    } else {
      await runActions({endpoints:e,inputs:config.inputs,call,observe,approve:async preview=>{
        console.log(previewLines(preview,e.CALENDAR_PREVIEW_PATH).join('\n'));
        console.log('Operation summaries and identities withheld. Inspect your Plan in Calendar before deciding. This API preview is not the UI preview snapshot.');
        return await readline.question('Type approve to WRITE this preview to the real calendar, or anything else to decline: ')==='approve';
      }});
      console.log('Open Today, Calendar, Tasks and Review. Read private requirement/proposal contents there. Admissions/rejections remain your deliberate actions.');
      await readline.question('Press Enter after the visual pass: ');
    }
    console.log('Four public judgment sentences follow. Do not paste a title, name, condition, fact key/value/row, credential or token. Describe your judgment in your own words.');
    const answers=await collectJudgments(prompt=>readline.question(prompt),{withheld:privateStrings([config.inputs,env.UBU_GOOGLE_CREDENTIALS_PATH,env.UBU_GOOGLE_TOKEN_CACHE_PATH,env.UBU_REHEARSAL_BINARY])});
    console.log(report.render(answers));
  } finally {process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);await stop();}
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  cli().catch(()=>{console.error('Rehearsal could not start or continue; configuration, destination or transport unavailable. Private details withheld.');process.exitCode=1;});
}
