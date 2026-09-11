export function analyze(level,cells){
  const n=level.size,stars=[];cells.forEach((v,i)=>{if(v===1)stars.push(i);});const conflicts=new Set();
  for(let a=0;a<stars.length;a++)for(let b=a+1;b<stars.length;b++){
    const i=stars[a],j=stars[b],r=Math.floor(i/n),c=i%n,s=Math.floor(j/n),d=j%n;
    if(r===s||c===d||level.regions[r][c]===level.regions[s][d]||(Math.abs(r-s)<=1&&Math.abs(c-d)<=1)){conflicts.add(i);conflicts.add(j);}
  }
  return {count:stars.length,conflicts,won:stars.length===n&&conflicts.size===0};
}
export function editCell(cells,index,tool,toggle=true){
  if(index<0||index>=cells.length)return cells;
  const desired=tool==='star'?1:tool==='cross'?2:0;
  const value=toggle&&cells[index]===desired?0:desired;
  if(cells[index]===value)return cells;
  const next=cells.slice();next[index]=value;return next;
}
// 0 empty, 1 confirmed Feiwan, 2 cross, 3 locked error.
export class Round {
  constructor(level){this.level=level;this.cells=Array(level.size**2).fill(0);this.lives=2;this.state='playing';}
  get found(){return this.cells.filter(v=>v===1).length;}
  canEdit(i){return this.state==='playing'&&Number.isInteger(i)&&i>=0&&i<this.cells.length&&this.cells[i]!==1&&this.cells[i]!==3;}
  mark(i,paint=false){if(this.canEdit(i))this.cells[i]=paint?2:this.cells[i]===2?0:2;}
  reveal(i){if(!this.canEdit(i))return false;const n=this.level.size,correct=this.level.solution[Math.floor(i/n)]===i%n;
    if(correct){this.cells[i]=1;if(this.found===n)this.state='won';}else{this.cells[i]=3;if(--this.lives===0)this.state='lost';}return correct;}
}
export class TapInput {
  constructor({single,double,delay=300,setTimer=(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimer=id=>globalThis.clearTimeout(id)}){Object.assign(this,{single,double,delay,setTimer,clearTimer});this.pending=null;}
  tap(i){if(this.pending?.i===i){this.clearTimer(this.pending.timer);this.pending=null;this.double(i);return;}this.flush();const p={i};p.timer=this.setTimer(()=>{if(this.pending!==p)return;this.pending=null;this.single(i);},this.delay);this.pending=p;}
  flush(){if(!this.pending)return;const p=this.pending;this.clearTimer(p.timer);this.pending=null;this.single(p.i);}
  cancel(){if(this.pending)this.clearTimer(this.pending.timer);this.pending=null;}
}
