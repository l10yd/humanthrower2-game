import {readGameplaySettings,saveGameplaySettings,type GameplaySettings,type SettingsStorage} from './GameplaySettings';
/** Nonmodal pause window: gameplay surfaces are inert, header/footer remain usable.
 * All settings are single DOM controls; no duplicate IDs or shadow copies. */
export class PauseMenu {
 private returnFocus:HTMLElement|null=null;
 private keydown=(e:KeyboardEvent)=>{
  if(this.panel.hidden)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.resume();return;}
  if(e.key!=='Tab')return;
  const items=[...this.panel.querySelectorAll<HTMLElement>('button:not(:disabled),select,input,[tabindex="0"]')].filter(el=>!el.hidden);
  if(!items.length)return;
  const first=items[0],last=items.at(-1)!;
  if(e.shiftKey&&(document.activeElement===first||!this.panel.contains(document.activeElement))){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&(document.activeElement===last||!this.panel.contains(document.activeElement))){e.preventDefault();first.focus();}
 };
 constructor(private panel:HTMLElement,private canvas:HTMLElement,private touch:HTMLElement,private resume:()=>void){window.addEventListener('keydown',this.keydown);}
 get open(){return !this.panel.hidden;}
 show(paused:boolean){
  if(!this.open)this.returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  this.panel.hidden=false;this.canvas.inert=true;this.touch.inert=true;
  this.panel.querySelector('#pause-heading')!.textContent=paused?'ПАУЗА':'НАСТРОЙКИ';
  this.panel.querySelector('.pause-note')!.textContent=paused?'Физика и игровые таймеры остановлены. Режим и поведение тел начинают новую сессию.':'Режим и поведение тел начинают новую сессию. Остальные настройки можно менять без запуска игры.';
  this.panel.querySelector('#resume')!.textContent=paused?'Продолжить':'Закрыть';
  this.panel.querySelector<HTMLElement>('#pause-restart')!.hidden=!paused;
  this.panel.querySelector<HTMLElement>('#pause-title')!.hidden=!paused;
  this.panel.querySelector<HTMLElement>('#resume')!.focus();
 }
 close(){if(!this.open)return;this.panel.hidden=true;this.canvas.inert=false;this.touch.inert=false;this.returnFocus?.focus();this.returnFocus=null;}
 dispose(){this.close();window.removeEventListener('keydown',this.keydown);}
}
export class GameplayPreferences {
 settings:GameplaySettings;
 constructor(private storage:SettingsStorage|null){this.settings=readGameplaySettings(storage);}
 setHeadControlFaults(enabled:boolean){this.settings={headControlFaults:enabled};saveGameplaySettings(this.storage,this.settings);}
}
