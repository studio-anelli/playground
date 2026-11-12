"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./grid-delay.css";
import GridDelayKnob from "./grid-delay-knob";
import GridDelayPatchBay, {type DelayWave,type DelayPatch,type DelayTarget,type DelayInputGains,knownTargets,beatDivisions,divisionBeats,syncSeconds,type BeatDivision} from "./grid-delay-patch-bay";
import {createDelayGPU, type DelayGPU, type DelayQuality} from "./grid-delay-gpu";
import {parseGridDelayPreset, type GridDelayPreset} from "./grid-delay-preset";

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
const defaults:Settings={deformAmount:76,deformFrequency:9,deformFlow:1,columns:30,rows:20,spacing:0,delay:4.4,speed:2.1,amplitude:65,scale:82,fontSize:63,weight:100,tracking:-8,lineHeight:.8,positionX:0,positionY:0,rotation:0};
const specs:Record<Param,[string,number,number,number,string]>={
 deformAmount:["Lens strength",0,100,1,"%"],deformFrequency:["Lens curvature",.2,12,.1,""],deformFlow:["Lens breathing",0,4,.05,"×"],
 columns:["Columns",1,48,1,""],rows:["Rows",1,32,1,""],spacing:["Grid spacing",0,150,1,"%"],delay:["Time delay",0,5,.05,"s"],speed:["Speed",0,3,.05,"×"],amplitude:["Motion amplitude",0,100,1,"%"],scale:["Source scale",10,300,1,"%"],
 fontSize:["Font size",5,120,1,"%"],weight:["Weight",100,900,10,""],tracking:["Letter spacing",-10,30,.5,"%"],lineHeight:["Line height",.6,2.5,.05,""],
 positionX:["Position X",-100,100,1,"%"],positionY:["Position Y",-100,100,1,"%"],rotation:["Rotation",-180,180,1,"°"]};
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const rgb=(hex:string):[number,number,number]=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255) as [number,number,number];
const hash=(x:number,y:number)=>{const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a)};
const oscValue=(o:DelayWave,t:number,beatClock:number)=>{const p=(o.sync?beatClock/divisionBeats[o.division??"1/4"]:t*o.rate)+o.phase;switch(o.shape){case "triangle":return 1-4*Math.abs(p-Math.floor(p)-.5);case "square":return Math.sin(p*Math.PI*2)>0?1:-1;case "noise":return hash(Math.floor(p*7),9)*2-1;case "ramp":return 2*(p-Math.floor(p))-1;default:return Math.sin(p*Math.PI*2)}};
function Control({name,value,onChange}:{name:Param;value:number;onChange:(n:number)=>void}){const [label,min,max,step,unit]=specs[name];return <GridDelayKnob name={label} min={min} max={max} step={step} value={value} unit={unit} onChange={onChange}/>}

