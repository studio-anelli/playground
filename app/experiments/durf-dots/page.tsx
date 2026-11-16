"use client";
import {buildDots,type Config,type Dot,type Shape,type Pattern,type Motion} from "../../../lib/durf-dots/geometry";
import {exportBounds} from "../../../lib/durf-dots/export-bounds";
import {pngMovie} from "../../../lib/durf-dots/mov";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";

const initial:Config={shape:"matrix",patternX:"peak",patternY:"peak",blend:"average",columns:9,rows:11,copies:5,direction:"horizontal",spacingX:82,spacingY:82,minSize:8,maxSize:39,overlap:28,offsetX:0,offsetY:10,scrollStrength:100,pointerStrength:70,pointerRadius:165,motion:"invert",speed:1,ease:0.085,foreground:"#F16A37",background:"#507568",transparent:false,width:1080,height:1080,videoDuration:6,fps:30,exportCrop:false,exportPadding:16,exportScale:1};
const presets:Record<string,Partial<Config>>={
 "DURF / Matrix":{...initial},
 "CTA / Bubble bands":{shape:"repeater",direction:"horizontal",patternX:"uniform",copies:5,columns:7,rows:5,minSize:7,maxSize:69,spacingX:67,spacingY:53,overlap:46,foreground:"#F16A37",background:"#DD8EB9",motion:"invert"},
 "Uniform / Interactive":{shape:"matrix",columns:12,rows:12,patternX:"uniform",patternY:"uniform",minSize:13,maxSize:27,overlap:0,pointerStrength:180,foreground:"#F16A37",background:"#507568",motion:"none"},
 "Ascending / Column":{shape:"vertical",columns:1,rows:12,patternY:"ascending",minSize:8,maxSize:66,foreground:"#DD8EB9",background:"#F16A37"},
 "Valley / Ribbon":{shape:"horizontal",columns:12,rows:1,patternX:"valley",minSize:10,maxSize:75,foreground:"#F16A37",background:"#F8F4EC"}
};
function validateConfig(value:unknown):Config{
 if(!value||typeof value!=="object")throw new Error("Invalid settings");
 const input=value as Record<string,unknown>,result={...initial};
 const enums:Record<string,string[]>={shape:["matrix","horizontal","vertical","repeater"],patternX:["uniform","peak","valley","ascending","descending"],patternY:["uniform","peak","valley","ascending","descending"],blend:["average","multiply","x","y"],direction:["horizontal","vertical"],motion:["invert","pulse","drift","none"]};
 const ranges:Record<string,number[]>={columns:[1,25],rows:[1,25],copies:[1,16],spacingX:[20,150],spacingY:[20,150],minSize:[1,80],maxSize:[4,130],overlap:[0,200],offsetX:[-100,100],offsetY:[-100,100],scrollStrength:[0,100],pointerStrength:[0,200],pointerRadius:[0,800],speed:[.2,4],ease:[0,1],width:[720,1920],height:[720,1920],videoDuration:[3,15],fps:[24,60],exportPadding:[0,200],exportScale:[1,2]};
 for(const key of Object.keys(initial) as (keyof Config)[]){const v=input[key];if(v===undefined)continue;if(enums[key]){if(typeof v!=="string"||!enums[key].includes(v))throw new Error("Invalid option")}else if(ranges[key]){const [lo,hi]=ranges[key];if(typeof v!=="number"||!Number.isFinite(v)||v<lo||v>hi||(["width","height","columns","rows","copies","fps","exportScale"].includes(key)&&!Number.isInteger(v)))throw new Error("Invalid number")}else if(key==="transparent"||key==="exportCrop"){if(typeof v!=="boolean")throw new Error("Invalid transparency")}else if(typeof v!=="string"||!/^#[0-9a-f]{6}$/i.test(v))throw new Error("Invalid colour");Object.assign(result,{[key]:v})}
 return result;
}
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const number=(v:number)=>Number.isFinite(v)?v:0;
const hex=(value:string)=>/^#[0-9A-F]{6}$/i.test(value)?value:"#F16A37";
function ease(t:number){return t*t*(3-2*t)}
function renderedDots(dots:Dot[],c:Config,phase:number,pointer:{x:number;y:number;active:boolean}):Dot[]{
 const t=c.motion==="invert"?ease((Math.sin(phase*Math.PI*2*c.speed-Math.PI/2)+1)/2):c.motion==="pulse"?ease((Math.sin(phase*Math.PI*2*c.speed)+1)/2):0;
 const dx=c.motion==="drift"?Math.sin(phase*2*Math.PI*c.speed)*26:0;
 return dots.map(d=>{
  let r=c.motion==="none"||c.motion==="drift"?d.radius:d.radius+(d.endRadius-d.radius)*t*c.scrollStrength/100;
  if(pointer.active&&c.pointerStrength>0){
   const dist=Math.hypot(d.x+dx-pointer.x,d.y-pointer.y),fall=Math.exp(-Math.pow(dist/Math.max(1,c.pointerRadius),2));
   r+=c.pointerStrength/100*Math.max(5,c.maxSize)*fall;
  }
  return {...d,x:d.x+dx,radius:Math.max(.2,r)};
 });
}
function saveBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),5000)}
function svgString(dots:Dot[],c:Config){const box=exportBounds(buildDots(c),c);const bg=c.transparent?"":`<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${hex(c.background)}"/>`;return `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">${bg}<g fill="${hex(c.foreground)}">`+dots.map(d=>`<circle cx="${d.x.toFixed(3)}" cy="${d.y.toFixed(3)}" r="${d.radius.toFixed(3)}"/>`).join("")+"</g></svg>"}

