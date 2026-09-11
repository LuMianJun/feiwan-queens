const MASTER_VOLUME=.3;
export class Feedback {
  constructor({sound=true,vibration=true,createContext=()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;return C?new C():null;},vibrate=typeof navigator!=='undefined'&&typeof navigator.vibrate==='function'?p=>navigator.vibrate(p):null}={}){
    Object.assign(this,{sound,vibration,createContext,vibrate});this.context=null;this.master=null;this.epoch=0;this.lastDrag=0;
  }
  unlock(){
    if(!this.sound)return Promise.resolve(false);
    try{if(!this.context||this.context.state==='closed'){this.context=this.createContext();if(!this.context)return Promise.resolve(false);this.master=this.context.createGain();this.master.gain.value=MASTER_VOLUME;this.master.connect(this.context.destination);}
      const c=this.context;return Promise.resolve(c.state==='running'?null:c.resume()).then(()=>c.state==='running').catch(()=>false);
    }catch{return Promise.resolve(false);}
  }
  setSound(value){this.sound=value;if(this.master)this.master.gain.value=value?MASTER_VOLUME:0;if(!value)this.epoch++;}
  setVibration(value){this.vibration=value;if(!value&&this.vibrate)try{this.vibrate(0);}catch{}}
  stop(){this.epoch++;if(this.master)this.master.gain.value=0;if(this.vibrate)try{this.vibrate(0);}catch{}}
  play(kind){
    if(kind==='drag'){const now=Date.now();if(now-this.lastDrag<75)return;this.lastDrag=now;}
    if(this.vibration&&this.vibrate)try{this.vibrate(kind==='wrong'?[80,45,80]:kind==='win'?[50,45,70]:kind==='correct'?55:kind==='drag'?18:25);}catch{}
    const epoch=this.epoch,started=Date.now();
    void this.unlock().then(ready=>{if(!ready||!this.sound||epoch!==this.epoch||Date.now()-started>250)return;
      try{const c=this.context;this.master.gain.value=MASTER_VOLUME;const notes=kind==='wrong'?[190,140]:kind==='win'?[523,659,784]:kind==='correct'?[660,880]:[kind==='erase'?350:470];
        notes.forEach((hz,i)=>{const t=c.currentTime+i*.08,o=c.createOscillator(),g=c.createGain();o.type=kind==='wrong'?'triangle':'sine';o.frequency.value=hz;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.5,t+.006);g.gain.exponentialRampToValueAtTime(.001,t+.085);o.connect(g);g.connect(this.master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+.09);});
      }catch{}
    });
  }
}
