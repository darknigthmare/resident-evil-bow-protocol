/** Decode dimensions from PNG/WebP containers; this is not a pixel/lore review. */
export function dimensions(b){
 if(!Buffer.isBuffer(b)||b.length<24||b.length>64*1024*1024)throw Error('Invalid image size');
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
  if(b.toString('ascii',12,16)!=='IHDR'||b.readUInt32BE(8)!==13)throw Error('Invalid PNG header');
  const w=b.readUInt32BE(16),h=b.readUInt32BE(20);let p=8,idat=false,iend=false;
  while(p+12<=b.length){const n=b.readUInt32BE(p);if(p+12+n>b.length)throw Error('Truncated PNG');const tag=b.toString('ascii',p+4,p+8);idat ||=tag==='IDAT';if(tag==='IEND'){iend=true;break;}p+=n+12;}
  if(!idat||!iend)throw Error('Incomplete PNG');return checked(w,h,'png');
 }
 if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'){
  if(b.readUInt32LE(4)+8!==b.length)throw Error('Truncated WebP');
  for(let p=12;p+8<=b.length;){const tag=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4),s=p+8;if(s+n>b.length)throw Error('Invalid WebP chunk');
   if(tag==='VP8X'&&n>=10)return checked(1+b.readUIntLE(s+4,3),1+b.readUIntLE(s+7,3),'webp');
   if(tag==='VP8L'&&n>=5&&b[s]===47){const v=b.readUInt32LE(s+1);return checked((v&16383)+1,((v>>>14)&16383)+1,'webp');}
   if(tag==='VP8 '&&n>=10&&b[s+3]===157&&b[s+4]===1&&b[s+5]===42)return checked(b.readUInt16LE(s+6)&16383,b.readUInt16LE(s+8)&16383,'webp');
   p=s+n+(n&1);
  }
 }
 throw Error('Only complete PNG/WebP image containers are supported');
}
function checked(width,height,format){if(width<8||height<8||width>8192||height>8192||width*height>32*1024*1024)throw Error('Unsupported raster dimensions');return {width,height,format};}
