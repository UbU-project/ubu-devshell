import * as realFs from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { INPUT_RULES } from './live-rehearsal-contract.mjs';
import { RESPONSE_STATUSES } from './live-rehearsal-report.mjs';
import codeNames from './live-rehearsal-codes.json' with {type:'json'};

export const REMEDIES=Object.freeze({
  required_configuration_missing:'Set each named variable in your private environment, then run again.',
  absolute_path_required:'Set each named path variable to an absolute path, then run again.',
  configuration_file_required:'Correct the named variable so its file/check meets the stated requirement. Set optional values or unset them.',
  token_unavailable:'Correct UBU_GOOGLE_TOKEN_CACHE_PATH; its file must be readable/writable or its parent writable.',
  fresh_store_required:'Stop the owned orchestrator, run the displayed cleanup command, reset the rehearsal calendar, then run again.',
  orchestrator_port_unavailable:'Stop acceptance.sh, run-live.sh or the stale orchestrator using this port, then run again.',
  owned_startup_failed:'Check the binary and checkout configuration and the private startup stderr shown on screen.',
  owned_orchestrator_unavailable:'Correct the private startup error shown on screen before starting a fresh rehearsal.',
  startup_timeout:'Correct the private startup error and make the owned health endpoint available before running again.',
  unsupported_argument:'Use --check-inputs for pre-flight, or no arguments for the rehearsal; --help shows configuration. No comparison or approval flag exists.',
  terminal_required:'Run from an interactive terminal so you can give consent and make the approval decision.',
  mock_configuration_refused:'Unset UBU_CALENDAR_MOCK_EVENTS for this real-calendar rehearsal.',
  invalid_port:'Set UBU_ORCHESTRATOR_PORT to an integer from 1 to 65535, or leave it unset for the UI default.',
  invalid_private_inputs:'Correct the named field in UBU_REHEARSAL_INPUTS privately to satisfy the named rule; see LIVE_REHEARSAL_DRIVER.md.',
  configuration_destination_or_transport_unavailable:'Check the selected environment and local checkout; paste this file when the cause remains unknown.',
  build_environment_unavailable:'Correct CARGO_BUILD_JOBS/UBU_TARGET_ROOT and the sourced env.sh build configuration; retain exclusion and memory limits.',
  offline_build_failed:'Make the locked offline orchestrator build pass under env.sh; stop a conflicting build/worker first.',
  launcher_failed:'Check Node 22 or newer, the checkout and the local offline build setup; paste this file when the cause remains unknown.',
  copy_back_unwritable:'Set UBU_REHEARSAL_OUTPUT to a writable file path outside credentials and state files, then run again.',
  startup_confirmation_declined:'Check the displayed store/calendar and reset prerequisite before deliberately typing live.',
  interrupted:'Review any actions already applied; reset the calendar and select a fresh store before starting another rehearsal.',
  action_request_failed:'Correct the private API diagnostic shown on screen and the named action configuration before another rehearsal.',
  preview_unavailable:'Generate a valid non-stale preview before authorizing a calendar write; inspect the private diagnosis.',
  approval_interrupted:'Review whether a calendar write occurred; use a fresh store/reset before another rehearsal.',
  task_selector_unavailable:'Correct the private Task selector to exactly one captured ordinary active Task.',
  task_unavailable:'Correct the private Task selector/version; choose an ordinary active Task.',
  calendar_session_unavailable:'Complete Google consent with the configured credential/token files and enable the session.',
  advisory_run_failed:'Correct private advisory endpoint/model/budget settings using the diagnostic on screen; do not rerun for preferred candidates.',
  subject_registry_unavailable:'Use the matching orchestrator checkout with subject metadata and complete non-negative reference counts, then start a fresh rehearsal.',
  judgment_unanswered:'Provide one non-empty judgment sentence for each of the three questions.',
  judgment_private_content:'Describe your judgment without copying known private data into the public answer.',
  help_requested:'Set your private environment and run run-live-rehearsal.sh without arguments.'
});
const variables=new Set(['UBU_DB_PATH','UBU_GOOGLE_CALENDAR_ID','UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_REHEARSAL_BINARY','UBU_REHEARSAL_INPUTS','UBU_ORCHESTRATOR_PORT','ORCHESTRATOR_DIR','UBU_REHEARSAL_OUTPUT','CARGO_BUILD_JOBS','UBU_TARGET_ROOT','UBU_PLANNING_WORKER_PYTHON','UBU_PLANNING_WORKER_PROBE_TIMEOUT_MS','UBU_PLANNER_STRATEGY']);
const checks=new Set(['missing','absolute path','stat','connection_or_timeout','invalid_json','response_too_large','unexpected_status','readable regular file','executable regular file','readable/writable regular file','writable parent','invalid JSON/field shape','greedy or chunked','probe budget 1 to 30000','endpoint configured','model configured','endpoint answers','model present','worker module and pinned torch']);
const inputRules=new Set(INPUT_RULES);
// Structural field paths only, never supplied keys or values.
const inputField=value=>typeof value==='string'&&/^(?:inputs|settings|subjects|mutations|ranking(?:\.(?:seed|layers))?|settings\[(?:0|[1-9][0-9]*)\](?:\.(?:name|value))?|subjects\[(?:0|[1-9][0-9]*)\])$/.test(value);
const actions=new Set(['routine','colour_setting','advisory_setting','planning_setting','subject_setting','session','capture','ranking_lookup','ranking_statement','plan','preview','approval','universe_before','subject','authoring','task_lookup','task_read','requirement','requirement_readback','registry','vocabulary','precondition','queue','advisory_readiness','risk_read','human_complete','time_by_category']);
export class RehearsalFault extends Error {
  constructor(code,context={}) {super(Object.hasOwn(REMEDIES,code)?code:'configuration_destination_or_transport_unavailable');this.code=this.message;this.context=context;}
}
export const shellPath=path=>"$'"+String(path).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/[\x00-\x1f\x7f]/g,c=>'\\x'+c.charCodeAt(0).toString(16).padStart(2,'0'))+"'";
export function failureLine(error) {
  const fault=error instanceof RehearsalFault?error:new RehearsalFault('configuration_destination_or_transport_unavailable');
  const c=fault.context,parts=[];
  if(Array.isArray(c.variables))parts.push(c.variables.filter(v=>variables.has(v)).join(', '));
  if(variables.has(c.variable))parts.push(c.variable);
  if(fault.code==='invalid_private_inputs'&&inputField(c.field))parts.push('field: '+c.field);
  if(fault.code==='invalid_private_inputs'&&inputRules.has(c.rule))parts.push('rule: '+c.rule);
  if(checks.has(c.check))parts.push('failed check: '+c.check);
  if(actions.has(c.action))parts.push('action: '+c.action);
  if(Number.isSafeInteger(c.status))parts.push('HTTP '+c.status);
  if(RESPONSE_STATUSES.includes(c.response_status))parts.push('response status: '+c.response_status);
  if(c.diagnostic_codes&&typeof c.diagnostic_codes==='object') {
    const allowed=new Set([...codeNames,'withheld_unknown']);
    const counts=Object.fromEntries(Object.entries(c.diagnostic_codes).filter(([code,n])=>allowed.has(code)&&Number.isSafeInteger(n)&&n>=0));
    parts.push('diagnostics[].code: '+JSON.stringify(counts));
  }
  if(Number.isSafeInteger(c.port)&&c.port>0&&c.port<65536)parts.push('port '+c.port);
  if(fault.code==='fresh_store_required'&&typeof c.store==='string') {
    parts.push('store '+JSON.stringify(c.store));
    parts.push('cleanup: rm -f -- '+[c.store,c.store+'-wal',c.store+'-shm'].map(shellPath).join(' '));
  }
  return `${fault.code}: ${parts.filter(Boolean).join('; ')||'run did not complete'}. Remedy: ${REMEDIES[fault.code]}\n`;
}
export function outputPath(env=process.env,cwd=process.cwd()) {
  return resolve(cwd,env.UBU_REHEARSAL_OUTPUT||'./live-rehearsal-copy-back.txt');
}
export async function writePublicArtifact(text,{env=process.env,cwd=process.cwd(),fs=realFs}={}) {
  const path=outputPath(env,cwd),temporary=path+'.tmp-'+randomUUID();
  // Credential/token/state paths must never become an output sink.
  const reserved=['UBU_GOOGLE_CREDENTIALS_PATH','UBU_GOOGLE_TOKEN_CACHE_PATH','UBU_DB_PATH','UBU_REHEARSAL_BINARY'].flatMap(key=>env[key]?[resolve(cwd,env[key]),...(key==='UBU_DB_PATH'?['-wal','-shm'].map(s=>resolve(cwd,env[key]+s)):[])]:[]);
  if(reserved.includes(path))throw new RehearsalFault('copy_back_unwritable',{variable:'UBU_REHEARSAL_OUTPUT'});
  try {
    const existing=await fs.lstat(path).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(existing&&!existing.isFile())throw new Error('output is not a regular file');
    await fs.access(dirname(path),2);
    await fs.writeFile(temporary,text,{mode:0o600,flag:'wx'});
    await fs.rename(temporary,path);
  } catch {await fs.rm(temporary,{force:true}).catch(()=>{});throw new RehearsalFault('copy_back_unwritable',{variable:'UBU_REHEARSAL_OUTPUT'});}
  return path;
}
export async function finishFailure(error,{report,print=console.error,...options}={}) {
  const line=failureLine(error);print(line.trimEnd());
  try {const path=await writePublicArtifact((report?report.render()+'\n':'')+line,options);print('Copy-back file: '+JSON.stringify(path));return path;}
  catch(writeError){print(failureLine(writeError).trimEnd());return null;}
}
export function scrubPrivatePaths(text,withheld=[]) {
  let result=text;
  for(const value of withheld.filter(v=>typeof v==='string'&&v)) {
    for(const spelling of [value,JSON.stringify(value).slice(1,-1),encodeURIComponent(value)])result=result.split(spelling).join('[credential/token path withheld]');
  }
  return result;
}
export function startupBuffer(withheld=[],limit=65536) {
  let text='',active=true;
  return {
    add(chunk){if(active)text=(text+chunk.toString('utf8')).slice(-limit);},
    lines(){const result=scrubPrivatePaths(text.split(/\r?\n/).slice(-20).join('\n'),withheld);return result.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));},
    clear(){active=false;text='';}
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const code=process.argv[2],variable=process.argv[3];
  await finishFailure(new RehearsalFault(code,{variable,store:process.env.UBU_DB_PATH}));
}
