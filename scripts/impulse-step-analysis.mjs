// Independent scalar formulation of the isolated impulse-step candidate.
// Research math only: not imported by the game, does not alter body state.
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export function feasibleImpulseScale(before1,before2,delta1,delta2,cap){
 if(!Number.isFinite(cap)||cap<=0||[before1,before2,delta1,delta2].some(v=>!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite)))throw Error('Invalid impulse-step vectors/cap');
 let result=1;
 for(const [a,d]of [[before1,delta1],[before2,delta2]]){
  const radius=Math.max(cap,Math.hypot(...a)),aa=dot(d,d),bb=dot(a,d),cc=dot(a,a)-radius*radius;
  const next=a.map((x,i)=>x+d[i]);
  if(dot(next,next)>radius*radius&&aa>0){
   const root=Math.max(0,Math.min(1,(-bb+Math.sqrt(Math.max(0,bb*bb-aa*cc)))/aa));
   result=Math.min(result,root*.99999);
  }
 }
 return result;
}
/** Preserve an unmodified float32 lane byte-for-byte when the constraint is
 * inactive: before+(proposed-before)*1 is NOT a safe numerical identity. */
export function applyFeasibleStep(before,proposed,scale){
 return scale===1?proposed:before.map((x,i)=>Math.fround(x+Math.fround(Math.fround(proposed[i]-x)*scale)));
}
