export const load = <T,>(key:string, fallback:T):T => { if(typeof window==="undefined") return fallback; try{return JSON.parse(localStorage.getItem(key)??"") as T}catch{return fallback} };
export const save = <T,>(key:string,value:T) => localStorage.setItem(key,JSON.stringify(value));
