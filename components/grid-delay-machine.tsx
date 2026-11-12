"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./grid-delay.css";
import GridDelayPatchBay, {type DelayWave,type DelayPatch} from "./grid-delay-patch-bay";

type Motion = "horizontal"|"vertical"|"orbit"|"rotation"|"scale";
type Pattern = "wave"|"cascade"|"radial"|"random";
type Param = "columns"|"rows"|"spacing"|"delay"|"speed"|"amplitude"|"scale"|"fontSize"|"weight"|"tracking"|"lineHeight"|"positionX"|"positionY"|"rotation";
type Settings = Record<Param, number>;
type BlendMode="source-over"|"multiply"|"screen"|"overlay"|"difference"|"exclusion"|"lighten"|"darken";
const blendModes:BlendMode[]=["source-over","multiply","screen","overlay","difference","exclusion","lighten","darken"];
const rotateHue=(hex:string,degrees:number)=>{const raw=hex.replace("#","");const rgb=[0,2,4].map(i=>parseInt(raw.slice(i,i+2),16)/255);const max=Math.max(...rgb),min=Math.min(...rgb),d=max-min,l=(max+min)/2;let h=0,sat=0;if(d){sat=d/(1-Math.abs(2*l-1));switch(max){case rgb[0]:h=((rgb[1]-rgb[2])/d)%6;break;case rgb[1]:h=(rgb[2]-rgb[0])/d+2;break;default:h=(rgb[0]-rgb[1])/d+4}h=h*60}h=(h+degrees%360+360)%360;sat=Math.max(sat,.55*Math.min(1,Math.abs(degrees)/90));const c=(1-Math.abs(2*l-1))*sat,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let v=[0,0,0];if(h<60)v=[c,x,0];else if(h<120)v=[x,c,0];else if(h<180)v=[0,c,x];else if(h<240)v=[0,x,c];else if(h<300)v=[x,0,c];else v=[c,0,x];return "#"+v.map(n=>Math.round((n+m)*255).toString(16).padStart(2,"0")).join("")};
const defaults:Settings={columns:16,rows:10,spacing:0,delay:1.8,speed:1,amplitude:65,scale:100,fontSize:34,weight:800,tracking:0,lineHeight:1,positionX:0,positionY:0,rotation:0};
const specs:Record<Param,[string,number,number,number,string]>={
 columns:["Columns",1,48,1,""],rows:["Rows",1,32,1,""],spacing:["Grid spacing",0,150,1,"%"],delay:["Time delay",0,5,.05,"s"],speed:["Speed",0,3,.05,"×"],amplitude:["Motion amplitude",0,100,1,"%"],scale:["Source scale",10,300,1,"%"],
 fontSize:["Font size",5,120,1,"%"],weight:["Weight",100,900,10,""],tracking:["Letter spacing",-10,30,.5,"%"],lineHeight:["Line height",.6,2.5,.05,""],
 positionX:["Position X",-100,100,1,"%"],positionY:["Position Y",-100,100,1,"%"],rotation:["Rotation",-180,180,1,"°"]};
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const hash=(x:number,y:number)=>{const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a)};
const oscValue=(o:DelayWave,t:number)=>{const p=t*o.rate+o.phase;switch(o.shape){case "triangle":return 1-4*Math.abs(p-Math.floor(p)-.5);case "square":return Math.sin(p*Math.PI*2)>0?1:-1;case "noise":return hash(Math.floor(p*7),9)*2-1;case "ramp":return 2*(p-Math.floor(p))-1;default:return Math.sin(p*Math.PI*2)}};
function Control({name,value,onChange}:{name:Param;value:number;onChange:(n:number)=>void}){const [label,min,max,step,unit]=specs[name];return <label className="gd-control"><span>{label}<output>{Number(value.toFixed(2))}{unit}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function Buttons<T extends string>({values,selected,onSelect}:{values:readonly T[];selected:T;onSelect:(v:T)=>void}){return <div className="gd-pills">{values.map(v=><button type="button" key={v} className={selected===v?"selected":""} onClick={()=>onSelect(v)}>{v}</button>)}</div>}
export default function GridDelayMachine(){
 const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null),file=useRef<HTMLInputElement>(null),image=useRef<HTMLImageElement|null>(null);
 const settingsRef=useRef(defaults),oscRef=useRef<DelayWave[]>([{shape:"sine",rate:.18,depth:75,phase:0,enabled:true},{shape:"triangle",rate:.13,depth:65,phase:0,enabled:true},{shape:"sine",rate:.32,depth:55,phase:0,enabled:true}]),patchRef=useRef<DelayPatch[]>([{id:"c0-scale",wave:0,target:"scale",amount:35},{id:"c1-delay",wave:1,target:"delay",amount:50}]);
 const visualRef=useRef<{ink:string;background:string;blend:BlendMode}>({ink:"#20241f",background:"#edeae3",blend:"source-over"}),linkedRef=useRef(false);
 const motionRef=useRef<Motion>("horizontal"),patternRef=useRef<Pattern>("wave"),textRef=useRef("DELAY"),fontRef=useRef("Arial, Helvetica, sans-serif"),playingRef=useRef(true),gridRef=useRef(false);
 const [ink,setInk]=useState("#20241f"),[backgroundColor,setBackgroundColor]=useState("#edeae3"),[blend,setBlend]=useState<BlendMode>("source-over"),[linked,setLinked]=useState(false);
 const [params,setParams]=useState(defaults),[motion,setMotion]=useState<Motion>("horizontal"),[pattern,setPattern]=useState<Pattern>("wave"),[sourceText,setSourceText]=useState("DELAY"),[font,setFont]=useState("Arial, Helvetica, sans-serif"),[osc,setOsc]=useState<DelayWave[]>(oscRef.current),[patches,setPatches]=useState<DelayPatch[]>(patchRef.current),[playing,setPlaying]=useState(true),[showGrid,setShowGrid]=useState(false),[tab,setTab]=useState<"patch"|"source"|"grid">("patch"),[open,setOpen]=useState(true),[fullscreen,setFullscreen]=useState(false),[hasImage,setHasImage]=useState(false);
 function change(name:Param,value:number){setParams(p=>{const next={...p,[name]:value};
  if(linkedRef.current&&(name==="columns"||name==="rows")){
   const ratio=value/Math.max(1,p[name]),other=name==="columns"?"rows":"columns";
   next[other]=Math.round(clamp(p[other]*ratio,1,other==="rows"?32:48));
  }
  settingsRef.current=next;return next})}
 function updateColor(key:"ink"|"background",value:string){visualRef.current={...visualRef.current,[key]:value};if(key==="ink")setInk(value);else setBackgroundColor(value)}
 function updateBlend(value:BlendMode){visualRef.current={...visualRef.current,blend:value};setBlend(value)}
 function updateLinked(value:boolean){linkedRef.current=value;setLinked(value)}

 function changeWaves(next:DelayWave[]){oscRef.current=next;setOsc(next)}
 function changePatches(next:DelayPatch[]){patchRef.current=next;setPatches(next)}

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
  // Sample at native canvas CSS resolution instead of scaling a 512px
  // thumbnail across the entire output. Adapt capture cadence to an explicit
  // memory budget; the ring remains bounded even on large displays in Safari.
  const maxAge=5.1;
  const memoryBudget=220*1024*1024;
  const historyScale=()=>Math.min(1,1600/Math.max(1,w),1100/Math.max(1,h));
  const frameInterval=()=>{
   const scale=historyScale();
   const pixels=Math.ceil(w*scale)*Math.ceil(h*scale);
   const safeFrameCount=Math.max(5,Math.floor(memoryBudget/Math.max(1,pixels*4)));
   return Math.max(1/15,maxAge/Math.max(1,safeFrameCount-1));
  };
  const recycled:HTMLCanvasElement[]=[];
  function resize(){
   const box=output!.getBoundingClientRect();
   const width=Math.max(1,Math.round(box.width)),height=Math.max(1,Math.round(box.height));
   const quality=Math.min(window.devicePixelRatio||1,1.5);
   if(width===w&&height===h&&quality===dpr)return;
   w=width;h=height;dpr=quality;output!.width=Math.round(w*dpr);output!.height=Math.round(h*dpr);
   source.width=w;source.height=h;history.length=0;recycled.length=0;accumulator=0;
  }
  const observer=new ResizeObserver(resize);observer.observe(output);resize();
  function modulated(t:number){
   const p={...settingsRef.current,inkHue:0,bgHue:0,blendOffset:0};
   let gridDrive=0;
   for(const cable of patchRef.current){
    const o=oscRef.current[cable.wave];if(!o||!o.enabled||cable.amount===0||o.depth===0)continue;
    const delta=oscValue(o,t)*o.depth/100*cable.amount/100;
    switch(cable.target){
     case "scale":p.scale=clamp(p.scale*(1+delta),10,400);break;
     case "delay":p.delay=clamp(p.delay+delta*4,0,5);break;
     case "spacing":p.spacing=clamp(p.spacing+delta*140,0,200);break;
     case "positionX":case "positionY":p[cable.target]=clamp(p[cable.target]+delta*100,-150,150);break;
     case "rotation":p.rotation+=delta*180;break;
     case "amplitude":p.amplitude=clamp(p.amplitude+delta*100,0,100);break;
     case "speed":p.speed=clamp(p.speed+delta*2,0,3);break;
     case "columns":case "rows":
      if(linkedRef.current)gridDrive+=delta;
      else p[cable.target]=clamp(Math.round(p[cable.target]+delta*(cable.target==="columns"?47:31)),1,cable.target==="columns"?48:32);
      break;
     case "inkHue":p.inkHue+=delta*360;break;
     case "bgHue":p.bgHue+=delta*360;break;
     case "blendMode":p.blendOffset+=delta*(blendModes.length-1);break;
    }
   }
   if(linkedRef.current&&gridDrive!==0){
    const factor=Math.max(.05,1+gridDrive);
    p.columns=clamp(Math.round(p.columns*factor),1,48);
    p.rows=clamp(Math.round(p.rows*factor),1,32);
   }
   p.columns=Math.round(p.columns);p.rows=Math.round(p.rows);
   return p;
  }

  function makeSource(t:number){
   const p=modulated(t),phase=t*1.7,amp=p.amplitude/100;
   sc!.setTransform(1,0,0,1,0,0);sc!.fillStyle=rotateHue(visualRef.current.background,p.bgHue);sc!.fillRect(0,0,w,h);
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
    sc!.textAlign="center";sc!.textBaseline="middle";sc!.fillStyle=rotateHue(visualRef.current.ink,p.inkHue);
    sc!.font=p.weight+" "+size+"px "+fontRef.current;
    const letterSpacing=size*p.tracking/100;
    lines.forEach((line,i)=>{const chars=Array.from(line);const widths=chars.map(ch=>sc!.measureText(ch).width),total=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*letterSpacing;let x=-total/2;const y=(i-(lines.length-1)/2)*size*p.lineHeight;chars.forEach((ch,j)=>{sc!.fillText(ch,x+widths[j]/2,y);x+=widths[j]+letterSpacing})});
   }
   sc!.restore();
   while(history.length>1&&history[0].at<t-maxAge)recycled.push(history.shift()!.canvas);
   const snap=recycled.pop()??document.createElement("canvas");
   const scale=historyScale(),sw=Math.max(1,Math.ceil(w*scale)),sh=Math.max(1,Math.ceil(h*scale));
   if(snap.width!==sw||snap.height!==sh){snap.width=sw;snap.height=sh}
   const snapshotContext=snap.getContext("2d");
   if(!snapshotContext)return;
   snapshotContext.drawImage(source,0,0,sw,sh);
   history.push({canvas:snap,at:t});
  }
  function draw(now:number){
   const delta=last?Math.min(.06,(now-last)/1000):0;last=now;
   resize();
   if(playingRef.current){const rate=modulated(clock).speed;clock+=delta*rate;accumulator+=delta*rate}
   if(!history.length){makeSource(clock);accumulator=0}
   const interval=frameInterval();
   if(playingRef.current&&accumulator>=interval){makeSource(clock);accumulator%=interval}
   const p=modulated(clock),cols=Math.round(p.columns),rows=Math.round(p.rows);
   ctx!.setTransform(dpr,0,0,dpr,0,0);
   ctx!.fillStyle=rotateHue(visualRef.current.background,p.bgHue);ctx!.fillRect(0,0,w,h);
   const baseBlendIndex=blendModes.indexOf(visualRef.current.blend);
   const activeBlend=blendModes[((baseBlendIndex+Math.round(p.blendOffset))%blendModes.length+blendModes.length)%blendModes.length];
   ctx!.globalCompositeOperation=activeBlend;
   // Keep the ENTIRE grid inside the output. Spacing consumes available space;
   // each cell gets smaller, rather than pushing the outer cells offscreen.
   // The source remains a single full-size composition divided into grid samples.
   const gapFraction=clamp(p.spacing/200,0,.75);
   const gapX=w/cols*gapFraction,gapY=h/rows*gapFraction;
   const cellW=(w-gapX*(cols-1))/cols,cellH=(h-gapY*(rows-1))/rows;
   const snap=(value:number)=>Math.round(value*dpr)/dpr;
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const u=(x+.5)/cols,v=(y+.5)/rows;
    const offset=patternRef.current==="cascade"?(u+v)/2:patternRef.current==="radial"?Math.min(1,Math.hypot(u-.5,v-.5)*1.42):patternRef.current==="random"?hash(x,y):(.5+.5*Math.sin(u*8+v*5));
    const target=clock-offset*p.delay;
    let lo=0,hi=history.length-1;
    while(lo<hi){const mid=(lo+hi+1)>>1;if(history[mid].at<=target)lo=mid;else hi=mid-1}
    const frame=history[lo].canvas;
    const sx=x*w/cols,sy=y*h/rows,sw=w/cols,sh=h/rows;
    const dx=snap(x*(cellW+gapX)),dy=snap(y*(cellH+gapY));
    const dw=snap((x+1)*cellW+x*gapX)-dx;
    const dh=snap((y+1)*cellH+y*gapY)-dy;
    if(dw<=0||dh<=0)continue;
    // Copy only the sampled region. This is much less expensive on WebKit
    // than drawing a complete frame once per cell with a clipping path.
    // Pixel-snapped destinations and a matching paper backdrop prevent dark seams.
    ctx!.drawImage(frame,sx*frame.width/w,sy*frame.height/h,sw*frame.width/w,sh*frame.height/h,dx,dy,dw,dh);
    if(gridRef.current&&gapFraction>0){
     ctx!.strokeStyle="rgba(20,22,20,.2)";ctx!.lineWidth=1/dpr;
     ctx!.strokeRect(dx+.5/dpr,dy+.5/dpr,Math.max(0,dw-1/dpr),Math.max(0,dh-1/dpr));
    }
   }
   ctx!.globalCompositeOperation="source-over";
   if(gridRef.current&&gapFraction===0){
    ctx!.beginPath();
    for(let x=1;x<cols;x++){const a=snap(x*w/cols)+.5/dpr;ctx!.moveTo(a,0);ctx!.lineTo(a,h)}
    for(let y=1;y<rows;y++){const a=snap(y*h/rows)+.5/dpr;ctx!.moveTo(0,a);ctx!.lineTo(w,a)}
    ctx!.strokeStyle="rgba(20,22,20,.2)";ctx!.lineWidth=1/dpr;ctx!.stroke();
   }
   raf=requestAnimationFrame(draw);
  }
  raf=requestAnimationFrame(draw);
  return ()=>{cancelAnimationFrame(raf);observer.disconnect();history.length=0;recycled.length=0};
 },[]);
 const control=(k:Param)=><Control key={k} name={k} value={params[k]} onChange={v=>change(k,v)}/>;
 return <main className="gd-machine" style={{"--gd-paper":"#edeae3"} as CSSProperties}>
  <header className="gd-top"><a href="/" className="gd-back" aria-label="Back to Playground index">← Experiments</a><strong>GRID DELAY MACHINE <span> / REC-13</span></strong><div><button aria-expanded={open} aria-controls="gd-controls-panel" onClick={()=>setOpen(v=>!v)}>{open?"Hide panel":"Show panel"}</button><button onClick={async()=>{if(!stage.current)return;if(!document.fullscreenElement){await stage.current.requestFullscreen();setFullscreen(true)}else{await document.exitFullscreen();setFullscreen(false)}}}>{fullscreen?"Exit fullscreen":"Fullscreen ↗"}</button></div></header>
  <div className={"gd-workspace"+(open?(tab==="patch"?" gd-patch-open":""):" gd-no-panel")}><div ref={stage} className="gd-stage"><canvas ref={canvas} aria-label="Animated temporal grid sampling output"/><div className="gd-stage-caption">SOURCE / {hasImage?"IMAGE":"TYPE"} &nbsp; · &nbsp; MOTION / {motion.toUpperCase()}</div><div className="gd-stage-bottom"><span>{params.columns} × {params.rows} / {pattern.toUpperCase()}</span><div><button onClick={()=>{playingRef.current=!playingRef.current;setPlaying(playingRef.current)}}>{playing?"Ⅱ Pause":"▶ Play"}</button><button className={showGrid?"active":""} onClick={()=>{gridRef.current=!gridRef.current;setShowGrid(gridRef.current)}}>Grid</button></div></div></div>
  {open&&<aside id="gd-controls-panel" className="gd-panel" aria-label="Grid Delay controls"><nav className="gd-tabs">{(["patch","source","grid"] as const).map(t=><button className={tab===t?"active":""} key={t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
   {tab==="source"&&<div className="gd-panel-grid"><div className="gd-block"><h2>01 / INPUT</h2><textarea value={sourceText} onChange={e=>{changeText(e.target.value);image.current=null;setHasImage(false)}} rows={2} aria-label="Source text"/><div className="gd-inline"><button onClick={()=>file.current?.click()}>↑ Upload image</button>{hasImage&&<button onClick={()=>{image.current=null;setHasImage(false)}}>Use text</button>}<input ref={file} type="file" hidden accept="image/*" onChange={e=>upload(e.target.files?.[0])}/></div><h2>Typography</h2><select value={font} onChange={e=>changeFont(e.target.value)}><option value="Arial, Helvetica, sans-serif">Arial / System Sans</option><option value="Georgia, serif">Georgia / Serif</option><option value="'Times New Roman', serif">Times New Roman</option><option value="'Courier New', monospace">Courier Mono</option><option value="'GT Era Text', Arial, sans-serif">GT Era Text</option><option value="'GT Alpina Typewriter', monospace">GT Alpina Typewriter</option></select><div className="gd-controls">{(["fontSize","weight","tracking","lineHeight"] as Param[]).map(control)}</div><div className="gd-color-controls"><label>Font color <input type="color" value={ink} onChange={e=>updateColor("ink",e.target.value)}/></label><label>Background color <input type="color" value={backgroundColor} onChange={e=>updateColor("background",e.target.value)}/></label><label>Blend mode <select value={blend} onChange={e=>updateBlend(e.target.value as BlendMode)}>{blendModes.map(m=><option value={m} key={m}>{m}</option>)}</select></label></div></div><div className="gd-block"><h2>02 / SOURCE MOTION</h2><Buttons values={["horizontal","vertical","orbit","rotation","scale"] as const} selected={motion} onSelect={changeMotion}/><div className="gd-controls">{(["scale","speed","amplitude","positionX","positionY","rotation"] as Param[]).map(control)}</div></div></div>}
   {tab==="grid"&&<div className="gd-panel-grid"><div className="gd-block"><h2>03 / SAMPLING GRID</h2><div className="gd-grid-link"><label><input type="checkbox" checked={linked} onChange={e=>updateLinked(e.target.checked)}/> <span>Link columns &amp; rows</span></label></div><div className="gd-controls">{(["columns","rows","spacing"] as Param[]).map(control)}</div><p>Spacing reduces tile size to keep the complete composition in frame.</p></div><div className="gd-block"><h2>04 / TEMPORAL DELAY</h2><Buttons values={["wave","cascade","radial","random"] as const} selected={pattern} onSelect={changePattern}/><div className="gd-controls">{control("delay")}</div><p>Each stationary cell reads a different point in the source's recent motion history.</p></div></div>}
   {tab==="patch"&&<GridDelayPatchBay waves={osc} patches={patches} onWaves={changeWaves} onPatches={changePatches}/>}

  </aside>}
  </div><footer className="gd-footer"><span>TIME AS MATERIAL / TYPE · IMAGE · MOTION</span><span>PATCH SYNTH / BUILD 02</span></footer>
 </main>;
}
