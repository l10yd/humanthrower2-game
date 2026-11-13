export const IMAGE_LIMITS={maxBytes:1024*1024,maxDimension:128,maxImages:12,maxPixels:12*128*128} as const;
export interface ImageHeader {width:number;height:number;mimeType:string;bytes:number}
const fail=()=>{throw Error('Invalid or unsupported embedded image header');};
const dimensions=(width:number,height:number,mimeType:string,bytes:number):ImageHeader=>{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>IMAGE_LIMITS.maxDimension||height>IMAGE_LIMITS.maxDimension)throw Error('Embedded image dimensions exceed character limits');
 return {width,height,mimeType,bytes};
};
/** Header/container checks only, not a pixel decoder or proof of codec validity.
 * All allocations for actual pixels happen AFTER these dimension/byte limits. */
export function inspectImageHeader(data:Uint8Array,mimeType:string):ImageHeader {
 if(!data.byteLength||data.byteLength>IMAGE_LIMITS.maxBytes)throw Error('Embedded image byte budget exceeded');
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength),n=data.length;
 const ascii=(offset:number,length:number)=>String.fromCharCode(...data.subarray(offset,offset+length));
 if(mimeType==='image/png'){
  if(n<45||[137,80,78,71,13,10,26,10].some((v,i)=>data[i]!==v))return fail();
  let at=8,width=0,height=0,idat=false,ended=false,count=0;
  while(at<n){if(at+12>n||++count>4096)return fail();const size=view.getUint32(at),type=ascii(at+4,4);if(size>n-at-12)return fail();
   if(at===8){if(type!=='IHDR'||size!==13)return fail();width=view.getUint32(at+8);height=view.getUint32(at+12);dimensions(width,height,mimeType,n);
    const depth=data[at+16],color=data[at+17],validDepth:Record<number,readonly number[]>={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
    if(!validDepth[color]?.includes(depth)||data[at+18]!==0||data[at+19]!==0||data[at+20]>1)return fail();
   }else if(type==='IHDR'||type==='acTL'||type==='fcTL'||type==='fdAT')return fail();
   if(type==='IDAT')idat=true;
   if(type==='IEND'){if(size!==0||!idat||at+12!==n)return fail();ended=true;break;}
   at+=size+12;
  }
  if(!ended)return fail();return dimensions(width,height,mimeType,n);
 }
 if(mimeType==='image/jpeg'){
  if(n<12||data[0]!==255||data[1]!==216||data[n-2]!==255||data[n-1]!==217)return fail();
  let at=2,width=0,height=0,scan=false,count=0;
  while(at<n-2){if(++count>4096||data[at++]!==255)return fail();while(at<n&&data[at]===255)at++;if(at>=n)return fail();const marker=data[at++];
   if(marker===0||marker===216)return fail();if(marker>=208&&marker<=215||marker===1)continue;
   if(at+2>n)return fail();const size=view.getUint16(at);if(size<2||at+size>n)return fail();
   if(marker===192||marker===194){if(width||size<8||data[at+2]!==8)return fail();height=view.getUint16(at+3);width=view.getUint16(at+5);dimensions(width,height,mimeType,n);const components=data[at+7];if(![1,3,4].includes(components)||size!==8+components*3)return fail();}
   else if(marker>=193&&marker<=207&&![196,200,204].includes(marker))return fail();
   if(marker===218){if(!width||size<6)return fail();scan=true;break;}at+=size;
  }
  if(!scan)return fail();return dimensions(width,height,mimeType,n);
 }
 if(mimeType==='image/webp'){
  if(n<20||ascii(0,4)!=='RIFF'||ascii(8,4)!=='WEBP'||view.getUint32(4,true)!==n-8)return fail();
  let at=12,width=0,height=0,canvasWidth=0,canvasHeight=0,count=0;
  while(at<n){if(at+8>n||++count>4096)return fail();const type=ascii(at,4),size=view.getUint32(at+4,true),body=at+8;if(size>n-body)return fail();
   if(type==='ANIM'||type==='ANMF')return fail();
   if(type==='VP8X'){if(at!==12||size!==10||data[body]&2)return fail();canvasWidth=1+data[body+4]+(data[body+5]<<8)+(data[body+6]<<16);canvasHeight=1+data[body+7]+(data[body+8]<<8)+(data[body+9]<<16);dimensions(canvasWidth,canvasHeight,mimeType,n);}
   if(type==='VP8 '){if(width||size<10||data[body]&1||data[body+3]!==157||data[body+4]!==1||data[body+5]!==42)return fail();width=view.getUint16(body+6,true)&16383;height=view.getUint16(body+8,true)&16383;dimensions(width,height,mimeType,n);}
   if(type==='VP8L'){if(width||size<5||data[body]!==47||data[body+4]>>5)return fail();width=1+data[body+1]+((data[body+2]&63)<<8);height=1+(data[body+2]>>6)+(data[body+3]<<2)+((data[body+4]&15)<<10);dimensions(width,height,mimeType,n);}
   at=body+size+(size%2);if(at>n)return fail();
  }
  if(!width||canvasWidth&&(width!==canvasWidth||height!==canvasHeight))return fail();return dimensions(width,height,mimeType,n);
 }
 return fail();
}
