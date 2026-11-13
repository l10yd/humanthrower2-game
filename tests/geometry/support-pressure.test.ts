import { describe,it,expect } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { landingShares } from '../../src/player/SupportPressure';
describe('one bounded relative-velocity landing budget',()=>{
 it('is order independent, distributes by real closing speed and respects both limits',()=>{
  const supports=[{weight:.9,velocityY:0},{weight:.7,velocityY:2},{weight:.8,velocityY:-30}];
  const shares=landingShares(supports,-24,64,true);
  expect(shares.reduce((s,n)=>s+n,0)).toBeLessThanOrEqual(CONFIG.playerContact.stompTotal);
  expect(shares.every(n=>n>=0&&n<=CONFIG.playerContact.stompPerBody)).toBe(true);expect(shares[2]).toBe(0);
  expect(landingShares([...supports].reverse(),-24,64,true).reverse()).toEqual(shares);
 });
 it('an upward support contributes point closing speed without an upward kick',()=>{
  expect(landingShares([{weight:1,velocityY:3}],0,64,false)).toEqual([CONFIG.playerContact.landingPerBody]);
  expect(landingShares([{weight:1,velocityY:-3}],-1,64,false)).toEqual([0]);
 });
 it('does not allocate leftover cap to non-closing bodies or manufacture impulses with no supports',()=>{
  expect(landingShares([],0,64,false)).toEqual([]);
  const shares=landingShares([{weight:1,velocityY:0},{weight:1,velocityY:-100}],-24,64,false);
  expect(shares).toEqual([CONFIG.playerContact.landingPerBody,0]);
 });
});
