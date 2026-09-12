import {Round} from './rules.js?v=20260913-1';

export class ChallengeClock {
  constructor(now=()=>Date.now()){this.now=now;this.ms=60000;this.started=null;this.completed=0;}
  get remainingMs(){return Math.max(0,this.ms-(this.started===null?0:this.now()-this.started));}
  get seconds(){return Math.ceil(this.remainingMs/1000);}
  pause(){this.ms=this.remainingMs;this.started=null;}
  resume(){if(this.started===null&&this.ms>0)this.started=this.now();}
  adjust(seconds){this.pause();this.ms=Math.max(0,this.ms+seconds*1000);this.resume();}
}
export class ChallengeRound extends Round {
  constructor(level,clock){super({...level,timeLimitSeconds:0});this.clock=clock;this.timeLimitSeconds=60;this.lives=Infinity;}
  get remainingSeconds(){return this.clock.seconds;}
  tick(){if(this.state==='playing'&&this.clock.remainingMs<=0)this.finish('lost','timeout');return this.state;}
  finish(state,reason=null){if(this.state!=='playing')return;this.clock.pause();this.state=state;this.failureReason=reason;if(state==='won')this.clock.completed++;}
  reveal(i){if(!this.canEdit(i))return false;const correct=this.level.solution[Math.floor(i/this.level.size)]===i%this.level.size;
    this.cells[i]=correct?1:3;this.clock.adjust(correct?5:-5);
    if(this.clock.remainingMs<=0)this.finish('lost','timeout');else if(this.found===this.level.size)this.finish('won');return correct;}
}
export function challengeSize(number){return Math.min(12,number+4);}
export function challengeResult(completed,previousBest){
  if(completed>previousBest)return {kind:'record',title:'新纪录',copy:'太厉害啦！肥丸为你欢呼！',face:'surprised',label:'惊喜的肥丸'};
  if(previousBest>0&&completed>=previousBest-1)return {kind:'close',title:'就差一点',copy:'就差一点点，下次一定！',face:'crying',label:'委屈泪眼的肥丸'};
  return {kind:'finished',title:'挑战结束',copy:'歇一会儿，再陪肥丸找一轮吧。',face:'smiling',label:'笑眯眯的肥丸'};
}
export class ChallengeBest {
  constructor(storage){this.storage=storage;this.value=0;try{const n=Number(storage.getItem('queens-challenge-best-v1'));if(Number.isSafeInteger(n)&&n>=0)this.value=n;}catch{}}
  record(completed){if(!Number.isSafeInteger(completed)||completed<=this.value)return false;this.value=completed;try{this.storage.setItem('queens-challenge-best-v1',String(completed));}catch{}return true;}
}

// Run generation outside the UI thread. Termination also cancels stale sessions.
export class LevelFactory {
  constructor(){this.worker=new Worker(new URL('./generator-worker.js?v=20260913-1',import.meta.url),{type:'module'});this.pending=new Map();this.id=0;
    this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(data.id);data.error?p.resolve({error:data.error}):p.resolve({level:data.level});};
    this.worker.onerror=()=>this.cancel();
  }
  generate(number,date=null){return new Promise(resolve=>{const id=++this.id;const timer=setTimeout(()=>this.cancel(),30000);this.pending.set(id,{resolve,timer});this.worker.postMessage({id,size:challengeSize(number),date});});}
  cancel(){this.worker.terminate();for(const p of this.pending.values()){clearTimeout(p.timer);p.resolve({error:'generation interrupted'});}this.pending.clear();}
}
