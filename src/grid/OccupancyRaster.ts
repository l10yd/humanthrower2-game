import { CONFIG } from '../core/Config';
import { GeometryRead,clip, vertices, type ConvexPolyhedron } from '../slicing/ConvexClipper';
import { dot } from '../slicing/Math';
import { add, rotate, vec, type Vec3 } from '../slicing/Math';
import type { Part } from '../physics/PhysicsManager';
interface Point {x:number;y:number}
const turn=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function hull(points:Point[]):Point[] {
  const ps=points.sort((a,b)=>a.x-b.x||a.y-b.y);if(ps.length<3)return ps;
  const lower:Point[]=[],upper:Point[]=[];
  for(const p of ps){while(lower.length>=2&&turn(lower.at(-2)!,lower.at(-1)!,p)<=0)lower.pop();lower.push(p);}
  for(const p of [...ps].reverse()){while(upper.length>=2&&turn(upper.at(-2)!,upper.at(-1)!,p)<=0)upper.pop();upper.push(p);}
  lower.pop();upper.pop();return lower.concat(upper);
}
export interface RowCoverage { columns:number[]; mean:number; stableRatio:number; gap:number; qualifies:boolean }
interface Footprint { poly:ConvexPolyhedron; pose:number[]; pixels:Uint32Array; spans:boolean }
/** Physical hulls are clipped in 3D BEFORE XY projection; cached footprints never subtract from an OR map. */
export class OccupancyRaster {
  readonly width=CONFIG.rows.columns*CONFIG.rows.resolution;readonly height=CONFIG.rows.count*CONFIG.rows.resolution;
  map=new Uint8Array(this.width*this.height);stable=new Uint8Array(this.map.length);overflow=new Uint8Array(this.map.length);
  rows:RowCoverage[]=[];cacheHits=0;cacheMisses=0;
  private cache=new Map<number,Footprint>();
  rebuild(parts:Iterable<Part>,useCache=true) {
    this.map.fill(0);this.stable.fill(0);this.overflow.fill(0);const alive=new Set<number>();
    for(const part of parts) {
      if(part.owner==='player')continue;alive.add(part.id);
      const v=part.body.linvel(),w=part.body.angvel(),sleep=part.body.isSleeping();
      const stable=sleep||(Math.hypot(v.x,v.y,v.z)<1&&Math.hypot(w.x,w.y,w.z)<2);
      const overflowStable=sleep||(Math.hypot(v.x,v.y,v.z)<.25&&Math.hypot(w.x,w.y,w.z)<.5);
      const t=part.body.translation(),q=part.body.rotation(),pose=[t.x,t.y,t.z,q.x,q.y,q.z,q.w];
      let footprint=this.cache.get(part.id);
      if(!useCache||!footprint||footprint.poly!==part.poly||footprint.spans!==this.footprintSpans||pose.some((n,i)=>n!==footprint!.pose[i])) {
        const transformed=new Map<Vec3,Vec3>();
        const world={faces:part.poly.faces.map(f=>({...f,vertices:f.vertices.map(p=>{
          if(!this.sharedCornerTransforms)return add(t,rotate(p,q));
          let value=transformed.get(p);if(!value){value=add(t,rotate(p,q));transformed.set(p,value);}return value;
        })}))};
        const pixels=this.project(world);footprint={poly:part.poly,pose,pixels,spans:this.footprintSpans};this.cache.set(part.id,footprint);this.cacheMisses++;
      }else this.cacheHits++;
      if(footprint.spans){
        for(let k=0;k<footprint.pixels.length;k+=2){const start=footprint.pixels[k],end=footprint.pixels[k+1];this.map.fill(1,start,end);if(stable)this.stable.fill(1,start,end);if(overflowStable)this.overflow.fill(1,start,end);}
      }else for(const i of footprint.pixels){this.map[i]=1;if(stable)this.stable[i]=1;if(overflowStable)this.overflow[i]=1;}
    }
    for(const id of this.cache.keys())if(!alive.has(id))this.cache.delete(id);
    this.rows=this.singlePassStatistics?this.summarizeRows():this.referenceRows();return this.rows;
  }
  /** Diagnostic reference row statistics, same integer counts/thresholds. */
  singlePassStatistics=false;
  private summarizeRows():RowCoverage[]{
    const res=CONFIG.rows.resolution,result:RowCoverage[]=[];
    for(let row=0;row<CONFIG.rows.count;row++){
      const counts=new Uint32Array(CONFIG.rows.columns),occupied=new Uint8Array(this.width);let total=0,stable=0;
      for(let y=row*res;y<(row+1)*res;y++)for(let col=0;col<CONFIG.rows.columns;col++){
        const start=col*res,end=start+res;
        for(let x=start;x<end;x++){
          const i=y*this.width+x,n=this.map[i];counts[col]+=n;total+=n;stable+=this.stable[i];occupied[x]|=n;
        }
      }
      let maxGap=0,gap=0;for(let x=0;x<this.width;x++){gap=occupied[x]?0:gap+1;maxGap=Math.max(maxGap,gap);}
      const columns=Array.from(counts,n=>n/(res*res)),mean=total/(this.width*res),ratio=total?stable/total:0;
      result.push({columns,mean,stableRatio:ratio,gap:maxGap/res,qualifies:columns.every(v=>v>=CONFIG.rows.cellCoverage)&&mean>=CONFIG.rows.meanCoverage&&ratio>=CONFIG.rows.stableRatio&&maxGap/res<=CONFIG.rows.maxGap});
    }
    return result;
  }
  private referenceRows():RowCoverage[]{
    return Array.from({length:CONFIG.rows.count},(_,row)=>{
      const columns:number[]=[],res=CONFIG.rows.resolution;let total=0,stable=0,maxGap=0,gap=0;
      for(let x=0;x<this.width;x++) {
        let occupied=false;for(let y=row*res;y<(row+1)*res;y++)if(this.map[y*this.width+x])occupied=true;
        gap=occupied?0:gap+1;maxGap=Math.max(maxGap,gap);
      }
      for(let col=0;col<CONFIG.rows.columns;col++) {
        let n=0;for(let y=row*res;y<(row+1)*res;y++)for(let x=col*res;x<(col+1)*res;x++){
          const i=y*this.width+x;n+=this.map[i];stable+=this.stable[i];
        }columns.push(n/(res*res));total+=n;
      }
      const mean=total/(this.width*res),ratio=total?stable/total:0;
      return {columns,mean,stableRatio:ratio,gap:maxGap/res,qualifies:columns.every(v=>v>=CONFIG.rows.cellCoverage)
        &&mean>=CONFIG.rows.meanCoverage&&ratio>=CONFIG.rows.stableRatio&&maxGap/res<=CONFIG.rows.maxGap};
    });
  }
  get cacheSize(){return this.cache.size;}
  criticalColumns():number[] {
    const res=CONFIG.rows.resolution,y0=Math.ceil(CONFIG.arena.critical*res),result:number[]=[];
    for(let col=0;col<CONFIG.rows.columns;col++){
      let n=0;for(let y=y0;y<this.height;y++)for(let x=col*res;x<(col+1)*res;x++)n+=this.overflow[y*this.width+x];
      result.push(n/(res*(this.height-y0)));
    }return result;
  }
  /** Diagnostic exact reference path for paired frozen-state measurements. */
  footprintSpans=false;
  sharedCornerTransforms=true;
  fastClipping=true;
  geometryReads=true;
  private geometryRead:GeometryRead|undefined;
  private halfSpace(poly:ConvexPolyhedron,n:Vec3,d:number){
    if(!this.fastClipping)return clip(poly,n,d,this.geometryRead);
    let inside=true,outside=true;
    for(const face of poly.faces)for(const p of face.vertices){const distance=dot(n,p)-d;if(distance>1e-9)inside=false;if(distance< -1e-9)outside=false;}
    if(inside)return poly;if(outside)return null;return clip(poly,n,d,this.geometryRead);
  }
  private project(world:ConvexPolyhedron):Uint32Array {
    this.geometryRead=this.geometryReads?new GeometryRead():undefined;
    try{return this.projectRead(world);}finally{this.geometryRead=undefined;}
  }
  private points(poly:ConvexPolyhedron){return this.geometryRead?this.geometryRead.vertices(poly):vertices(poly);}
  private projectRead(world:ConvexPolyhedron):Uint32Array {
    let bounded:ConvexPolyhedron|null=world;
    for(const [n,d]of [[vec(1,0,0),CONFIG.arena.width/2],[vec(-1,0,0),CONFIG.arena.width/2],
      [vec(0,0,1),CONFIG.arena.depth/2],[vec(0,0,-1),CONFIG.arena.depth/2],
      [vec(0,1,0),CONFIG.arena.height],[vec(0,-1,0),0]] as [Vec3,number][]){if(!bounded)break;bounded=this.halfSpace(bounded,n,d);}
    if(!bounded)return new Uint32Array();
    const points=this.points(bounded),bottom=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))),top=Math.min(CONFIG.rows.count-1,Math.floor(Math.max(...points.map(p=>p.y))));
    const pixels:number[]=[];
    for(let row=bottom;row<=top;row++) {
      const below=this.halfSpace(bounded,vec(0,1,0),row+1),slab=below&&this.halfSpace(below,vec(0,-1,0),-row);
      if(slab)this.raster(this.points(slab),row,pixels);
    }return Uint32Array.from(pixels);
  }
  private raster(points:Vec3[],row:number,pixels:number[]) {
    const res=CONFIG.rows.resolution,polygon=hull(points.map(p=>({x:(p.x+CONFIG.arena.width/2)*res,y:p.y*res})));
    if(polygon.length<3)return;
    const y0=Math.max(row*res,Math.ceil(Math.min(...polygon.map(p=>p.y))-.5)),y1=Math.min((row+1)*res-1,Math.floor(Math.max(...polygon.map(p=>p.y))-.5));
    for(let y=y0;y<=y1;y++) {
      const xs:number[]=[];for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length];
        if((a.y<=y+.5&&b.y>y+.5)||(b.y<=y+.5&&a.y>y+.5))xs.push(a.x+(y+.5-a.y)*(b.x-a.x)/(b.y-a.y));
      }if(xs.length<2)continue;
      const x0=Math.max(0,Math.ceil(Math.min(...xs)-.5)),x1=Math.min(this.width-1,Math.floor(Math.max(...xs)-.5));
      if(this.footprintSpans){if(x0<=x1)pixels.push(y*this.width+x0,y*this.width+x1+1);}
      else for(let x=x0;x<=x1;x++)pixels.push(y*this.width+x);
    }
  }
}
