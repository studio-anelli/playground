"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./grid-delay.css";

type Motion = "horizontal"|"vertical"|"orbit"|"rotation"|"scale";
type Pattern = "wave"|"cascade"|"radial"|"random";
type Target = "none"|"positionX"|"positionY"|"rotation"|"scale"|"delay"|"spacing";
type Param = "columns"|"rows"|"spacing"|"delay"|"speed"|"amplitude"|"scale"|"fontSize"|"weight"|"tracking"|"lineHeight"|"positionX"|"positionY"|"rotation";
type Settings = Record<Param, number>;
type Osc = {target:Target;shape:"sine"|"triangle"|"square"|"noise";rate:number;depth:number};
const defaults:Settings={columns:16,rows:10,spacing:0,delay:1.8,speed:1,amplitude:65,scale:100,fontSize:34,weight:800,tracking:0,lineHeight:1,positionX:0,positionY:0,rotation:0};
const specs:Record<Param,[string,number,number,number,string]>={
 columns:["Columns",2,48,1,""],rows:["Rows",2,32,1,""],spacing:["Grid spacing",0,150,1,"%"],delay:["Time delay",0,5,.05,"s"],speed:["Speed",0,3,.05,"×"],amplitude:["Motion amplitude",0,100,1,"%"],scale:["Source scale",10,300,1,"%"],
 fontSize:["Font size",5,120,1,"%"],weight:["Weight",100,900,10,""],tracking:["Letter spacing",-10,30,.5,"%"],lineHeight:["Line height",.6,2.5,.05,""],
 positionX:["Position X",-100,100,1,"%"],positionY:["Position Y",-100,100,1,"%"],rotation:["Rotation",-180,180,1,"°"]};
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const hash=(x:number,y:number)=>{const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a)};
const oscValue=(o:Osc,t:number)=>{const p=t*o.rate;switch(o.shape){case "triangle":return 1-4*Math.abs(p-Math.floor(p)-.5);case "square":return Math.sin(p*Math.PI*2)>0?1:-1;case "noise":return hash(Math.floor(p*7),9)*2-1;default:return Math.sin(p*Math.PI*2)}};
function Control({name,value,onChange}:{name:Param;value:number;onChange:(n:number)=>void}){const [label,min,max,step,unit]=specs[name];return <label className="gd-control"><span>{label}<output>{Number(value.toFixed(2))}{unit}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function Buttons<T extends string>({values,selected,onSelect}:{values:readonly T[];selected:T;onSelect:(v:T)=>void}){return <div className="gd-pills">{values.map(v=><button type="button" key={v} className={selected===v?"selected":""} onClick={()=>onSelect(v)}>{v}</button>)}</div>}
export default function GridDelayMachine(){
 const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null),file=useRef<HTMLInputElement>(null),image=useRef<HTMLImageElement|null>(null);
 const settingsRef=useRef(defaults),oscRef=useRef<Osc[]>([{target:"scale",shape:"sine",rate:.18,depth:25},{target:"delay",shape:"sine",rate:.13,depth:35}]);
 const motionRef=useRef<Motion>("horizontal"),patternRef=useRef<Pattern>("wave"),textRef=useRef("DELAY"),fontRef=useRef("Arial, Helvetica, sans-serif"),playingRef=useRef(true),gridRef=useRef(false);
 const [params,setParams]=useState(defaults),[motion,setMotion]=useState<Motion>("horizontal"),[pattern,setPattern]=useState<Pattern>("wave"),[sourceText,setSourceText]=useState("DELAY"),[font,setFont]=useState("Arial, Helvetica, sans-serif"),[osc,setOsc]=useState<Osc[]>(oscRef.current),[playing,setPlaying]=useState(true),[showGrid,setShowGrid]=useState(false),[tab,setTab]=useState<"source"|"grid"|"modulation">("source"),[open,setOpen]=useState(true),[fullscreen,setFullscreen]=useState(false),[hasImage,setHasImage]=useState(false);
 function change(name:Param,value:number){setParams(p=>{const next={...p,[name]:value};settingsRef.current=next;return next})}
 function editOsc(i:number,key:keyof Osc,value:string|number){setOsc(p=>{const next=p.map((o,j)=>j===i?{...o,[key]:value}:o);oscRef.current=next;return next})}
 function changeMotion(v:Motion){motionRef.current=v;setMotion(v)}
 function changePattern(v:Pattern){patternRef.current=v;setPattern(v)}
 function changeFont(v:string){fontRef.current=v;setFont(v)}
 function changeText(v:string){textRef.current=v;setSourceText(v)}
 async function upload(f?:File){if(!f||!f.type.startsWith("image/"))return;const url=URL.createObjectURL(f);const img=new Image();img.onload=()=>{image.current=img;setHasImage(true);URL.revokeObjectURL(url)};img.onerror=()=>URL.revokeObjectURL(url);img.src=url}
 useEffect(()=>{
  const output=canvas.current;if(!output)return;
  const ctx=output.getContext("2d",{alpha:false});if(!ctx)return;
  const source=document.createElement("canvas"),sc=source.getContext("2d");if(!sc)return;
  // Bounded temporal ring. Each source frame is drawn only once, then sampled by all cells.
  const history:{canvas:HTMLCanvasElement;at:number}[]=[];
  let raf=0,last=0,clock=0,accumulator=0,w=0,h=0,dpr=1;
  const interval=1/24;
  function resize(){
   const box=output!.getBoundingClientRect();
   const width=Math.max(1,Math.round(box.width)),height=Math.max(1,Math.round(box.height));
   const quality=Math.min(window.devicePixelRatio||1,1.5);
   if(width===w&&height===h&&quality===dpr)return;
   w=width;h=height;dpr=quality;output!.width=Math.round(w*dpr);output!.height=Math.round(h*dpr);
   source.width=w;source.height=h;history.length=0;accumulator=0;
  }
  const observer=new ResizeObserver(resize);observer.observe(output);resize();
  function modulated(t:number){
   const p={...settingsRef.current};
   for(const o of oscRef.current){if(o.target==="none"||o.depth===0)continue;const delta=oscValue(o,t)*o.depth/100;
    if(o.target==="scale")p.scale=clamp(p.scale*(1+delta),10,400);
    else if(o.target==="delay")p.delay=clamp(p.delay+delta*4,0,5);
    else if(o.target==="spacing")p.spacing=clamp(p.spacing+delta*140,0,200);
    else if(o.target==="positionX"||o.target==="positionY")p[o.target]+=delta*100;
    else if(o.target==="rotation")p.rotation+=delta*180;
   }
   return p;
  }
  function makeSource(t:number){
   const p=modulated(t),phase=t*1.7,amp=p.amplitude/100;
   sc!.setTransform(1,0,0,1,0,0);sc!.fillStyle="#edeae3";sc!.fillRect(0,0,w,h);
   let dx=0,dy=0,angle=p.rotation*Math.PI/180,zoom=1;
   switch(motionRef.current){
    case "horizontal":dx=Math.sin(phase)*w*.44*amp;break;
    case "vertical":dy=Math.sin(phase)*h*.44*amp;break;
    case "orbit":dx=Math.cos(phase)*w*.36*amp;dy=Math.sin(phase)*h*.36*amp;break;
    case "rotation":angle+=phase*amp;break;
    case "scale":zoom=Math.exp(Math.sin(phase)*amp);break;
   }
   sc!.save();sc!.translate(w*(.5+p.positionX/100)+dx,h*(.5+p.positionY/100)+dy);sc!.rotate(angle);sc!.scale(p.scale/100*zoom,p.scale/100*zoom);
   if(image.current){const im=image.current,ratio=Math.min(w*.76/im.width,h*.76/im.height);sc!.drawImage(im,-im.width*ratio/2,-im.height*ratio/2,im.width*ratio,im.height*ratio)}
   else{
    const lines=textRef.current.split("\n").slice(0,6),size=h*p.fontSize/100;
    sc!.textAlign="center";sc!.textBaseline="middle";sc!.fillStyle="#20241f";
    sc!.font=p.weight+" "+size+"px "+fontRef.current;
    const letterSpacing=size*p.tracking/100;
    lines.forEach((line,i)=>{const chars=Array.from(line);const widths=chars.map(ch=>sc!.measureText(ch).width),total=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*letterSpacing;let x=-total/2;const y=(i-(lines.length-1)/2)*size*p.lineHeight;chars.forEach((ch,j)=>{sc!.fillText(ch,x+widths[j]/2,y);x+=widths[j]+letterSpacing})});
   }
   sc!.restore();
   const snap=document.createElement("canvas");snap.width=w;snap.height=h;snap.getContext("2d")!.drawImage(source,0,0);
   history.push({canvas:snap,at:t});
   const maxAge=5.25;
   while(history.length>2&&history[1].at<t-maxAge)history.shift();
  }
  function draw(now:number){
   const delta=last?Math.min(.06,(now-last)/1000):0;last=now;
   resize();
   if(playingRef.current){clock+=delta*settingsRef.current.speed;accumulator+=delta*settingsRef.current.speed}
   if(!history.length){makeSource(clock);accumulator=0}
   if(playingRef.current&&accumulator>=interval){makeSource(clock);accumulator%=interval}
   const p=modulated(clock),cols=Math.round(p.columns),rows=Math.round(p.rows),cw=w/cols,ch=h/rows,gx=cw*p.spacing/100,gy=ch*p.spacing/100;
   ctx!.setTransform(dpr,0,0,dpr,0,0);ctx!.fillStyle="#222520";ctx!.fillRect(0,0,w,h);
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const u=(x+.5)/cols,v=(y+.5)/rows;
    let offset=patternRef.current==="cascade"?(u+v)/2:patternRef.current==="radial"?Math.min(1,Math.hypot(u-.5,v-.5)*1.42):patternRef.current==="random"?hash(x,y):(.5+.5*Math.sin(u*8+v*5));
    const target=clock-offset*p.delay;
    let lo=0,hi=history.length-1;
    while(lo<hi){const mid=(lo+hi+1)>>1;if(history[mid].at<=target)lo=mid;else hi=mid-1}
    const frame=history[lo].canvas,dx=x*cw+(x-(cols-1)/2)*gx,dy=y*ch+(y-(rows-1)/2)*gy;
    ctx!.drawImage(frame,x*cw,y*ch,cw,ch,dx,dy,cw,ch);
    if(gridRef.current){ctx!.strokeStyle="rgba(20,22,20,.2)";ctx!.lineWidth=.5;ctx!.strokeRect(dx+.25,dy+.25,cw-.5,ch-.5)}
   }
   raf=requestAnimationFrame(draw);
  }
  raf=requestAnimationFrame(draw);
  return ()=>{cancelAnimationFrame(raf);observer.disconnect();history.length=0};
 },[]);
 const control=(k:Param)=><Control key={k} name={k} value={params[k]} onChange={v=>change(k,v)}/>;
 return <main className="gd-machine" style={{"--gd-paper":"#edeae3"} as CSSProperties}>
  <header className="gd-top"><a href="/" className="gd-back" aria-label="Back to Playground index">← Experiments</a><strong>GRID DELAY MACHINE <span> / REC-13</span></strong><div><button aria-expanded={open} aria-controls="gd-controls-panel" onClick={()=>setOpen(v=>!v)}>{open?"Hide panel":"Show panel"}</button><button onClick={async()=>{if(!stage.current)return;if(!document.fullscreenElement){await stage.current.requestFullscreen();setFullscreen(true)}else{await document.exitFullscreen();setFullscreen(false)}}}>{fullscreen?"Exit fullscreen":"Fullscreen ↗"}</button></div></header>
  <div className={"gd-workspace"+(open?"":" gd-no-panel")}><div ref={stage} className="gd-stage"><canvas ref={canvas} aria-label="Animated temporal grid sampling output"/><div className="gd-stage-caption">SOURCE / {hasImage?"IMAGE":"TYPE"} &nbsp; · &nbsp; MOTION / {motion.toUpperCase()}</div><div className="gd-stage-bottom"><span>{params.columns} × {params.rows} / {pattern.toUpperCase()}</span><div><button onClick={()=>{playingRef.current=!playingRef.current;setPlaying(playingRef.current)}}>{playing?"Ⅱ Pause":"▶ Play"}</button><button className={showGrid?"active":""} onClick={()=>{gridRef.current=!gridRef.current;setShowGrid(gridRef.current)}}>Grid</button></div></div></div>
  {open&&<aside id="gd-controls-panel" className="gd-panel" aria-label="Grid Delay controls"><nav className="gd-tabs">{(["source","grid","modulation"] as const).map(t=><button className={tab===t?"active":""} key={t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
   {tab==="source"&&<div className="gd-panel-grid"><div className="gd-block"><h2>01 / INPUT</h2><textarea value={sourceText} onChange={e=>{changeText(e.target.value);image.current=null;setHasImage(false)}} rows={2} aria-label="Source text"/><div className="gd-inline"><button onClick={()=>file.current?.click()}>↑ Upload image</button>{hasImage&&<button onClick={()=>{image.current=null;setHasImage(false)}}>Use text</button>}<input ref={file} type="file" hidden accept="image/*" onChange={e=>upload(e.target.files?.[0])}/></div><h2>Typography</h2><select value={font} onChange={e=>changeFont(e.target.value)}><option value="Arial, Helvetica, sans-serif">Arial / System Sans</option><option value="Georgia, serif">Georgia / Serif</option><option value="'Times New Roman', serif">Times New Roman</option><option value="'Courier New', monospace">Courier Mono</option><option value="'GT Era Text', Arial, sans-serif">GT Era Text</option><option value="'GT Alpina Typewriter', monospace">GT Alpina Typewriter</option></select><div className="gd-controls">{(["fontSize","weight","tracking","lineHeight"] as Param[]).map(control)}</div></div><div className="gd-block"><h2>02 / SOURCE MOTION</h2><Buttons values={["horizontal","vertical","orbit","rotation","scale"] as const} selected={motion} onSelect={changeMotion}/><div className="gd-controls">{(["scale","speed","amplitude","positionX","positionY","rotation"] as Param[]).map(control)}</div></div></div>}
   {tab==="grid"&&<div className="gd-panel-grid"><div className="gd-block"><h2>03 / SAMPLING GRID</h2><div className="gd-controls">{(["columns","rows","spacing"] as Param[]).map(control)}</div><p>Spacing pushes intact sampled cells outward. It does not resize their contents.</p></div><div className="gd-block"><h2>04 / TEMPORAL DELAY</h2><Buttons values={["wave","cascade","radial","random"] as const} selected={pattern} onSelect={changePattern}/><div className="gd-controls">{control("delay")}</div><p>Each stationary cell reads a different point in the source's recent motion history.</p></div></div>}
   {tab==="modulation"&&<div className="gd-panel-grid">{osc.map((o,i)=><div className="gd-block" key={i}><h2>0{i+5} / OSCILLATOR {i+1}</h2><label className="gd-select-label">Destination<select value={o.target} onChange={e=>editOsc(i,"target",e.target.value)}>{(["none","positionX","positionY","rotation","scale","delay","spacing"] as const).map(v=><option key={v} value={v}>{v}</option>)}</select></label><Buttons values={["sine","triangle","square","noise"] as const} selected={o.shape} onSelect={v=>editOsc(i,"shape",v)}/><div className="gd-controls"><label className="gd-control"><span>Rate <output>{o.rate.toFixed(2)} Hz</output></span><input type="range" min=".01" max="3" step=".01" value={o.rate} onChange={e=>editOsc(i,"rate",Number(e.target.value))}/></label><label className="gd-control"><span>Depth <output>{o.depth}%</output></span><input type="range" min="0" max="100" step="1" value={o.depth} onChange={e=>editOsc(i,"depth",Number(e.target.value))}/></label></div></div>)}</div>}
  </aside>}
  </div><footer className="gd-footer"><span>TIME AS MATERIAL / TYPE · IMAGE · MOTION</span><span>EXPERIMENTAL BUILD 01</span></footer>
 </main>;
}
