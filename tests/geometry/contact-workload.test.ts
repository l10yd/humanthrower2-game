import {expect,it} from 'vitest';
// @ts-expect-error pure JS diagnostic module
import {contactWorkload} from '../../scripts/contact-workload.mjs';
it('counts real solver-contact connectivity once, without mutating or sleeping bodies',()=>{
 const collider=(handle:number)=>({handle}),a=collider(1),b=collider(2),c=collider(3),floor=collider(0);
 const parts=[{id:1,collider:a,body:{isSleeping:()=>false}},{id:2,collider:b,body:{isSleeping:()=>true}},{id:3,collider:c,body:{isSleeping:()=>true}}];
 const pairs=new Map([[a,[b,floor]],[b,[a]],[c,[]]]),physics={parts:new Map(parts.map(p=>[p.id,p])),joints:new Map([[1,{a:2,b:3}]]),partForCollider:(c:any)=>parts.find(p=>p.collider===c),world:{contactPairsWith:(c:any,fn:any)=>pairs.get(c)?.forEach(fn),contactPair:(_a:any,_b:any,fn:any)=>fn({numSolverContacts:()=>2})}};
 const result=contactWorkload(physics);
 expect(result.contactPairs).toBe(2);expect(result.solverContactPoints).toBe(4);expect(result.staticPairs).toBe(1);
 expect(result.connectedIslands).toBe(1);expect(result.largestIsland).toBe(3);expect(result.activeIslands).toBe(1);expect(result.sleeping).toBe(2);
});