function Buttons<T extends string>({values,selected,onSelect}:{values:readonly T[];selected:T;onSelect:(v:T)=>void}){return <div className="gd-pills">{values.map(v=><button type="button" key={v} className={selected===v?"selected":""} onClick={()=>onSelect(v)}>{v}</button>)}</div>}
export default function GridDelayMachine(){
 const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null),file=useRef<HTMLInputElement>(null),presetFile=useRef<HTMLInputElement>(null),image=useRef<HTMLImageElement|null>(null);
 const settingsRef=useRef(defaults),oscRef=useRef<DelayWave[]>([{shape:"sine",rate:.01,depth:75,phase:0,enabled:true},{shape:"triangle",rate:.13,depth:65,phase:0,enabled:true},{shape:"sine",rate:1.08,depth:62,phase:0,enabled:true}]),patchRef=useRef<DelayPatch[]>([{id:"c2-inkHue",wave:2,target:"inkHue",amount:100}]);
 const visualRef=useRef<{ink:string;background:string;blend:BlendMode}>({ink:"#0533ff",background:"#000000",blend:"source-over"}),linkedRef=useRef(true);
 const motionRef=useRef<Motion>("scale"),patternRef=useRef<Pattern>("radial"),textRef=useRef("play"),fontRef=useRef("Arial, Helvetica, sans-serif"),alignRef=useRef<TextAlign>("center"),vAlignRef=useRef<VerticalAlign>("middle"),deformRef=useRef<DeformMode>("pinch"),playingRef=useRef(true),gridRef=useRef(false);
 const patchGainRef=useRef<DelayInputGains>({});
 const [patchGains,setPatchGains]=useState<DelayInputGains>({});
 const delayModeRef=useRef<"image"|"black">("image"),blackHoldRef=useRef(35);
 const [delayMode,setDelayMode]=useState<"image"|"black">("image"),[blackHold,setBlackHold]=useState(35);
 const globalRef=useRef<{enabled:boolean;mode:"fisheye"|"pinch";strength:number;size:number;growth:number}>({enabled:false,mode:"fisheye",strength:65,size:90,growth:1});
 const [globalLens,setGlobalLens]=useState(globalRef.current);
 const feedbackRef=useRef<{enabled:boolean;amount:number;decay:number;refresh:number;blend:BlendMode}>({enabled:false,amount:55,decay:88,refresh:33,blend:"screen"});
 const [feedback,setFeedback]=useState(feedbackRef.current);
 function changeFeedback(next:Partial<typeof feedback>){const value={...feedbackRef.current,...next};feedbackRef.current=value;setFeedback(value)}
 const qualityRef=useRef<DelayQuality>("fluid");
 const [quality,setQuality]=useState<DelayQuality>("fluid");
 const bpmRef=useRef(120),delaySyncRef=useRef(false),delayDivisionRef=useRef<BeatDivision>("1 bar"),backgroundInsideRef=useRef(true);
 const [bpm,setBpm]=useState(120),[delaySync,setDelaySync]=useState(false),[delayDivision,setDelayDivision]=useState<BeatDivision>("1 bar"),[backgroundInside,setBackgroundInside]=useState(true);
 function changeBpm(v:number){const b=clamp(Math.round(v),40,240);bpmRef.current=b;setBpm(b);dirtyRef.current=true}
 function changeDelaySync(v:boolean){delaySyncRef.current=v;setDelaySync(v);dirtyRef.current=true}
 function changeDelayDivision(v:BeatDivision){delayDivisionRef.current=v;setDelayDivision(v);dirtyRef.current=true}
 function changeBackgroundInside(v:boolean){backgroundInsideRef.current=v;setBackgroundInside(v);dirtyRef.current=true;window.dispatchEvent(new Event("grid-delay-quality-change"))}
 const [presetMessage,setPresetMessage]=useState<{text:string;error:boolean}|null>(null);
 const [renderError,setRenderError]=useState<string|null>(null),dirtyRef=useRef(true);
 const [alignText,setAlignText]=useState<TextAlign>("center"),[alignVertical,setAlignVertical]=useState<VerticalAlign>("middle"),[deformMode,setDeformMode]=useState<DeformMode>("pinch");
 const [ink,setInk]=useState("#0533ff"),[backgroundColor,setBackgroundColor]=useState("#000000"),[blend,setBlend]=useState<BlendMode>("source-over"),[linked,setLinked]=useState(true);
 const [params,setParams]=useState(defaults),[motion,setMotion]=useState<Motion>("scale"),[pattern,setPattern]=useState<Pattern>("radial"),[sourceText,setSourceText]=useState("play"),[font,setFont]=useState("Arial, Helvetica, sans-serif"),[osc,setOsc]=useState<DelayWave[]>(oscRef.current),[patches,setPatches]=useState<DelayPatch[]>(patchRef.current),[playing,setPlaying]=useState(true),[showGrid,setShowGrid]=useState(false),[tab,setTab]=useState<"patch"|"source"|"grid"|"fx">("patch"),[open,setOpen]=useState(true),[fullscreen,setFullscreen]=useState(false),[hasImage,setHasImage]=useState(false);
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
 // A portable, versioned snapshot of the entire patch and visual state.
 function presetImage():string|null{
  const original=image.current;if(!original)return null;
  const maxSide=1800,scale=Math.min(1,maxSide/Math.max(original.naturalWidth,original.naturalHeight));
  const c=document.createElement("canvas");
  c.width=Math.max(1,Math.round(original.naturalWidth*scale));
  c.height=Math.max(1,Math.round(original.naturalHeight*scale));
  c.getContext("2d")!.drawImage(original,0,0,c.width,c.height);
  const encoded=c.toDataURL("image/webp",.9);
  if(encoded.length>10_000_000)throw Error("The image is too large for a preset. Please use a smaller image.");
  return encoded;
 }
 function snapshotPreset():GridDelayPreset{
  return {
   kind:"grid-delay-machine",version:1,
   settings:{...settingsRef.current},
   text:textRef.current,font:fontRef.current,
   align:alignRef.current,vertical:vAlignRef.current,
   motion:motionRef.current,pattern:patternRef.current,deformation:deformRef.current,
   ink:visualRef.current.ink,background:visualRef.current.background,blend:visualRef.current.blend,
   waves:oscRef.current.map(w=>({...w})),patches:patchRef.current.map(p=>({...p})),
   gains:{...patchGainRef.current},
   linked:linkedRef.current,grid:gridRef.current,playing:playingRef.current,quality:qualityRef.current,
   transport:{bpm:bpmRef.current,delaySync:delaySyncRef.current,delayDivision:delayDivisionRef.current},backgroundInside:backgroundInsideRef.current,
   delay:{mode:delayModeRef.current,blackHold:blackHoldRef.current},
   globalLens:{...globalRef.current},
   feedback:{...feedbackRef.current},
   image:presetImage()
  };
 }
 function exportPreset(){
  try{
   const json=JSON.stringify(snapshotPreset(),null,2);
   const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));
   const a=document.createElement("a");a.href=url;a.download="grid-delay-"+new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")+".json";
   document.body.appendChild(a);a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setPresetMessage({text:"Preset exported",error:false});
  }catch(error){setPresetMessage({text:error instanceof Error?error.message:"Preset export failed",error:true})}
 }
 async function importPreset(f?:File){
  if(!f)return;
  try{
   if(f.size>10_000_000)throw Error("Preset file is too large (10 MB limit).");
   const raw:unknown=JSON.parse(await f.text());
   const ranges=Object.fromEntries(Object.entries(specs).map(([key,[,min,max]])=>[key,[min,max] as const]));
   const p=parseGridDelayPreset(raw,ranges,knownTargets);
   const restoredImage=await (async()=>{
    if(!p.image)return null;
    return new Promise<HTMLImageElement>((resolve,reject)=>{
     const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Could not decode preset image"));img.src=p.image!;
    });
   })();
   settingsRef.current={...p.settings} as Settings;setParams(settingsRef.current);
   textRef.current=p.text;setSourceText(p.text);
   fontRef.current=p.font;setFont(p.font);
   alignRef.current=p.align;setAlignText(p.align);
   vAlignRef.current=p.vertical;setAlignVertical(p.vertical);
   motionRef.current=p.motion;setMotion(p.motion);
   patternRef.current=p.pattern;setPattern(p.pattern);
   deformRef.current=p.deformation;setDeformMode(p.deformation);
   visualRef.current={ink:p.ink,background:p.background,blend:p.blend};
   setInk(p.ink);setBackgroundColor(p.background);setBlend(p.blend);
   oscRef.current=p.waves.map(w=>({...w}));setOsc(oscRef.current);
   patchRef.current=p.patches.map(patch=>({...patch}));setPatches(patchRef.current);
   patchGainRef.current={...p.gains};setPatchGains(patchGainRef.current);
   linkedRef.current=p.linked;setLinked(p.linked);
   gridRef.current=p.grid;setShowGrid(p.grid);
   playingRef.current=p.playing;setPlaying(p.playing);
   delayModeRef.current=p.delay.mode;setDelayMode(p.delay.mode);
   blackHoldRef.current=p.delay.blackHold;setBlackHold(p.delay.blackHold);
   globalRef.current={...p.globalLens};setGlobalLens(globalRef.current);
   feedbackRef.current={...p.feedback};setFeedback(feedbackRef.current);
   qualityRef.current=p.quality;setQuality(p.quality);
   const transport=p.transport??{bpm:120,delaySync:false,delayDivision:"1 bar" as BeatDivision};
   bpmRef.current=transport.bpm;setBpm(transport.bpm);
   delaySyncRef.current=transport.delaySync;setDelaySync(transport.delaySync);
   delayDivisionRef.current=transport.delayDivision;setDelayDivision(transport.delayDivision);
   backgroundInsideRef.current=p.backgroundInside??true;setBackgroundInside(backgroundInsideRef.current);
   image.current=restoredImage;setHasImage(!!restoredImage);
   dirtyRef.current=true;
   // Reset the old temporal history and feedback buffers, including when
   // the imported quality is unchanged.
   window.dispatchEvent(new Event("grid-delay-quality-change"));
   setPresetMessage({text:"Preset imported",error:false});
  }catch(error){setPresetMessage({text:error instanceof Error?error.message:"Invalid preset file",error:true})}
 }

 async function upload(f?:File){if(!f||!f.type.startsWith("image/"))return;const url=URL.createObjectURL(f);const img=new Image();img.onload=()=>{dirtyRef.current=true;image.current=img;setHasImage(true);URL.revokeObjectURL(url)};img.onerror=()=>URL.revokeObjectURL(url);img.src=url}
 useEffect(()=>{
  const output=canvas.current;if(!output)return;
  const source=document.createElement("canvas"),sc=source.getContext("2d",{alpha:true});
  const textLayer=document.createElement("canvas"),tc=textLayer.getContext("2d");
  if(!sc||!tc)return;
  let textCacheKey="";
  let gpu:DelayGPU|null=null;
  let raf=0,last=0,clock=0,beatClock=0,accumulator=0,lastCapture=0,w=0,h=0,dpr=1,needsFirstFrame=true,failed=false,qualityChanged=false;
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
   if(delaySyncRef.current)p.delay=clamp(syncSeconds(bpmRef.current,delayDivisionRef.current),0,5);
   let gridDrive=0;
   for(const cable of patchRef.current){
    const o=oscRef.current[cable.wave];if(!o||!o.enabled||cable.amount===0||o.depth===0)continue;
    // Fine control around zero, with target-specific ranges. A full-strength
    // cable no longer sweeps an entire parameter range in a single cycle.
    const amount=Math.sign(cable.amount)*Math.pow(Math.abs(cable.amount)/100,1.5);
    const delta=oscValue(o,t,beatClock)*o.depth/100*amount*(patchGainRef.current[cable.target]??1);
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
   sc!.clearRect(0,0,w,h);
   if(backgroundInsideRef.current){
    sc!.fillStyle=rotateHue(visualRef.current.background,p.bgHue);
    sc!.fillRect(0,0,w,h);
   }
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
    clock+=delta*speed;beatClock+=delta*speed*bpmRef.current/60;accumulator+=delta*speed;
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
    background:rgb(rotateHue(visualRef.current.background,p.bgHue)),blend:selectedBlend,backgroundInside:backgroundInsideRef.current,
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
  <header className="gd-top"><a href="/" className="gd-back" aria-label="Back to Playground index">← Experiments</a><strong>GRID DELAY MACHINE <span> / REC-13</span></strong><div className="gd-top-actions"><button type="button" onClick={exportPreset}>Export preset</button><button type="button" onClick={()=>presetFile.current?.click()}>Import preset</button><input ref={presetFile} type="file" hidden accept=".json,application/json" aria-label="Import Grid Delay preset JSON" onChange={e=>{const selected=e.target.files?.[0];e.target.value="";void importPreset(selected)}}/>{presetMessage&&<span className={presetMessage.error?"gd-preset-error":"gd-preset-success"} role={presetMessage.error?"alert":"status"}>{presetMessage.text}</span>}<button aria-expanded={open} aria-controls="gd-controls-panel" onClick={()=>setOpen(v=>!v)}>{open?"Hide panel":"Show panel"}</button><button onClick={async()=>{if(!stage.current)return;if(!document.fullscreenElement){await stage.current.requestFullscreen();setFullscreen(true)}else{await document.exitFullscreen();setFullscreen(false)}}}>{fullscreen?"Exit fullscreen":"Fullscreen ↗"}</button></div></header>
  <div className={"gd-workspace"+(open?"":" gd-no-panel")}><div ref={stage} className="gd-stage"><canvas ref={canvas} aria-label="Animated temporal grid sampling output"/>{renderError&&<div role="alert" className="gd-stage-error"><strong>WebGL2 renderer unavailable</strong><span>{renderError}</span></div>}<div className="gd-stage-caption">SOURCE / {hasImage?"IMAGE":"TYPE"} &nbsp; · &nbsp; MOTION / {motion.toUpperCase()}</div><div className="gd-stage-bottom"><span>{params.columns} × {params.rows} / {pattern.toUpperCase()}</span><div><button onClick={()=>{playingRef.current=!playingRef.current;setPlaying(playingRef.current)}}>{playing?"Ⅱ Pause":"▶ Play"}</button><button className={showGrid?"active":""} onClick={()=>{gridRef.current=!gridRef.current;setShowGrid(gridRef.current)}}>Grid</button></div></div></div>
  {open&&<aside id="gd-controls-panel" className="gd-panel" aria-label="Grid Delay controls"><nav className="gd-tabs">{(["patch","source","grid","fx"] as const).map(t=><button className={tab===t?"active":""} key={t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
   {tab==="source"&&<div className="gd-panel-grid"><div className="gd-block gd-module"><h2><span>01 / SOURCE</span><span className="gd-module-led">●</span></h2><textarea value={sourceText} onChange={e=>{changeText(e.target.value);image.current=null;setHasImage(false)}} rows={2} aria-label="Source text"/><div className="gd-inline"><button onClick={()=>file.current?.click()}>↑ Upload image</button>{hasImage&&<button onClick={()=>{image.current=null;setHasImage(false)}}>Use text</button>}<input ref={file} type="file" hidden accept="image/*" onChange={e=>upload(e.target.files?.[0])}/></div><h2>Typography</h2><select value={font} onChange={e=>changeFont(e.target.value)}><option value="Arial, Helvetica, sans-serif">Arial / System Sans</option><option value="Georgia, serif">Georgia / Serif</option><option value="'Times New Roman', serif">Times New Roman</option><option value="'Courier New', monospace">Courier Mono</option><option value="'GT Era Text', Arial, sans-serif">GT Era Text</option><option value="'GT Alpina Typewriter', monospace">GT Alpina Typewriter</option></select><div className="gd-control-group"><span>Horizontal alignment</span><Buttons values={["left","center","right"] as const} selected={alignText} onSelect={changeAlignment}/><span>Vertical alignment</span><Buttons values={["top","middle","bottom"] as const} selected={alignVertical} onSelect={changeVertical}/></div><div className="gd-controls">{(["fontSize","weight","tracking","lineHeight"] as Param[]).map(control)}</div><div className="gd-color-controls"><label>Font color <input type="color" value={ink} onChange={e=>updateColor("ink",e.target.value)}/></label><label>Background color <input type="color" value={backgroundColor} onChange={e=>updateColor("background",e.target.value)}/></label><label className="gd-grid-link"><input type="checkbox" checked={backgroundInside} onChange={e=>changeBackgroundInside(e.target.checked)}/> Background inside grid cells</label><label>Blend mode <select value={blend} onChange={e=>updateBlend(e.target.value as BlendMode)}>{blendModes.map(m=><option value={m} key={m}>{m}</option>)}</select></label></div></div><div className="gd-block gd-module"><h2><span>02 / MOTION</span><span className="gd-module-led">●</span></h2><Buttons values={["horizontal","vertical","orbit","rotation","scale"] as const} selected={motion} onSelect={changeMotion}/><div className="gd-controls">{(["scale","speed","amplitude","positionX","positionY","rotation"] as Param[]).map(control)}</div></div></div>}
   {tab==="grid"&&<div className="gd-panel-grid"><div className="gd-block gd-module"><h2><span>03 / SAMPLER</span><span className="gd-module-led">●</span></h2><div className="gd-grid-link"><label><input type="checkbox" checked={linked} onChange={e=>updateLinked(e.target.checked)}/> <span>Link columns &amp; rows</span></label></div><div className="gd-controls">{(["columns","rows","spacing"] as Param[]).map(control)}</div><p>Each tile keeps a stable historical time slice. Spacing reduces tile size without changing temporal sampling.</p></div><div className="gd-block gd-module"><h2><span>04 / TIME DELAY</span><span className="gd-module-led">●</span></h2><div className="gd-controls gd-one-knob"><GridDelayKnob name="Tempo" value={bpm} min={40} max={240} step={1} unit="BPM" onChange={changeBpm}/></div><label className="gd-grid-link"><input type="checkbox" checked={delaySync} onChange={e=>changeDelaySync(e.target.checked)}/> Sync delay to BPM</label>{delaySync&&<label className="gd-control"><span>Beat division <output>{Math.min(5,syncSeconds(bpm,delayDivision)).toFixed(2)} s{syncSeconds(bpm,delayDivision)>5?" (history limit)":""}</output></span><select value={delayDivision} onChange={e=>changeDelayDivision(e.target.value as BeatDivision)}>{beatDivisions.map(d=><option key={d} value={d}>{d}</option>)}</select></label>}<Buttons values={["wave","cascade","radial","random"] as const} selected={pattern} onSelect={changePattern}/>{!delaySync&&<div className="gd-controls">{control("delay")}</div>}<div className="gd-control-group"><span>Delay output</span><Buttons values={["image","black"] as const} selected={delayMode} onSelect={changeDelayMode}/></div>{delayMode==="black"&&<GridDelayKnob name="Black hold" value={blackHold} min={0} max={100} step={1} unit="%" onChange={changeBlackHold}/>}<p>{delayMode==="black"?"Each cell alternates between its delayed image and true black, staggered by its temporal offset. Black hold sets the proportion of each cycle.":"Each stationary cell reads a different point in the source's recent motion history."}</p></div></div>}
   {tab==="fx"&&<div className="gd-panel-grid"><div className="gd-block gd-module"><h2><span>05 / CELL LENS</span><span className="gd-module-led">●</span></h2><Buttons values={["rigid","fisheye","pinch"] as const} selected={deformMode} onSelect={changeDeformation}/><div className="gd-controls">{(["deformAmount","deformFrequency","deformFlow"] as Param[]).map(control)}</div><p>{deformMode==="fisheye"?"Convex glass: each delayed cell magnifies through its own lens.":deformMode==="pinch"?"Concave glass: each delayed cell compresses through its own lens.":"No per-cell optical refraction."} The lens stays responsive at dense grids without folding the image. Rigid disables per-cell refraction; Global Lens controls the entire composition independently.</p></div><div className="gd-block gd-module"><h2><span>06 / RENDERING</span><span className="gd-module-led">●</span></h2><Buttons values={["balanced","sharp","fluid"] as const} selected={quality} onSelect={changeQuality}/><p>Fluid is the default for smoother temporal sampling. Balanced and Sharp remain available for comparison. Changing quality restarts the history buffer.</p></div><div className="gd-block gd-module"><h2><span>07 / GLOBAL LENS</span><span className="gd-module-led">●</span></h2><div className="gd-grid-link"><label><input type="checkbox" checked={globalLens.enabled} onChange={e=>changeGlobalLens({enabled:e.target.checked})}/><span>Apply lens to entire delayed grid</span></label></div>{globalLens.enabled&&<><Buttons values={["fisheye","pinch"] as const} selected={globalLens.mode} onSelect={mode=>changeGlobalLens({mode})}/><div className="gd-controls"><GridDelayKnob name="Strength" value={globalLens.strength} min={0} max={100} step={1} unit="%" onChange={strength=>changeGlobalLens({strength})}/><GridDelayKnob name="Lens size" value={globalLens.size} min={15} max={150} step={1} unit="%" onChange={size=>changeGlobalLens({size})}/><GridDelayKnob name="Growth" value={globalLens.growth} min={0} max={3} step={.05} unit="×" onChange={growth=>changeGlobalLens({growth})}/></div><p>The lens expands and contracts smoothly across the entire delayed image. Set growth to 0 for a stationary lens.</p></>}</div><div className="gd-block gd-module"><h2><span>08 / FEEDBACK</span><span className="gd-module-led">●</span></h2><div className="gd-grid-link"><label><input type="checkbox" checked={feedback.enabled} onChange={e=>changeFeedback({enabled:e.target.checked})}/><span>Enable output feedback</span></label></div>{feedback.enabled&&<><div className="gd-controls"><GridDelayKnob name="Amount" value={feedback.amount} min={0} max={100} step={1} unit="%" onChange={amount=>changeFeedback({amount})}/><GridDelayKnob name="Persistence" value={feedback.decay} min={0} max={100} step={1} unit="%" onChange={decay=>changeFeedback({decay})}/><GridDelayKnob name="Refresh" value={feedback.refresh} min={16} max={500} step={1} unit="ms" onChange={refresh=>changeFeedback({refresh})}/></div><label className="gd-select-label">Feedback blend<select value={feedback.blend} onChange={e=>changeFeedback({blend:e.target.value as BlendMode})}>{blendModes.map(mode=><option key={mode} value={mode}>{mode}</option>)}</select></label><p>Output feedback accumulates previous composite frames. Separate from source time-delay history; modulation controls amount, decay and refresh.</p></>}</div></div>}
   {tab==="patch"&&<><div className="gd-block gd-module gd-bpm-module"><h2><span>TRANSPORT / MASTER CLOCK</span><span className="gd-module-led">●</span></h2><div className="gd-controls gd-one-knob"><GridDelayKnob name="Tempo" value={bpm} min={40} max={240} step={1} unit="BPM" onChange={changeBpm}/></div></div><GridDelayPatchBay waves={osc} patches={patches} gains={patchGains} bpm={bpm} onWaves={changeWaves} onPatches={changePatches} onGain={changePatchGain}/></>}

  </aside>}
  </div><footer className="gd-footer"><span>TIME AS MATERIAL / TYPE · IMAGE · MOTION</span><span>WEBGL2 / BUILD 03</span></footer>
 </main>;
}
