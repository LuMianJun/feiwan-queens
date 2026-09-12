// Exact cover (row/column/region) + adjacency, smallest remaining unit first.
// Independent of the row-by-row solver used to validate accepted boards.
export class SearchBudgetExceeded extends Error {
  constructor(){super('Deterministic solver node budget exhausted');this.name='SearchBudgetExceeded';}
}
export function solveFast(regions,limit=2,metrics={}){
  const n=regions.length,flat=regions.flat(),all=(1<<n)-1,out=[];
  metrics.calls=(metrics.calls||0)+1;
  const zones=Array.from({length:n},()=>new Uint16Array(n));
  flat.forEach((z,i)=>zones[z][Math.floor(i/n)]|=1<<(i%n));
  const conflicts=flat.map((z,i)=>{
    const r=Math.floor(i/n),c=i%n,masks=Uint16Array.from(zones[z]);
    for(let row=0;row<n;row++)masks[row]|=1<<c;
    masks[r]=all;
    for(const row of [r-1,r+1])if(row>=0&&row<n)masks[row]|=((1<<c)|((1<<c)>>1)|((1<<c)<<1))&all;
    return masks;
  });
  const pop=x=>{x=x-((x>>>1)&0x5555);x=(x&0x3333)+((x>>>2)&0x3333);x=(x+(x>>>4))&0x0f0f;return (x+(x>>>8))&31;};
  function visit(domains,rows,cols,usedZones,answer){
    if((metrics.nodes||0)>=(metrics.maxNodes??Infinity))throw new SearchBudgetExceeded();
    metrics.nodes=(metrics.nodes||0)+1;if(out.length>=limit)return;
    if(rows===all){out.push([...answer]);return;}
    let best=null,count=Infinity;
    function consider(candidates){let amount=0;for(const mask of candidates)amount+=pop(mask);if(amount<count){count=amount;best=candidates;}return amount>0;}
    for(let r=0;r<n;r++)if(!(rows&(1<<r))){const d=new Uint16Array(n);d[r]=domains[r];if(!consider(d))return;}
    if(count>1)for(let c=0;c<n;c++)if(!(cols&(1<<c))){if(!consider(domains.map(m=>m&(1<<c))))return;}
    if(count>1)for(let z=0;z<n;z++)if(!(usedZones&(1<<z))){if(!consider(domains.map((m,r)=>m&zones[z][r])))return;}
    for(let r=0;r<n;r++)for(let mask=best[r];mask;mask&=mask-1){
      const bit=mask&-mask,c=31-Math.clz32(bit),i=r*n+c,z=flat[i];
      answer[r]=c;visit(domains.map((m,row)=>m&~conflicts[i][row]),rows|(1<<r),cols|bit,usedZones|(1<<z),answer);answer[r]=-1;
      if(out.length>=limit)return;
    }
  }
  visit(new Uint16Array(n).fill(all),0,0,0,Array(n).fill(-1));return out;
}
