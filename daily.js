export function beijingDate(now=Date.now()){
  return new Date(now+8*60*60*1000).toISOString().slice(0,10);
}
// Version the seed convention so future generator changes can be coordinated.
export function dateRandom(date){
  let seed=2166136261;
  for(const c of 'feiwan-daily-balanced-v6:'+date)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  return ()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
