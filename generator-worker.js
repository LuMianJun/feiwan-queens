import {generateLevel} from './generator.js?v=20260913-1';
import {dateRandom} from './daily.js?v=20260913-1';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,level:generateLevel(data.size,data.date?dateRandom(data.date):Math.random)});}catch(error){self.postMessage({id:data.id,error:error.message});}};
