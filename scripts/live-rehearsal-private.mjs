// Private presentation has no import, callback or output connection to PublicReport.
import { numericComparisonWords } from '../../ubu-ui/src/presentation/precondition.ts';
export const PRIVATE_BANNER='PRIVATE REHEARSAL DATA — your own content; never paste this screen.';
const plain=value=>typeof value==='string'?value:JSON.stringify(value)??'unavailable';
const safeText=value=>plain(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
export function conditionWords(condition,depth=0) {
  if(condition==null)return 'This Task has no precondition.';
  if(depth>16)return 'Condition exceeds terminal rendering depth; '+plain(condition);
  if(typeof condition!=='object')return plain(condition);
  const group=Array.isArray(condition.all_of)?{parts:condition.all_of,word:' and '}:Array.isArray(condition.any_of)?{parts:condition.any_of,word:' or '}:null;
  if(group)return '('+group.parts.map(part=>conditionWords(part,depth+1)).join(group.word)+')';
  const {target,predicate,expected}=condition;
  if(typeof target!=='string')return plain(condition);
  if(predicate==='equals')return `${target} is ${JSON.stringify(expected)??"unavailable"}`;
  if(predicate==='member_of')return `${target} is one of ${JSON.stringify(expected)??"unavailable"}`;
  if(predicate==='absent')return `${target} is not set`;
  const comparison=numericComparisonWords(predicate);
  if(comparison&&target.startsWith('numeric_values.')&&typeof expected==='number'&&Number.isFinite(expected))return `${target} ${comparison} ${JSON.stringify(expected)??"unavailable"}`;
  return plain(condition);
}
export class PrivateRenderer {
  constructor({print=console.log,credentialPaths=[]}={}) {this.print=print;this.credentialPaths=credentialPaths;this.knownContent=new Set();}
  remember(value){if(typeof value==='string'&&value.length>=4)this.knownContent.add(value);}
  rememberCondition(condition) {
    this.remember(conditionWords(condition));
    if(condition&&typeof condition==='object') {
      this.remember(condition.target);this.remember(typeof condition.expected==='string'?condition.expected:undefined);
      for(const group of ['all_of','any_of'])if(Array.isArray(condition[group]))condition[group].forEach(part=>this.rememberCondition(part));
    }
  }
  say(value){let text=safeText(value);for(const path of this.credentialPaths.filter(Boolean))text=text.split(path).join('[credential/token path withheld]');this.print(text);}
  observe(record) {
    const data=record.result?.data;if(!data||typeof data!=='object')return;
    this.say(PRIVATE_BANNER);
    if(Array.isArray(data.diagnostics))for(const diagnostic of data.diagnostics){this.remember(diagnostic?.message);this.say(`${plain(diagnostic?.code)}: ${plain(diagnostic?.message)}`);}
    if(record.label==='plan') {
      this.say('Plan placements:');
      for(const step of Array.isArray(data.plan?.steps)?data.plan.steps:[]){this.remember(step.summary);this.say(`${plain(step.summary)} | ${plain(step.start_at)} → ${plain(step.end_at)} | ${step.static_anchor===true?'Static':'Dynamic'}`);}
      this.say('Not in this Plan:');
      for(const task of Array.isArray(data.unplaced_tasks)?data.unplaced_tasks:[]){for(const value of [task.summary,task.reason,task.explanation])this.remember(value);this.say(`${plain(task.summary)}: ${plain(task.reason)}. ${plain(task.explanation)}`);for(const alternative of Array.isArray(task.safe_alternatives)?task.safe_alternatives:[])this.say(`${plain(alternative.label)}: ${plain(alternative.resulting_change_summary)}`);}
      for(const task of Array.isArray(data.blocked_tasks)?data.blocked_tasks:[]){this.remember(task.task_id);this.say(`Blocked Task ${plain(task.task_id)}: ${conditionWords(task.precondition)}`);}
      for(const task of Array.isArray(data.invalid_tasks)?data.invalid_tasks:[]){this.remember(task.error);this.say(`Invalid requirement: ${plain(task.error)}`);}
      const risk=data.risk_report??data.plan?.risk_report;
      this.say(`Plan risk: ${plain(risk?.level)}`);
      for(const finding of Array.isArray(risk?.findings)?risk.findings:[]){this.remember(finding.detail);this.say(`${plain(finding.category)} (${plain(finding.severity)}): ${plain(finding.detail)}`);}
    }
    if(record.label==='preview') {
      this.say('Preview — exactly the operations proposed for your approval:');
      for(const operation of Array.isArray(data.operations)?data.operations:[]){const event=operation.event;this.remember(event?.summary??operation.summary);this.say(`${plain(operation.kind)}: ${plain(event?.summary??operation.summary)}${event?` | ${plain(event.start_at)} → ${plain(event.end_at)} | ${operation.static_anchor===true?'Static':'Dynamic'}`:''}`);}
    }
    if(['task_read','requirement_readback'].includes(record.label)) {
      const words=conditionWords(data.payload?.preconditions);this.rememberCondition(data.payload?.preconditions);
      this.say(`${record.label==='requirement_readback'?'Saved':'Current'} requirement: ${words}`);
    }
    if(record.label==='queue') {
      this.say('Queued proposals:');
      for(const entry of Array.isArray(data.candidates)?data.candidates:[]) {
        const candidate=entry?.candidate,proposal=candidate?.normalized_proposal;if(!proposal)continue;
        const title=data.target_titles?.[candidate.target_refs?.[0]?.id];if(title){this.remember(title);this.say('Prompted by Task: '+title);}
        if(candidate.candidate_kind==='universe_target'){this.remember(proposal.target);this.say('Suggested name: '+plain(proposal.target));}
        else if(candidate.candidate_kind==='precondition'){
          if(proposal.existing_precondition){const words=conditionWords(proposal.existing_precondition);this.rememberCondition(proposal.existing_precondition);this.say('Currently required: '+words);}
          const words=conditionWords(proposal.proposed_precondition??proposal);this.rememberCondition(proposal.proposed_precondition??proposal);this.say('Proposed requirement: '+words);
        } else this.say('Proposal: '+plain(proposal));
      }
    }
  }
}
