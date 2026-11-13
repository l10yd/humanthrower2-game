import {it,expect} from 'vitest';
import {readGameplaySettings,saveGameplaySettings} from '../../src/gameplay/GameplaySettings';
import {HeadTrauma} from '../../src/player/HeadTrauma';
const raw={axis:1,pressed:true,released:false,stomp:false,jumpPresses:1,effortPresses:1};
it('head control faults default off and storage only accepts an explicit boolean',()=>{
 expect(readGameplaySettings(null)).toEqual({headControlFaults:false});
 for(const value of ['{}','null','{bad','{"headControlFaults":"true"}','{"headControlFaults":1}'])expect(readGameplaySettings({getItem:()=>value,setItem:()=>{}})).toEqual({headControlFaults:false});
 expect(readGameplaySettings({getItem:()=>'{"headControlFaults":true}',setItem:()=>{}})).toEqual({headControlFaults:true});
 expect(readGameplaySettings({getItem:()=>{throw Error('denied');},setItem:()=>{}})).toEqual({headControlFaults:false});
 expect(()=>saveGameplaySettings({getItem:()=>null,setItem:()=>{throw Error('quota');}},{headControlFaults:true})).not.toThrow();
});
it('disabling trauma immediately clears inversion and pending trips without altering input edges',()=>{
 const t=new HeadTrauma();t.configure(false);
 for(let i=0;i<600;i++){t.update(i/60,.1);expect(t.input(raw)).toEqual(raw);expect(t.takeTrip()).toBe(false);}
 t.configure(true);let episode=false;for(let i=0;i<600;i++){t.update(i/60,.1);episode||=t.keyboardInverted||t.mouseInverted;}
 expect(episode).toBe(true);t.configure(false);expect(t.snapshot).toEqual({keyboardInverted:false,mouseInverted:false,trips:0});expect(t.input(raw)).toEqual(raw);expect(t.takeTrip()).toBe(false);
});
