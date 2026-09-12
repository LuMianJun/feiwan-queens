import {solutions} from './generator-exact.js?v=20260913-1';
export function seeded(seed){return ()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function logicalSolve(regions){
  const n=regions.length,z=regions.flat(),ids=Array.from({length:n*n},(_,i)=>i);
  const families=[ids.map(i=>Math.floor(i/n)),ids.map(i=>i%n),z];
  const groups=families.flatMap((f,k)=>Array.from({length:n},(_,g)=>({family:k,id:g,cells:ids.filter(i=>f[i]===g)})));
  const live=new Set(ids),found=new Set(),steps=[];
  const conflicts=(a,b)=>families.some(f=>f[a]===f[b])||(Math.abs(Math.floor(a/n)-Math.floor(b/n))<=1&&Math.abs(a%n-b%n)<=1);
  function remove(cells,rule,source){const removed=[...new Set(cells)].filter(i=>live.has(i)&&!found.has(i));if(!removed.length)return false;removed.forEach(i=>live.delete(i));steps.push({rule,source,removed});return true;}
  for(let iteration=0;iteration<n*n*3;iteration++){
    if(found.size===n)return {solved:true,found:[...found],steps,difficulty:steps.some(s=>s.rule==='pair')?'hard':steps.some(s=>s.rule!=='single')?'normal':'easy'};
    const active=groups.filter(g=>!g.cells.some(i=>found.has(i))).map(g=>({...g,candidates:g.cells.filter(i=>live.has(i))}));
    if(active.some(g=>!g.candidates.length))return {solved:false,contradiction:true,steps};
    const singles=active.filter(g=>g.candidates.length===1);
    if(singles.length){const g=singles[0],i=g.candidates[0];found.add(i);const removed=ids.filter(j=>j!==i&&live.has(j)&&conflicts(i,j));removed.forEach(j=>live.delete(j));steps.push({rule:'single',source:[g.family,g.id],placed:i,removed,availableSingles:singles.length});continue;}
    let changed=false;
    // Any cell conflicting with EVERY possible position of one required queen is impossible.
    for(const g of active){const removed=ids.filter(i=>!g.candidates.includes(i)&&g.candidates.every(j=>conflicts(i,j)));if(remove(removed,'common-exclusion',[g.family,g.id])){changed=true;break;}}
    if(changed)continue;
    // Two disjoint units whose candidates occupy exactly two units of another family.
    outer:for(let a=0;a<active.length;a++)for(let b=a+1;b<active.length;b++){
      const x=active[a],y=active[b];if(x.family!==y.family)continue;
      for(let target=0;target<3;target++){if(target===x.family)continue;const occupied=new Set([...x.candidates,...y.candidates].map(i=>families[target][i]));if(occupied.size!==2)continue;
        if(remove(ids.filter(i=>families[x.family][i]!==x.id&&families[x.family][i]!==y.id&&occupied.has(families[target][i])),'pair',[x.family,x.id,y.id,target,[...occupied]])){changed=true;break outer;}
      }
    }
    if(!changed)return {solved:false,steps,remaining:n-found.size};
  }
  return {solved:false,steps};
}
export function generateBalanced(n,seed,{maxAttempts=100000,maxMs=8000,solve=solutions,avoidCycles=false}={}){
  const random=seeded(seed),pick=a=>a[Math.floor(random()*a.length)],shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const ids=Array.from({length:n*n},(_,i)=>i),neighbors=ids.map(i=>[i%n?i-1:-1,i%n<n-1?i+1:-1,i>=n?i-n:-1,i<n*(n-1)?i+n:-1].filter(j=>j>=0));
  const min=Math.max(2,Math.floor(n*.4)),max=Math.ceil(n*1.8),started=performance.now();
  const counts={attempts:0,areaRejected:0,multiple:0,logicStuck:0,repairMoves:0,revisitedStates:0,repairStalled:0,solveMs:0};
  const checked=regions=>{const t=performance.now();const result=solve(regions);counts.solveMs+=performance.now()-t;return result;};
  for(let attempt=0;attempt<maxAttempts&&performance.now()-started<maxMs;attempt++){
    counts.attempts++;
    const answer=shuffle(Array.from({length:n},(_,i)=>i));if(answer.some((c,r)=>r&&Math.abs(c-answer[r-1])<=1))continue;
    const grid=Array(n*n).fill(-1),cells=answer.map((c,r)=>[r*n+c]);cells.forEach((a,z)=>grid[a[0]]=z);
    let left=n*n-n;
    while(left){
      const options=cells.map((a,z)=>({z,size:a.length,edges:[...new Set(a.flatMap(i=>neighbors[i]).filter(i=>grid[i]===-1))]})).filter(o=>o.edges.length&&o.size<max);
      if(!options.length)break;
      // Bias toward small regions without making all regions identical rectangles.
      const smallest=Math.min(...options.map(o=>o.size)),o=pick(options.filter(o=>o.size<=smallest+2)),i=pick(o.edges);
      grid[i]=o.z;cells[o.z].push(i);left--;
    }
    if(left||cells.some(a=>a.length<min)){counts.areaRejected++;continue;}
    let regions=Array.from({length:n},(_,r)=>grid.slice(r*n,(r+1)*n)),answers=checked(regions);
    const visited=new Set([grid.join(',')]);
    // Remove alternative solutions by transferring an alternative queen's boundary cell.
    // Never move a target queen or break connectivity/area constraints.
    for(let repair=0;answers.length>1&&repair<100;repair++){
      const alternate=answers.find(a=>a.some((c,r)=>c!==answer[r]));
      const candidates=shuffle(alternate.flatMap((c,r)=>c!==answer[r]?[r*n+c]:[]));let repaired=false;
      for(const i of candidates){
        const from=grid[i];if(cells[from].length<=min)continue;
        const remaining=cells[from].filter(j=>j!==i),seen=new Set(),todo=[remaining[0]];
        while(todo.length){const j=todo.pop();if(seen.has(j))continue;seen.add(j);for(const k of neighbors[j])if(k!==i&&grid[k]===from&&!seen.has(k))todo.push(k);}
        if(seen.size!==remaining.length)continue;
        const destinations=shuffle([...new Set(neighbors[i].map(j=>grid[j]))].filter(to=>to!==from&&cells[to].length<max));
        if(!destinations.length)continue;
        const to=destinations.find(to=>{if(!avoidCycles)return true;grid[i]=to;const seen=visited.has(grid.join(','));grid[i]=from;return !seen;});
        if(to===undefined)continue;
        grid[i]=to;cells[from]=remaining;cells[to].push(i);repaired=true;break;
      }
      if(!repaired){counts.repairStalled++;break;}
      counts.repairMoves++;const signature=grid.join(',');if(visited.has(signature))counts.revisitedStates++;visited.add(signature);
      regions=Array.from({length:n},(_,r)=>grid.slice(r*n,(r+1)*n));answers=checked(regions);
    }
    if(answers.length!==1){counts.multiple++;continue;}
    const logic=logicalSolve(regions);if(!logic.solved){counts.logicStuck++;continue;}
    return {size:n,seed,regions,solution:answer,areas:cells.map(a=>a.length),logic,counts,ms:Math.round(performance.now()-started),limits:{min,max}};
  }
  return {size:n,seed,failed:true,counts,ms:Math.round(performance.now()-started),limits:{min,max}};
}
