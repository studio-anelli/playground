"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";

type Shape="matrix"|"horizontal"|"vertical"|"repeater";
type Pattern="uniform"|"peak"|"valley"|"ascending"|"descending";
type Motion="invert"|"pulse"|"drift"|"none";
type Config={shape:Shape;patternX:Pattern;patternY:Pattern;blend:"average"|"multiply"|"x"|"y";columns:number;rows:number;copies:number;direction:"horizontal"|"vertical";spacingX:number;spacingY:number;minSize:number;maxSize:number;overlap:number;offsetX:number;offsetY:number;scrollStrength:number;pointerStrength:number;pointerRadius:number;motion:Motion;speed:number;ease:number;foreground:string;background:string;transparent:boolean;width:number;height:number;videoDuration:number;fps:number};
type Dot={x:number;y:number;radius:number;endRadius:number};
const initial:Config={shape:"matrix",patternX:"peak",patternY:"peak",blend:"average",columns:9,rows:11,copies:5,direction:"horizontal",spacingX:82,spacingY:82,minSize:8,maxSize:39,overlap:28,offsetX:0,offsetY:10,scrollStrength:100,pointerStrength:70,pointerRadius:165,motion:"invert",speed:1,ease:0.085,foreground:"#F16A37",background:"#507568",transparent:false,width:1080,height:1080,videoDuration:6,fps:30};
const presets:Record<string,Partial<Config>>={
 "DURF / Matrix":{...initial},
 "CTA / Bubble bands":{shape:"repeater",direction:"horizontal",patternX:"uniform",copies:5,columns:7,rows:5,minSize:7,maxSize:69,spacingX:67,spacingY:53,overlap:46,foreground:"#F16A37",background:"#DD8EB9",motion:"invert"},
 "Uniform / Interactive":{shape:"matrix",columns:12,rows:12,patternX:"uniform",patternY:"uniform",minSize:13,maxSize:27,overlap:0,pointerStrength:180,foreground:"#F16A37",background:"#507568",motion:"none"},
 "Ascending / Column":{shape:"vertical",columns:1,rows:12,patternY:"ascending",minSize:8,maxSize:66,foreground:"#DD8EB9",background:"#F16A37"},
 "Valley / Ribbon":{shape:"horizontal",columns:12,rows:1,patternX:"valley",minSize:10,maxSize:75,foreground:"#F16A37",background:"#F8F4EC"}
};
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const number=(v:number)=>Number.isFinite(v)?v:0;
const hex=(value:string)=>/^#[0-9A-F]{6}$/i.test(value)?value:"#F16A37";
function curve(p:Pattern,t:number,offset=0){const z=t-(offset/100)*0.5;if(p==="uniform")return .5;if(p==="ascending")return clamp(z,0,1);if(p==="descending")return 1-clamp(z,0,1);if(p==="peak")return clamp(1-Math.abs(z-.5)*2,0,1);return clamp(Math.abs(z-.5)*2,0,1)}
function buildDots(c:Config):Dot[]{
 const dots:Dot[]=[];
 const cols=c.shape==="vertical"?1:c.shape==="horizontal"?c.columns:c.columns;
 const rows=c.shape==="horizontal"?1:c.shape==="vertical"?c.rows:c.shape==="repeater"?c.copies:c.rows;
 const padding=Math.max(c.maxSize*(1+c.overlap/100),20)+8;
 const dx=(c.width-2*padding)/Math.max(1,cols-1);
 const dy=(c.height-2*padding)/Math.max(1,rows-1);
 const gapX=c.spacingX/100,gapY=c.spacingY/100;
 const gridWidth=(cols-1)*dx*gapX,gridHeight=(rows-1)*dy*gapY;
 const x0=(c.width-gridWidth)/2,y0=(c.height-gridHeight)/2;
 const size=(z:number)=>Math.max(1,c.minSize+(c.maxSize-c.minSize)*clamp(z,0,1))*(1+c.overlap/100);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const tx=cols>1?x/(cols-1):.5,ty=rows>1?y/(rows-1):.5;
   const px=curve(c.patternX,tx,c.offsetX),py=curve(c.patternY,ty,c.offsetY);
   let k=c.blend==="multiply"?px*py:c.blend==="x"?px:c.blend==="y"?py:(px+py)/2;
   if(c.shape==="horizontal")k=px;
   if(c.shape==="vertical")k=py;
   if(c.shape==="repeater"){
     const progression=rows>1?1-y/(rows-1):1;
     const rowCurve=c.patternY==="uniform"?progression:py;
     const axis=c.direction==="vertical"?curve(c.patternX,ty,c.offsetX):px;
     k=c.patternX==="uniform"?rowCurve:.55*axis+.45*rowCurve;
   }
   const a=size(k),b=c.shape==="repeater"?size(1-k):size(1-k);
   const cx=c.shape==="repeater"&&c.direction==="vertical"?x0+y*dy*gapY:x0+x*dx*gapX;
   const cy=c.shape==="repeater"&&c.direction==="vertical"?y0+x*dx*gapX:y0+y*dy*gapY;
   dots.push({x:cx,y:cy,radius:a,endRadius:b});
 }
 return dots;
}
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
function svgString(dots:Dot[],c:Config){const bg=c.transparent?"":'<rect width="100%" height="100%" fill="'+hex(c.background)+'"/>';return '<svg xmlns="http://www.w3.org/2000/svg" width="'+c.width+'" height="'+c.height+'" viewBox="0 0 '+c.width+' '+c.height+'">'+bg+'<g fill="'+hex(c.foreground)+'">'+dots.map(d=>'<circle cx="'+d.x.toFixed(3)+'" cy="'+d.y.toFixed(3)+'" r="'+d.radius.toFixed(3)+'"/>').join("")+'</g></svg>'}
function Labeled({name,value,min,max,step=1,onChange,unit=""}:{name:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void;unit?:string}){return <label className="dd-range"><span>{name}<b>{value}{unit}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function Select({label,value,options,onChange}:{label:string;value:string;options:string[];onChange:(v:string)=>void}){return <label className="dd-select"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>}
const css=`
.dd{min-height:100vh;background:#eeeae3;color:#1c1d1b;font-family:Arial,Helvetica,sans-serif;--bd:#cfcbc3}
.dd *{box-sizing:border-box}.dd-head{min-height:68px;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;padding:14px 25px;gap:18px;border-bottom:1px solid var(--bd)}.dd-head a{justify-self:start;position:relative;z-index:2;display:inline-flex;align-items:center;min-height:40px;padding:8px 10px;margin-left:-10px;color:inherit;text-decoration:none;font-size:12px;cursor:pointer}.dd-head a:hover{text-decoration:underline}.dd-head h1{justify-self:center;text-align:center;font-size:19px;line-height:1.1;font-weight:600;margin:0}.dd-badge{justify-self:end;text-align:right;font-size:11px;opacity:.6}@media(max-width:560px){.dd-head{padding:10px 15px;gap:8px}.dd-head h1{font-size:14px}.dd-head a,.dd-badge{font-size:10px}}
.dd-shell{display:grid;grid-template-columns:minmax(0,1fr) 325px;min-height:calc(100vh - 68px)}.dd-main{min-width:0;display:flex;flex-direction:column;gap:12px;padding:18px}.dd-view{position:relative;display:grid;place-items:center;flex:1;min-height:430px;overflow:hidden;background:#507568}.dd-view svg{display:block;width:min(100%,min(75vh,900px));max-height:calc(100vh - 200px);height:auto;touch-action:none;cursor:crosshair}.dd-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.dd-button{border:1px solid #888781;background:transparent;color:inherit;padding:9px 11px;font-size:12px;cursor:pointer}.dd-button:hover{background:#242521;color:#fff}.dd-button.primary{background:#25231F;color:#fff}.dd-button:disabled{opacity:.45;cursor:not-allowed}.dd-actions .dd-spacer{flex:1}.dd-sidebar{border-left:1px solid var(--bd);max-height:calc(100vh - 68px);overflow:auto;padding:17px 16px}.dd-section{border-bottom:1px solid var(--bd);padding:12px 0}.dd-section summary{cursor:pointer;font-size:13px;font-weight:600;padding:4px 0 9px;list-style:none;display:flex;justify-content:space-between}.dd-section summary:after{content:"+"}.dd-section[open] summary:after{content:"−"}.dd-controls{display:grid;gap:14px;padding:7px 0 13px}.dd-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dd-range{display:grid;gap:7px}.dd-range span{display:flex;justify-content:space-between;font-size:11px;gap:6px}.dd-range b{font-weight:500;color:#6d6d67}.dd-range input{width:100%;accent-color:#25231F}.dd-select{display:grid;gap:7px;font-size:11px}.dd-select select{width:100%;border:1px solid var(--bd);background:#f7f4ed;padding:9px 5px;font-size:12px;color:#25231F}.dd-check{font-size:12px;display:flex;gap:8px;align-items:center}.dd-color{display:flex;align-items:center;justify-content:space-between;font-size:11px}.dd-color input{width:55px;height:34px;cursor:pointer;border:0;padding:0;background:transparent}.dd-footnote{font-size:11px;line-height:1.5;color:#6c6c65}.dd-progress{display:flex;align-items:center;gap:10px;font-size:11px}.dd-progress input{flex:1;accent-color:#25231F}.dd-error{font-size:12px;color:#9b3a20}
@media(max-width:850px){.dd-shell{grid-template-columns:1fr}.dd-sidebar{max-height:none;border-left:0;border-top:1px solid var(--bd)}.dd-main{min-height:520px}.dd-view{min-height:350px}.dd-head{padding:12px 15px}}
`;
export default function DurfDotsLab(){
 const [cfg,setCfg]=useState<Config>(initial);
 const [preset,setPreset]=useState("DURF / Matrix");
 const [playing,setPlaying]=useState(true);
 const [phase,setPhase]=useState(0);
 const [recording,setRecording]=useState(false);
 const [message,setMessage]=useState("");
 const [pointer,setPointer]=useState({x:0,y:0,active:false});
 const cfgRef=useRef(cfg),phaseRef=useRef(phase),pointerRef=useRef(pointer),playingRef=useRef(playing),request=useRef(0),last=useRef(0),svgRef=useRef<SVGSVGElement>(null);
 useEffect(()=>{cfgRef.current=cfg},[cfg]);useEffect(()=>{phaseRef.current=phase},[phase]);useEffect(()=>{pointerRef.current=pointer},[pointer]);useEffect(()=>{playingRef.current=playing},[playing]);
 useEffect(()=>{last.current=performance.now();const tick=(now:number)=>{const delta=Math.min(.1,(now-last.current)/1000);last.current=now;if(playingRef.current)setPhase(p=>(p+delta/8)%1);request.current=requestAnimationFrame(tick)};request.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(request.current)},[]);
 const dots=useMemo(()=>buildDots(cfg),[cfg]);
 const visible=useMemo(()=>renderedDots(dots,cfg,phase,pointer),[dots,cfg,phase,pointer]);
 const set=<K extends keyof Config>(key:K,v:Config[K])=>{setCfg(p=>({...p,[key]:v}));};
 const applyPreset=(name:string)=>{setPreset(name);setCfg(p=>({...p,...presets[name]}))};
 const exportSvg=()=>saveBlob(new Blob([svgString(visible,cfg)],{type:"image/svg+xml;charset=utf-8"}),"durf-dots.svg");
 const exportPng=()=>{const cv=document.createElement("canvas");cv.width=cfg.width;cv.height=cfg.height;const ctx=cv.getContext("2d");if(!ctx)return;draw(ctx,visible,cfg);cv.toBlob(b=>b&&saveBlob(b,"durf-dots.png"),"image/png")};
 function draw(ctx:CanvasRenderingContext2D,arr:Dot[],c:Config){ctx.clearRect(0,0,c.width,c.height);if(!c.transparent){ctx.fillStyle=c.background;ctx.fillRect(0,0,c.width,c.height)}ctx.fillStyle=c.foreground;ctx.beginPath();arr.forEach(d=>{ctx.moveTo(d.x+d.radius,d.y);ctx.arc(d.x,d.y,d.radius,0,Math.PI*2)});ctx.fill()}
 const exportVideo=async()=>{
  if(recording)return;
  if(!("MediaRecorder" in window)||!HTMLCanvasElement.prototype.captureStream){setMessage("This browser cannot record canvas video. Try Chrome or Edge.");return}
  const c={...cfgRef.current};const arr=buildDots(c);const canvas=document.createElement("canvas");canvas.width=c.width;canvas.height=c.height;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  const mime=["video/mp4;codecs=avc1.42E01E","video/webm;codecs=vp9","video/webm"].find(s=>MediaRecorder.isTypeSupported(s));
  if(!mime){setMessage("No supported video format in this browser.");return}
  setRecording(true);setMessage("Recording a short motion loop…");
  const stream=canvas.captureStream(c.fps);const chunks:BlobPart[]=[];const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:9000000});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());saveBlob(new Blob(chunks,{type:mime}),"durf-dots."+(mime.startsWith("video/mp4")?"mp4":"webm"));setRecording(false);setMessage("Video ready.")};
  recorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());setRecording(false);setMessage("Recording failed; try another browser.")};
  const wasPlaying=playingRef.current;setPlaying(false);recorder.start(250);
  const start=performance.now();const duration=c.videoDuration*1000;const run=(now:number)=>{const t=clamp((now-start)/duration,0,1);draw(ctx,renderedDots(arr,c,t,{x:0,y:0,active:false}),c);if(t<1&&recorder.state==="recording")requestAnimationFrame(run);else if(recorder.state==="recording"){window.setTimeout(()=>{if(recorder.state==="recording")recorder.stop();setPlaying(wasPlaying)},100)}};requestAnimationFrame(run);
 };
 const onPointer=(e:React.PointerEvent<SVGSVGElement>)=>{const b=e.currentTarget.getBoundingClientRect();setPointer({x:(e.clientX-b.left)/b.width*cfg.width,y:(e.clientY-b.top)/b.height*cfg.height,active:true})};
 return <main className="dd"><style>{css}</style><header className="dd-head"><a href="/" aria-label="Back to Playground index">← BACK TO INDEX</a><h1>DURF / DOT SYSTEM</h1><span className="dd-badge">REC-11 · BETA</span></header>
 <div className="dd-shell"><div className="dd-main"><div className="dd-view" style={{background:cfg.transparent?"repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 50% / 24px 24px":cfg.background}}>
 <svg ref={svgRef} viewBox={`0 0 ${cfg.width} ${cfg.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Interactive dot composition" onPointerMove={onPointer} onPointerLeave={()=>setPointer(p=>({...p,active:false}))}>
 {visible.map((d,i)=><circle key={i} cx={number(d.x)} cy={number(d.y)} r={number(d.radius)} fill={cfg.foreground}/>)}</svg>
 </div><div className="dd-actions"><button className="dd-button" onClick={()=>setPlaying(p=>!p)}>{playing?"Ⅱ Pause":"▶ Play"}</button><button className="dd-button" onClick={()=>setPhase(0)}>↺ Reset</button><span className="dd-spacer"/><button className="dd-button" onClick={exportSvg}>Export SVG</button><button className="dd-button" onClick={exportPng}>PNG</button><button className="dd-button primary" disabled={recording} onClick={exportVideo}>{recording?"Recording…":"Record video"}</button></div>
 <div className="dd-progress"><span>PLAYHEAD</span><input type="range" min="0" max="1" step=".001" value={phase} onChange={e=>{setPlaying(false);setPhase(Number(e.target.value))}}/><span>{Math.round(phase*100)}%</span></div>{message&&<p className="dd-error" role="status">{message}</p>}
 </div>
 <aside className="dd-sidebar"><label className="dd-select"><span>PRESET</span><select value={preset} onChange={e=>applyPreset(e.target.value)}>{Object.keys(presets).map(k=><option key={k}>{k}</option>)}</select></label>
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
 <div className="dd-two"><Select label="Width" value={String(cfg.width)} options={["720","1080","1440","1920"]} onChange={v=>set("width",Number(v))}/><Select label="Height" value={String(cfg.height)} options={["720","1080","1440","1920"]} onChange={v=>set("height",Number(v))}/></div>
 <div className="dd-two"><Select label="Duration (seconds)" value={String(cfg.videoDuration)} options={["3","6","10","15"]} onChange={v=>set("videoDuration",Number(v))}/><Select label="Frame rate" value={String(cfg.fps)} options={["24","30","60"]} onChange={v=>set("fps",Number(v))}/></div>
 <p className="dd-footnote">SVG remains editable vector artwork. Video uses your browser's supported recording format (MP4 where available, otherwise WebM).</p></div></details>
 <p className="dd-footnote" style={{paddingTop:16}}>Independent Playground prototype. Nothing is connected to the WordPress plugin or the live DURF website.</p>
 </aside></div></main>;
}