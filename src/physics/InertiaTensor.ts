import {rotate,vec,type Vec3,type Quat} from '../slicing/Math';
import type {Matrix3} from './Diagnostics';
/** Direct Q diag(I) Q^T, avoiding inversion of the extremely ill-conditioned
 * inverse inertia of a long micron-scale retained fragment. Read-only. */
export function principalInertiaTensor(principal:Vec3,frame:Quat):Matrix3 {
 const axes=[vec(1,0,0),vec(0,1,0),vec(0,0,1)].map(axis=>rotate(axis,frame)),values=[principal.x,principal.y,principal.z];
 const entry=(a:keyof Vec3,b:keyof Vec3)=>axes.reduce((sum,axis,i)=>sum+values[i]*axis[a]*axis[b],0);
 return {m11:entry('x','x'),m12:entry('x','y'),m13:entry('x','z'),m22:entry('y','y'),m23:entry('y','z'),m33:entry('z','z')};
}
