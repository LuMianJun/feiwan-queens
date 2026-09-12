export function solutions(regions,limit=2){
  const n=regions.length,out=[];
  function visit(cols,used,zones){if(out.length>=limit)return;if(cols.length===n){out.push([...cols]);return;}
    const r=cols.length;for(let c=0;c<n;c++){const z=regions[r][c];if((used&(1<<c))||(zones&(1<<z))||(r&&Math.abs(c-cols[r-1])<=1))continue;cols.push(c);visit(cols,used|(1<<c),zones|(1<<z));cols.pop();}}
  visit([],0,0);return out;
}
