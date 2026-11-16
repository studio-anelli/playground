// QuickTime PNG samples preserve full RGBA without a browser video encoder.
const bytes=(...parts:Uint8Array[])=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length}return out};
const u32=(n:number)=>{const a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,n);return a};
const u16=(n:number)=>new Uint8Array([n>>>8,n&255]);
const str=(s:string)=>new TextEncoder().encode(s);
const zeros=(n:number)=>new Uint8Array(n);
const atom=(name:string,...data:Uint8Array[])=>{const body=bytes(...data);return bytes(u32(body.length+8),str(name),body)};
const full=(name:string,...data:Uint8Array[])=>atom(name,zeros(4),...data);
const matrix=()=>bytes(u32(65536),u32(0),u32(0),u32(0),u32(65536),u32(0),u32(0),u32(0),u32(1073741824));
export function pngMovie(frames:Uint8Array[],width:number,height:number,fps:number):Blob{
 if(!frames.length||!Number.isInteger(fps)||fps<1)throw new Error("Invalid movie frames or frame rate");
 const duration=frames.length;
 const ftyp=atom("ftyp",str("qt  "),u32(0),str("qt  "));
 const offset=ftyp.length+8;
 const dataSize=frames.reduce((n,p)=>n+p.length,0);
 if(dataSize+offset>0xffffffff)throw new Error("Movie exceeds 4 GB. Reduce dimensions or duration.");
 const mvhd=full("mvhd",u32(0),u32(0),u32(fps),u32(duration),u32(65536),u16(256),zeros(10),matrix(),zeros(24),u32(2));
 const tkhd=atom("tkhd",new Uint8Array([0,0,0,7]),u32(0),u32(0),u32(1),u32(0),u32(duration),zeros(8),u16(0),u16(0),u16(0),u16(0),matrix(),u32(width*65536),u32(height*65536));
 const mdhd=full("mdhd",u32(0),u32(0),u32(fps),u32(duration),u16(0),u16(0));
 const hdlr=full("hdlr",str("mhlr"),str("vide"),zeros(12),str("PNG Video\0"));
 const entry=atom("png ",zeros(6),u16(1),zeros(16),u16(width),u16(height),u32(72*65536),u32(72*65536),u32(0),u16(1),zeros(32),u16(32),u16(65535));
 const stbl=atom("stbl",full("stsd",u32(1),entry),full("stts",u32(1),u32(duration),u32(1)),full("stsc",u32(1),u32(1),u32(duration),u32(1)),full("stsz",u32(0),u32(duration),...frames.map(p=>u32(p.length))),full("stco",u32(1),u32(offset)));
 const minf=atom("minf",atom("vmhd",new Uint8Array([0,0,0,1]),zeros(8)),atom("dinf",full("dref",u32(1),atom("url ",new Uint8Array([0,0,0,1])))),stbl);
 const moov=atom("moov",mvhd,atom("trak",tkhd,atom("mdia",mdhd,hdlr,minf)));
 return new Blob([ftyp as BlobPart,u32(dataSize+8) as BlobPart,str("mdat") as BlobPart,...frames as BlobPart[],moov as BlobPart],{type:"video/quicktime"});
}
