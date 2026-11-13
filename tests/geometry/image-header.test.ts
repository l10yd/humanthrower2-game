import { describe,it,expect } from 'vitest';
import { inspectImageHeader } from '../../src/assets/ImageHeader';
const chunk=(name:string,body:Uint8Array)=>{const bytes=new Uint8Array(body.length+12),v=new DataView(bytes.buffer);v.setUint32(0,body.length);bytes.set(new TextEncoder().encode(name),4);bytes.set(body,8);return bytes;};
const concat=(...arrays:Uint8Array[])=>{const bytes=new Uint8Array(arrays.reduce((s,b)=>s+b.length,0));let offset=0;for(const b of arrays){bytes.set(b,offset);offset+=b.length;}return bytes;};
function png(w:number,h:number){const ihdr=new Uint8Array(13),view=new DataView(ihdr.buffer);view.setUint32(0,w);view.setUint32(4,h);ihdr[8]=8;ihdr[9]=6;return concat(new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',new Uint8Array([1])),chunk('IEND',new Uint8Array()));}
function jpeg(w:number,h:number){return new Uint8Array([255,216,255,192,0,11,8,h>>8,h&255,w>>8,w&255,1,1,17,0,255,218,0,8,1,1,0,0,63,0,1,255,217]);}
function webp(w:number,h:number){const bytes=new Uint8Array(30),v=new DataView(bytes.buffer);bytes.set(new TextEncoder().encode('RIFF'));v.setUint32(4,22,true);bytes.set(new TextEncoder().encode('WEBPVP8 '),8);v.setUint32(16,10,true);bytes[23]=157;bytes[24]=1;bytes[25]=42;v.setUint16(26,w,true);v.setUint16(28,h,true);return bytes;}
describe('bounded embedded image header inspection, not pixel decoding',()=>{
 for(const [mime,make]of [['image/png',png],['image/jpeg',jpeg],['image/webp',webp]] as const){
  it(`${mime} reads dimensions before a decoder and rejects oversized/zero/truncated/spoofed images`,()=>{
   expect(inspectImageHeader(make(64,32),mime)).toMatchObject({width:64,height:32,mimeType:mime});
   expect(()=>inspectImageHeader(make(4096,32),mime)).toThrow('dimensions');expect(()=>inspectImageHeader(make(0,32),mime)).toThrow();expect(()=>inspectImageHeader(make(64,32).slice(0,15),mime)).toThrow();expect(()=>inspectImageHeader(new Uint8Array(60),mime)).toThrow();
  });
 }
 it('PNG animation/chunk corruption and unsupported codec types are refused',()=>{
  const source=png(64,64);expect(()=>inspectImageHeader(concat(source.slice(0,33),chunk('acTL',new Uint8Array(8)),source.slice(33)),'image/png')).toThrow();
  const corrupt=png(64,64);new DataView(corrupt.buffer).setUint32(33,999999);expect(()=>inspectImageHeader(corrupt,'image/png')).toThrow();
  expect(()=>inspectImageHeader(new Uint8Array(60),'image/gif')).toThrow();
 });
 it('WebP animated/extended canvases cannot conceal a larger allocation',()=>{
  const bytes=new Uint8Array(40),view=new DataView(bytes.buffer);bytes.set(new TextEncoder().encode('RIFF'));view.setUint32(4,32,true);bytes.set(new TextEncoder().encode('WEBPVP8X'),8);view.setUint32(16,10,true);bytes[20]=2;
  expect(()=>inspectImageHeader(bytes,'image/webp')).toThrow();
 });
});
