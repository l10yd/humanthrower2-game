import {expect,it} from 'vitest';
import {HudCadence} from '../../src/core/HudCadence';
it('bounds RAF presentation updates while refreshing state transitions immediately',()=>{
 const hud=new HudCadence();let count=0;
 for(let i=0;i<240;i++)if(hud.due(i*1000/240,'RUNNING'))count++;
 expect(count).toBeLessThanOrEqual(30);expect(count).toBeGreaterThanOrEqual(27);
 expect(hud.due(999,'PAUSED')).toBe(true);expect(hud.due(1000,'PAUSED')).toBe(false);
 expect(hud.due(1001,'GAME_OVER')).toBe(true);expect(hud.due(0,'GAME_OVER')).toBe(true);
});
