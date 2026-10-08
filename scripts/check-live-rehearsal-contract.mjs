// Offline source agreement, no process, HTTP, or operator data access.
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {SETTING_NAMES,SETTING_PREFIXES,RESERVED_SUBJECTS,GOVERNED_SUBJECTS,SETTING_VALUE_RULES,REVIEW_DEFAULTS} from './live-rehearsal-contract.mjs';

// Bounded lexical extraction, not a general Rust parser. Strings/comments are
// atomic, so a message cannot supply a brace or masquerade as emitted code.
export function tokens(source) {
  const result=[];
  const pattern=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|r(#+)?"[\s\S]*?"\1|"(?:\\.|[^"\\])*"|[A-Za-z_][A-Za-z_0-9]*|[0-9][0-9_]*|=>|::|[^\s]/g;
  for(const match of source.matchAll(pattern)) {
    const raw=match[0];
    if(raw.startsWith('//')||raw.startsWith('/*'))continue;
    if(raw.startsWith('"'))result.push({v:raw.slice(1,-1),string:true});
    else if(raw.startsWith('r"')||/^r#+"/.test(raw))result.push({v:raw.slice(raw.indexOf('"')+1,raw.lastIndexOf('"')),string:true});
    else result.push({v:raw,string:false});
  }
  return result;
}
function endGroup(t,start) {
  const close={'(':')','[':']','{':'}'}[t[start]?.v];
  assert(close,'source group missing');
  const stack=[close];
  for(let i=start+1;i<t.length;i++) {
    if(t[i].string)continue;
    if(['(','[','{'].includes(t[i].v))stack.push({'(':')','[':']','{':'}'}[t[i].v]);
    else if(t[i].v===stack.at(-1)) {stack.pop();if(!stack.length)return i;}
  }
  throw Error('unterminated source group');
}
function expression(t,start,stop=',') {
  let end=start;
  while(end<t.length&&!(t[end].v===stop&&!t[end].string)) {
    if(!t[end].string&&['(','[','{'].includes(t[end].v))end=endGroup(t,end);
    end++;
  }
  return t.slice(start,end);
}
function args(t,start) {
  const end=endGroup(t,start),result=[];
  let i=start+1;
  while(i<end) {const arg=expression(t.slice(0,end),i);result.push(arg);i+=arg.length+1;}
  return result;
}
function fnTokens(t,name) {
  const index=t.findIndex((token,i)=>token.v==='fn'&&t[i+1]?.v===name);
  assert(index>=0,`source function missing: ${name}`);
  let start=index;
  while(start<t.length&&t[start].v!=='{')start++;
  return t.slice(start+1,endGroup(t,start));
}
function constants(t) {
  const values=new Map();
  for(let i=0;i<t.length;i++)if(t[i].v==='const') {
    let j=i+2;while(j<t.length&&!['=',';'].includes(t[j].v))j++;
    if(t[j].v==='='&&t[j+1]?.string)values.set(t[i+1].v,t[j+1].v);
  }
  return values;
}
const sorted=values=>[...new Set(values)].sort();
export function settingsFromSource(authoring,subjects) {
  const t=tokens(authoring),s=tokens(subjects),values=constants([...t,...s]);
  const body=fnTokens(t,'validate_name');
  const match=body.findIndex((v,i)=>v.v==='matches'&&body[i+1]?.v==='!');
  assert(match>=0,'validate_name match arms missing');
  const arms=args(body,match+2)[1];
  const names=arms.filter(v=>v.string||values.has(v.v)).map(v=>v.string?v.v:values.get(v.v));
  const prefixes=[];
  for(let i=0;i<body.length;i++)if(body[i].v==='strip_prefix') {
    const value=args(body,i+1)[0].at(-1);
    assert(value.string||values.has(value.v),'unresolved setting prefix');
    prefixes.push(value.string?value.v:values.get(value.v));
  }
  const root=fnTokens(s,'validate_root');
  const firstArray=root.findIndex(v=>v.v==='[');
  const reserved=root.slice(firstArray,endGroup(root,firstArray)).filter(v=>v.string).map(v=>v.v);
  const governedIndex=s.findIndex(v=>v.v==='GOVERNED');
  let array=governedIndex;while(s[array].v!=='=')array++;array++;
  const governed=s.slice(array,endGroup(s,array)).filter(v=>v.string).map(v=>v.v);
  return {names:sorted(names),prefixes:sorted(prefixes),reserved:sorted(reserved),governed:sorted(governed)};
}
export function assertSettingsAgreement(authoring,subjects) {
  assert.deepEqual(settingsFromSource(authoring,subjects),{
    names:sorted(SETTING_NAMES),prefixes:sorted(SETTING_PREFIXES),
    reserved:sorted(RESERVED_SUBJECTS),governed:sorted(GOVERNED_SUBJECTS)
  },'driver settings gate differs from validator');
}
function production(t) {
  // Remove test-only items while retaining production items after a test module.
  const out=[];
  for(let i=0;i<t.length;i++) {
    if(t[i].v==='#'&&t[i+1]?.v==='[') {
      const end=endGroup(t,i+1),attr=t.slice(i+2,end).map(v=>v.v).join('');
      if(attr==='cfg(test)') {let body=end+1;while(body<t.length&&t[body].v!=='{')body++;i=endGroup(t,body);continue;}
    }
    out.push(t[i]);
  }
  return out;
}
export function emittedCodes(sources,kernelDiagnostics) {
  const streams=sources.map(source=>production(tokens(source)));
  const values=constants(streams.flat());
  const ambiguous=new Set(),seen=new Map();
  for(const stream of streams)for(const [name,value] of constants(stream)) {
    if(seen.has(name)&&seen.get(name)!==value)ambiguous.add(name);
    seen.set(name,value);
  }
  let localValues=new Map();
  const helpers=new Map([['bad_request_diagnostic',0],['conflict_diagnostic',0],['bad_request_diagnostics',1]]);
  for(const t of streams)for(let i=0;i<t.length;i++)if(t[i].v==='fn'&&t[i+2]?.v==='(') {
    const parameters=args(t,i+2);
    const index=parameters.findIndex(p=>p[0]?.v==='code'&&p[1]?.v===':');
    if(index>=0)helpers.set(t[i+1].v,index);
  }
  // Code-parameter closures use the same argument contract as named helpers.
  for(const t of streams)for(let i=0;i<t.length;i++)if(t[i].v==='let'&&t[i+2]?.v==='='&&t[i+3]?.v==='|'&&t[i+4]?.v==='code')helpers.set(t[i+1].v,0);
  const found=new Set();
  const staticFormat=expr=>{
    for(let i=0;i<expr.length;i++)if(expr[i].v==='format'&&expr[i+1]?.v==='!') {
      const call=args(expr,i+2);
      assert(call.length===2&&call[0].length===1&&call[0][0].string&&call[0][0].v==='{:?}',
        'new dynamic diagnostic format needs a closed-source extractor');
    }
  };
  const collect=expr=>{for(let index=0;index<expr.length;index++) {
    const token=expr[index],previous=expr[index-1]?.v;
    // Only a returned code value is public. Predicate arguments, JSON keys
    // and message tuple members are not code values, whatever their spelling.
    if(index!==0&&!['{','=>','return',';'].includes(previous))continue;
    if(token.v==='Some'&&expr[index+1]?.v==='(') {collect(args(expr,index+1)[0]);continue;}
    if(!token.string&&ambiguous.has(token.v)&&!localValues.has(token.v))throw Error('ambiguous imported diagnostic constant; resolve its source before refreshing');
    const value=token.string?token.v:localValues.get(token.v)??values.get(token.v);
    if(value!==undefined) {
      assert(/^[A-Za-z][A-Za-z_0-9.-]*$/.test(value),`unsupported static code syntax needs an explicit extractor (${token.string?'literal':token.v})`);
      found.add(value);
    }
  }};
  const collectTuples=(expr,slot)=>{
    for(let index=0;index<expr.length;index++)if(expr[index].v==='('&&!expr[index].string) {
      const previous=expr[index-1]?.v;
      if(index===0||['=>','{','[',',','(',';','return'].includes(previous)) {
        const tuple=args(expr,index);
        if(tuple.length>slot+1) {collect(tuple[slot]);index=endGroup(expr,index);}
      }
    }
  };
  for(const t of streams) {localValues=constants(t);for(let i=0;i<t.length;i++) {
    if(t[i].v==='fn'&&t[i+1]?.v.endsWith('_code')) {
      const body=fnTokens(t,t[i+1].v);staticFormat(body);collect(body);
    }
    if(t[i].v==='code'&&t[i+1]?.v===':') {
      const expr=expression(t,i+2);
      staticFormat(expr);
      collect(expr);
    }
    if(helpers.has(t[i].v)&&t[i+1]?.v==='(') {
      const arg=args(t,i+1)[helpers.get(t[i].v)]??[];
      collect(arg);
      if(t[i].v==='bad_request_diagnostics'&&arg.length===1) {
        const name=arg[0].v;
        let declaration=-1;
        for(let j=0;j<i;j++)if(t[j].v==='let'&&(t[j+1]?.v===name||(t[j+1]?.v==='mut'&&t[j+2]?.v===name)))declaration=j;
        assert(declaration>=0,'diagnostic batch source unresolved');
        let equal=declaration;while(t[equal].v!=='=')equal++;
        collectTuples(expression(t,equal+1,';'),0);
        for(let j=0;j<t.length;j++)if(t[j].v===name&&t[j+1]?.v==='.'&&t[j+2]?.v==='push'&&t[j+3]?.v==='(')collectTuples(args(t,j+3)[0],0);
      }
    }
    if(t[i].v==='let') {
      let equal=i+1;while(equal<t.length&&!['=',';'].includes(t[equal].v))equal++;
      if(t[equal]?.v==='='&&t[i+1]?.v!=='Some'&&t.slice(i+1,equal).some(v=>!v.string&&v.v==='code')) {
        const value=expression(t,equal+1,';');
        // In (code,message) batches, message formatting is intentionally private.
        if(t[i+1]?.v==='code'||(t[i+1]?.v==='mut'&&t[i+2]?.v==='code'))staticFormat(value);
        if(t[i+1]?.v==='(') {
          const pattern=args(t,i+1);
          const slot=pattern.findIndex(part=>part.some(v=>v.v==='code'));
          assert(slot>=0,'code tuple binding changed');collectTuples(value,slot);
        } else collect(value);
      }
    }
  }}
  // The service forwards kernel codes through Debug, and NextAction's enum
  // through serde snake_case. Both vocabularies derive from their enum bodies.
  for(const [source,name,snake] of [[kernelDiagnostics,'DiagnosticCode',false],
    [sources.find(s=>s.includes('pub enum NextActionDiagnosticCode')),'NextActionDiagnosticCode',true]]) {
    assert(source,`enum source missing: ${name}`);
    const t=tokens(source),index=t.findIndex((v,i)=>v.v==='enum'&&t[i+1]?.v===name),start=index+2;
    assert(index>=0&&t[start].v==='{','diagnostic enum shape changed');
    const body=t.slice(start+1,endGroup(t,start));
    assert(body.every(v=>!v.string&&(v.v===','||/^[A-Z][A-Za-z0-9]*$/.test(v.v))),'new diagnostic enum representation needs an explicit extractor');
    const members=body.filter(v=>v.v!==',');
    for(const member of members)found.add(snake?member.v.replace(/[A-Z]/g,(c,i)=>(i?'_':'')+c.toLowerCase()):member.v);
  }
  return sorted(found);
}
export function assertCodesAgreement(actual,known) {
  assert.deepEqual(sorted(known),sorted(actual),'public diagnostic vocabulary differs from emitted source; regenerate and review it');
}
async function rustSources(url) {
  const sources=[];
  for(const entry of await readdir(url,{withFileTypes:true})) {
    const child=new URL(entry.name+(entry.isDirectory()?'/':''),url);
    if(entry.isDirectory())sources.push(...await rustSources(child));
    else if(entry.name.endsWith('.rs'))sources.push(await readFile(child,'utf8'));
  }
  return sources;
}
export async function checkSourceAgreement({write=false}={}) {
  const orchestrator=new URL('../../ubu-orchestrator/src/',import.meta.url);
  const authoring=await readFile(new URL('services/setting_authoring.rs',orchestrator),'utf8');
  const subjects=await readFile(new URL('services/subject_vocabulary.rs',orchestrator),'utf8');
  assertSettingsAgreement(authoring,subjects);
  const hashes={};
  for(const [source,names] of [[authoring,['validate_name','valid_advisory_timeout','valid_advisory_endpoint','put','review_days','check_review_pair']],
    [subjects,['snake_case','validate_root']]])for(const name of names) {
    let body=fnTokens(tokens(source),name);
    if(name==='put')body=body.slice(0,body.findIndex(v=>v.v==='_import'));
    hashes[name]=createHash('sha256').update(JSON.stringify(body)).digest('hex');
  }
  // Numeric bounds/colour membership are constants outside those function bodies.
  for(const name of ['MIN_ADVISORY_TIMEOUT_MS','MAX_ADVISORY_TIMEOUT_MS','MAX_ROOT_BYTES']) {
    const source=name==='MAX_ROOT_BYTES'?subjects:authoring;
    hashes[name]=source.match(new RegExp(`const ${name}[^=]*=([^;]+);`))?.[1].trim();
    assert(hashes[name],`validation constant missing: ${name}`);
  }
  const palette=await readFile(new URL('category_palette.rs',orchestrator),'utf8');
  hashes.colours=palette.match(/const ALLOWED_COLOR_IDS[^=]*=\s*(\[[\s\S]*?\]);/)?.[1];
  assert(hashes.colours,'colour vocabulary missing');
  const numeric=value=>Number(value.replaceAll('_',''));
  assert.equal(numeric(hashes.MIN_ADVISORY_TIMEOUT_MS),SETTING_VALUE_RULES.timeoutMin);
  assert.equal(numeric(hashes.MAX_ADVISORY_TIMEOUT_MS),SETTING_VALUE_RULES.timeoutMax);
  assert.equal(numeric(hashes.MAX_ROOT_BYTES),SETTING_VALUE_RULES.rootBytes);
  assert.deepEqual([...hashes.colours.matchAll(/"([0-9]+)"/g)].map(m=>m[1]),Array.from({length:11},(_,i)=>String(i+1)));
  const defaults=authoring.match(/let default\s*=\s*if name == REVIEW_SEED\s*\{\s*(\d+)\s*\}\s*else\s*\{\s*(\d+)\s*\}/);
  assert(defaults,'review default shape changed');
  assert.deepEqual({seed:Number(defaults[1]),ceiling:Number(defaults[2])},REVIEW_DEFAULTS);
  const interval=authoring.match(/!\s*\(\s*(\d+)\s*\.\.=\s*(\d+)\s*\)\.contains\(&days\)/);
  assert(interval,'review bounds shape changed');
  assert.deepEqual([Number(interval[1]),Number(interval[2])],[SETTING_VALUE_RULES.reviewMin,SETTING_VALUE_RULES.reviewMax]);
  const codes=emittedCodes(await rustSources(orchestrator),await readFile(new URL('../../ubu-planning-kernel/crates/ubu-planning-core/src/diagnostics.rs',import.meta.url),'utf8'));
  const codesUrl=new URL('live-rehearsal-codes.json',import.meta.url),rulesUrl=new URL('live-rehearsal-validation.json',import.meta.url);
  if(write) {
    await writeFile(codesUrl,JSON.stringify(codes,null,2)+'\n');
    await writeFile(rulesUrl,JSON.stringify(hashes,null,2)+'\n');
  } else {
    assertCodesAgreement(codes,JSON.parse(await readFile(codesUrl,'utf8')));
    assert.deepEqual(hashes,JSON.parse(await readFile(rulesUrl,'utf8')),'validator values changed; update driver witnesses/rules before refreshing fingerprints');
  }
  return {settings:SETTING_NAMES.length,prefixes:SETTING_PREFIXES.length,codes:codes.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  assert(process.argv.slice(2).every(arg=>arg==='--write'),'unsupported check argument');
  console.log('PASS live rehearsal source agreement',await checkSourceAgreement({write:process.argv.includes('--write')}));
}
