export type Action='left'|'right'|'jump'|'stomp'|'saw'|'thrust';
const bindings:Record<string,Action>={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'jump',KeyW:'jump',ArrowUp:'jump',KeyS:'stomp',ArrowDown:'stomp',KeyE:'saw'};
export class Input {
  private sources=new Map<string,Action>();private jumpPressed=false;private jumpReleased=false;private effortPresses=0;private jumpPresses=0;
  private cleanups:(()=>void)[]=[];
  constructor(private command:(key:string)=>void,canvas?:HTMLCanvasElement,private gameplayAllowed:()=>boolean=()=>true) {
    window.addEventListener('keydown',this.keydown);window.addEventListener('keyup',this.keyup);window.addEventListener('blur',this.clear);
    if(canvas){
      const down=(e:PointerEvent)=>{if(!this.gameplayAllowed()||e.button!==0&&e.button!==2)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);this.set(`blade${e.pointerId}:${e.button}`,e.button===2?'thrust':'saw');};
      const up=(e:PointerEvent)=>{if(e.type==='pointerup')this.release(`blade${e.pointerId}:${e.button}`);else for(const button of [0,2])this.release(`blade${e.pointerId}:${button}`);};
      const chord=(e:PointerEvent)=>{if(e.button!==0&&e.button!==2)return;if(e.buttons&(e.button===2?2:1))down(e);else up(new PointerEvent('pointerup',{pointerId:e.pointerId,button:e.button}));};
      const context=(e:Event)=>e.preventDefault();
      canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',chord);canvas.addEventListener('contextmenu',context);
      for(const event of ['pointerup','pointercancel','lostpointercapture'] as const)canvas.addEventListener(event,up);
      this.cleanups.push(()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',chord);canvas.removeEventListener('contextmenu',context);for(const event of ['pointerup','pointercancel','lostpointercapture'] as const)canvas.removeEventListener(event,up);});
    }
    for(const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      const down=(e:PointerEvent)=>{if(!this.gameplayAllowed())return;e.preventDefault();button.setPointerCapture(e.pointerId);this.set(`pointer${e.pointerId}`,button.dataset.action as Action);};
      const release=(e:PointerEvent)=>{e.preventDefault();this.release(`pointer${e.pointerId}`);};
      button.addEventListener('pointerdown',down);
      for(const event of ['pointerup','pointercancel','lostpointercapture'] as const)button.addEventListener(event,release);
      this.cleanups.push(()=>{button.removeEventListener('pointerdown',down);for(const event of ['pointerup','pointercancel','lostpointercapture'] as const)button.removeEventListener(event,release);});
    }
  }
  held(action:Action){return [...this.sources.values()].includes(action);}
  private set(source:string,action:Action){if(this.sources.has(source))return;if(action!=='saw'&&action!=='thrust')this.effortPresses=Math.min(12,this.effortPresses+1);if(action==='jump'){this.jumpPresses=Math.min(12,this.jumpPresses+1);if(!this.held('jump'))this.jumpPressed=true;}this.sources.set(source,action);}
  private release(source:string){const wasJump=this.held('jump');this.sources.delete(source);if(wasJump&&!this.held('jump'))this.jumpReleased=true;}
  consume():InputFrame{const result={axis:Number(this.held('right'))-Number(this.held('left')),stomp:this.held('stomp'),saw:this.held('saw'),thrust:this.held('thrust'),pressed:this.jumpPressed,released:this.jumpReleased,effortPresses:this.effortPresses,jumpPresses:this.jumpPresses};this.jumpPressed=false;this.jumpReleased=false;this.effortPresses=0;this.jumpPresses=0;return result;}
  clear=()=>{this.sources.clear();this.jumpPressed=false;this.jumpReleased=false;this.effortPresses=0;this.jumpPresses=0;};
  private keydown=(e:KeyboardEvent)=>{if(e.target instanceof HTMLElement&&(e.target.matches('input,select,textarea')||e.target.isContentEditable))return;const action=bindings[e.code];if(action){if(!this.gameplayAllowed())return;e.preventDefault();if(!e.repeat)this.set(e.code,action);}else if(!e.repeat)this.command(e.code);};
  private keyup=(e:KeyboardEvent)=>{if(bindings[e.code]){if(this.gameplayAllowed())e.preventDefault();this.release(e.code);}};
  dispose(){this.clear();window.removeEventListener('keydown',this.keydown);window.removeEventListener('keyup',this.keyup);window.removeEventListener('blur',this.clear);for(const cleanup of this.cleanups)cleanup();this.cleanups=[];}
}
export interface InputFrame {axis:number;stomp:boolean;saw?:boolean;thrust?:boolean;pressed:boolean;released:boolean;effortPresses?:number;jumpPresses?:number}
