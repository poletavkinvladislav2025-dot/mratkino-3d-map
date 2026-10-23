import {decodeLandscape} from './generate.js';
self.onmessage=e=>{const {id,buffer,cell}=e.data;try{self.postMessage({id,result:decodeLandscape(buffer,cell)});}catch(error){self.postMessage({id,error:String(error.message)});}};
