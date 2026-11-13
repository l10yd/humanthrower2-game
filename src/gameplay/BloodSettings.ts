export type BloodMode='full'|'reduced'|'off';
export interface BloodStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
const KEY='humanthrower.blood.v1';
export function validateBlood(value:unknown):BloodMode {return value==='off'||value==='reduced'?value:'full';}
export function readBlood(storage:BloodStorage|null):BloodMode {try{return validateBlood(JSON.parse(storage?.getItem(KEY)??'null'));}catch{return 'full';}}
export function saveBlood(storage:BloodStorage|null,mode:BloodMode){try{storage?.setItem(KEY,JSON.stringify(mode));}catch{/* session-local fallback */}}
export function browserBloodStorage():BloodStorage|null {try{return window.localStorage;}catch{return null;}}
