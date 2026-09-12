export function solutions(regions,limit=2){
  const n=regions.length,out=[];
  function visit(cols,used,zones){if(out.length>=limit)return;if(cols.length===n){out.push([...cols]);return;}
    const r=cols.length;for(let c=0;c<n;c++){const z=regions[r][c];if((used&(1<<c))||(zones&(1<<z))||(r&&Math.abs(c-cols[r-1])<=1))continue;cols.push(c);visit(cols,used|(1<<c),zones|(1<<z));cols.pop();}}
  visit([],0,0);return out;
}
export function generateLevel(n,random=Math.random){
  if(!Number.isInteger(n)||n<5||n>12)throw Error('Invalid size');
  const pick=a=>a[Math.floor(random()*a.length)],shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const neighbors=Array.from({length:n*n},(_,i)=>[i%n?i-1:-1,i%n<n-1?i+1:-1,i>=n?i-n:-1,i<n*(n-1)?i+n:-1].filter(j=>j>=0));
  for(let attempt=0;attempt<50000;attempt++){
    const answer=shuffle(Array.from({length:n},(_,i)=>i));if(answer.some((c,r)=>r&&Math.abs(c-answer[r-1])<=1))continue;
    const stars=answer.map((c,r)=>r*n+c),grid=Array(n*n).fill(-1);stars.forEach((i,z)=>grid[i]=z);
    const background=Math.floor(random()*n);
    for(const z of shuffle(Array.from({length:n},(_,i)=>i).filter(i=>i!==background))){
      const cells=[stars[z]],target=2+Math.floor(random()*3);
      while(cells.length<target){const edges=[...new Set(cells.flatMap(i=>neighbors[i]).filter(i=>grid[i]===-1))];if(!edges.length)break;const i=pick(edges);grid[i]=z;cells.push(i);}
    }
    for(let i=0;i<grid.length;i++)if(grid[i]===-1)grid[i]=background;
    const seen=new Set(),todo=[stars[background]];
    while(todo.length){const i=todo.pop();if(seen.has(i))continue;seen.add(i);for(const j of neighbors[i])if(grid[j]===background&&!seen.has(j))todo.push(j);}
    if(seen.size!==grid.filter(z=>z===background).length)continue;
    const regions=Array.from({length:n},(_,r)=>grid.slice(r*n,(r+1)*n));if(solutions(regions).length!==1)continue;
    return {id:'challenge-'+n+'-'+Date.now()+'-'+attempt,size:n,regions,solution:answer,timeLimitSeconds:0};
  }
  throw Error('请重试生成关卡');
}
