"use client";
import {useRef,useState,type CSSProperties,type PointerEvent} from "react";

type Props={name:string;value:number;min:number;max:number;step:number;unit?:string;onChange:(value:number)=>void;accent?:string;compact?:boolean};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export default function GridDelayKnob({name,value,min,max,step,unit="",onChange,accent,compact=false}:Props){
 const ref=useRef<{pointer:number;y:number;raw:number}|null>(null);
 const input=useRef<HTMLInputElement>(null);
 const [dragging,setDragging]=useState(false);
 const decimals=(String(step).split(".")[1]||"").length;
 const commit=(n:number)=>{
  if(!Number.isFinite(n))return;
  const snapped=clamp(min+Math.round((clamp(n,min,max)-min)/step)*step,min,max);
  onChange(Number(snapped.toFixed(decimals)));
 };
 function move(e:PointerEvent<HTMLElement>){
  const g=ref.current;if(!g||g.pointer!==e.pointerId)return;
  const sensitivity=e.altKey?.025:e.shiftKey?.12:1;
  g.raw=clamp(g.raw+(g.y-e.clientY)*(max-min)/260*sensitivity,min,max);
  g.y=e.clientY;commit(g.raw);
 }
 function start(e:PointerEvent<HTMLElement>){if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);ref.current={pointer:e.pointerId,y:e.clientY,raw:value};setDragging(true)}
 function stop(e:PointerEvent<HTMLElement>){if(ref.current?.pointer===e.pointerId){ref.current=null;setDragging(false)}}
 const pct=clamp((value-min)/Math.max(.000001,max-min),0,1);
 const angle=-135+pct*270;
 return <div className={"gd-knob-control"+(compact?" gd-knob-compact":"")+(dragging?" is-dragging":"")} style={accent?{"--gd-knob-accent":accent} as CSSProperties:undefined}>
  <div className="gd-knob-label" title="Drag up/down to adjust · Shift fine · Option ultra fine" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={()=>{ref.current=null;setDragging(false)}} onLostPointerCapture={()=>{ref.current=null;setDragging(false)}} onDoubleClick={()=>{input.current?.focus();input.current?.select()}}>{name}</div>
  <button className="gd-knob-dial" type="button" role="slider" aria-label={name} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} title="Drag up/down · Shift fine · Option ultra fine · Double click to enter a value"
   style={{"--gd-knob-angle":angle+"deg"} as CSSProperties}
   onPointerDown={start}
   onPointerMove={move}
   onPointerUp={stop}
   onPointerCancel={()=>{ref.current=null;setDragging(false)}} onLostPointerCapture={()=>{ref.current=null;setDragging(false)}}
   onDoubleClick={()=>{input.current?.focus();input.current?.select()}}
   onKeyDown={e=>{if(e.key==="Enter"){input.current?.focus();input.current?.select();return}const dir=e.key==="ArrowUp"||e.key==="ArrowRight"?1:e.key==="ArrowDown"||e.key==="ArrowLeft"?-1:0;if(dir){e.preventDefault();commit(value+dir*step*(e.shiftKey?1:5))}else if(e.key==="Home"||e.key==="End"){e.preventDefault();commit(e.key==="Home"?min:max)}}}>
   <svg viewBox="0 0 64 64" aria-hidden="true" className="gd-knob-svg">
    <circle cx="32" cy="32" r="26" className="gd-knob-track" strokeDasharray="122.52 163.36" transform="rotate(135 32 32)"/>
    <circle cx="32" cy="32" r="26" className="gd-knob-fill" strokeDasharray={`${122.52*pct} 163.36`} transform="rotate(135 32 32)"/>
    <circle cx="32" cy="32" r="20" className="gd-knob-face"/>
    <path d="M32 13 V23" className="gd-knob-pointer" transform={`rotate(${angle} 32 32)`}/>
   </svg>
  </button>
  <div className="gd-knob-readout"><input ref={input} type="number" min={min} max={max} step={step} value={value} aria-label={name+" exact value"} onChange={e=>{if(e.target.value!=="")commit(Number(e.target.value))}}/><span>{unit}</span></div>
 </div>;
}
