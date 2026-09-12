const MASTER_VOLUME=.3;
export class CountdownWarning {
  constructor(now=()=>performance.now()){this.now=now;this.sessions=new WeakMap();}
  check(session,seconds,active=true){
    const state=this.sessions.get(session)||{previous:Infinity,last:-Infinity};
    const crossed=state.previous>30&&seconds<=30&&seconds>0;
    state.previous=seconds;this.sessions.set(session,state);
    if(!active||!crossed)return false;
    const now=this.now();if(now-state.last<10000)return false;
    state.last=now;return true;
  }
}
// A quiet original eight-bar plucked-key loop, synthesized locally once.
export class BackgroundMusic {
  constructor({enabled=true,createContext=()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;return C?new C():null;}}={}){
    Object.assign(this,{enabled,createContext});this.context=null;this.source=null;this.buffer=null;this.epoch=0;
  }
  makeBuffer(){
    const rate=22050,beat=60/84,length=32*beat,buffer=this.context.createBuffer(1,Math.ceil(length*rate),rate),data=buffer.getChannelData(0);
    const note=(midi,at,duration,volume)=>{
      const hz=440*2**((midi-69)/12),samples=Math.floor(duration*rate),start=Math.floor(at*rate);
      for(let i=0;i<samples;i++){
        const t=i/rate,attack=Math.min(1,t/.018),release=Math.min(1,(duration-t)/.15);
        const wave=Math.sin(2*Math.PI*hz*t)+.18*Math.sin(4*Math.PI*hz*t);
        data[(start+i)%data.length]+=volume*wave*attack*release*Math.exp(-t*3/duration);
      }
    };
    const chords=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,69]];
    const melody=[[76,79,74],[72,76,71],[69,72,76],[74,71,67],[79,76,74],[76,72,71],[72,76,79],[74,71,72]];
    for(let bar=0;bar<8;bar++){
      const chord=chords[bar%4],base=bar*4*beat;
      note(chord[0]-12,base,beat*3.8,.055);
      [0,2,1,3].forEach((k,j)=>note(chord[k],base+j*beat,beat*1.7,.026));
      melody[bar].forEach((n,j)=>note(n,base+[.5,2,3][j]*beat,beat*1.1,.035));
    }
    return buffer;
  }
  async start(){
    if(!this.enabled||this.source)return;const epoch=this.epoch;
    try{
      if(!this.context||this.context.state==='closed'){this.context=this.createContext();this.buffer=null;}
      if(!this.context)return;
      if(this.context.state!=='running')await this.context.resume();
      if(!this.enabled||epoch!==this.epoch||this.source||this.context.state!=='running')return;
      this.buffer??=this.makeBuffer();
      const source=this.context.createBufferSource();source.buffer=this.buffer;source.loop=true;source.connect(this.context.destination);source.start();this.source=source;
    }catch{this.stop();}
  }
  stop(){this.epoch++;if(this.source){try{this.source.stop();this.source.disconnect();}catch{}this.source=null;}}
  setEnabled(value){this.enabled=value;if(value)void this.start();else this.stop();}
}
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
    if(kind!=='record'&&kind!=='warning'&&this.vibration&&this.vibrate)try{this.vibrate(kind==='wrong'?[80,45,80]:kind==='win'?[50,45,70]:kind==='correct'?55:kind==='drag'?18:25);}catch{}
    const epoch=this.epoch,started=Date.now();
    void this.unlock().then(ready=>{if(!ready||!this.sound||epoch!==this.epoch||Date.now()-started>250)return;
      try{const c=this.context;this.master.gain.value=MASTER_VOLUME;
        if(kind==='warning'){
          [880,660,880].forEach((hz,i)=>{const t=c.currentTime+i*.18,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.65,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.13);o.connect(g);g.connect(this.master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+.14);});return;
        }
        const record=kind==='record',notes=record?[659,880]:kind==='wrong'?[190,140]:kind==='win'?[523,659,784]:kind==='correct'?[660,880]:[kind==='erase'?350:470];
        notes.forEach((hz,i)=>{const t=c.currentTime+i*(record?.24:.08),duration=record?.18:.085,o=c.createOscillator(),g=c.createGain();o.type=kind==='wrong'||record?'triangle':'sine';o.frequency.value=hz;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.5,t+(record?.015:.006));g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.005);});
      }catch{}
    });
  }
}
