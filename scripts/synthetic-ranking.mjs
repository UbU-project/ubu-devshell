// Rehearsal stand-in only: pairwise statements, never planner values or rules.
export function mulberry32(seed) {
  let state=seed>>>0;
  return ()=>{
    state=(state+0x6d2b79f5)|0;
    let value=Math.imul(state^(state>>>15),1|state);
    value^=value+Math.imul(value^(value>>>7),61|value);
    return ((value^(value>>>14))>>>0)/4294967296;
  };
}
export function shuffle(items,random) {
  const result=[...items].sort();
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function rankingStatements(taskIds,{seed,layers}) {
  const ids=shuffle(taskIds,mulberry32(seed)),m=Math.min(layers,ids.length),buckets=[],statements=[];
  for(let p=0,offset=0;p<m;p++){const size=Math.floor(ids.length/m)+(p<ids.length%m?1:0);buckets.push(ids.slice(offset,offset+=size));}
  for(const bucket of buckets)for(let i=1;i<bucket.length;i++)statements.push({task_a:bucket[i-1],task_b:bucket[i],order:'a_indifferent_to_b'});
  for(let p=1;p<buckets.length;p++)statements.push({task_a:buckets[p-1][0],task_b:buckets[p][0],order:'a_preferred_to_b'});
  return {buckets,statements};
}
