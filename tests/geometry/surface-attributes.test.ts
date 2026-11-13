import { describe,it,expect } from 'vitest';
import { box,clip,validate,massProperties,vertices,type ConvexPolyhedron } from '../../src/slicing/ConvexClipper';
import { planarCapUvs } from '../../src/slicing/SurfaceAttributes';
import { geometry } from '../../src/rendering/RetroRenderer';
import { dot,normalize,vec } from '../../src/slicing/Math';
function textured(){const p=box(1,1,1);p.faces=p.faces.map((f,i)=>({...f,surfaceId:`original-${i}`,uvs:f.vertices.map(v=>({u:v.x*.7+v.y*.2+v.z*.4+i*3,v:v.x*.1-v.y*.3+v.z*.8+i*5}))}));return p;}
const strip=(p:ConvexPolyhedron)=>({faces:p.faces.map(f=>({vertices:f.vertices,cap:f.cap}))});
describe('body-local per-face surface attributes',()=>{
 it('interpolates authored UVs at edge intersections, preserves seams and does not mutate the source',()=>{
  const source=textured(),before=JSON.stringify(source),normal=normalize(vec(.3,.8,.2)),kept=clip(source,normal,.2)!;validate(kept);
  for(const f of kept.faces.filter(f=>f.surfaceId?.startsWith('original-'))){
   const i=Number(f.surfaceId!.split('-')[1]);expect(f.uvs).toHaveLength(f.vertices.length);
   f.vertices.forEach((v,j)=>{expect(f.uvs![j].u).toBeCloseTo(v.x*.7+v.y*.2+v.z*.4+i*3,10);expect(f.uvs![j].v).toBeCloseTo(v.x*.1-v.y*.3+v.z*.8+i*5,10);});
  }
  const samePosition=kept.faces.flatMap(f=>f.vertices.map((v,i)=>({v,uv:f.uvs?.[i]}))).filter(c=>c.v.x===-1&&c.v.y===-1&&c.v.z===-1);
  expect(samePosition.length).toBeGreaterThan(1);expect(new Set(samePosition.map(c=>c.uv!.u)).size).toBeGreaterThan(1);expect(JSON.stringify(source)).toBe(before);
 });
 it('uses both cut-plane axes for cap UVs instead of collapsing a horizontal cut to one texture line',()=>{
  const kept=clip(textured(),vec(0,1,0),0)!,cap=kept.faces.at(-1)!;
  expect(cap.cap).toBe(true);expect(cap.surfaceId).toBe('cut');expect(cap.uvs).toHaveLength(cap.vertices.length);
  expect(new Set(cap.uvs!.map(v=>v.u)).size).toBeGreaterThan(1);expect(new Set(cap.uvs!.map(v=>v.v)).size).toBeGreaterThan(1);
  expect(planarCapUvs(cap.vertices,vec(0,-1,0))).toEqual(cap.uvs);
 });
 it('repeated clipping preserves the previous cap UVs and does not recenter their texture',()=>{
  const first=clip(textured(),vec(0,1,0),0)!,second=clip(first,vec(1,0,0),.3)!;
  const oldCap=second.faces.find(f=>f.cap&&f.vertices.every(p=>Math.abs(p.y)<1e-10))!;
  const expected=planarCapUvs(oldCap.vertices,vec(0,1,0));oldCap.uvs!.forEach((uv,i)=>{expect(uv.u).toBeCloseTo(expected[i].u,12);expect(uv.v).toBeCloseTo(expected[i].v,12);});validate(second);
  let p:ConvexPolyhedron=first;
  for(const [n,d]of [[vec(1,0,0),.8],[vec(0,0,1),.8],[vec(-1,0,0),.8],[vec(0,-1,0),.8]] as const){p=clip(p,n,d)!;validate(p);for(const f of p.faces)expect(f.uvs).toHaveLength(f.vertices.length);}
 });
 it('position-only and textured clipping have identical geometry, volume and COM',()=>{
  const source=textured(),normal=normalize(vec(.3,.8,.2)),a=clip(source,normal,.2)!,b=clip(strip(source),normal,.2)!;
  expect(strip(a)).toEqual(strip(b));expect(vertices(a)).toEqual(vertices(b));expect(massProperties(a)).toEqual(massProperties(b));
 });
 it('non-affine UVs interpolate only along the crossed source edge, not from a global projection',()=>{
  const source=textured(),face=source.faces[1];face.uvs=[{u:0,v:0},{u:2,v:1},{u:7,v:9},{u:-3,v:4}];
  const kept=clip(source,vec(1,0,0),0)!,retained=kept.faces.find(f=>f.surfaceId===face.surfaceId)!;
  retained.vertices.forEach((p,i)=>{if(Math.abs(p.x)>1e-8)return;const expected=p.y===-1?{u:1,v:.5}:{u:2,v:6.5};expect(retained.uvs![i]).toEqual(expected);});
 });
 it('rejects mismatched and non-finite UV arrays before clipping or rendering even for a no-op cut',()=>{
  for(const uvs of [[{u:0,v:0}],Array.from({length:4},()=>({u:NaN,v:1})),Array.from({length:4},()=>({u:Infinity,v:1}))]){
   const p=box(1,1,1);p.faces[0].uvs=uvs;
   expect(()=>clip(p,vec(0,1,0),2)).toThrow('Invalid face UV');expect(()=>validate(p)).toThrow('Invalid face UV');expect(()=>geometry(p)).toThrow('Invalid face UV');
  }
 });
 it('renderer emits authored UVs corner-for-corner and blood-off never changes them',()=>{
  const poly=clip(textured(),vec(0,1,0),0)!,a=geometry(poly,true),b=geometry(poly,false);
  try{
   const expected=poly.faces.flatMap(f=>Array.from({length:f.vertices.length-2},(_,i)=>[0,i+1,i+2].flatMap(j=>[f.uvs![j].u,f.uvs![j].v])).flat());
   expect(Array.from(a.getAttribute('uv').array)).toEqual(Array.from(new Float32Array(expected)));expect(a.getAttribute('uv').array).toEqual(b.getAttribute('uv').array);
   expect(a.getAttribute('position').array).toEqual(b.getAttribute('position').array);expect(a.getAttribute('normal').array).toEqual(b.getAttribute('normal').array);
  }finally{a.dispose();b.dispose();}
 });
 it('sparse UV corner arrays are rejected instead of reading undefined attributes',()=>{
  const p=box(1,1,1);p.faces[0].uvs=new Array(4);
  expect(()=>validate(p)).toThrow('Invalid face UV');expect(()=>clip(p,vec(0,1,0),0)).toThrow('Invalid face UV');
 });
 it('old untextured hulls retain legacy external-surface UVs',()=>{
  const poly=box(1,1,1),g=geometry(poly);try{
   const position=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++){expect(uv.getX(i)).toBeCloseTo(position.getX(i)*3+.5,6);expect(uv.getY(i)).toBeCloseTo(position.getY(i)*3+.5,6);}
  }finally{g.dispose();}
 });
});
