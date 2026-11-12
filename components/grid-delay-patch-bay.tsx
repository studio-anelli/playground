"use client";
import {useEffect,useRef,useState,type CSSProperties,type DragEvent} from "react";

export type DelayTarget="positionX"|"positionY"|"rotation"|"scale"|"delay"|"spacing"|"amplitude"|"speed"|"columns"|"rows"|"inkHue"|"bgHue"|"blendMode"|"deformAmount"|"deformFrequency"|"deformFlow";
export type DelayWave={shape:"sine"|"triangle"|"square"|"noise"|"ramp";rate:number;depth:number;phase:number;enabled:boolean};
export type DelayPatch={id:string;wave:number;target:DelayTarget;amount:number};
const targets:DelayTarget[]=["positionX","positionY","rotation","scale","delay","spacing","amplitude","speed","columns","rows","inkHue","bgHue","blendMode","deformAmount","deformFrequency","deformFlow"];
const labels:Record<DelayTarget,string>={positionX:"Position X",positionY:"Position Y",rotation:"Rotation",scale:"Source scale",delay:"Time delay",spacing:"Grid spacing",amplitude:"Motion range",speed:"Motion speed",columns:"Grid columns",rows:"Grid rows",inkHue:"Font color / Hue",bgHue:"Background / Hue",blendMode:"Blend mode",deformAmount:"Deform amount",deformFrequency:"Deform frequency",deformFlow:"Deform flow"};
const colors=["#e9ad73","#91b4ea","#c2b7e9"];
type Props={waves:DelayWave[];patches:DelayPatch[];onWaves:(w:DelayWave[])=>void;onPatches:(p:DelayPatch[])=>void};
type Point={x:number;y:number};
export default function GridDelayPatchBay({waves,patches,onWaves,onPatches}:Props){
 const surface=useRef<HTMLDivElement>(null),nodes=useRef<Record<string,HTMLButtonElement|null>>({});
 const [geometry,setGeometry]=useState<Record<string,Point>>({}),[armed,setArmed]=useState<number|null>(null),[drag,setDrag]=useState<{wave:number;point:Point}|null>(null);
 const [compact,setCompact]=useState(false);
 function updateWave(i:number,key:keyof DelayWave,value:number|string|boolean){onWaves(waves.map((w,j)=>j===i?{...w,[key]:value}:w))}
 function connect(wave:number,target:DelayTarget){const found=patches.find(p=>p.wave===wave&&p.target===target);if(!found)onPatches([...patches,{id:"c"+wave+"-"+target,wave,target,amount:55}]);setArmed(null);setDrag(null)}
 function measure(){
  const b=surface.current?.getBoundingClientRect();if(!b)return;
  const positions:Record<string,Point>={};
  for(const [key,node] of Object.entries(nodes.current)){if(!(node instanceof HTMLElement))continue;const r=node.getBoundingClientRect();positions[key]={x:r.left-b.left+r.width/2,y:r.top-b.top+r.height/2}}
  setGeometry(positions);
 }
 useEffect(()=>{const el=surface.current;if(!el)return;const ro=new ResizeObserver(measure);ro.observe(el);el.addEventListener("scroll",measure,true);measure();return()=>{ro.disconnect();el.removeEventListener("scroll",measure,true)}},[waves.length,patches.length,compact]);
 const setNode=(key:string)=>(el:HTMLButtonElement|null)=>{nodes.current[key]=el};
 const handleDrag=(e:DragEvent<HTMLElement>,i:number)=>{e.dataTransfer.setData("text/plain","gd-wave:"+i);e.dataTransfer.effectAllowed="copy";setArmed(i)};
 return <div className="gd-patch-machine">
   <div className="gd-bay-head"><span>MODULATION PATCH BAY</span><button type="button" onClick={()=>{onPatches([]);setArmed(null)}} disabled={!patches.length}>CLEAR CABLES</button></div>
   <p className="gd-bay-help">Drag an output to an input, or click two sockets to connect. Multiple generators may modulate one parameter.</p>
   <div ref={surface} className="gd-bay-board" onPointerMove={e=>{if(drag&&surface.current){const r=surface.current.getBoundingClientRect();setDrag({...drag,point:{x:e.clientX-r.left,y:e.clientY-r.top}})}}} onPointerUp={()=>setDrag(null)}>
     <svg className="gd-cables" aria-hidden="true"><defs>{colors.map((color,i)=><linearGradient id={"gd-cable-gradient-"+i} key={i}><stop stopColor={color}/><stop offset="1" stopColor={color} stopOpacity=".7"/></linearGradient>)}</defs>
      {patches.map(p=>{const a=geometry["w"+p.wave],b=geometry["t"+p.target];if(!a||!b)return null;const bend=Math.max(35,Math.abs(b.x-a.x)*.46);return <path key={p.id} d={`M ${a.x} ${a.y} C ${a.x+bend} ${a.y}, ${b.x-bend} ${b.y}, ${b.x} ${b.y}`} stroke={colors[p.wave]} strokeWidth={1.5+Math.abs(p.amount)/100*1.6} fill="none" opacity=".9"/>})}
      {drag&&geometry["w"+drag.wave]&&<path d={`M ${geometry["w"+drag.wave].x} ${geometry["w"+drag.wave].y} Q ${(geometry["w"+drag.wave].x+drag.point.x)/2} ${drag.point.y} ${drag.point.x} ${drag.point.y}`} stroke={colors[drag.wave]} strokeDasharray="4 5" strokeWidth="2" fill="none"/>}
     </svg>
     <div className="gd-bay-columns">
      <div className="gd-bay-sources"><div className="gd-bay-caption">SIGNAL GENERATORS</div>{waves.map((w,i)=><div className="gd-wave-unit" key={i} style={{"--wave-color":colors[i]} as CSSProperties}>
       <div className="gd-wave-title"><label><input type="checkbox" checked={w.enabled} onChange={e=>updateWave(i,"enabled",e.target.checked)}/> WAVE {i+1}</label><button type="button" className={"gd-port gd-output"+(armed===i?" armed":"")} ref={setNode("w"+i)} title={"Connect Wave "+(i+1)} aria-label={"Patch Wave "+(i+1)+" output"} draggable onDragStart={e=>handleDrag(e,i)} onDragEnd={()=>setArmed(null)} onClick={()=>setArmed(armed===i?null:i)} onPointerDown={e=>{if(e.pointerType==="touch"||e.pointerType==="pen"){const r=surface.current?.getBoundingClientRect();if(r)setDrag({wave:i,point:{x:e.clientX-r.left,y:e.clientY-r.top}})}}}>●</button></div>
       <select value={w.shape} aria-label={"Wave "+(i+1)+" shape"} onChange={e=>updateWave(i,"shape",e.target.value)}>{["sine","triangle","square","noise","ramp"].map(shape=><option key={shape} value={shape}>{shape}</option>)}</select>
       <div className="gd-wave-ctrl"><label>RATE <output>{w.rate.toFixed(2)} Hz</output><input type="range" min=".01" max="4" step=".01" value={w.rate} onChange={e=>updateWave(i,"rate",Number(e.target.value))}/></label><label>DEPTH <output>{w.depth}%</output><input type="range" min="0" max="100" value={w.depth} onChange={e=>updateWave(i,"depth",Number(e.target.value))}/></label></div>
       </div>)}</div>
      <div className="gd-bay-targets"><div className="gd-bay-caption">DESTINATIONS</div>{targets.map(target=><div className={"gd-target"+(armed!==null?" gd-target-ready":"")} key={target} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const raw=e.dataTransfer.getData("text/plain");if(raw.startsWith("gd-wave:")){const i=Number(raw.slice(8));if(Number.isInteger(i)&&i>=0&&i<waves.length)connect(i,target)}}}><button type="button" ref={setNode("t"+target)} className="gd-port gd-input" title={"Connect to "+labels[target]} aria-label={"Patch input "+labels[target]} onClick={()=>{if(armed!==null)connect(armed,target)}} onPointerUp={()=>{if(drag)connect(drag.wave,target)}}>●</button><span>{labels[target]}</span><small>{patches.filter(p=>p.target===target).length||""}</small></div>)}</div>
     </div>
   </div>
   <div className="gd-connections-head"><span>CABLES / {patches.length}</span><button type="button" onClick={()=>setCompact(v=>!v)}>{compact?"SHOW ALL":"COMPACT"}</button></div>
   {!compact&&<div className="gd-connection-list">{patches.length===0?<p>No cables connected. Connect a wave output to a destination.</p>:patches.map(p=><div className="gd-connection" key={p.id}><span style={{color:colors[p.wave]}}>●</span><span className="gd-connection-name">W{p.wave+1} → {labels[p.target]}</span><label><input type="range" min="-100" max="100" step="1" value={p.amount} aria-label={"Modulation amount "+labels[p.target]} onChange={e=>onPatches(patches.map(q=>q.id===p.id?{...q,amount:Number(e.target.value)}:q))}/><output>{p.amount}%</output></label><button type="button" title="Disconnect cable" aria-label={"Disconnect Wave "+(p.wave+1)+" from "+labels[p.target]} onClick={()=>onPatches(patches.filter(q=>q.id!==p.id))}>×</button></div>)}</div>}
  </div>;
}
