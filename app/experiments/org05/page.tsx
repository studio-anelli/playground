"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x:number; y:number; weight:number };
type Analysis = { levels: Float32Array; w:number; h:number; points:Point[]; palette:string[] };
const W=1000,H=760;
function rand(seed:number){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
function readImage(img:HTMLImageElement,threshold:number,blur:number,levels:number):Analysis{
 const c=document.createElement("canvas");c.width=120;c.height=92;const cx=c.getContext("2d")!;
 const scale=Math.max(120/img.width,92/img.height);cx.drawImage(img,(120-img.width*scale)/2,(92-img.height*scale)/2,img.width*scale,img.height*scale);
 const data=cx.getImageData(0,0,120,92).data;
 const luminance=new Float32Array(120*92),mapped=new Float32Array(120*92);
 for(let i=0;i<luminance.length;i++)luminance[i]=(data[i*4]*.2126+data[i*4+1]*.7152+data[i*4+2]*.0722)/255;
 const radius=Math.round(blur/8);
 for(let y=0;y<92;y++)for(let x=0;x<120;x++){let value=0,total=0;for(let dy=-radius;dy<=radius;dy+=Math.max(1,Math.floor(radius/3)))for(let dx=-radius;dx<=radius;dx+=Math.max(1,Math.floor(radius/3))){const xx=clamp(x+dx,0,119),yy=clamp(y+dy,0,91);value+=luminance[yy*120+xx];total++;}
 const v=value/total;const cut=clamp((threshold-50)/130+.5,.05,.95); const dark=clamp((cut-v)*3+0.5,0,1);mapped[y*120+x]=Math.floor(dark*levels)/Math.max(1,levels);}
 const blocks=[] as Point[];for(let y=5;y<92;y+=10)for(let x=5;x<120;x+=10){let sum=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)sum+=mapped[(y+dy)*120+(x+dx)];const weight=sum/81;blocks.push({x:x/120,y:y/92,weight});}
 blocks.sort((a,b)=>b.weight-a.weight);
 const points:Point[]=[];for(const candidate of blocks){if(points.every(p=>Math.hypot((p.x-candidate.x)*W,(p.y-candidate.y)*H)>165)){points.push(candidate);}if(points.length>=5)break;}
 if(!points.length)points.push({x:.5,y:.5,weight:1});
 const palette=["#f3e9db","#162d3e","#f26838","#b1c8bc","#72469c"];
 return {levels:mapped,w:120,h:92,points,palette};
}
function sample(a:Analysis,x:number,y:number){return a.levels[clamp(Math.floor(y*a.h),0,a.h-1)*a.w+clamp(Math.floor(x*a.w),0,a.w-1)];}
export default function Org05Page(){
 const canvas=useRef<HTMLCanvasElement>(null),preview=useRef<HTMLCanvasElement>(null),original=useRef<HTMLImageElement|null>(null),drag=useRef<number|null>(null);
 const [seed,setSeed]=useState(2718),[threshold,setThreshold]=useState(54),[blur,setBlur]=useState(35),[levels,setLevels]=useState(3),[abstract,setAbstract]=useState(75),[complexity,setComplexity]=useState(52),[mode,setMode]=useState<"CUT"|"FLOW">("CUT"),[showAnalysis,setShowAnalysis]=useState(false),[analysis,setAnalysis]=useState<Analysis|null>(null),[points,setPoints]=useState<Point[]>([]),[imageName,setImageName]=useState("No image uploaded"),[blend,setBlend]=useState<GlobalCompositeOperation>("multiply");
 const recompute=useCallback(()=>{if(!original.current)return;const a=readImage(original.current,threshold,blur,levels);setAnalysis(a);setPoints(a.points);},[threshold,blur,levels]);
 useEffect(()=>recompute(),[recompute]);
 useEffect(()=>{const c=preview.current;if(!c||!analysis)return;const ctx=c.getContext("2d")!;c.width=240;c.height=184;const img=ctx.createImageData(240,184);for(let y=0;y<184;y++)for(let x=0;x<240;x++){const v=sample(analysis,x/240,y/184),i=(y*240+x)*4;const ch=Math.round(247-v*215);img.data.set([ch,ch,ch,255],i);}ctx.putImageData(img,0,0);ctx.fillStyle="#ff4a17";points.forEach(p=>{ctx.beginPath();ctx.arc(p.x*240,p.y*184,4.5,0,Math.PI*2);ctx.fill()});},[analysis,points]);
 useEffect(()=>{
 const c=canvas.current;if(!c)return;const ctx=c.getContext("2d")!;c.width=W;c.height=H;
 ctx.fillStyle="#f3e9db";ctx.fillRect(0,0,W,H);
 const r=rand(seed), anchors=points.length?points:[{x:.45,y:.5,weight:.8},{x:.7,y:.28,weight:.6}];
 const strength=abstract/100, count=Math.round(8+complexity*.27);
 const color=["#162d3e","#f26838","#72469c","#b1c8bc","#ddaa5b","#222"];
 ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
 if(mode==="CUT"){
 ctx.globalCompositeOperation=blend;
 for(let i=0;i<count;i++){
 const origin=anchors[i%anchors.length],angle=r()*Math.PI*2,spread=95+strength*470;
 const radius=Math.sqrt(r())*spread,baseX=origin.x*W+Math.cos(angle)*radius,baseY=origin.y*H+Math.sin(angle)*radius;
 const mass=analysis?sample(analysis,clamp(baseX/W,0,1),clamp(baseY/H,0,1)):.5;
 const large=i<anchors.length?2.6:1;
 const rx=(16+r()*68)*(0.7+mass*.75)*large,ry=(20+r()*108)*(0.65+strength)*large;
 const rotation=Math.atan2(baseY-origin.y*H,baseX-origin.x*W)+(r()-.5)*1.4;
 ctx.save();ctx.translate(baseX,baseY);ctx.rotate(rotation);ctx.beginPath();
 for(let j=0;j<=12;j++){let t=j/12*Math.PI*2, jag=(.68+r()*.58);let x=Math.cos(t)*rx*jag,y=Math.sin(t)*ry*jag;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
 ctx.closePath();ctx.fillStyle=color[Math.floor(r()*color.length)];ctx.globalAlpha=.65+r()*.3;ctx.fill();ctx.restore();
 }
 } else {
 ctx.globalCompositeOperation="source-over";
 const ribbons= Math.round(10+complexity*.12),baseAngle=Math.atan2((anchors[1]?.y??.7)-(anchors[0]?.y??.3),(anchors[1]?.x??.7)-(anchors[0]?.x??.3));
 ctx.translate(W/2,H/2);ctx.rotate((baseAngle+Math.PI/2)*(.25+strength*.65));ctx.translate(-W/2,-H/2);
 for(let i=0;i<ribbons;i++){const y=(i+.5)*H/ribbons,band=5+r()*26+complexity*.22;ctx.beginPath();
 for(let k=0;k<=65;k++){let x=-150+k*20,tx=clamp(x/W,0,1),active=analysis?sample(analysis,tx,clamp(y/H,0,1)):.5;
 let bend=Math.sin(tx*4+i*.3+seed*.001)* (20+strength*80)+active*55;
 let thick=band*(.35+.9*Math.sin(tx*8+i*.6)**2+active*.4);
 if(k===0)ctx.moveTo(x,y+bend-thick);else ctx.lineTo(x,y+bend-thick);}
 for(let k=65;k>=0;k--){let x=-150+k*20,tx=clamp(x/W,0,1),active=analysis?sample(analysis,tx,clamp(y/H,0,1)):.5,bend=Math.sin(tx*4+i*.3+seed*.001)*(20+strength*80)+active*55,thick=band*(.35+.9*Math.sin(tx*8+i*.6)**2+active*.4);ctx.lineTo(x,y+bend+thick);}
 ctx.closePath();ctx.fillStyle=color[i%color.length];ctx.fill();}
 }
 ctx.restore();
 },[seed,complexity,abstract,mode,analysis,points,blend]);
 const updatePoint=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(drag.current===null)return;const b=e.currentTarget.getBoundingClientRect(),x=clamp((e.clientX-b.left)/b.width,0,1),y=clamp((e.clientY-b.top)/b.height,0,1);setPoints(p=>p.map((v,i)=>i===drag.current?{...v,x,y}:v));};
 const onDown=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(!showAnalysis||!points.length)return;const b=e.currentTarget.getBoundingClientRect(),x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;let best=0,dist=Infinity;points.forEach((p,i)=>{const d=Math.hypot((p.x-x)*240,(p.y-y)*184);if(d<dist){dist=d;best=i;}});if(dist<20){drag.current=best;e.currentTarget.setPointerCapture(e.pointerId);}};
 const upload=(file?:File)=>{if(!file)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{original.current=img;setImageName(file.name);const a=readImage(img,threshold,blur,levels);setAnalysis(a);setPoints(a.points);};img.src=String(reader.result);};reader.readAsDataURL(file)};
 const download=()=>{if(!canvas.current)return;const a=document.createElement("a");a.download="ORG05-"+seed+".png";a.href=canvas.current.toDataURL("image/png");a.click();};
 const slider=(name:string,value:number,set:(n:number)=>void,min=0,max=100)=><label style={{display:"block",marginBottom:18,fontSize:12}}><span style={{display:"flex",justifyContent:"space-between"}}>{name}<span>{value}</span></span><input type="range" min={min} max={max} value={value} onChange={e=>set(Number(e.target.value))} style={{width:"100%",accentColor:"#f06b3a",marginTop:8}}/></label>;
 return <main style={{height:"100dvh",display:"grid",gridTemplateColumns:"minmax(0,1fr) 315px",background:"#242424",color:"#eee",fontFamily:"Arial, sans-serif"}}>
 <section style={{display:"flex",flexDirection:"column",minWidth:0}}>
 <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"17px 23px",background:"#111",borderBottom:"1px solid #444"}}><span><strong style={{fontSize:22}}>ORG/05</strong> <small style={{marginLeft:14,letterSpacing:2,color:"#999"}}>COMPOSITION EXTRACTION</small></span><a href="/" style={{color:"#ccc",fontSize:12}}>← INDEX</a></header>
 <div style={{flex:1,display:"grid",placeItems:"center",padding:25,overflow:"hidden"}}><canvas ref={canvas} style={{width:"min(100%, 1120px)",aspectRatio:"1000 / 760",maxHeight:"100%",objectFit:"contain",boxShadow:"0 10px 38px #0008"}}/></div>
 <footer style={{background:"#111",padding:"12px 23px",fontSize:11,color:"#999"}}>SOURCE → COMPOSITION BLUEPRINT → GENERATIVE LANGUAGE · EXPERIMENTAL PREVIEW</footer>
 </section>
 <aside style={{overflowY:"auto",background:"#111",borderLeft:"1px solid #444",padding:19}}>
 <h3 style={{fontSize:11,letterSpacing:2,fontWeight:400,color:"#aaa"}}>01 / SOURCE</h3>
 <input aria-label="Upload source image" type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])} style={{width:"100%",fontSize:11}}/><p style={{fontSize:10,color:"#999"}}>{imageName}</p>
 <button onClick={()=>setShowAnalysis(v=>!v)} style={{width:"100%",padding:10,background:"#333",color:"#eee",border:"1px solid #555",cursor:"pointer"}}>{showAnalysis?"HIDE ANALYSIS":"SHOW ANALYSIS"}</button>
 {showAnalysis&&<div style={{marginTop:12}}><canvas ref={preview} onPointerDown={onDown} onPointerMove={updatePoint} onPointerUp={()=>drag.current=null} style={{width:"100%",touchAction:"none",cursor:"crosshair",background:"#eee"}}/><p style={{fontSize:10,color:"#aaa"}}>Drag orange origin points to edit the composition. Changes update the output.</p><button onClick={()=>setPoints(p=>[...p,{x:.5,y:.5,weight:1}])} style={{padding:8}}>+ ADD ORIGIN</button><button onClick={()=>setPoints(p=>p.slice(0,-1))} style={{padding:8,marginLeft:8}}>− REMOVE</button></div>}
 <div style={{borderTop:"1px solid #444",marginTop:18,paddingTop:18}}>
 <h3 style={{fontSize:11,letterSpacing:2,color:"#aaa",fontWeight:400}}>02 / ANALYSIS</h3>
 {slider("Threshold",threshold,setThreshold)}{slider("Simplification / blur",blur,setBlur)}{slider("Posterize",levels,setLevels,2,8)}
 </div><div style={{borderTop:"1px solid #444",paddingTop:18}}><h3 style={{fontSize:11,letterSpacing:2,color:"#aaa",fontWeight:400}}>03 / INTERPRETATION</h3>
 <div style={{display:"flex",gap:5,marginBottom:16}}>{(["CUT","FLOW"] as const).map(m=><button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:11,cursor:"pointer",border:"1px solid #555",background:mode===m?"#eee":"#222",color:mode===m?"#111":"#eee"}}>{m}</button>)}</div>
 {slider("Abstraction",abstract,setAbstract)}{slider("Complexity",complexity,setComplexity)}
 <label style={{fontSize:12}}>Blend mode <select value={blend} onChange={e=>setBlend(e.target.value as GlobalCompositeOperation)} style={{width:"100%",marginTop:8,marginBottom:15,background:"#222",color:"white",padding:8}}><option value="multiply">Multiply</option><option value="source-over">Normal</option><option value="screen">Screen</option><option value="overlay">Overlay</option></select></label>
 <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginTop:12}}>Seed <input type="number" value={seed} onChange={e=>setSeed(Number(e.target.value))} style={{width:95,padding:8,background:"#222",color:"white",border:"1px solid #555"}}/></div></div>
 <button onClick={()=>setSeed(Math.floor(Math.random()*999999))} style={{marginTop:22,width:"100%",padding:13,background:"#ef6839",color:"#111",fontWeight:"bold",border:0,cursor:"pointer"}}>↻ NEW INTERPRETATION</button>
 <button onClick={download} style={{marginTop:8,width:"100%",padding:12,background:"#222",border:"1px solid #555",color:"white",cursor:"pointer"}}>EXPORT PNG ↗</button>
 <p style={{fontSize:10,lineHeight:1.6,color:"#888",marginTop:20}}>Experimental first pass. Focus: graphic hierarchy, extracted masses, editable anchors and seed variations. No production changes.</p>
 </aside></main>;
}
