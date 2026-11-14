import {expect,it} from 'vitest';
import {GeometryRead,box,clip,vertices} from '../../src/slicing/ConvexClipper';
import {prepareRowCut} from '../../src/slicing/RowPreparation';
import {vec} from '../../src/slicing/Math';
it('reuses exact welded vertices within one read-only scope and discards at the next operation',()=>{
 const poly=box(.2,2,.2),read=new GeometryRead();
 const a=read.vertices(poly);expect(read.vertices(poly)).toBe(a);expect(read.welds).toBe(1);expect(a).toEqual(vertices(poly));
 expect(clip(poly,vec(0,1,0),.5,read)).toEqual(clip(poly,vec(0,1,0),.5));
 poly.faces[0].vertices[0].x-=.1;
 expect(new GeometryRead().vertices(poly)).toEqual(vertices(poly));
});
it('row preparation returns identical caps/UVs/score while avoiding repeated original hull welds',()=>{
 const poly=box(.2,2,.2),local=[{lower:-1,upper:0},{lower:.5,upper:1}],read=new GeometryRead();
 const cached=prepareRowCut(poly,vec(0,1,0),local,true,read),reference=prepareRowCut(poly,vec(0,1,0),local,true,null);
 expect(cached).toEqual(reference);expect(read.reads).toBeGreaterThan(read.welds);
});
