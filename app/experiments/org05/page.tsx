"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderGrowth } from "./growth-engine";

type V = { x: number; y: number };
type Guide = V & { strength: number };
type Analysis = { w: number; h: number; field: Float32Array; edge: Float32Array; gx: Float32Array; gy: Float32Array; guides: Guide[] };
const W = 1000, H = 760, AW = 110, AH = 84;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const rnd=(seed:number)=>{let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}};
const noise=(x:number,y:number,s:number)=>{const v=Math.sin(x*127.1+y*311.7+s*.37)*43758.5453;return v-Math.floor(v)};
function analyze(img:HTMLImageElement,threshold:number,smoothing:number,contrast:number):Analysis{
 const c=document.createElement("canvas");c.width=AW;c.height=AH;const ctx=c.getContext("2d",{willReadFrequently:true})!;
 const scale=Math.max(AW/img.width,AH/img.height);ctx.drawImage(img,(AW-img.width*scale)/2,(AH-img.height*scale)/2,img.width*scale,img.height*scale);
 const pixels=ctx.getImageData(0,0,AW,AH).data,gray=new Float32Array(AW*AH);
 for(let i=0;i<gray.length;i++)gray[i]=1-(pixels[4*i]*.2126+pixels[4*i+1]*.7152+pixels[4*i+2]*.0722)/255;
 const blur=Math.floor(smoothing/11),field=new Float32Array(AW*AH),edge=new Float32Array(AW*AH),gx=new Float32Array(AW*AH),gy=new Float32Array(AW*AH);
 for(let y=0;y<AH;y++)for(let x=0;x<AW;x++){
 let sum=0,count=0;const step=Math.max(1,Math.floor(blur/4));
 for(let dy=-blur;dy<=blur;dy+=step)for(let dx=-blur;dx<=blur;dx+=step){sum+=gray[clamp(y+dy,0,AH-1)*AW+clamp(x+dx,0,AW-1)];count++;}
 const v=sum/count;field[y*AW+x]=clamp((v-(threshold/100-.5)*.5-.5)*(1+contrast/24)+.5,0,1);
 }
 for(let y=1;y<AH-1;y++)for(let x=1;x<AW-1;x++){
 let i=y*AW+x,dx=field[i+1]-field[i-1],dy=field[i+AW]-field[i-AW];gx[i]=dx;gy[i]=dy;edge[i]=clamp(Math.hypot(dx,dy)*2.5,0,1);
 }
 const candidates:Guide[]=[];for(let y=5;y<AH-5;y+=5)for(let x=5;x<AW-5;x+=5){
 let e=0,m=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const i=(y+dy)*AW+x+dx;e+=edge[i];m+=field[i]}
 const strength=e/25*.75+m/25*.25;candidates.push({x:x/AW,y:y/AH,strength});
 }
 candidates.sort((a,b)=>b.strength-a.strength);const guides:Guide[]=[];
 for(const p of candidates){if(guides.every(q=>Math.hypot((q.x-p.x)*W,(q.y-p.y)*H)>155))guides.push(p);if(guides.length>=5)break}
 return {w:AW,h:AH,field,edge,gx,gy,guides:guides.length?guides:[{x:.5,y:.5,strength:1}]};
}
function get(a:Analysis|undefined,kind:"field"|"edge"|"gx"|"gy",x:number,y:number){if(!a)return 0;const xi=clamp(Math.round(x*(a.w-1)),0,a.w-1),yi=clamp(Math.round(y*(a.h-1)),0,a.h-1);return a[kind][yi*a.w+xi]}
export default function Org05(){
 const imgRef=useRef<HTMLImageElement|null>(null),drag=useRef<number|null>(null),analysisRef=useRef<HTMLCanvasElement>(null);
 const [sourceName,setSourceName]=useState("No image — use the synthetic study or upload one"),[revision,setRevision]=useState(0);
 const [threshold,setThreshold]=useState(48),[smoothing,setSmoothing]=useState(35),[contrast,setContrast]=useState(42),[analysis,setAnalysis]=useState<Analysis|undefined>(),[guides,setGuides]=useState<Guide[]>([{x:.37,y:.44,strength:1},{x:.66,y:.63,strength:1}]);
 const [seed,setSeed]=useState(2718),[expansion,setExpansion]=useState(55),[repulsion,setRepulsion]=useState(65),[compression,setCompression]=useState(45),[smoothness,setSmoothness]=useState(75),[pruning,setPruning]=useState(40),[width,setWidth]=useState(32),[influence,setInfluence]=useState(75),[contours,setContours]=useState(10),[renderMode,setRenderMode]=useState<"CONTOUR"|"RIBBON">("CONTOUR"),[showAnalysis,setShowAnalysis]=useState(true),[palette,setPalette]=useState("ink");
 const palettes:Record<string,{bg:string;ink:string[]}>={ink:{bg:"#f4eadd",ink:["#0e232f","#16383a","#192634"]},signal:{bg:"#f1dbbf",ink:["#ed643b","#153c50","#624687","#25252a"]},acid:{bg:"#f1f1c8",ink:["#002e24","#2f8f4b","#f26d21","#111b18"]},mono:{bg:"#eaeaea",ink:["#111111","#555555","#999999"]}};
 useEffect(()=>{if(!imgRef.current)return;setAnalysis(analyze(imgRef.current,threshold,smoothing,contrast));},[threshold,smoothing,contrast,revision]);
 useEffect(()=>{if(analysis)setGuides(analysis.guides);},[analysis]);
 const svg=useMemo(()=>renderGrowth(analysis,guides,{seed,expansion,repulsion,compression,smoothness,pruning,width,influence,contours,render:renderMode},palettes[palette].bg,palettes[palette].ink[0]),[analysis,guides,seed,expansion,repulsion,compression,smoothness,pruning,width,influence,contours,renderMode,palette]);
 useEffect(()=>{const c=analysisRef.current;if(!c||!analysis||!showAnalysis)return;c.width=AW*3;c.height=AH*3;const ctx=c.getContext("2d")!,im=ctx.createImageData(c.width,c.height);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const v=analysis.field[Math.floor(y/3)*AW+Math.floor(x/3)],edge=analysis.edge[Math.floor(y/3)*AW+Math.floor(x/3)];const z=(y*c.width+x)*4,gray=Math.round(247-v*220-edge*55);im.data.set([gray,gray,gray,255],z)}ctx.putImageData(im,0,0);ctx.fillStyle="#fb6233";guides.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x*c.width,p.y*c.height,8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="14px sans-serif";ctx.fillText(String(i+1),p.x*c.width+12,p.y*c.height);ctx.fillStyle="#fb6233";});},[analysis,guides,showAnalysis]);
 const loadFile=(file?:File)=>{if(!file)return;const reader=new FileReader();reader.onload=()=>{const im=new Image();im.onload=()=>{imgRef.current=im;setSourceName(file.name);setRevision(v=>v+1)};im.src=String(reader.result)};reader.readAsDataURL(file)};
 const pointer=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(drag.current===null)return;const b=e.currentTarget.getBoundingClientRect();const x=clamp((e.clientX-b.left)/b.width,0,1),y=clamp((e.clientY-b.top)/b.height,0,1);setGuides(v=>v.map((p,i)=>i===drag.current?{...p,x,y}:p));};
 const slider=(label:string,val:number,onChange:(v:number)=>void)=><label style={{display:"block",fontSize:11,marginBottom:16}}><span style={{display:"flex",justifyContent:"space-between"}}>{label}<span style={{color:"#aaa"}}>{val}</span></span><input type="range" min="0" max="100" value={val} onChange={e=>onChange(+e.target.value)} style={{display:"block",width:"100%",accentColor:"#ff6739",marginTop:9}}/></label>;
 const setContourPercent=(v:number)=>setContours(Math.max(3,Math.round(v/5)));
 const download=()=>{const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));link.download="ORG-GROWTH-"+seed+".svg";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)};
 return <main style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 326px",height:"100dvh",background:"#242424",color:"#eee",fontFamily:"Arial,Helvetica,sans-serif"}}>
 <section style={{minWidth:0,display:"flex",flexDirection:"column"}}>
 <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"15px 24px",background:"#101010",borderBottom:"1px solid #333"}}><div><b style={{fontSize:23}}>ORG/GROWTH 01</b> <span style={{fontSize:10,letterSpacing:2,color:"#999",marginLeft:12}}>COHERENT DIFFERENTIAL GROWTH</span></div><a href="/" style={{color:"#aaa",fontSize:12}}>← INDEX</a></header>
 <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,minHeight:0}}><div style={{width:"100%",maxWidth:1100,maxHeight:"100%",aspectRatio:"1000 / 760",boxShadow:"0 12px 42px #0007",background:"#f4eadd"}} dangerouslySetInnerHTML={{__html:svg}}/></div>
 <footer style={{background:"#111",padding:"12px 24px",fontSize:10,letterSpacing:1,color:"#aaa"}}>IMAGE → SKELETON → SIMULATION → SELECTED CONTOURS · PRIVATE DEVELOPMENT PREVIEW</footer>
 </section>
 <aside style={{overflowY:"auto",background:"#111",borderLeft:"1px solid #383838",padding:18}}>
 <div style={{fontSize:10,letterSpacing:2,color:"#999",marginBottom:15}}>01 / SOURCE + ANALYSIS</div>
 <input type="file" accept="image/*" aria-label="Upload an image" onChange={e=>loadFile(e.target.files?.[0])} style={{fontSize:11,width:"100%"}}/><p style={{fontSize:10,color:"#888",lineHeight:1.5}}>{sourceName}</p>
 <button onClick={()=>setShowAnalysis(v=>!v)} style={{width:"100%",padding:9,background:"#303030",border:"1px solid #555",color:"#eee",cursor:"pointer"}}>{showAnalysis?"HIDE ANALYSIS":"SHOW ANALYSIS"}</button>
 {showAnalysis&&<div style={{marginTop:9}}>{analysis?<canvas ref={analysisRef} style={{width:"100%",touchAction:"none",cursor:"crosshair"}} onPointerDown={e=>{const rect=e.currentTarget.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;let index=-1,dist=25;guides.forEach((p,i)=>{const d=Math.hypot((p.x-x)*rect.width,(p.y-y)*rect.height);if(d<dist){dist=d;index=i}});if(index>=0){drag.current=index;e.currentTarget.setPointerCapture(e.pointerId)}}} onPointerMove={pointer} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}/>:<div style={{background:"#292929",padding:16,fontSize:11}}>Upload a source to reveal its analysis.</div>}<p style={{fontSize:10,color:"#999"}}>Drag the orange guides to adjust compression zones; analysis also determines the main growth axis.</p><button onClick={()=>setGuides(v=>[...v,{x:.5,y:.5,strength:1}])}>+ GUIDE</button><button onClick={()=>setGuides(v=>v.slice(0,-1))} style={{marginLeft:8}}>− GUIDE</button></div>}
 <div style={{borderTop:"1px solid #383838",paddingTop:17,marginTop:20}}>{slider("Threshold",threshold,setThreshold)}{slider("Simplify / blur",smoothing,setSmoothing)}{slider("Contrast",contrast,setContrast)}</div>
 <div style={{borderTop:"1px solid #383838",paddingTop:17,marginTop:6}}><div style={{fontSize:10,letterSpacing:2,color:"#999",marginBottom:13}}>02 / DIFFERENTIAL GROWTH</div><p style={{fontSize:11,color:"#aaa",lineHeight:1.5}}>One coherent structure. Related contours captured across the same growth simulation. Image masses guide its principal axis and expansion pressure.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:17}}>{(["CONTOUR","RIBBON"] as const).map(n=><button key={n} onClick={()=>setRenderMode(n)} style={{padding:11,fontSize:11,background:renderMode===n?"#eee":"#262626",color:renderMode===n?"#111":"#ddd",border:"1px solid #555",cursor:"pointer"}}>{n}</button>)}</div></div>
 <div style={{borderTop:"1px solid #383838",paddingTop:18}}>{slider("Expansion",expansion,setExpansion)}{slider("Repulsion",repulsion,setRepulsion)}{slider("Compression",compression,setCompression)}{slider("Smoothness",smoothness,setSmoothness)}{slider("Prune strength",pruning,setPruning)}{slider("Contour count",contours*5,setContourPercent)}{slider("Width contrast",width,setWidth)}{slider("Image influence",influence,setInfluence)}</div>
 <div style={{borderTop:"1px solid #383838",paddingTop:18}}><label style={{fontSize:11}}>Palette<select value={palette} onChange={e=>setPalette(e.target.value)} style={{display:"block",width:"100%",background:"#252525",padding:10,marginTop:9,color:"#eee",border:"1px solid #555"}}><option value="ink">Ink / Paper</option><option value="signal">Signal / Pop</option><option value="acid">Acid / Botanical</option><option value="mono">Monochrome</option></select></label><label style={{display:"flex",justifyContent:"space-between",fontSize:11,alignItems:"center",margin:"17px 0"}}>Seed <input type="number" value={seed} onChange={e=>setSeed(Number(e.target.value))} style={{width:96,padding:8,color:"#eee",background:"#252525",border:"1px solid #555"}}/></label><button onClick={()=>setSeed(Math.floor(Math.random()*999999))} style={{width:"100%",padding:12,background:"#f16c39",border:0,cursor:"pointer",fontWeight:700}}>↻ NEW INTERPRETATION</button><button onClick={download} style={{width:"100%",marginTop:7,padding:11,background:"#222",color:"#eee",border:"1px solid #555",cursor:"pointer"}}>EXPORT SVG ↗</button></div>
 <p style={{fontSize:10,lineHeight:1.5,color:"#777",marginTop:18}}>One growth organism, selected contour history, shared axis, and restrained variation. Draft experiment — not on the public index.</p>
 </aside></main>;
}
