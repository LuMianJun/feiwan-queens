import {generateReliable} from './generator-reliable.js?v=20260913-1';
export {solutions} from './generator-exact.js?v=20260913-1';
export {generateReliable} from './generator-reliable.js?v=20260913-1';
export function generateLevel(size,random=Math.random){
  const value=random();
  if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('Random source must return [0,1)');
  const seed=Math.floor(value*4294967296),level=generateReliable(size,seed);
  return {...level,id:'balanced-v6-'+size+'-'+seed,timeLimitSeconds:0};
}
