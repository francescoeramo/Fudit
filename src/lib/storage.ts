const MAX_STORED_BYTES = 1_000_000;
export const load = <T,>(key:string, fallback:T):T => { if(typeof window==="undefined") return fallback; try{const raw=localStorage.getItem(key);if(!raw||raw.length>MAX_STORED_BYTES)return fallback;return JSON.parse(raw) as T}catch{return fallback} };
export const save = <T,>(key:string,value:T) => { try{const raw=JSON.stringify(value);if(raw.length<=MAX_STORED_BYTES)localStorage.setItem(key,raw)}catch{/* Storage può essere disabilitato o pieno. */} };
