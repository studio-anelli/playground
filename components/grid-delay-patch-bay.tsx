"use client";
import {useEffect,useRef,useState,type CSSProperties,type DragEvent} from "react";
import GridDelayKnob from "./grid-delay-knob";

export type DelayTarget="positionX"|"positionY"|"rotation"|"scale"|"delay"|"spacing"|"amplitude"|"speed"|"columns"|"rows"|"inkHue"|"bgHue"|"blendMode"|"deformAmount"|"deformFrequency"|"deformFlow"|"globalStrength"|"globalSize"|"globalGrowth"|"blackHold"|"feedbackAmount"|"feedbackDecay"|"feedbackRefresh"|"feedbackBlend";
export const beatDivisions=["2 bars","1 bar","1/2","1/4","1/8","1/16","1/32","1/4 dotted","1/8 dotted","1/16 dotted","1/4 triplet","1/8 triplet","1/16 triplet"] as const;
export type BeatDivision=typeof beatDivisions[number];
export const divisionBeats:Record<BeatDivision,number>={"2 bars":8,"1 bar":4,"1/2":2,"1/4":1,"1/8":.5,"1/16":.25,"1/32":.125,"1/4 dotted":1.5,"1/8 dotted":.75,"1/16 dotted":.375,"1/4 triplet":2/3,"1/8 triplet":1/3,"1/16 triplet":1/6};
export const syncSeconds=(bpm:number,division:BeatDivision)=>60/bpm*divisionBeats[division];
export type DelayWave={shape:"sine"|"triangle"|"square"|"noise"|"ramp";rate:number;depth:number;phase:number;enabled:boolean;sync?:boolean;division?:BeatDivision};
export type DelayPatch={id:string;wave:number;target:DelayTarget;amount:number};
export type DelayInputGains=Partial<Record<DelayTarget,number>>;
export const knownTargets:DelayTarget[]=["positionX","positionY","rotation","scale","speed","amplitude","columns","rows","spacing","delay","blackHold","inkHue","bgHue","blendMode","deformAmount","deformFrequency","deformFlow","globalStrength","globalSize","globalGrowth","feedbackAmount","feedbackDecay","feedbackRefresh","feedbackBlend"];
const targets=knownTargets;
const labels:Record<DelayTarget,string>={positionX:"Position X",positionY:"Position Y",rotation:"Rotation",scale:"Source scale",delay:"Time delay",spacing:"Grid spacing",amplitude:"Motion range",speed:"Motion speed",columns:"Grid columns",rows:"Grid rows",inkHue:"Font color / Hue",bgHue:"Background / Hue",blendMode:"Blend selection",deformAmount:"Cell lens strength",deformFrequency:"Cell lens curvature",deformFlow:"Cell lens breathing",globalStrength:"Global lens strength",globalSize:"Global lens size",globalGrowth:"Global lens growth",blackHold:"Black mode hold",feedbackAmount:"Feedback amount",feedbackDecay:"Feedback decay",feedbackRefresh:"Feedback refresh",feedbackBlend:"Feedback blend selection"};
const colors=["#e9ad73","#91b4ea","#c2b7e9"];
// Logarithmic rate adjustment makes 0.01–0.3 Hz movements practical without removing fast modulation.
const rateSlider=(rate:number)=>Math.round(1000*Math.log(Math.max(.01,Math.min(4,rate))/.01)/Math.log(400));
const sliderRate=(value:number)=>Math.round(.01*Math.pow(400,value/1000)*1000)/1000;
type Props={waves:DelayWave[];patches:DelayPatch[];gains:DelayInputGains;bpm:number;onWaves:(w:DelayWave[])=>void;onPatches:(p:DelayPatch[])=>void;onGain:(target:DelayTarget,value:number)=>void};
type Point={x:number;y:number};
export default function GridDelayPatchBay({waves,patches,gains,bpm,onWaves,onPatches,onGain}:Props){
 const surface=useRef<HTMLDivElement>(null),nodes=useRef<Record<string,HTMLButtonElement|null>>({});
 const [geometry,setGeometry]=useState<Record<string,Point>>({}),[armed,setArmed]=useState<number|null>(null),[drag,setDrag]=useState<{wave:number;point:Point}|null>(null);
 const [compact,setCompact]=useState(false);
 function updateWave(i:number,key:keyof DelayWave,value:number|string|boolean){onWaves(waves.map((w,j)=>j===i?{...w,[key]:value}:w))}
 function connect(wave:number,target:DelayTarget){const found=patches.find(p=>p.wave===wave&&p.target===target);if(!found)onPatches([...patches,{id:"c"+wave+"-"+target,wave,target,amount:30}]);setArmed(null);setDrag(null)}
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
   <p className="gd-bay-help">Patch a wave to a destination. Each cable has its own signed amount; the × control beside an input scales all cables arriving there. Cell lens inputs work in Fisheye/Pinch, global lens inputs when Global Lens is on, Black hold when Black delay is selected, and Feedback inputs when Feedback is enabled.</p>
   <div ref={surface} className="gd-bay-board" onPointerMove={e=>{if(drag&&surface.current){const r=surface.current.getBoundingClientRect();setDrag({...drag,point:{x:e.clientX-r.left,y:e.clientY-r.top}})}}} onPointerUp={()=>setDrag(null)}>
     <svg className="gd-cables" aria-hidden="true"><defs>{colors.map((color,i)=><linearGradient id={"gd-cable-gradient-"+i} key={i}><stop stopColor={color}/><stop offset="1" stopColor={color} stopOpacity=".7"/></linearGradient>)}</defs>
      {patches.map(p=>{const a=geometry["w"+p.wave],b=geometry["t"+p.target];if(!a||!b)return null;const bend=Math.max(35,Math.abs(b.x-a.x)*.46);return <path key={p.id} d={`M ${a.x} ${a.y} C ${a.x+bend} ${a.y}, ${b.x-bend} ${b.y}, ${b.x} ${b.y}`} stroke={colors[p.wave]} strokeWidth={1.5+Math.abs(p.amount)/100*1.6} fill="none" opacity=".9"/>})}
      {drag&&geometry["w"+drag.wave]&&<path d={`M ${geometry["w"+drag.wave].x} ${geometry["w"+drag.wave].y} Q ${(geometry["w"+drag.wave].x+drag.point.x)/2} ${drag.point.y} ${drag.point.x} ${drag.point.y}`} stroke={colors[drag.wave]} strokeDasharray="4 5" strokeWidth="2" fill="none"/>}
     </svg>
     <div className="gd-bay-columns">
      <div className="gd-bay-sources"><div className="gd-bay-caption">SIGNAL GENERATORS</div>{waves.map((w,i)=><div className="gd-wave-unit" key={i} style={{"--wave-color":colors[i]} as CSSProperties}>
       <div className="gd-wave-title"><label><input type="checkbox" checked={w.enabled} onChange={e=>updateWave(i,"enabled",e.target.checked)}/> WAVE {i+1}</label><button type="button" className={"gd-port gd-output"+(armed===i?" armed":"")} ref={setNode("w"+i)} title={"Connect Wave "+(i+1)} aria-label={"Patch Wave "+(i+1)+" output"} draggable onDragStart={e=>handleDrag(e,i)} onDragEnd={()=>setArmed(null)} onClick={()=>setArmed(armed===i?null:i)} onPointerDown={e=>{if(e.pointerType==="touch"||e.pointerType==="pen"){const r=surface.current?.getBoundingClientRect();if(r)setDrag({wave:i,point:{x:e.clientX-r.left,y:e.clientY-r.top}})}}}>●</button></div>
       <select value={w.shape} aria-label={"Wave "+(i+1)+" shape"} onChange={e=>updateWave(i,"shape",e.target.value)}>{["sine","triangle","square","noise","ramp"].map(shape=><option key={shape} value={shape}>{shape}</option>)}</select>
       <div className="gd-wave-ctrl"><label className="gd-wave-sync"><input type="checkbox" checked={!!w.sync} onChange={e=>updateWave(i,"sync",e.target.checked)}/> BPM sync</label>{w.sync?<label className="gd-wave-division">DIVISION <output>{(1/syncSeconds(bpm,w.division??"1/4")).toFixed(2)} Hz</output><select value={w.division??"1/4"} aria-label={"Wave "+(i+1)+" beat division"} onChange={e=>updateWave(i,"division",e.target.value)}>{beatDivisions.map(d=><option key={d} value={d}>{d}</option>)}</select></label>:<GridDelayKnob compact name="Rate" value={w.rate} min={.01} max={4} step={.01} unit="Hz" accent={colors[i]} onChange={rate=>updateWave(i,"rate",rate)}/>}<GridDelayKnob compact name="Depth" value={w.depth} min={0} max={100} step={1} unit="%" accent={colors[i]} onChange={depth=>updateWave(i,"depth",depth)}/></div>
       </div>)}</div>
      <div className="gd-bay-targets"><div className="gd-bay-caption">DESTINATIONS / INPUT GAIN</div>{targets.map((target,i)=><div className="gd-target-group" key={target}>{([0,6,10,14,17,20].includes(i))&&<div className="gd-target-group-label">{i===0?"SOURCE MOTION":i===6?"GRID & TIME":i===10?"BLACK DELAY / COLOUR":i===14?"CELL OPTICS":i===17?"GLOBAL OPTICS":"FEEDBACK"}</div>}<div className={"gd-target"+(armed!==null?" gd-target-ready":"")} key={target} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const raw=e.dataTransfer.getData("text/plain");if(raw.startsWith("gd-wave:")){const i=Number(raw.slice(8));if(Number.isInteger(i)&&i>=0&&i<waves.length)connect(i,target)}}}><button type="button" ref={setNode("t"+target)} className="gd-port gd-input" title={"Connect to "+labels[target]} aria-label={"Patch input "+labels[target]} onClick={()=>{if(armed!==null)connect(armed,target)}} onPointerUp={()=>{if(drag)connect(drag.wave,target)}}>●</button><span>{labels[target]}</span>{patches.some(p=>p.target===target)&&<label className="gd-input-gain" title={"Multiply combined modulation input for "+labels[target]}><input type="number" min="0" max="4" step=".25" value={gains[target]??1} aria-label={"Input multiplier "+labels[target]} onChange={e=>{const v=Number(e.target.value);if(Number.isFinite(v))onGain(target,Math.min(4,Math.max(0,v)))}}/><small>×</small></label>}<small>{patches.filter(p=>p.target===target).length||""}</small></div></div>)}</div>
     </div>
   </div>
   <div className="gd-connections-head"><span>CABLES / {patches.length}</span><button type="button" onClick={()=>setCompact(v=>!v)}>{compact?"SHOW ALL":"COMPACT"}</button></div>
   {!compact&&<div className="gd-connection-list">{patches.length===0?<p>No cables connected. Connect a wave output to a destination.</p>:patches.map(p=><div className="gd-connection" key={p.id}><span style={{color:colors[p.wave]}}>●</span><span className="gd-connection-name">W{p.wave+1} → {labels[p.target]}</span><label><input type="range" min="-100" max="100" step="1" value={p.amount} aria-label={"Modulation amount "+labels[p.target]} onChange={e=>onPatches(patches.map(q=>q.id===p.id?{...q,amount:Number(e.target.value)}:q))}/><output>{p.amount}%</output></label><button type="button" title="Disconnect cable" aria-label={"Disconnect Wave "+(p.wave+1)+" from "+labels[p.target]} onClick={()=>onPatches(patches.filter(q=>q.id!==p.id))}>×</button></div>)}</div>}
  </div>;
}
