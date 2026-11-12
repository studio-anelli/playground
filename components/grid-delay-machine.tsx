"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./grid-delay.css";
import GridDelayPatchBay, {type DelayWave,type DelayPatch,type DelayTarget,type DelayInputGains} from "./grid-delay-patch-bay";
import {createDelayGPU, type DelayGPU, type DelayQuality} from "./grid-delay-gpu";

type Motion = "horizontal"|"vertical"|"orbit"|"rotation"|"scale";
type Pattern = "wave"|"cascade"|"radial"|"random";
type TextAlign="left"|"center"|"right";
type VerticalAlign="top"|"middle"|"bottom";
type DeformMode="rigid"|"fisheye"|"pinch";
type Param = "deformAmount"|"deformFrequency"|"deformFlow"|"columns"|"rows"|"spacing"|"delay"|"speed"|"amplitude"|"scale"|"fontSize"|"weight"|"tracking"|"lineHeight"|"positionX"|"positionY"|"rotation";
type Settings = Record<Param, number>;
type BlendMode="source-over"|"multiply"|"screen"|"overlay"|"difference"|"exclusion"|"lighten"|"darken";
const blendModes:BlendMode[]=["source-over","multiply","screen","overlay","difference","exclusion","lighten","darken"];
const rotateHue=(hex:string,degrees:number)=>{const raw=hex.replace("#","");const rgb=[0,2,4].map(i=>parseInt(raw.slice(i,i+2),16)/255);const max=Math.max(...rgb),min=Math.min(...rgb),d=max-min,l=(max+min)/2;let h=0,sat=0;if(d){sat=d/(1-Math.abs(2*l-1));switch(max){case rgb[0]:h=((rgb[1]-rgb[2])/d)%6;break;case rgb[1]:h=(rgb[2]-rgb[0])/d+2;break;default:h=(rgb[0]-rgb[1])/d+4}h=h*60}h=(h+degrees%360+360)%360;sat=Math.max(sat,.55*Math.min(1,Math.abs(degrees)/90));const c=(1-Math.abs(2*l-1))*sat,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let v=[0,0,0];if(h<60)v=[c,x,0];else if(h<120)v=[x,c,0];else if(h<180)v=[0,c,x];else if(h<240)v=[0,x,c];else if(h<300)v=[x,0,c];else v=[c,0,x];return "#"+v.map(n=>Math.round((n+m)*255).toString(16).padStart(2,"0")).join("")};
const defaults:Settings={deformAmount:35,deformFrequency:2.5,deformFlow:1,columns:1,rows:32,spacing:0,delay:1.8,speed:2.1,amplitude:65,scale:41,fontSize:34,weight:900,tracking:-8,lineHeight:.8,positionX:0,positionY:0,rotation:0};
const specs:Record<Param,[string,number,number,number,string]>={
 deformAmount:["Lens strength",0,100,1,"%"],deformFrequency:["Lens curvature",.2,12,.1,""],deformFlow:["Lens breathing",0,4,.05,"×"],
 columns:["Columns",1,48,1,""],rows:["Rows",1,32,1,""],spacing:["Grid spacing",0,150,1,"%"],delay:["Time delay",0,5,.05,"s"],speed:["Speed",0,3,.05,"×"],amplitude:["Motion amplitude",0,100,1,"%"],scale:["Source scale",10,300,1,"%"],
 fontSize:["Font size",5,120,1,"%"],weight:["Weight",100,900,10,""],tracking:["Letter spacing",-10,30,.5,"%"],lineHeight:["Line height",.6,2.5,.05,""],
 positionX:["Position X",-100,100,1,"%"],positionY:["Position Y",-100,100,1,"%"],rotation:["Rotation",-180,180,1,"°"]};
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const rgb=(hex:string):[number,number,number]=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255) as [number,number,number];
const hash=(x:number,y:number)=>{const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a)};
const oscValue=(o:DelayWave,t:number)=>{const p=t*o.rate+o.phase;switch(o.shape){case "triangle":return 1-4*Math.abs(p-Math.floor(p)-.5);case "square":return Math.sin(p*Math.PI*2)>0?1:-1;case "noise":return hash(Math.floor(p*7),9)*2-1;case "ramp":return 2*(p-Math.floor(p))-1;default:return Math.sin(p*Math.PI*2)}};
function Control({name,value,onChange}:{name:Param;value:number;onChange:(n:number)=>void}){const [label,min,max,step,unit]=specs[name];return <label className="gd-control"><span>{label}<output>{Number(value.toFixed(2))}{unit}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function Buttons<T extends string>({values,selected,onSelect}:{values:readonly T[];selected:T;onSelect:(v:T)=>void}){return <div className="gd-pills">{values.map(v=><button type="button" key={v} className={selected===v?"selected":""} onClick={()=>onSelect(v)}>{v}</button>)}</div>}
export default function GridDelayMachine(){
 const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null),file=useRef<HTMLInputElement>(null),image=useRef<HTMLImageElement|null>(null);
 const settingsRef=useRef(defaults),oscRef=useRef<DelayWave[]>([{shape:"sine",rate:.01,depth:75,phase:0,enabled:true},{shape:"triangle",rate:.13,depth:65,phase:0,enabled:true},{shape:"square",rate:.20,depth:75,phase:0,enabled:true}]),patchRef=useRef<DelayPatch[]>([]);
 const visualRef=useRef<{ink:string;background:string;blend:BlendMode}>({ink:"#ffffff",background:"#969696",blend:"source-over"}),linkedRef=useRef(false);
 const motionRef=useRef<Motion>("scale"),patternRef=useRef<Pattern>("wave"),textRef=useRef("Hey\ngood\nlooking"),fontRef=useRef("Arial, Helvetica, sans-serif"),alignRef=useRef<TextAlign>("center"),vAlignRef=useRef<VerticalAlign>("middle"),deformRef=useRef<DeformMode>("rigid"),playingRef=useRef(true),gridRef=useRef(false);
 const patchGainRef=useRef<DelayInputGains>({});
 const [patchGains,setPatchGains]=useState<DelayInputGains>({});
 const delayModeRef=useRef<"image"|"black">("image"),blackHoldRef=useRef(35);
 const [delayMode,setDelayMode]=useState<"image"|"black">("image"),[blackHold,setBlackHold]=useState(35);
 const globalRef=useRef<{enabled:boolean;mode:"fisheye"|"pinch";strength:number;size:number;growth:number}>({enabled:false,mode:"fisheye",strength:65,size:90,growth:1});
 const [globalLens,setGlobalLens]=useState(globalRef.current);
 const feedbackRef=useRef<{enabled:boolean;amount:number;decay:number;refresh:number;blend:BlendMode}>({enabled:false,amount:55,decay:88,refresh:33,blend:"screen"});
 const [feedback,setFeedback]=useState(feedbackRef.current);
 function changeFeedback(next:Partial<typeof feedback>){const value={...feedbackRef.current,...next};feedbackRef.current=value;setFeedback(value)}
 const qualityRef=useRef<DelayQuality>("balanced");
 const [quality,setQuality]=useState<DelayQuality>("balanced");
 const [renderError,setRenderError]=useState<string|null>(null),dirtyRef=useRef(true);
 const [alignText,setAlignText]=useState<TextAlign>("center"),[alignVertical,setAlignVertical]=useState<VerticalAlign>("middle"),[deformMode,setDeformMode]=useState<DeformMode>("rigid");
 const [ink,setInk]=useState("#ffffff"),[backgroundColor,setBackgroundColor]=useState("#969696"),[blend,setBlend]=useState<BlendMode>("source-over"),[linked,setLinked]=useState(false);
 const [params,setParams]=useState(defaults),[motion,setMotion]=useState<Motion>("scale"),[pattern,setPattern]=useState<Pattern>("wave"),[sourceText,setSourceText]=useState("Hey\ngood\nlooking"),[font,setFont]=useState("Arial, Helvetica, sans-serif"),[osc,setOsc]=useState<DelayWave[]>(oscRef.current),[patches,setPatches]=useState<DelayPatch[]>(patchRef.current),[playing,setPlaying]=useState(true),[showGrid,setShowGrid]=useState(false),[tab,setTab]=useState<"patch"|"source"|"grid"|"fx">("patch"),[open,setOpen]=useState(true),[fullscreen,setFullscreen]=useState(false),[hasImage,setHasImage]=useState(false);
 function change(name:Param,value:number){dirtyRef.current=true;setParams(p=>{const next={...p,[name]:value};
  if(linkedRef.current&&(name==="columns"||name==="rows")){
   const ratio=value/Math.max(1,p[name]),other=name==="columns"?"rows":"columns";
   next[other]=Math.round(clamp(p[other]*ratio,1,other==="rows"?32:48));
  }
  settingsRef.current=next;return next})}
 function updateColor(key:"ink"|"background",value:string){dirtyRef.current=true;visualRef.current={...visualRef.current,[key]:value};if(key==="ink")setInk(value);else setBackgroundColor(value)}
 function updateBlend(value:BlendMode){dirtyRef.current=true;visualRef.current={...visualRef.current,blend:value};setBlend(value)}
 function updateLinked(value:boolean){linkedRef.current=value;setLinked(value)}

 function changeWaves(next:DelayWave[]){dirtyRef.current=true;oscRef.current=next;setOsc(next)}
 function changePatches(next:DelayPatch[]){dirtyRef.current=true;patchRef.current=next;setPatches(next)}
 function changePatchGain(target:DelayTarget,value:number){const next={...patchGainRef.current,[target]:value};patchGainRef.current=next;setPatchGains(next)}
 function changeDelayMode(v:"image"|"black"){delayModeRef.current=v;setDelayMode(v)}
 function changeBlackHold(v:number){blackHoldRef.current=v;setBlackHold(v)}

 function changeMotion(v:Motion){dirtyRef.current=true;motionRef.current=v;setMotion(v)}
 function changePattern(v:Pattern){dirtyRef.current=true;patternRef.current=v;setPattern(v)}
 function changeFont(v:string){dirtyRef.current=true;fontRef.current=v;setFont(v)}
 function changeAlignment(v:TextAlign){dirtyRef.current=true;alignRef.current=v;setAlignText(v)}
 function changeVertical(v:VerticalAlign){dirtyRef.current=true;vAlignRef.current=v;setAlignVertical(v)}
 function changeDeformation(v:DeformMode){dirtyRef.current=true;deformRef.current=v;setDeformMode(v)}
 function changeQuality(v:DelayQuality){qualityRef.current=v;setQuality(v);window.dispatchEvent(new Event("grid-delay-quality-change"))}
 function changeGlobalLens(next:Partial<typeof globalLens>){const value={...globalRef.current,...next};globalRef.current=value;setGlobalLens(value)}
 function changeText(v:string){dirtyRef.current=true;textRef.current=v;setSourceText(v)}
 async function upload(f?:File){if(!f||!f.type.startsWith("image/"))return;const url=URL.createObjectURL(f);const img=new Image();img.onload=()=>{dirtyRef.current=true;image.current=img;setHasImage(true);URL.revokeObjectURL(url)};img.onerror=()=>URL.revokeObjectURL(url);img.src=url}
 useEffect(()=>{
  const output=canvas.current;if(!output)return;
  const source=document.createElement("canvas"),sc=source.getContext("2d",{alpha:false});
  const textLayer=document.createElement("canvas"),tc=textLayer.getContext("2d");
  if(!sc||!tc)return;
  let textCacheKey="";
  let gpu:DelayGPU|null=null;
  let raf=0,last=0,clock=0,accumulator=0,lastCapture=0,w=0,h=0,dpr=1,needsFirstFrame=true,failed=false,qualityChanged=false;
  // Opt-in measurements: append ?perf=1 to compare frame pacing and CPU
  // command costs without introducing an always-on profiling UI.
  const monitor=new URLSearchParams(window.location.search).get("perf")==="1";
  let measureSince=0,measureFrames=0,measureSlow=0,sourceMs=0,captureMs=0,submitMs=0;
  function resize(){
   const box=output.getBoundingClientRect();
   const width=Math.max(1,Math.round(box.width)),height=Math.max(1,Math.round(box.height));
   const renderScale=qualityRef.current==="sharp"?2:qualityRef.current==="fluid"?1.25:1.5;
   const quality=Math.min(window.devicePixelRatio||1,renderScale);
   if(failed||width===w&&height===h&&quality===dpr&&gpu&&!qualityChanged)return;
   qualityChanged=false;
   w=width;h=height;dpr=quality;
   output.width=Math.round(w*dpr);output.height=Math.round(h*dpr);
   gpu?.dispose();
   try{
    gpu=createDelayGPU(output,output.width,output.height,qualityRef.current);
    // Draw source at the actual history texture resolution, not the output
    // resolution: removes a full-canvas rescale every animation frame.
    source.width=gpu.width;source.height=gpu.height;
    textCacheKey="";
    setRenderError(null);
   }
   catch(error){failed=true;setRenderError(error instanceof Error?error.message:String(error));return}
   needsFirstFrame=true;dirtyRef.current=true;accumulator=0;
  }
  const observer=new ResizeObserver(resize);
  const onQualityChange=()=>{qualityChanged=true;failed=false;resize()};
  window.addEventListener("grid-delay-quality-change",onQualityChange);
  const contextLost=(event:Event)=>{event.preventDefault();gpu=null;};
  const contextRestored=()=>{failed=false;w=0;resize()};
  output.addEventListener("webglcontextlost",contextLost);
  output.addEventListener("webglcontextrestored",contextRestored);
  observer.observe(output);
  resize();
  function modulated(t:number){
   const p={...settingsRef.current,inkHue:0,bgHue:0,blendOffset:0,
    globalStrength:globalRef.current.strength,
    globalSize:globalRef.current.size,
    globalGrowth:globalRef.current.growth,
    blackHold:blackHoldRef.current,
    feedbackAmount:feedbackRef.current.amount,
    feedbackDecay:feedbackRef.current.decay,
    feedbackRefresh:feedbackRef.current.refresh,feedbackBlendOffset:0};
   let gridDrive=0;
   for(const cable of patchRef.current){
    const o=oscRef.current[cable.wave];if(!o||!o.enabled||cable.amount===0||o.depth===0)continue;
    // Fine control around zero, with target-specific ranges. A full-strength
    // cable no longer sweeps an entire parameter range in a single cycle.
    const amount=Math.sign(cable.amount)*Math.pow(Math.abs(cable.amount)/100,1.5);
    const delta=oscValue(o,t)*o.depth/100*amount*(patchGainRef.current[cable.target]??1);
    switch(cable.target){
     case "scale":p.scale=clamp(p.scale*(1+delta*.2),10,400);break;
     case "delay":p.delay=clamp(p.delay+delta*.7,0,5);break;
     case "spacing":p.spacing=clamp(p.spacing+delta*30,0,150);break;
     case "positionX":case "positionY":p[cable.target]=clamp(p[cable.target]+delta*22,-100,100);break;
     case "rotation":p.rotation+=delta*45;break;
     case "amplitude":p.amplitude=clamp(p.amplitude+delta*25,0,100);break;
     case "speed":p.speed=clamp(p.speed+delta*.6,0,3);break;
     case "columns":case "rows":
      if(linkedRef.current)gridDrive+=delta;
      else p[cable.target]=clamp(Math.round(p[cable.target]+delta*(cable.target==="columns"?8:6)),1,cable.target==="columns"?48:32);
      break;
     case "inkHue":p.inkHue+=delta*100;break;
     case "bgHue":p.bgHue+=delta*100;break;
     case "blendMode":p.blendOffset+=delta*2.5;break;
     case "deformAmount":p.deformAmount=clamp(p.deformAmount+delta*28,0,100);break;
     case "deformFrequency":p.deformFrequency=clamp(p.deformFrequency+delta*2,.2,12);break;
     case "deformFlow":p.deformFlow=clamp(p.deformFlow+delta*.8,0,4);break;
     case "globalStrength":p.globalStrength=clamp(p.globalStrength+delta*50,0,100);break;
     case "globalSize":p.globalSize=clamp(p.globalSize+delta*65,15,150);break;
     case "globalGrowth":p.globalGrowth=clamp(p.globalGrowth+delta*1.5,0,3);break;
     case "blackHold":p.blackHold=clamp(p.blackHold+delta*45,0,100);break;
     case "feedbackAmount":p.feedbackAmount=clamp(p.feedbackAmount+delta*45,0,100);break;
     case "feedbackDecay":p.feedbackDecay=clamp(p.feedbackDecay+delta*40,0,100);break;
     case "feedbackRefresh":p.feedbackRefresh=clamp(p.feedbackRefresh+delta*120,16,500);break;
     case "feedbackBlend":p.feedbackBlendOffset+=delta*3;break;
    }
   }
   if(linkedRef.current&&gridDrive!==0){
    const factor=clamp(1+gridDrive*.35,.35,1.65);
    p.columns=clamp(Math.round(p.columns*factor),1,48);
    p.rows=clamp(Math.round(p.rows*factor),1,32);
   }
   p.columns=Math.round(p.columns);p.rows=Math.round(p.rows);
   return p;
  }

  // K-TIC-SYNTH-inspired split: rasterise type only when the glyph/layout
  // actually changes. Animate a prepared transparent text layer each RAF.
  let textOriginX=0,textOriginY=0,textLogicalW=1,textLogicalH=1;
  // Keep the cache tightly bounded to the glyphs. A viewport-sized cached
  // raster would clip large type before its animated transform is applied.
  function preparedText(p:ReturnType<typeof modulated>){
   const ink=rotateHue(visualRef.current.ink,p.inkHue);
   const key=JSON.stringify([source.width,source.height,w,h,textRef.current,fontRef.current,
    p.fontSize,p.weight,p.tracking,p.lineHeight,ink,alignRef.current,vAlignRef.current]);
   if(key===textCacheKey)return;
   textCacheKey=key;
   const sx=source.width/w,sy=source.height/h;
   const lines=textRef.current.split("\n").slice(0,6),size=h*p.fontSize/100;
   const tracking=size*p.tracking/100;
   tc!.font=p.weight+" "+size+"px "+fontRef.current;
   tc!.fontKerning="normal";
   tc!.textBaseline="middle";
   tc!.textAlign="left";
   // Native whole-line shaping avoids the incorrect half-character offsets
   // and preserves kerning pairs such as 'He', 'oo', and 'ki'.
   const hasNativeSpacing="letterSpacing" in tc!;
   const measureLine=(line:string)=>{
    if(hasNativeSpacing){
     tc!.letterSpacing=tracking+"px";
     return tc!.measureText(line).width;
    }
    const chars=Array.from(line);
    let width=0,previous="";
    for(const ch of chars){
     const advance=tc!.measureText(ch).width;
     if(previous){
      width+=tracking+tc!.measureText(previous+ch).width-tc!.measureText(previous).width-advance;
     }
     width+=advance;previous=ch;
    }
    return width;
   };
   const layout=lines.map(line=>({text:line,width:measureLine(line)}));
   const advance=size*p.lineHeight,total=layout.length*advance;
   const positioned=layout.map((line,i)=>{
    const x=alignRef.current==="left"?0:alignRef.current==="right"?-line.width:-line.width/2;
    const y=vAlignRef.current==="top"?i*advance+size*.5:
           vAlignRef.current==="bottom"?-total+i*advance+size*.5:
           (i-(layout.length-1)/2)*advance;
    return {...line,x,y};
   });
   const padding=Math.max(8,size);
   textOriginX=Math.min(0,...positioned.map(line=>Math.min(line.x,line.x+line.width)))-padding;
   textOriginY=Math.min(0,...positioned.map(line=>line.y))-padding;
   const right=Math.max(0,...positioned.map(line=>Math.max(line.x,line.x+line.width)))+padding;
   const bottom=Math.max(0,...positioned.map(line=>line.y))+padding;
   textLogicalW=Math.max(1,right-textOriginX);
   textLogicalH=Math.max(1,bottom-textOriginY);
   textLayer.width=Math.max(1,Math.ceil(textLogicalW*sx));
   textLayer.height=Math.max(1,Math.ceil(textLogicalH*sy));
   // Resizing the canvas resets font and spacing state.
   tc!.setTransform(sx,0,0,sy,-textOriginX*sx,-textOriginY*sy);
   tc!.textBaseline="middle";tc!.textAlign="left";tc!.fillStyle=ink;
   tc!.font=p.weight+" "+size+"px "+fontRef.current;
   tc!.fontKerning="normal";
   if(hasNativeSpacing)tc!.letterSpacing=tracking+"px";
   positioned.forEach(line=>{
    if(hasNativeSpacing||tracking===0){
     tc!.fillText(line.text,line.x,line.y);
    }else{
     // Fallback for browsers without Canvas letterSpacing: advance each glyph
     // using pair-aware kerning rather than its half-width as an offset.
     let x=line.x,previous="";
     for(const ch of Array.from(line.text)){
      const advance=tc!.measureText(ch).width;
      if(previous)x+=tracking+tc!.measureText(previous+ch).width-tc!.measureText(previous).width-advance;
      tc!.fillText(ch,x,line.y);
      x+=advance;previous=ch;
     }
    }
   });
  }
  function makeSource(t:number,p:ReturnType<typeof modulated>){
   const phase=t*1.7,amp=p.amplitude/100;
   sc!.setTransform(source.width/w,0,0,source.height/h,0,0);
   sc!.fillStyle=rotateHue(visualRef.current.background,p.bgHue);
   sc!.fillRect(0,0,w,h);
   let dx=0,dy=0,angle=p.rotation*Math.PI/180,zoom=1;
   switch(motionRef.current){
    case "horizontal":dx=Math.sin(phase)*w*.44*amp;break;
    case "vertical":dy=Math.sin(phase)*h*.44*amp;break;
    case "orbit":dx=Math.cos(phase)*w*.36*amp;dy=Math.sin(phase)*h*.36*amp;break;
    case "rotation":angle+=phase*amp;break;
    case "scale":zoom=Math.exp(Math.sin(phase)*amp);break;
   }
   const isImage=!!image.current;
   const ax=isImage?.5:(alignRef.current==="left"?.06:alignRef.current==="right"?.94:.5);
   const ay=isImage?.5:(vAlignRef.current==="top"?.08:vAlignRef.current==="bottom"?.92:.5);
   sc!.save();
   sc!.translate(w*ax+w*p.positionX/100+dx,h*ay+h*p.positionY/100+dy);
   sc!.rotate(angle);sc!.scale(p.scale/100*zoom,p.scale/100*zoom);
   if(image.current){
    const im=image.current,ratio=Math.min(w*.76/im.width,h*.76/im.height);
    sc!.drawImage(im,-im.width*ratio/2,-im.height*ratio/2,im.width*ratio,im.height*ratio);
   }else{
    preparedText(p);
    sc!.drawImage(textLayer,textOriginX,textOriginY,textLogicalW,textLogicalH);
   }
   sc!.restore();
   gpu?.pushLive(source);
  }
  function draw(now:number){
   const actualDelta=last?(now-last)/1000:0;
   const delta=Math.min(.06,actualDelta);last=now;
   if(monitor&&document.visibilityState==="visible"){
    if(!measureSince)measureSince=now;
    measureFrames++;
    if(actualDelta>1/30&&actualDelta<.5)measureSlow++;
   }
   if(!gpu){raf=requestAnimationFrame(draw);return}
   if(playingRef.current){
    const speed=modulated(clock).speed;
    clock+=delta*speed;accumulator+=delta*speed;
   }
   const p=modulated(clock);
   const interval=gpu.interval;
   // Always redraw the current source for smooth motion; only archive snapshots
   // at the cadence permitted by the bounded history texture array.
   const capture=needsFirstFrame||(playingRef.current&&accumulator>=interval);
   if(playingRef.current||needsFirstFrame||dirtyRef.current){
    const sourceStart=monitor?performance.now():0;
    makeSource(clock,p);
    if(monitor)sourceMs+=performance.now()-sourceStart;
    if(capture){
     const captureStart=monitor?performance.now():0;
     gpu.capture(source);
     if(monitor)captureMs+=performance.now()-captureStart;
     lastCapture=clock;
     accumulator=accumulator%interval;
    }
    needsFirstFrame=false;dirtyRef.current=false;
   }
   const blendIndex=blendModes.indexOf(visualRef.current.blend);
   const selectedBlend=((blendIndex+Math.round(p.blendOffset))%blendModes.length+blendModes.length)%blendModes.length;
   const renderStart=monitor?performance.now():0;
   gpu.render({
    columns:p.columns,rows:p.rows,spacing:p.spacing,delay:p.delay,
    delayMode:delayModeRef.current==="black"?1:0,blackHold:p.blackHold/100,
    pattern:Math.max(0,["wave","cascade","radial","random"].indexOf(patternRef.current)),
    mode:Math.max(0,["rigid","fisheye","pinch"].indexOf(deformRef.current)),
    amount:p.deformAmount/100,frequency:p.deformFrequency,flow:p.deformFlow,
    globalMode:globalRef.current.enabled?(globalRef.current.mode==="fisheye"?1:2):0,
    globalStrength:p.globalStrength/100,globalSize:p.globalSize/100,globalGrowth:p.globalGrowth,
    time:clock,elapsed:Math.max(0,clock-lastCapture),grid:gridRef.current,
    background:rgb(rotateHue(visualRef.current.background,p.bgHue)),blend:selectedBlend,
    feedbackEnabled:feedbackRef.current.enabled,
    feedbackAmount:p.feedbackAmount/100,feedbackDecay:p.feedbackDecay/100,
    feedbackRefresh:p.feedbackRefresh/1000,
    feedbackBlend:(blendModes.indexOf(feedbackRef.current.blend)+Math.round(p.feedbackBlendOffset)+blendModes.length*8)%blendModes.length
   });
   if(monitor){
    submitMs+=performance.now()-renderStart;
    if(now-measureSince>=5000&&measureSince>0){
     const samples=Math.max(1,measureFrames);
     console.info("[Grid Delay perf]",{
      fps:Math.round(measureFrames*1000/(now-measureSince)*10)/10,
      slowFrames:measureSlow,
      sourceMsPerFrame:Math.round(sourceMs/samples*100)/100,
      captureMsPerFrame:Math.round(captureMs/samples*100)/100,
      renderSubmissionMs:Math.round(submitMs/samples*100)/100,
      quality:qualityRef.current
     });
     measureSince=now;measureFrames=0;measureSlow=0;sourceMs=0;captureMs=0;submitMs=0;
    }
   }
   raf=requestAnimationFrame(draw);
  }
  raf=requestAnimationFrame(draw);
  return ()=>{
   cancelAnimationFrame(raf);observer.disconnect();
   window.removeEventListener("grid-delay-quality-change",onQualityChange);
   output.removeEventListener("webglcontextlost",contextLost);
   output.removeEventListener("webglcontextrestored",contextRestored);
   gpu?.dispose();
  };
 },[]);
 const control=(k:Param)=><Control key={k} name={k} value={params[k]} onChange={v=>change(k,v)}/>;
 return <main className="gd-machine" style={{"--gd-paper":"#edeae3"} as CSSProperties}>
  <header className="gd-top"><a href="/" className="gd-back" aria-label="Back to Playground index">← Experiments</a><strong>GRID DELAY MACHINE <span> / REC-13</span></strong><div><button aria-expanded={open} aria-controls="gd-controls-panel" onClick={()=>setOpen(v=>!v)}>{open?"Hide panel":"Show panel"}</button><button onClick={async()=>{if(!stage.current)return;if(!document.fullscreenElement){await stage.current.requestFullscreen();setFullscreen(true)}else{await document.exitFullscreen();setFullscreen(false)}}}>{fullscreen?"Exit fullscreen":"Fullscreen ↗"}</button></div></header>
  <div className={"gd-workspace"+(open?"":" gd-no-panel")}><div ref={stage} className="gd-stage"><canvas ref={canvas} aria-label="Animated temporal grid sampling output"/>{renderError&&<div role="alert" className="gd-stage-error"><strong>WebGL2 renderer unavailable</strong><span>{renderError}</span></div>}<div className="gd-stage-caption">SOURCE / {hasImage?"IMAGE":"TYPE"} &nbsp; · &nbsp; MOTION / {motion.toUpperCase()}</div><div className="gd-stage-bottom"><span>{params.columns} × {params.rows} / {pattern.toUpperCase()}</span><div><button onClick={()=>{playingRef.current=!playingRef.current;setPlaying(playingRef.current)}}>{playing?"Ⅱ Pause":"▶ Play"}</button><button className={showGrid?"active":""} onClick={()=>{gridRef.current=!gridRef.current;setShowGrid(gridRef.current)}}>Grid</button></div></div></div>
  {open&&<aside id="gd-controls-panel" className="gd-panel" aria-label="Grid Delay controls"><nav className="gd-tabs">{(["patch","source","grid","fx"] as const).map(t=><button className={tab===t?"active":""} key={t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
   {tab==="source"&&<div className="gd-panel-grid"><div className="gd-block"><h2>01 / INPUT</h2><textarea value={sourceText} onChange={e=>{changeText(e.target.value);image.current=null;setHasImage(false)}} rows={2} aria-label="Source text"/><div className="gd-inline"><button onClick={()=>file.current?.click()}>↑ Upload image</button>{hasImage&&<button onClick={()=>{image.current=null;setHasImage(false)}}>Use text</button>}<input ref={file} type="file" hidden accept="image/*" onChange={e=>upload(e.target.files?.[0])}/></div><h2>Typography</h2><select value={font} onChange={e=>changeFont(e.target.value)}><option value="Arial, Helvetica, sans-serif">Arial / System Sans</option><option value="Georgia, serif">Georgia / Serif</option><option value="'Times New Roman', serif">Times New Roman</option><option value="'Courier New', monospace">Courier Mono</option><option value="'GT Era Text', Arial, sans-serif">GT Era Text</option><option value="'GT Alpina Typewriter', monospace">GT Alpina Typewriter</option></select><div className="gd-control-group"><span>Horizontal alignment</span><Buttons values={["left","center","right"] as const} selected={alignText} onSelect={changeAlignment}/><span>Vertical alignment</span><Buttons values={["top","middle","bottom"] as const} selected={alignVertical} onSelect={changeVertical}/></div><div className="gd-controls">{(["fontSize","weight","tracking","lineHeight"] as Param[]).map(control)}</div><div className="gd-color-controls"><label>Font color <input type="color" value={ink} onChange={e=>updateColor("ink",e.target.value)}/></label><label>Background color <input type="color" value={backgroundColor} onChange={e=>updateColor("background",e.target.value)}/></label><label>Blend mode <select value={blend} onChange={e=>updateBlend(e.target.value as BlendMode)}>{blendModes.map(m=><option value={m} key={m}>{m}</option>)}</select></label></div></div><div className="gd-block"><h2>02 / SOURCE MOTION</h2><Buttons values={["horizontal","vertical","orbit","rotation","scale"] as const} selected={motion} onSelect={changeMotion}/><div className="gd-controls">{(["scale","speed","amplitude","positionX","positionY","rotation"] as Param[]).map(control)}</div></div></div>}
   {tab==="grid"&&<div className="gd-panel-grid"><div className="gd-block"><h2>03 / SAMPLING GRID</h2><div className="gd-grid-link"><label><input type="checkbox" checked={linked} onChange={e=>updateLinked(e.target.checked)}/> <span>Link columns &amp; rows</span></label></div><div className="gd-controls">{(["columns","rows","spacing"] as Param[]).map(control)}</div><p>Spacing reduces tile size to keep the complete composition in frame.</p></div><div className="gd-block"><h2>04 / TEMPORAL DELAY</h2><Buttons values={["wave","cascade","radial","random"] as const} selected={pattern} onSelect={changePattern}/><div className="gd-controls">{control("delay")}</div><div className="gd-control-group"><span>Delay output</span><Buttons values={["image","black"] as const} selected={delayMode} onSelect={changeDelayMode}/></div>{delayMode==="black"&&<label className="gd-control"><span>Black hold <output>{blackHold}%</output></span><input type="range" min="0" max="100" step="1" value={blackHold} onChange={e=>changeBlackHold(Number(e.target.value))}/></label>}<p>{delayMode==="black"?"Each cell alternates between its delayed image and true black, staggered by its temporal offset. Black hold sets the proportion of each cycle.":"Each stationary cell reads a different point in the source's recent motion history."}</p></div></div>}
   {tab==="fx"&&<div className="gd-panel-grid"><div className="gd-block"><h2>05 / WEBGL DEFORMATION</h2><Buttons values={["rigid","fisheye","pinch"] as const} selected={deformMode} onSelect={changeDeformation}/><div className="gd-controls">{(["deformAmount","deformFrequency","deformFlow"] as Param[]).map(control)}</div><p>{deformMode==="fisheye"?"Convex glass: each delayed cell magnifies through its own lens.":deformMode==="pinch"?"Concave glass: each delayed cell compresses through its own lens.":"No per-cell optical refraction."} Per-cell lens strength now adapts to the actual pixel resolution of each tile. At very dense grids, it fades to prevent repeated artifacts.</p></div><div className="gd-block"><h2>06 / RENDERING QUALITY</h2><Buttons values={["balanced","sharp","fluid"] as const} selected={quality} onSelect={changeQuality}/><p>Balanced is the default. Sharp gives more detail to the source; Fluid favours more temporal samples for smoother delayed motion. Changing quality restarts the history buffer.</p></div><div className="gd-block"><h2>07 / GLOBAL LENS</h2><div className="gd-grid-link"><label><input type="checkbox" checked={globalLens.enabled} onChange={e=>changeGlobalLens({enabled:e.target.checked})}/><span>Apply lens to entire delayed grid</span></label></div>{globalLens.enabled&&<><Buttons values={["fisheye","pinch"] as const} selected={globalLens.mode} onSelect={mode=>changeGlobalLens({mode})}/><div className="gd-controls"><label className="gd-control"><span>Lens strength <output>{globalLens.strength}%</output></span><input type="range" min="0" max="100" step="1" value={globalLens.strength} onChange={e=>changeGlobalLens({strength:Number(e.target.value)})}/></label><label className="gd-control"><span>Maximum size <output>{globalLens.size}%</output></span><input type="range" min="15" max="150" step="1" value={globalLens.size} onChange={e=>changeGlobalLens({size:Number(e.target.value)})}/></label><label className="gd-control"><span>Growth speed <output>{globalLens.growth.toFixed(2)}×</output></span><input type="range" min="0" max="3" step=".05" value={globalLens.growth} onChange={e=>changeGlobalLens({growth:Number(e.target.value)})}/></label></div><p>The lens expands and contracts smoothly across the entire delayed image. Set growth to 0 for a stationary lens.</p></>}</div><div className="gd-block"><h2>08 / FEEDBACK</h2><div className="gd-grid-link"><label><input type="checkbox" checked={feedback.enabled} onChange={e=>changeFeedback({enabled:e.target.checked})}/><span>Enable output feedback</span></label></div>{feedback.enabled&&<><div className="gd-controls"><label className="gd-control"><span>Feedback amount <output>{feedback.amount}%</output></span><input type="range" min="0" max="100" step="1" value={feedback.amount} onChange={e=>changeFeedback({amount:Number(e.target.value)})}/></label><label className="gd-control"><span>Decay <output>{feedback.decay}%</output></span><input type="range" min="0" max="100" step="1" value={feedback.decay} onChange={e=>changeFeedback({decay:Number(e.target.value)})}/></label><label className="gd-control"><span>Refresh <output>{feedback.refresh} ms</output></span><input type="range" min="16" max="500" step="1" value={feedback.refresh} onChange={e=>changeFeedback({refresh:Number(e.target.value)})}/></label></div><label className="gd-select-label">Feedback blend<select value={feedback.blend} onChange={e=>changeFeedback({blend:e.target.value as BlendMode})}>{blendModes.map(mode=><option key={mode} value={mode}>{mode}</option>)}</select></label><p>Output feedback accumulates previous composite frames. Separate from source time-delay history; modulation controls amount, decay and refresh.</p></>}</div></div>}
   {tab==="patch"&&<GridDelayPatchBay waves={osc} patches={patches} gains={patchGains} onWaves={changeWaves} onPatches={changePatches} onGain={changePatchGain}/>}

  </aside>}
  </div><footer className="gd-footer"><span>TIME AS MATERIAL / TYPE · IMAGE · MOTION</span><span>WEBGL2 / BUILD 03</span></footer>
 </main>;
}
