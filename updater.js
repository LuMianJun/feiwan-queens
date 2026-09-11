export function isNewerVersion(candidate,current){
  const parse=v=>typeof v==='string'&&/^\d{8}-\d+$/.test(v)?v.split('-').map(Number):null;
  const a=parse(candidate),b=parse(current);return !!(a&&b&&(a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1])));
}
export function refreshURL(href,version,stamp=Date.now()){
  const url=new URL(href);url.searchParams.set('v',version);url.searchParams.set('_refresh',String(stamp));return url.href;
}
export function cleanURL(href){const url=new URL(href);url.searchParams.delete('v');url.searchParams.delete('_refresh');return url.href;}
export class VersionChecker {
  constructor({current,base,notify,fetcher=(...args)=>fetch(...args),now=()=>Date.now()}){Object.assign(this,{current,base,notify,fetcher,now});this.busy=false;this.last=-Infinity;this.latest=null;}
  async check(){
    if(this.busy||this.now()-this.last<30000)return;
    this.busy=true;this.last=this.now();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
    try{
      const url=new URL('version.json',this.base);url.searchParams.set('_check',String(this.last));
      const response=await this.fetcher(url.href,{cache:'no-store',signal:controller.signal});
      if(!response.ok)return;const data=await response.json();
      if(isNewerVersion(data.version,this.current)&&(!this.latest||isNewerVersion(data.version,this.latest))){this.latest=data.version;this.notify(data.version);}
    }catch{/* Offline or failed checks must never interrupt the game. */}
    finally{clearTimeout(timer);this.busy=false;}
  }
}
export function installUpdater(){
  const current=document.querySelector('meta[name="app-version"]')?.content;
  const banner=document.querySelector('#update-notice'),button=document.querySelector('#update-now');
  if(!current||!banner||!button)return;
  const checker=new VersionChecker({current,base:location.href,notify:()=>{banner.hidden=false;}});
  // Remove only our own cache-busting parameters after this version has loaded.
  try{history.replaceState(history.state,'',cleanURL(location.href));}catch{}
  button.addEventListener('click',()=>{if(checker.latest)location.assign(refreshURL(location.href,checker.latest));});
  const check=()=>{if(!document.hidden)void checker.check();};
  check();setInterval(check,300000);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
}
