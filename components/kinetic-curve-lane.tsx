"use client";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { Keyframe, TimelineData, TimelineTrack } from "./kinetic-timeline";

const HEIGHT=116, TOP=12, BOTTOM=104, SPAN=BOTTOM-TOP;
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
const round=(n:number)=>Math.round(n*100)/100;
type Props={
  track:TimelineTrack; min:number;max:number;discrete:boolean;
  duration:number;zoom:number;tick:number;time:number;
  selectedTime:number|null; onSelect:(time:number)=>void;
  onChange:(next:TimelineTrack)=>void; onSeek:(time:number)=>void;
  onAdd:(time:number,value:number)=>void;
};
type Drag={kind:"point"|"out"|"in";index:number;startX:number;startY:number;frames:Keyframe[];pointerId:number};
export default function KineticCurveLane({track,min,max,discrete,duration,zoom,tick,time,selectedTime,onSelect,onChange,onSeek,onAdd}:Props){
  const svg=useRef<SVGSVGElement>(null);
  const drag=useRef<Drag|null>(null);
  const width=Math.max(250,duration*zoom),delta=Math.max(.00001,max-min);
  const frames=track.frames.slice().sort((a,b)=>a.time-b.time);
  const x=(t:number)=>t*zoom;
  const y=(v:number)=>BOTTOM-clamp((v-min)/delta,0,1)*SPAN;
  const xy=(event:ReactPointerEvent<SVGSVGElement>)=>{
    const rect=event.currentTarget.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*width/rect.width,y:(event.clientY-rect.top)*HEIGHT/rect.height};
  };
  const parts=frames.slice(0,-1).map((first,i)=>{
    const last=frames[i+1],x0=x(first.time),x3=x(last.time),y0=y(first.value),y3=y(last.value),dx=x3-x0,dy=y3-y0;
    const out=first.outHandle??{x:.33,y:.33},incoming=last.inHandle??{x:.33,y:-.33};
    const p1={x:x0+out.x*dx,y:y0+out.y*dy};
    const p2={x:x3-incoming.x*dx,y:y3+incoming.y*dy};
    const path=first.curve==="hold"||discrete
      ?`M ${x0} ${y0} H ${x3} V ${y3}`
      :first.curve==="linear"
        ?`M ${x0} ${y0} L ${x3} ${y3}`
        :first.curve==="smooth"
          ?`M ${x0} ${y0} C ${x0+dx/3} ${y0} ${x3-dx/3} ${y3} ${x3} ${y3}`
          :`M ${x0} ${y0} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${x3} ${y3}`;
    return {path,first,last,i,p1,p2,x0,x3,y0,y3,dx,dy,bezier:first.curve==="bezier"&&!discrete};
  });
  const begin=(event:ReactPointerEvent<SVGElement>,kind:Drag["kind"],index:number)=>{
    if(event.button!==0)return;
    event.stopPropagation();event.preventDefault();
    const el=event.currentTarget;
    el.setPointerCapture(event.pointerId);
    drag.current={kind,index,startX:event.clientX,startY:event.clientY,frames:frames.map(f=>({...f})),pointerId:event.pointerId};
    onSelect(frames[index].time);
  };
  const move=(event:ReactPointerEvent<SVGElement>)=>{
    const d=drag.current;if(!d||d.pointerId!==event.pointerId)return;
    const rect=svg.current?.getBoundingClientRect();if(!rect)return;
    const dx=(event.clientX-d.startX)*width/rect.width,dy=(event.clientY-d.startY)*HEIGHT/rect.height;
    const original=d.frames[d.index],next=d.frames.map(f=>({...f}));
    if(d.kind==="point"){
      const lower=d.index>0?d.frames[d.index-1].time+.02:0;
      const upper=d.index<d.frames.length-1?d.frames[d.index+1].time-.02:duration;
      const newTime=round(clamp(original.time+dx/zoom,Math.min(lower,upper),Math.max(lower,upper)));
      const newValue=clamp(min+(BOTTOM-(y(original.value)+dy))/SPAN*delta,min,max);
      next[d.index]={...original,time:newTime,value:discrete?Math.round(newValue):round(newValue)};
      onSelect(newTime);onSeek(newTime);
    } else {
      const isOut=d.kind==="out";
      const left=isOut?d.index:d.index-1,right=left+1;
      const first=d.frames[left],last=d.frames[right];
      if(!first||!last||last.time<=first.time)return;
      const sectionDx=(last.time-first.time)*zoom;
      const sectionDy=y(last.value)-y(first.value);
      const originalHandle=isOut?(original.outHandle??{x:.33,y:.33}):(original.inHandle??{x:.33,y:-.33});
      const nextHandle={
        x:round(clamp(originalHandle.x+(isOut?dx:-dx)/sectionDx,0,1)),
        y:round(clamp(originalHandle.y+(Math.abs(sectionDy)>.0001?dy/sectionDy:-dy/SPAN),-3,3))
      };
      next[d.index]={...original,[isOut?"outHandle":"inHandle"]:nextHandle};
      next[left]={...next[left],curve:"bezier"};
    }
    onChange({...track,frames:next});
  };
  const stop=(event:ReactPointerEvent<SVGElement>)=>{if(drag.current?.pointerId===event.pointerId)drag.current=null;};
  return <svg ref={svg} className="kt-curve-svg" width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} aria-label={`Editable automation curve for ${track.target}`} onDoubleClick={event=>{
    if((event.target as SVGElement).closest(".kt-curve-point, .kt-curve-handle"))return;
    const p=xy(event);onAdd(round(clamp(p.x/zoom,0,duration)),discrete?Math.round(min+(BOTTOM-clamp(p.y,TOP,BOTTOM))/SPAN*delta):round(min+(BOTTOM-clamp(p.y,TOP,BOTTOM))/SPAN*delta));
  }} onPointerDown={e=>{if(e.target===e.currentTarget){onSeek(round(clamp(xy(e).x/zoom,0,duration)));}}}>
    {Array.from({length:5},(_,i)=><line key={i} x1="0" x2={width} y1={TOP+i*SPAN/4} y2={TOP+i*SPAN/4} stroke="#445247" strokeWidth=".65"/>)}
    {Array.from({length:Math.floor(duration/tick)+1},(_,i)=><line key={i} x1={i*tick*zoom} x2={i*tick*zoom} y1="0" y2={HEIGHT} stroke="#49574b" strokeWidth=".7"/>)}
    {frames.length===1&&<path d={`M 0 ${y(frames[0].value)} H ${width}`} stroke="#89afea" strokeWidth="1.8" fill="none"/>}
    {parts.map(part=><path key={part.i} d={part.path} fill="none" stroke="#8eafea" strokeWidth="2" strokeLinejoin="round"/>)}
    <line x1={x(time)} x2={x(time)} y1="0" y2={HEIGHT} stroke="#ffbf72" strokeWidth="1.1" pointerEvents="none"/>
    {parts.filter(p=>p.bezier&&(selectedTime!==null&&(Math.abs(selectedTime-p.first.time)<.025||Math.abs(selectedTime-p.last.time)<.025))).map(p=><g key={`handle-${p.i}`}>
      <path d={`M ${p.x0} ${p.y0} L ${p.p1.x} ${p.p1.y} M ${p.x3} ${p.y3} L ${p.p2.x} ${p.p2.y}`} fill="none" stroke="#a9b9a5" strokeDasharray="3 3"/>
      <circle className="kt-curve-handle" cx={p.p1.x} cy={p.p1.y} r="5.5" stroke="#c7d7fa" strokeWidth="1.5" fill="#27362b" onPointerDown={e=>begin(e,"out",p.i)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}/>
      <circle className="kt-curve-handle" cx={p.p2.x} cy={p.p2.y} r="5.5" stroke="#c7d7fa" strokeWidth="1.5" fill="#27362b" onPointerDown={e=>begin(e,"in",p.i+1)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}/>
    </g>)}
    {frames.map((f,i)=><g key={i} className="kt-curve-point" onPointerDown={e=>begin(e,"point",i)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} style={{cursor:"grab",touchAction:"none"}}>
      <circle cx={x(f.time)} cy={y(f.value)} r="10" fill="transparent"/>
      <circle cx={x(f.time)} cy={y(f.value)} r={selectedTime!==null&&Math.abs(selectedTime-f.time)<.025?5.5:4} fill={selectedTime!==null&&Math.abs(selectedTime-f.time)<.025?"#f5f5ee":"#9dbafd"} stroke="#212822" strokeWidth="1.1"/>
      <title>{f.time.toFixed(2)}s · {f.value} · drag to edit time and value</title>
    </g>)}
  </svg>;
}