function Labeled({name,value,min,max,step=1,onChange,unit=""}:{name:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void;unit?:string}){return <label className="dd-range"><span>{name}<b>{value}{unit}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function Select({label,value,options,onChange}:{label:string;value:string;options:string[];onChange:(v:string)=>void}){return <label className="dd-select"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>}
const css=`
.dd{min-height:100vh;background:#eeeae3;color:#1c1d1b;font-family:Arial,Helvetica,sans-serif;--bd:#cfcbc3}
.dd *{box-sizing:border-box}.dd-head{min-height:68px;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;padding:14px 25px;gap:18px;border-bottom:1px solid var(--bd)}.dd-head a{justify-self:start;position:relative;z-index:2;display:inline-flex;align-items:center;min-height:40px;padding:8px 10px;margin-left:-10px;color:inherit;text-decoration:none;font-size:12px;cursor:pointer}.dd-head a:hover{text-decoration:underline}.dd-head h1{justify-self:center;text-align:center;font-size:19px;line-height:1.1;font-weight:600;margin:0}.dd-badge{justify-self:end;text-align:right;font-size:11px;opacity:.6}@media(max-width:560px){.dd-head{padding:10px 15px;gap:8px}.dd-head h1{font-size:14px}.dd-head a,.dd-badge{font-size:10px}}
.dd-shell{display:grid;grid-template-columns:minmax(0,1fr) 325px;min-height:calc(100vh - 68px)}.dd-main{min-width:0;display:flex;flex-direction:column;gap:12px;padding:18px}.dd-view{position:relative;display:grid;place-items:center;flex:1;min-height:430px;overflow:hidden;background:#d7d3cc;padding:52px 24px 24px}.dd-view svg{display:block;max-width:100%;height:auto;flex-shrink:0;touch-action:none;cursor:crosshair;box-shadow:0 0 0 1px #fff,0 0 0 2px #555,0 8px 28px #0002}.dd-canvas-info{position:absolute;top:16px;left:20px;right:20px;display:flex;gap:12px;justify-content:space-between;align-items:center;font-size:11px}.dd-canvas-info strong{font-weight:500;letter-spacing:.05em}.dd-canvas-info button{padding:5px 8px}.dd-canvas-warning{color:#913418}.dd-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.dd-button{border:1px solid #888781;background:transparent;color:inherit;padding:9px 11px;font-size:12px;cursor:pointer}.dd-button:hover{background:#242521;color:#fff}.dd-button.primary{background:#25231F;color:#fff}.dd-button:disabled{opacity:.45;cursor:not-allowed}.dd-actions .dd-spacer{flex:1}.dd-sidebar{border-left:1px solid var(--bd);max-height:calc(100vh - 68px);overflow:auto;padding:17px 16px}.dd-section{border-bottom:1px solid var(--bd);padding:12px 0}.dd-section summary{cursor:pointer;font-size:13px;font-weight:600;padding:4px 0 9px;list-style:none;display:flex;justify-content:space-between}.dd-section summary:after{content:"+"}.dd-section[open] summary:after{content:"−"}.dd-controls{display:grid;gap:14px;padding:7px 0 13px}.dd-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dd-range{display:grid;gap:7px}.dd-range span{display:flex;justify-content:space-between;font-size:11px;gap:6px}.dd-range b{font-weight:500;color:#6d6d67}.dd-range input{width:100%;accent-color:#25231F}.dd-select{display:grid;gap:7px;font-size:11px}.dd-select select{width:100%;border:1px solid var(--bd);background:#f7f4ed;padding:9px 5px;font-size:12px;color:#25231F}.dd-check{font-size:12px;display:flex;gap:8px;align-items:center}.dd-color{display:flex;align-items:center;justify-content:space-between;font-size:11px}.dd-color input{width:55px;height:34px;cursor:pointer;border:0;padding:0;background:transparent}.dd-footnote{font-size:11px;line-height:1.5;color:#6c6c65}.dd-progress{display:flex;align-items:center;gap:10px;font-size:11px}.dd-progress input{flex:1;accent-color:#25231F}.dd-error{font-size:12px;color:#9b3a20}
@media(max-width:850px){.dd-shell{grid-template-columns:1fr}.dd-sidebar{max-height:none;border-left:0;border-top:1px solid var(--bd)}.dd-main{min-height:520px}.dd-view{min-height:350px}.dd-head{padding:12px 15px}}
`;
export default function DurfDotsLab(){
 const [cfg,setCfg]=useState<Config>(initial);
 const [preset,setPreset]=useState("DURF / Matrix");
 const [saved,setSaved]=useState<Record<string,Config>>({});
 const [presetName,setPresetName]=useState("");
 const [storageReady,setStorageReady]=useState(false);
 const importRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{try{const raw=localStorage.getItem("durf-dots-presets-v1");if(raw){const data=JSON.parse(raw);const clean:Record<string,Config>={};for(const [name,value] of Object.entries(data))clean[name]=validateConfig(value);setSaved(clean)}}catch{setMessage("Saved presets could not be loaded. Import a JSON backup to restore them.")}setStorageReady(true)},[]);
 useEffect(()=>{if(storageReady)try{localStorage.setItem("durf-dots-presets-v1",JSON.stringify(saved))}catch{setMessage("Browser storage is unavailable. Export JSON to keep your preset.")}},[saved,storageReady]);
 const savePreset=()=>{const name=presetName.trim();if(!name){setMessage("Give this version a name first.");return}if(Object.hasOwn(saved,name)&&!window.confirm(`Replace “${name}”?`))return;setSaved(p=>({...p,[name]:{...cfg}}));setMessage(`Saved “${name}”. Export JSON for a portable backup.`)};
 const exportPreset=()=>saveBlob(new Blob([JSON.stringify({format:"durf-dots",version:1,name:presetName.trim()||preset,config:cfg},null,2)],{type:"application/json"}),"durf-dots-"+(presetName.trim()||"preset").replace(/[^a-z0-9_-]+/gi,"-")+".json");
 const importPreset=async(file:File)=>{try{const data=JSON.parse(await file.text());if(data.format!=="durf-dots"||data.version!==1)throw new Error();const config=validateConfig(data.config);setCfg(config);setPresetName(typeof data.name==="string"?data.name.slice(0,120):"Imported preset");setMessage("Imported. Save under a name to keep it in this browser.")}catch{setMessage("Choose a valid DURF dots JSON preset.")}};
 const [playing,setPlaying]=useState(true);
 const [phase,setPhase]=useState(0);
 const [recording,setRecording]=useState(false);
 const [message,setMessage]=useState("");
 const [pointer,setPointer]=useState({x:0,y:0,active:false});
 const cfgRef=useRef(cfg),phaseRef=useRef(phase),pointerRef=useRef(pointer),playingRef=useRef(playing),request=useRef(0),last=useRef(0),svgRef=useRef<SVGSVGElement>(null);
 useEffect(()=>{cfgRef.current=cfg},[cfg]);useEffect(()=>{phaseRef.current=phase},[phase]);useEffect(()=>{pointerRef.current=pointer},[pointer]);useEffect(()=>{playingRef.current=playing},[playing]);
 useEffect(()=>{last.current=performance.now();const tick=(now:number)=>{const delta=Math.min(.1,(now-last.current)/1000);last.current=now;if(playingRef.current)setPhase(p=>(p+delta/8)%1);request.current=requestAnimationFrame(tick)};request.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(request.current)},[]);
 const dots=useMemo(()=>buildDots(cfg),[cfg]);
 const exportBox=useMemo(()=>exportBounds(dots,cfg),[dots,cfg]);
 const artworkBox=useMemo(()=>exportBounds(dots,{...cfg,exportCrop:true,exportPadding:0}),[dots,cfg]);
 const clipsArtwork=!cfg.exportCrop&&(artworkBox.x<0||artworkBox.y<0||artworkBox.x+artworkBox.width>cfg.width||artworkBox.y+artworkBox.height>cfg.height);
 const visible=useMemo(()=>renderedDots(dots,cfg,phase,pointer),[dots,cfg,phase,pointer]);
 const set=<K extends keyof Config>(key:K,v:Config[K])=>{setCfg(p=>({...p,[key]:v}));};
 const applyPreset=(name:string)=>{setPreset(name);setCfg(p=>({...p,...presets[name]}))};
 const exportSvg=()=>saveBlob(new Blob([svgString(visible,cfg)],{type:"image/svg+xml;charset=utf-8"}),"durf-dots.svg");
 const exportPng=()=>{const cv=document.createElement("canvas");const box=exportBounds(buildDots(cfg),cfg);cv.width=box.width*cfg.exportScale;cv.height=box.height*cfg.exportScale;const ctx=cv.getContext("2d");if(!ctx)return;draw(ctx,visible,cfg);cv.toBlob(b=>b&&saveBlob(b,cfg.exportScale===2?"durf-dots@2x.png":"durf-dots.png"),"image/png")};
 function draw(ctx:CanvasRenderingContext2D,arr:Dot[],c:Config){const box=exportBounds(buildDots(c),c);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);if(!c.transparent){ctx.fillStyle=c.background;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height)}ctx.save();ctx.scale(c.exportScale,c.exportScale);ctx.translate(-box.x,-box.y);ctx.fillStyle=c.foreground;ctx.beginPath();arr.forEach(d=>{ctx.moveTo(d.x+d.radius,d.y);ctx.arc(d.x,d.y,d.radius,0,Math.PI*2)});ctx.fill();ctx.restore()}
 const exportTransparentVideo=async(preview=false)=>{
  if(recording)return;
  const c={...cfgRef.current,transparent:true};const wasPlaying=playingRef.current;playingRef.current=false;setPlaying(false);if(preview){phaseRef.current=0;setPhase(0);setPointer({x:0,y:0,active:false})}setRecording(true);setMessage("Rendering transparent MOV…");
  try{
   const canvas=document.createElement("canvas");const box=exportBounds(buildDots(c),c);canvas.width=box.width*c.exportScale;canvas.height=box.height*c.exportScale;
   const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas unavailable");
   const arr=buildDots(c),frames:Uint8Array[]=[];const count=Math.round(c.videoDuration*c.fps);let size=0;const started=performance.now();
   for(let i=0;i<count;i++){
    if(preview){const delay=started+i*1000/c.fps-performance.now();if(delay>0)await new Promise(r=>setTimeout(r,delay));setPhase(i/count)}
    draw(ctx,renderedDots(arr,c,i/count,{x:0,y:0,active:false}),c);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Frame export failed")),"image/png"));
    size+=blob.size;if(size>512*1024*1024)throw new Error("Export too large. Reduce dimensions or duration.");
    frames.push(new Uint8Array(await blob.arrayBuffer()));
    if(i%10===0){setMessage(`Rendering transparent MOV: ${Math.round((i+1)/count*100)}%`);await new Promise(r=>setTimeout(r,0))}
   }
   saveBlob(pngMovie(frames,canvas.width,canvas.height,c.fps),c.exportScale===2?"durf-dots-transparent@2x.mov":"durf-dots-transparent.mov");setMessage("Transparent MOV ready. Test in Keynote over a coloured slide. Uses lossless PNG video, not ProRes.");
  }catch(e){setMessage(e instanceof Error?e.message:"Transparent export failed.")}finally{setRecording(false);setPlaying(wasPlaying);if(preview)setPhase(0)}
 };
 const exportVideo=async(preview=false)=>{
  if(cfgRef.current.transparent){await exportTransparentVideo(preview);return}
  if(recording)return;
  if(!("MediaRecorder" in window)||!HTMLCanvasElement.prototype.captureStream){setMessage("This browser cannot record canvas video. Try Chrome or Edge.");return}
  const c={...cfgRef.current};const arr=buildDots(c);const canvas=document.createElement("canvas");const box=exportBounds(buildDots(c),c);canvas.width=box.width*c.exportScale;canvas.height=box.height*c.exportScale;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  const mime=["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm"].find(s=>MediaRecorder.isTypeSupported(s));
  if(!mime){setMessage("No supported video format in this browser.");return}
  setRecording(true);setMessage("Recording a short motion loop…");
  const stream=canvas.captureStream(c.fps);const chunks:BlobPart[]=[];let recorder:MediaRecorder;
  try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:9000000*c.exportScale*c.exportScale})}catch{stream.getTracks().forEach(t=>t.stop());setRecording(false);setMessage("This browser cannot record at this resolution. Try 1× or a smaller canvas.");return}
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());saveBlob(new Blob(chunks,{type:mime}),(c.exportScale===2?"durf-dots@2x.":"durf-dots.")+(mime.startsWith("video/mp4")?"mp4":"webm"));setRecording(false);setMessage("Video ready.")};
  recorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());setRecording(false);setPlaying(wasPlaying);setMessage("Recording failed. Try 1×, a smaller canvas or another browser.")};
  const wasPlaying=playingRef.current;playingRef.current=false;setPlaying(false);if(preview){phaseRef.current=0;setPhase(0);setPointer({x:0,y:0,active:false})}draw(ctx,renderedDots(arr,c,0,{x:0,y:0,active:false}),c);try{recorder.start(250)}catch{stream.getTracks().forEach(t=>t.stop());setRecording(false);setPlaying(wasPlaying);setMessage("This browser cannot record at this resolution. Try 1× or a smaller canvas.");return}
  const start=performance.now();const duration=c.videoDuration*1000;const run=(now:number)=>{const t=clamp((now-start)/duration,0,1);if(preview)setPhase(t);draw(ctx,renderedDots(arr,c,t,{x:0,y:0,active:false}),c);if(t<1&&recorder.state==="recording")requestAnimationFrame(run);else if(recorder.state==="recording"){window.setTimeout(()=>{if(recorder.state==="recording")recorder.stop();setPlaying(wasPlaying);if(preview)setPhase(0)},100)}};requestAnimationFrame(run);
 };
 const onPointer=(e:React.PointerEvent<SVGSVGElement>)=>{if(recording)return;const b=e.currentTarget.getBoundingClientRect();setPointer({x:exportBox.x+(e.clientX-b.left)/b.width*exportBox.width,y:exportBox.y+(e.clientY-b.top)/b.height*exportBox.height,active:true})};
 return <main className="dd"><style>{css}</style><header className="dd-head"><a href="/" aria-label="Back to Playground index">← BACK TO INDEX</a><h1>●●●</h1><span className="dd-badge">REC-11 · BETA</span></header>
 <div className="dd-shell"><div className="dd-main"><div className="dd-view">
 <div className="dd-canvas-info"><strong>EXPORT · {exportBox.width*cfg.exportScale} × {exportBox.height*cfg.exportScale} PX · {cfg.exportScale}×</strong><span>{clipsArtwork&&<span className="dd-canvas-warning">Artwork extends outside canvas. </span>}<button className="dd-button" disabled={recording} onClick={()=>{set("exportCrop",!cfg.exportCrop);setPointer({x:0,y:0,active:false})}}>{cfg.exportCrop?"Full canvas":"Fit artwork"}</button></span></div>
 <svg ref={svgRef} width={exportBox.width} height={exportBox.height} style={{width:`min(100%, ${Math.min(900,Math.max(160,560*exportBox.width/exportBox.height))}px, calc((100vh - 285px) * ${exportBox.width/exportBox.height}))`,background:cfg.transparent?"repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 50% / 24px 24px":cfg.background}} viewBox={`${exportBox.x} ${exportBox.y} ${exportBox.width} ${exportBox.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Interactive dot composition" onPointerMove={onPointer} onPointerLeave={()=>setPointer(p=>({...p,active:false}))}>
 {visible.map((d,i)=><circle key={i} cx={number(d.x)} cy={number(d.y)} r={number(d.radius)} fill={cfg.foreground}/>)}</svg>
 </div><div className="dd-actions"><button className="dd-button" disabled={recording} onClick={()=>setPlaying(p=>!p)}>{playing?"Ⅱ Pause":"▶ Play"}</button><button className="dd-button" disabled={recording} onClick={()=>setPhase(0)}>↺ Reset</button><button className="dd-button primary" disabled={recording} onClick={()=>void exportVideo(true)}>● Rec &amp; play</button><span className="dd-spacer"/><button className="dd-button" onClick={exportSvg}>Export SVG</button><button className="dd-button" onClick={exportPng}>PNG</button><button className="dd-button primary" disabled={recording} onClick={()=>void exportVideo()}>{recording?"Exporting…":cfg.transparent?"Export transparent MOV":"Record video"}</button></div>
 <div className="dd-progress"><span>PLAYHEAD</span><input type="range" min="0" max="1" step=".001" disabled={recording} value={phase} onChange={e=>{setPlaying(false);setPhase(Number(e.target.value))}}/><span>{Math.round(phase*100)}%</span></div>{message&&<p className="dd-error" role="status">{message}</p>}
 </div>
 <aside className="dd-sidebar"><fieldset disabled={recording} style={{border:0,padding:0,margin:0,minWidth:0}}><details className="dd-section" open><summary>Client presets</summary><div className="dd-controls">
 <label className="dd-select"><span>Version name</span><input value={presetName} maxLength={120} placeholder="Client / v01" onChange={e=>setPresetName(e.target.value)}/></label>
 <button className="dd-button" onClick={savePreset}>Save current settings</button>
 {Object.keys(saved).length>0&&<><label className="dd-select"><span>Saved versions</span><select value="" onChange={e=>{const name=e.target.value;if(saved[name]){setCfg({...saved[name]});setPresetName(name);setMessage(`Loaded “${name}”.`)}}}><option value="" disabled>Load a version…</option>{Object.keys(saved).map(name=><option key={name}>{name}</option>)}</select></label><button className="dd-button" disabled={!Object.hasOwn(saved,presetName)} onClick={()=>{if(window.confirm(`Delete “${presetName}”?`))setSaved(p=>{const next={...p};delete next[presetName];return next})}}>Delete named version</button></>}
 <div className="dd-two"><button className="dd-button" onClick={exportPreset}>Export JSON</button><button className="dd-button" onClick={()=>importRef.current?.click()}>Import JSON</button></div>
 <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void importPreset(file);e.target.value=""}}/>
 <p className="dd-footnote">Includes composition, colours, motion and export settings. Browser presets stay on this device. Export JSON to archive a client version or move it to another computer.</p>
 </div></details><label className="dd-select"><span>PRESET</span><select value={preset} onChange={e=>applyPreset(e.target.value)}>{Object.keys(presets).map(k=><option key={k}>{k}</option>)}</select></label>
 <details className="dd-section" open><summary>01 / Composition</summary><div className="dd-controls"><Select label="Layout" value={cfg.shape} options={["matrix","horizontal","vertical","repeater"]} onChange={v=>set("shape",v as Shape)}/>
 {cfg.shape==="repeater"&&<Select label="Repeater direction" value={cfg.direction} options={["horizontal","vertical"]} onChange={v=>set("direction",v as Config["direction"])}/>}
 <div className="dd-two">{cfg.shape!=="vertical"&&<Labeled name={cfg.shape==="repeater"?"Dots / copy":"Columns"} value={cfg.columns} min={2} max={25} onChange={v=>set("columns",v)}/>}
 {cfg.shape==="repeater"?<Labeled name="Copies" value={cfg.copies} min={1} max={16} onChange={v=>set("copies",v)}/>:cfg.shape!=="horizontal"&&<Labeled name="Rows" value={cfg.rows} min={2} max={25} onChange={v=>set("rows",v)}/>}</div>
 <div className="dd-two"><Labeled name="Spacing X" value={cfg.spacingX} min={20} max={150} unit="%" onChange={v=>set("spacingX",v)}/><Labeled name="Spacing Y" value={cfg.spacingY} min={20} max={150} unit="%" onChange={v=>set("spacingY",v)}/></div>
 <Labeled name="Overlap" value={cfg.overlap} min={0} max={200} unit="%" onChange={v=>set("overlap",v)}/></div></details>
 <details className="dd-section" open><summary>02 / Pattern</summary><div className="dd-controls">
 <div className="dd-two"><Select label="Pattern X" value={cfg.patternX} options={["uniform","peak","valley","ascending","descending"]} onChange={v=>set("patternX",v as Pattern)}/><Select label="Pattern Y" value={cfg.patternY} options={["uniform","peak","valley","ascending","descending"]} onChange={v=>set("patternY",v as Pattern)}/></div>
 {cfg.shape==="matrix"&&<Select label="Combine axes" value={cfg.blend} options={["average","multiply","x","y"]} onChange={v=>set("blend",v as Config["blend"])}/>}
 <div className="dd-two"><Labeled name="Min radius" value={cfg.minSize} min={1} max={80} onChange={v=>set("minSize",v)}/><Labeled name="Max radius" value={cfg.maxSize} min={4} max={130} onChange={v=>set("maxSize",v)}/></div>
 <div className="dd-two"><Labeled name="Offset X" value={cfg.offsetX} min={-100} max={100} onChange={v=>set("offsetX",v)}/><Labeled name="Offset Y" value={cfg.offsetY} min={-100} max={100} onChange={v=>set("offsetY",v)}/></div>
 </div></details>
 <details className="dd-section"><summary>03 / Motion & interaction</summary><div className="dd-controls"><Select label="Motion" value={cfg.motion} options={["invert","pulse","drift","none"]} onChange={v=>set("motion",v as Motion)}/>
 <Labeled name="Speed" value={cfg.speed} min={.2} max={4} step={.1} onChange={v=>set("speed",v)}/>
 <Labeled name="Morph strength" value={cfg.scrollStrength} min={0} max={100} unit="%" onChange={v=>set("scrollStrength",v)}/>
 <Labeled name="Pointer radius" value={cfg.pointerRadius} min={0} max={800} unit="px" onChange={v=>set("pointerRadius",v)}/>
 <Labeled name="Pointer strength" value={cfg.pointerStrength} min={0} max={200} unit="%" onChange={v=>set("pointerStrength",v)}/>
 <p className="dd-footnote">Move your pointer over the artwork to influence nearby dots. Video renders the motion cycle without pointer input.</p></div></details>
 <details className="dd-section"><summary>04 / Appearance & export</summary><div className="dd-controls"><label className="dd-color">Dots <input type="color" value={hex(cfg.foreground)} onChange={e=>set("foreground",e.target.value)}/></label><label className="dd-color">Background <input type="color" value={hex(cfg.background)} onChange={e=>set("background",e.target.value)}/></label><label className="dd-check"><input type="checkbox" checked={cfg.transparent} onChange={e=>set("transparent",e.target.checked)}/>Transparent export background</label>
 <label className="dd-check"><input type="checkbox" checked={cfg.exportCrop} onChange={e=>set("exportCrop",e.target.checked)}/>Trim empty canvas on export</label>
 {cfg.exportCrop&&<Labeled name="Export padding" value={cfg.exportPadding} min={0} max={200} unit="px" onChange={v=>set("exportPadding",v)}/>}
 <p className="dd-footnote">The framed area is exactly what SVG, PNG and video export. Fit artwork trims empty space and includes the whole motion. Rec &amp; play restarts at 0% and records while the preview plays.</p>
 <div className="dd-two"><Select label="Width" value={String(cfg.width)} options={["720","1080","1440","1920"]} onChange={v=>set("width",Number(v))}/><Select label="Height" value={String(cfg.height)} options={["720","1080","1440","1920"]} onChange={v=>set("height",Number(v))}/></div>
 <label className="dd-select"><span>Export resolution</span><select value={cfg.exportScale} onChange={e=>set("exportScale",Number(e.target.value) as 1|2)}><option value={1}>1× · Standard</option><option value={2}>2× · Retina</option></select></label>
 <p className="dd-footnote">1 = standard · 2 = Retina. Doubles PNG and video dimensions while preserving the composition. SVG stays vector.</p>
 <div className="dd-two"><Select label="Duration (seconds)" value={String(cfg.videoDuration)} options={["3","6","10","15"]} onChange={v=>set("videoDuration",Number(v))}/><Select label="Frame rate" value={String(cfg.fps)} options={["24","30","60"]} onChange={v=>set("fps",Number(v))}/></div>
 <p className="dd-footnote">Transparent video uses lossless PNG-in-MOV with alpha. Test in your Keynote version before presenting. Opaque video uses MP4 or WebM. PNG and SVG also preserve transparency.</p></div></details>
 <p className="dd-footnote" style={{paddingTop:16}}>Independent Playground prototype. Nothing is connected to the WordPress plugin or the live DURF website.</p>
 </fieldset></aside></div></main>;
}