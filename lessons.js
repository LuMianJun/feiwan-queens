import {lessons} from './lessons-data.js?v=20260913-5';
import {TapInput} from './rules.js?v=20260913-1';
export class LessonRound {
  constructor(lesson){this.lesson=lesson;this.done=new Set();}
  act(i,action){
    if(!this.lesson.targets.includes(i)||action!==this.lesson.action)return false;
    if(action==='cross'&&this.done.has(i))this.done.delete(i);else this.done.add(i);
    return true;
  }
  get complete(){return this.lesson.targets.every(i=>this.done.has(i));}
}
export function openLessons({onClose=()=>{}}={}){
  if(document.querySelector('#reasoning-dialog'))return;
  const dialog=document.createElement('dialog');dialog.id='reasoning-dialog';dialog.setAttribute('aria-labelledby','lesson-title');
  dialog.innerHTML='<header><span id="lesson-count"></span><button id="lesson-exit" type="button">跳过</button></header><h2 id="lesson-title"></h2><p id="lesson-copy"></p><div id="lesson-board" role="group" aria-label="教学棋盘"></div><footer><button id="lesson-prev" type="button">上一课</button><button id="lesson-hint" type="button">给点提示</button><button id="lesson-next" type="button" disabled>下一课</button></footer>';
  const intro=dialog.querySelector('header');intro.id='lesson-intro';intro.tabIndex=-1;intro.setAttribute('autofocus','');
  document.body.append(dialog);const $=s=>dialog.querySelector(s),grid=$('#lesson-board');
  const palette=['#3986cf','#28965b','#d9b52c','#e38735','#d84d49','#ec9fbe'];
  let index=0,round,buttons=[],gesture=null;
  function act(i,action,paint=false){
    if(paint&&round.done.has(i))return;
    round.act(i,action);

    render();
  }
  const taps=new TapInput({immediate:true,single:i=>{if(round.lesson.action==='cross')act(i,'cross');},double:i=>{if(round.lesson.action==='find')act(i,'find');}});
  function render(){
    buttons.forEach((b,i)=>{
      const found=round.lesson.found.includes(i)||(round.lesson.action==='find'&&round.done.has(i));
      const crossed=round.lesson.preCross.includes(i)||(round.lesson.action==='cross'&&round.done.has(i));
      b.classList.toggle('lesson-crossed',crossed);
      b.classList.toggle('lesson-found',found);b.classList.toggle('lesson-given',round.lesson.preCross.includes(i));
      b.setAttribute('aria-label',`第${Math.floor(i/round.lesson.size)+1}行第${i%round.lesson.size+1}列，${String.fromCharCode(65+round.lesson.regions.flat()[i])}色，${found?'肥丸':crossed?'已排除':'候选'}`);
    });
    $('#lesson-next').disabled=!round.complete;
    $('#lesson-next').textContent=index===lessons.length-1?'完成教学':'下一课';
    $('#lesson-hint').disabled=round.complete;
    $('#lesson-copy').textContent=round.lesson.copy;
  }
  function show(){
    taps.cancel();gesture=null;round=new LessonRound(lessons[index]);
    $('#lesson-count').textContent=`推理教学 ${index+1} / ${lessons.length}`;
    $('#lesson-title').textContent=round.lesson.title;$('#lesson-copy').textContent=round.lesson.copy;

    $('#lesson-prev').disabled=index===0;$('#lesson-next').textContent=index===lessons.length-1?'完成教学':'下一课';
    grid.style.setProperty('--lesson-size',round.lesson.size);grid.replaceChildren();
    buttons=round.lesson.regions.flat().map((z,i)=>{
      const b=document.createElement('button');b.type='button';b.dataset.index=i;b.style.background=palette[z];b.className='lesson-cell';
      b.classList.toggle('lesson-focus',round.lesson.evidence.includes(i));
      b.classList.toggle('lesson-muted',!round.lesson.scope.includes(i));
      const label=document.createElement('small');label.textContent=String.fromCharCode(65+z);const symbol=document.createElement('span');symbol.className='lesson-symbol';b.append(label,symbol);grid.append(b);return b;
    });render();intro.focus({preventScroll:true});dialog.scrollTop=0;
  }
  function close(completed=false){taps.cancel();gesture=null;if(completed)try{localStorage.setItem('queens-reasoning-complete-v1','yes');}catch{}dialog.close();dialog.remove();onClose();}
  $('#lesson-exit').onclick=()=>close();dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  $('#lesson-next').onclick=()=>{taps.cancel();gesture=null;if(!round.complete)return;if(index===lessons.length-1)close(true);else{index++;show();}};
  $('#lesson-prev').onclick=()=>{if(index){index--;show();}};
  $('#lesson-hint').onclick=()=>{const i=round.lesson.targets.find(i=>!round.done.has(i));if(i===undefined)return;buttons.forEach(b=>b.classList.remove('lesson-hint'));buttons[i].classList.add('lesson-hint');};
  function hit(x,y){const b=document.elementFromPoint(x,y)?.closest('.lesson-cell');return b&&grid.contains(b)?Number(b.dataset.index):null;}
  grid.addEventListener('pointerdown',e=>{if(e.button!==0||gesture)return;const i=hit(e.clientX,e.clientY);if(i===null)return;e.preventDefault();gesture={id:e.pointerId,i,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,drag:false,visited:new Set()};grid.setPointerCapture(e.pointerId);});
  grid.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>8){gesture.drag=true;taps.cancel();}
    if(gesture.drag&&round.lesson.action==='cross'){
      const steps=Math.max(1,Math.ceil(Math.hypot(e.clientX-gesture.lastX,e.clientY-gesture.lastY)/8));
      for(let k=0;k<=steps;k++){const i=hit(gesture.lastX+(e.clientX-gesture.lastX)*k/steps,gesture.lastY+(e.clientY-gesture.lastY)*k/steps);if(i!==null&&!gesture.visited.has(i)){gesture.visited.add(i);act(i,'cross',true);}}
      gesture.lastX=e.clientX;gesture.lastY=e.clientY;
    }
  });
  grid.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;if(!g.drag&&hit(e.clientX,e.clientY)===g.i)taps.tap(g.i);if(grid.hasPointerCapture(e.pointerId))grid.releasePointerCapture(e.pointerId);});
  const cancel=()=>{gesture=null;taps.cancel();};grid.addEventListener('pointercancel',cancel);grid.addEventListener('lostpointercapture',()=>{gesture=null;});
  dialog.showModal();show();return {close};
}
