import {generateBalanced, logicalSolve, seeded} from './generator-balanced.js?v=20260913-1';
import {solveFast, SearchBudgetExceeded} from './generator-fast.js?v=20260913-1';
import {templates} from './generator-templates.js?v=20260913-1';

// All acceptance budgets are operation counts, never elapsed time: same date/seed,
// version and options produce the same board even on a slower phone.
export const DEFAULT_BUDGET = Object.freeze({maxAttempts:256, maxNodes:10000, mutationAttempts:100});
const shuffle=(a,random)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const limitsFor=n=>({min:Math.max(2,Math.floor(n*.4)),max:Math.ceil(n*1.8)});

export function transformTemplate(base, symmetry, colors=Array.from({length:base.size},(_,i)=>i)){
  const n=base.size,regions=Array.from({length:n},()=>Array(n)),solution=Array(n);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    let y=r,x=c;if(symmetry&4)x=n-1-x;
    for(let k=0;k<(symmetry&3);k++)[y,x]=[x,n-1-y];
    regions[y][x]=colors[base.regions[r][c]];
    if(base.solution[r]===c)solution[y]=x;
  }
  return {regions,solution};
}

export function generateReliable(n,seed,options={}){
  if(!Number.isInteger(n)||n<5||n>12)throw new RangeError('Size must be 5 through 12');
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Seed must be uint32');
  const budget={...DEFAULT_BUDGET,...options};
  for(const key of Object.keys(DEFAULT_BUDGET))if(!Number.isSafeInteger(budget[key])||budget[key]<0)throw new RangeError('Invalid '+key);
  const started=performance.now(),metrics={nodes:0,calls:0,maxNodes:budget.maxNodes};
  let fresh,reason='attempt-budget';
  if(budget.maxNodes&&budget.maxAttempts)try{
    fresh=generateBalanced(n,seed,{maxMs:Infinity,maxAttempts:budget.maxAttempts,avoidCycles:true,solve:r=>solveFast(r,2,metrics)});
    if(!fresh.failed)return {...fresh,source:'fresh',solverMetrics:metrics,version:6};
  }catch(error){if(!(error instanceof SearchBudgetExceeded))throw error;reason='node-budget';}
  else reason='search-disabled';

  // Independently seeded fallback, unrelated to the amount of search completed.
  const random=seeded((seed^0x9e3779b9)>>>0),pool=templates.filter(t=>t.size===n);
  if(!pool.length)throw new Error('Missing verified template for '+n);
  const base=pool[Math.floor(random()*pool.length)],symmetry=Math.floor(random()*8);
  const colors=shuffle(Array.from({length:n},(_,i)=>i),random);
  let {regions,solution}=transformTemplate(base,symmetry,colors),logic=logicalSolve(regions);
  if(!logic.solved)throw new Error('Template transformation failed logic validation: '+base.id);
  const initial=regions.flat(),grid=[...initial],queenCells=new Set(solution.map((c,r)=>r*n+c));
  const areas=Array(n).fill(0);grid.forEach(z=>areas[z]++);
  const limits=limitsFor(n),neighbors=grid.map((_,i)=>[i%n?i-1:-1,i%n<n-1?i+1:-1,i>=n?i-n:-1,i<n*(n-1)?i+n:-1].filter(j=>j>=0));
  const counts={mutationAttempts:0,acceptedMoves:0,logicRejected:0,disconnected:0,revisited:0};
  const visited=new Set([grid.join(',')]);
  for(let attempt=0;attempt<budget.mutationAttempts;attempt++){
    counts.mutationAttempts++;
    const candidates=grid.flatMap((z,i)=>!queenCells.has(i)&&areas[z]>limits.min&&neighbors[i].some(j=>grid[j]!==z&&areas[grid[j]]<limits.max)?[i]:[]);
    if(!candidates.length)break;
    const i=candidates[Math.floor(random()*candidates.length)],from=grid[i];
    const destinations=[...new Set(neighbors[i].map(j=>grid[j]))].filter(z=>z!==from&&areas[z]<limits.max);
    const to=destinations[Math.floor(random()*destinations.length)];
    // Destination remains connected because it touches i. Check the source too.
    const start=grid.findIndex((z,j)=>z===from&&j!==i),seen=new Set(),todo=[start];
    while(todo.length){const j=todo.pop();if(seen.has(j))continue;seen.add(j);for(const k of neighbors[j])if(k!==i&&grid[k]===from&&!seen.has(k))todo.push(k);}
    if(seen.size!==areas[from]-1){counts.disconnected++;continue;}
    grid[i]=to;const signature=grid.join(',');
    if(visited.has(signature)){grid[i]=from;counts.revisited++;continue;}
    visited.add(signature);
    const candidate=Array.from({length:n},(_,r)=>grid.slice(r*n,(r+1)*n)),deduction=logicalSolve(candidate);
    // We never move any queen, so the known answer remains valid. A complete
    // sound deduction trace proves uniqueness as well; no exponential search.
    if(!deduction.solved){grid[i]=from;counts.logicRejected++;continue;}
    areas[from]--;areas[to]++;regions=candidate;logic=deduction;counts.acceptedMoves++;
  }
  const changedCells=grid.filter((z,i)=>z!==initial[i]).length;
  return {size:n,seed,regions,solution,areas,limits,logic,counts,solverMetrics:metrics,
    source:changedCells?'template-evolved':'verified-template',baseId:base.id,symmetry,changedCells,
    fallbackReason:reason,freshCounts:fresh?.counts,ms:Math.round(performance.now()-started),version:6};
}
