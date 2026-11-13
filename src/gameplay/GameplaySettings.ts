export interface GameplaySettings {headControlFaults:boolean}
export interface SettingsStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
const KEY='humanthrower.gameplay-settings';
export function readGameplaySettings(storage:SettingsStorage|null):GameplaySettings {
 try{const value=JSON.parse(storage?.getItem(KEY)??'null');return {headControlFaults:value?.headControlFaults===true};}catch{return {headControlFaults:false};}
}
export function saveGameplaySettings(storage:SettingsStorage|null,settings:GameplaySettings){try{storage?.setItem(KEY,JSON.stringify(settings));}catch{/* Playable even when storage is denied. */}}
export function browserGameplayStorage():SettingsStorage|null {try{return window.localStorage;}catch{return null;}}
