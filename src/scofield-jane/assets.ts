import {useState,useEffect} from 'react';
import {delayRender,continueRender,cancelRender} from 'remotion';
const cache=new Map<string,Promise<unknown>>();
/** Explicit render barrier: a successful Chromium screenshot must not precede GLB loading. */
export function useAsset<T>(key:string,load:()=>Promise<T>){const [value,setValue]=useState<T|null>(null),[handle]=useState(()=>delayRender(`Loading ${key}`));useEffect(()=>{let alive=true;if(!cache.has(key))cache.set(key,load());(cache.get(key) as Promise<T>).then(v=>{if(alive)setValue(v);}).catch(cancelRender);return()=>{alive=false;continueRender(handle);};},[key,handle]);useEffect(()=>{if(value)continueRender(handle);},[value,handle]);return value;}
