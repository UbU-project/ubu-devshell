// These are deliberately public operator-authored judgments, never API fields.
export const QUESTIONS=Object.freeze([
  'whether what it chose to schedule is what he would have chosen, and whether this is a store he would plan tomorrow on',
  "whether the precondition's words express his requirement",
  'whether a proposed name was worth recording',
  'whether anything on Today or Calendar looked visibly wrong'
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
    let answer;try {answer=await question(`${prompt}\nYour public judgment sentence: `);} catch {}
    if(typeof answer!=='string'||!answer.trim())answers.push('unanswered');
    else if(withheld.some(value=>answer.includes(value)))answers.push('answer withheld because it included known private configuration');
    else answers.push(answer);
  }
  return answers;
}
