// Read-only contact/joint connectivity diagnostics. Never changes sleeping state.
export function contactWorkload(physics){
 const parts=[...physics.parts.values()],parents=new Map(parts.map(p=>[p.id,p.id]));
 const root=id=>{let r=id;while(parents.get(r)!==r)r=parents.get(r);while(id!==r){const next=parents.get(id);parents.set(id,r);id=next;}return r;};
 const connect=(a,b)=>{const ra=root(a),rb=root(b);if(ra!==rb)parents.set(rb,ra);};
 for(const joint of physics.joints.values())if(parents.has(joint.a)&&parents.has(joint.b))connect(joint.a,joint.b);
 const seen=new Set();let pairs=0,points=0,staticPairs=0;
 for(const part of parts)physics.world.contactPairsWith(part.collider,other=>{
  const key=[part.collider.handle,other.handle].sort((a,b)=>a-b).join(':');if(seen.has(key))return;seen.add(key);
  let count=0;physics.world.contactPair(part.collider,other,m=>{count+=m.numSolverContacts();});if(!count)return;
  pairs++;points+=count;const member=physics.partForCollider(other);if(member)connect(part.id,member.id);else staticPairs++;
 });
 const groups=new Map();for(const p of parts){const id=root(p.id),g=groups.get(id)??{parts:0,active:0};g.parts++;g.active+=p.body.isSleeping()?0:1;groups.set(id,g);}
 return {parts:parts.length,active:parts.filter(p=>!p.body.isSleeping()).length,sleeping:parts.filter(p=>p.body.isSleeping()).length,contactPairs:pairs,solverContactPoints:points,staticPairs,
  connectedIslands:groups.size,activeIslands:[...groups.values()].filter(g=>g.active).length,largestIsland:Math.max(0,...[...groups.values()].map(g=>g.parts)),
  scope:'Current joint + contact graph, not native solver island internals'};
}
