import { RehearsalFault } from './live-rehearsal-diagnostics.mjs';
// These are deliberately public operator-authored judgments, never API fields.
export const QUESTIONS=Object.freeze([
  'whether what it chose to schedule is what he would have chosen, and whether this is a store he would plan tomorrow on',
  "whether the precondition's words express his requirement",
  'whether a proposed name was worth recording'
]);
export function privateStrings(value) {
  if(typeof value==='string')return value.length>=4?[value]:[];
  if(Array.isArray(value))return value.flatMap(privateStrings);
  if(value&&typeof value==='object')return Object.values(value).flatMap(privateStrings);
  return [];
}
export async function collectJudgments(question,{withheld=[]}={}) {
  const answers=[];
  for(const prompt of QUESTIONS) {
    const answer=await question(`${prompt}\nYour public judgment sentence: `);
    if(typeof answer!=='string'||!answer.trim())throw new RehearsalFault('judgment_unanswered');
    else if(withheld.some(value=>answer.includes(value)))throw new RehearsalFault('judgment_private_content');
    else answers.push(answer);
  }
  return answers;
}
