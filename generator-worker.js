import {generateLevel} from './generator.js?v=20260912-7';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,level:generateLevel(data.size)});}catch(error){self.postMessage({id:data.id,error:error.message});}};
