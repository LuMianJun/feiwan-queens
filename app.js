import {installUpdater} from './updater.js?v=20260912-5';
import {Round,TapInput,ResultGuard,isLevelUnlocked} from './rules.js?v=20260912-5';
import {Feedback,BackgroundMusic} from './feedback.js?v=20260912-5';
const $=s=>document.querySelector(s),board=$('#board');
// Fixed categorical palette: blue, green, yellow, orange, red, pink,
// violet, navy, cyan, brown, gray, magenta. Avoid multiple similar greens.
const colors=['#3986cf','#28965b','#d9b52c','#e38735','#d84d49','#ec9fbe','#9064c5','#354d83','#31b9ca','#95633f','#89949c','#ba3e91'];
// Twelve distinct geometric textures, one fixed texture per region color.
const patternDefinitions=[
  ['横纹','<path d="M0 4H16M0 12H16"/>'],
  ['竖纹','<path d="M4 0V16M12 0V16"/>'],
  ['棋盘格','<path fill="currentColor" stroke="none" d="M0 0H8V8H0ZM8 8H16V16H8Z"/>'],
  ['反斜纹','<path d="M-4 4L12 20M4-4L20 12"/>'],
  ['圆环','<circle cx="8" cy="8" r="4"/>'],
  ['圆点','<circle cx="4" cy="4" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>'],
  ['正斜纹','<path d="M-4 12L12-4M4 20L20 4"/>'],
  ['十字','<path d="M4 8H12M8 4V12"/>'],
  ['波浪','<path d="M-8 5Q-4 0 0 5T8 5T16 5T24 5M-8 13Q-4 8 0 13T8 13T16 13T24 13"/>'],
  ['菱形','<path d="M8 2L14 8L8 14L2 8Z"/>'],
  ['短划线','<path d="M2 4H7M10 12H15"/>'],
  ['折线','<path d="M-4 4L0 0L8 8L16 0L20 4M-4 12L0 8L8 16L16 8L20 12"/>'],
];
const patterns=patternDefinitions.map(([name,shape],i)=>{
  const ink=[0,1,4,6,7,9,11].includes(i)?'#ffffff':'#283044';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><g fill="none" stroke="${ink}" color="${ink}" stroke-width="1.6" opacity=".24">${shape}</g></svg>`;
  return {name,image:`url("data:image/svg+xml,${encodeURIComponent(svg)}")`};
});
let resultTimer=null;
let levels=[],current=0,round=null,gesture=null,shownResult=false,loading=false,complete=new Set();
let preferences={sound:true,vibration:true,music:true};try{const p=JSON.parse(localStorage.getItem('queens-feedback-v1')||'{}');preferences={sound:p.sound!==false,vibration:p.vibration!==false,music:p.music!==false};}catch{}
const feedback=new Feedback(preferences);
const music=new BackgroundMusic({enabled:preferences.music});
let patternsEnabled=true;try{patternsEnabled=localStorage.getItem('queens-patterns-v1')!=='off';}catch{}
function showPatterns(){board.classList.toggle('patterns-off',!patternsEnabled);$('#pattern-toggle').textContent='花纹：'+(patternsEnabled?'开':'关');$('#pattern-toggle').setAttribute('aria-pressed',String(patternsEnabled));}
$('#pattern-toggle').addEventListener('click',()=>{patternsEnabled=!patternsEnabled;try{localStorage.setItem('queens-patterns-v1',patternsEnabled?'on':'off');}catch{}showPatterns();});showPatterns();
document.addEventListener('pointerdown',e=>{if(!document.hidden&&!e.target.closest('#music-toggle'))void music.start();},{capture:true});
document.addEventListener('keydown',e=>{if(!document.hidden&&!e.repeat&&!e.target.closest('#music-toggle'))void music.start();});
window.addEventListener('blur',()=>music.stop());
document.addEventListener('visibilitychange',()=>{if(document.hidden)music.stop();});
function showPreferences(){for(const [key,label] of [['music','BGM'],['sound','音效'],['vibration','震动']]){const b=$('#'+key+'-toggle');b.textContent=key==='vibration'&&!feedback.vibrate?'震动：不支持':label+'：'+(preferences[key]?'开':'关');b.setAttribute('aria-pressed',String(preferences[key]&&(key!=='vibration'||!!feedback.vibrate)));b.disabled=key==='vibration'&&!feedback.vibrate;}}
for(const key of ['music','sound','vibration'])$('#'+key+'-toggle').addEventListener('click',()=>{preferences[key]=!preferences[key];if(key==='sound')feedback.setSound(preferences[key]);else if(key==='music')music.setEnabled(preferences[key]);else feedback.setVibration(preferences[key]);try{localStorage.setItem('queens-feedback-v1',JSON.stringify(preferences));}catch{}showPreferences();if(preferences[key]&&key!=='music')feedback.play('mark');});showPreferences();
try{const a=JSON.parse(localStorage.getItem('queens-garden-complete-v1')||'[]');if(Array.isArray(a))complete=new Set(a.filter(v=>typeof v==='string'));}catch{}
function save(){try{localStorage.setItem('queens-garden-complete-v1',JSON.stringify([...complete]));}catch{}}
function reveal(i){if(!round?.canEdit(i))return;const correct=round.reveal(i);feedback.play(correct?(round.state==='won'?'win':'correct'):'wrong');$('#status').textContent=correct?'':('这里没有肥丸。'+(round.lives?'还剩 1 滴血。':''));render();}
function mark(i){if(!round?.canEdit(i))return;round.mark(i);feedback.play(round.cells[i]===2?'mark':'erase');render();}
const resultGuard=new ResultGuard();
const taps=new TapInput({single:mark,double:reveal,immediate:true});
function clearInput(){taps.cancel();gesture=null;}
function start(index){if(!isLevelUnlocked(levels,complete,index))return;clearTimeout(resultTimer);clearInput();current=index;round=new Round(levels[index]);shownResult=false;
  $('#result-dialog').close();$('#levels-screen').hidden=true;$('#play-screen').hidden=false;$('#title').textContent='第 '+(index+1)+' 关';$('#size').textContent=round.level.size+' × '+round.level.size;$('#status').textContent='';board.style.setProperty('--size',round.level.size);board.replaceChildren();
  for(let i=0;i<round.cells.length;i++){const b=document.createElement('button');b.type='button';b.className='cell';b.dataset.index=i;b.tabIndex=i===0?0:-1;const n=round.level.size;const region=round.level.regions[Math.floor(i/n)][i%n];b.dataset.region=region;b.style.setProperty('--cell',colors[region]);b.style.backgroundImage=patterns[region].image;b.style.backgroundSize='16px 16px';const mark=document.createElement('span');mark.className='mark';mark.setAttribute('aria-hidden','true');b.append(mark);board.append(b);}
  $('#reset').disabled=false;render();
}
function render(){if(!round)return;round.tick();updateClock();const n=round.level.size;$('#remaining').textContent=n-round.found;
  $('#hearts').setAttribute('aria-label','剩余'+round.lives+'滴血');[...$('#hearts').children].forEach((h,i)=>h.classList.toggle('lost',i>=round.lives));
  [...board.children].forEach((b,i)=>{const v=round.cells[i];const className='cell'+(v===1?' found':v===2?' cross':v===3?' wrong':'');if(b.className!==className)b.className=className;b.setAttribute('aria-disabled',String(!round.canEdit(i)));b.setAttribute('aria-label','第'+(Math.floor(i/n)+1)+'行第'+(i%n+1)+'列，区域'+(Number(b.dataset.region)+1)+'，'+patterns[Number(b.dataset.region)].name+'，'+['空格','已找到肥丸，锁定','已打叉','错误位置，锁定'][v]);});
  if(round.state!=='playing'&&!shownResult&&!$('#play-screen').hidden){shownResult=true;clearInput();resultGuard.reset();const won=round.state==='won';if(won){complete.add(round.level.id);save();}
    $('#result-symbol').textContent=won?'✦':'♡';$('#result-title').textContent=won?'肥丸都找到了！':round.failureReason==='timeout'?'时间到啦':'两滴血用完啦';$('#result-copy').textContent=won?'下一关，继续找肥丸。':'重新开始，再试一次。';$('#result-action').textContent=won?(current===levels.length-1?'再玩本关':'下一关'):'再试一次';const finishedRound=round;
    const showResult=()=>{if(round!==finishedRound||$('#play-screen').hidden)return;$('#reset-dialog').close();resultGuard.reset();$('#result-dialog').showModal();};
    if(won&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)resultTimer=setTimeout(showResult,300);else showResult();
  }
}
function showLevels(){if(round?.state!=='playing')shownResult=false;clearTimeout(resultTimer);clearInput();$('#result-dialog').close();$('#reset-dialog').close();$('#play-screen').hidden=true;$('#levels-screen').hidden=false;$('#completion').textContent='已完成 '+levels.filter(l=>complete.has(l.id)).length+' / '+levels.length+' 关';$('#level-list').replaceChildren();
  const row=document.createElement('div');row.className='level-buttons';
  levels.forEach((l,i)=>{
    const unlocked=isLevelUnlocked(levels,complete,i),done=complete.has(l.id),b=document.createElement('button');
    b.type='button';b.disabled=!unlocked;b.className=(i===current?'current ':'')+(done?'done':'');
    b.textContent=String(i+1).padStart(2,'0');
    b.setAttribute('aria-label','第 '+(i+1)+' 关，'+(done?'已完成':unlocked?'已解锁':'未解锁'));
    if(!unlocked)b.title='通关前面的关卡后解锁';
    b.addEventListener('click',()=>start(i));row.append(b);
  });$('#level-list').append(row);$('#back').focus();
}
function indexAt(x,y){const rect=board.getBoundingClientRect(),n=round.level.size;if(x<rect.left||x>=rect.right||y<rect.top||y>=rect.bottom)return -1;return Math.floor((y-rect.top)/rect.height*n)*n+Math.floor((x-rect.left)/rect.width*n);}
function paintLine(a,b,value){let changed=false;const rect=board.getBoundingClientRect(),steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/(Math.min(rect.width,rect.height)/round.level.size/3)));for(let k=0;k<=steps;k++){const i=indexAt(a.x+(b.x-a.x)*k/steps,a.y+(b.y-a.y)*k/steps);if(round.paint(i,value))changed=true;}if(changed)feedback.play('drag');render();}
board.addEventListener('pointerdown',e=>{if(!round||round.state!=='playing'||gesture||e.button!==0)return;const b=e.target.closest('.cell');if(!b)return;e.preventDefault();void feedback.unlock();const i=Number(b.dataset.index);gesture={id:e.pointerId,index:i,value:round.cells[i]===0?2:0,start:{x:e.clientX,y:e.clientY},last:{x:e.clientX,y:e.clientY},drag:false};board.setPointerCapture(e.pointerId);if(document.activeElement?.matches('.cell'))document.activeElement.blur();});
board.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const next={x:e.clientX,y:e.clientY};if(!gesture.drag&&Math.hypot(next.x-gesture.start.x,next.y-gesture.start.y)>8){gesture.drag=true;taps.cancel();gesture.last=gesture.start;}if(gesture.drag)paintLine(gesture.last,next,gesture.value);gesture.last=next;});
board.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;if(g.drag)paintLine(g.last,{x:e.clientX,y:e.clientY},g.value);else {const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.cell');if(hit&&board.contains(hit)&&Number(hit.dataset.index)===g.index)taps.tap(g.index);}if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);});
for(const name of ['pointercancel','lostpointercapture'])board.addEventListener(name,()=>{gesture=null;});
board.addEventListener('contextmenu',e=>e.preventDefault());board.addEventListener('dblclick',e=>e.preventDefault());
board.addEventListener('click',e=>{if(e.detail!==0)return;const b=e.target.closest('.cell');if(b){void feedback.unlock();taps.cancel();mark(Number(b.dataset.index));}});
board.addEventListener('keydown',e=>{const b=e.target.closest('.cell');if(!b||!round)return;const i=Number(b.dataset.index),n=round.level.size;let next=i;
  if(e.key==='Enter'){e.preventDefault();void feedback.unlock();taps.cancel();reveal(i);return;}
  if(e.key==='ArrowLeft')next=Math.floor(i/n)*n+Math.max(0,i%n-1);else if(e.key==='ArrowRight')next=Math.floor(i/n)*n+Math.min(n-1,i%n+1);else if(e.key==='ArrowUp')next=i>=n?i-n:i;else if(e.key==='ArrowDown')next=i+n<round.cells.length?i+n:i;else return;e.preventDefault();b.tabIndex=-1;board.children[next].tabIndex=0;board.children[next].focus();
});
window.addEventListener('blur',()=>{clearInput();feedback.stop();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();feedback.stop();}});
$('#choose').addEventListener('click',showLevels);$('#result-levels').addEventListener('click',showLevels);$('#back').addEventListener('click',()=>{$('#levels-screen').hidden=true;$('#play-screen').hidden=false;$('#choose').focus();render();});
$('#reset').addEventListener('click',()=>{clearInput();$('#reset-dialog').showModal();});$('#cancel-reset').addEventListener('click',()=>$('#reset-dialog').close());$('#confirm-reset').addEventListener('click',()=>{$('#reset-dialog').close();start(current);});$('#result-action').addEventListener('click',()=>start(round.state==='won'&&current<levels.length-1?current+1:current));
// Capture activation before the existing result button click handlers run.
const resultDialog=$('#result-dialog');
resultDialog.addEventListener('pointerdown',e=>{
  const button=e.target.closest('button');if(e.button===0&&button)resultGuard.begin(button,e.pointerId);
});
resultDialog.addEventListener('pointerup',e=>{
  const button=document.elementFromPoint(e.clientX,e.clientY)?.closest('button');
  resultGuard.end(button,e.pointerId);
});
resultDialog.addEventListener('pointercancel',()=>resultGuard.cancel());
resultDialog.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&!e.repeat&&e.target.matches('button')){
    resultGuard.begin(e.target,'key');resultGuard.end(e.target,'key');
  }
});
resultDialog.addEventListener('click',e=>{
  const button=e.target.closest('button');
  if(button&&!resultGuard.consume(button)){e.preventDefault();e.stopImmediatePropagation();}
},true);
resultDialog.addEventListener('close',()=>resultGuard.cancel());
window.addEventListener('blur',()=>resultGuard.cancel());
function updateClock(){
  if(!round)return;
  const clock=$('#countdown');clock.hidden=round.timeLimitSeconds===0;
  if(!clock.hidden){const remaining=round.remainingSeconds;clock.textContent='剩余 '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');clock.classList.toggle('urgent',remaining<=20);}
}
setInterval(()=>{
  if(!round||round.timeLimitSeconds===0)return;
  round.tick();updateClock();
  if(round.state!=='playing'&&!shownResult)render();
},200);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&round)render();});
const character=new Image();
function prepareCharacter(){return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>finish(Error('character timeout')),12000);
  function finish(error){clearTimeout(timeout);character.onload=character.onerror=null;error?reject(error):resolve();}
  character.onload=()=>{if(character.decode)character.decode().then(()=>finish(),finish);else finish();};
  character.onerror=()=>finish(Error('character load'));
  character.src='./feiwan.webp?v=20260912-5';
});}
async function load(){if(loading)return;loading=true;$('#load-message').textContent='正在准备关卡和肥丸…';$('#retry').hidden=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{const [r]=await Promise.all([fetch('./levels.json?v=20260912-5',{signal:controller.signal}),prepareCharacter()]);if(!r.ok)throw Error('load');const pack=await r.json();if(!Array.isArray(pack.levels)||!pack.levels.length)throw Error('pack');for(const l of pack.levels){if(!Number.isInteger(l.size)||l.size<4||l.size>12||l.regions?.length!==l.size||l.regions.some(row=>row.length!==l.size||row.some(v=>!Number.isInteger(v)||v<0||v>=l.size))||l.solution?.length!==l.size||l.solution.some(c=>!Number.isInteger(c)||c<0||c>=l.size))throw Error('level');if(!Number.isInteger(l.timeLimitSeconds??0)||(l.timeLimitSeconds??0)<0)throw Error('time limit');}levels=pack.levels;$('#loading').hidden=true;$('#choose').disabled=false;start(0);}catch{$('#load-message').textContent='关卡或肥丸未加载完成，请检查网络后重试。';$('#retry').hidden=false;}finally{clearTimeout(timeout);loading=false;}}
$('#retry').addEventListener('click',load);load();
installUpdater();
