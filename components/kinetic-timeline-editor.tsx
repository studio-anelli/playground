"use client";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { TimelineData, Curve } from "./kinetic-timeline";
import { upsertKey } from "./kinetic-timeline";

type Parameter={key:string;label:string;min:number;max:number;step:number;discrete?:boolean};
type Props={data:TimelineData;onChange:(d:TimelineData)=>void;position:number;onSeek:(t:number)=>void;playing:boolean;onPlay:()=>void;options:Parameter[];readValue:(key:string)=>number};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const round=(n:number)=>Math.round(n*100)/100;

export default function KineticTimeline({data,onChange,position,onSeek,playing,onPlay,options,readValue}:Props){
  const [zoom,setZoom]=useState(48); // pixels per second (AE-style horizontal time zoom)
  const [panelPosition,setPanelPosition]=useState<{x:number;y:number}|null>(null);
  const [panelSize,setPanelSize]=useState({width:Math.min(1050,typeof window==="undefined"?1050:window.innerWidth-36),height:355});
  const [moduleTab,setModuleTab]=useState("SAMPLING");
  const moduleTabs=["SAMPLING","MOTION","VERTEX","TYPOGRAPHY","FEEDBACK"] as const;
  const moduleOf=(key:string,label:string)=>{
    const upper=label.toUpperCase();
    if(upper.startsWith("SAMPLING /")||["threshold","opacity","samplingThicknessX","samplingThicknessY","stripSpacing","samplingAxes"].includes(key))return "SAMPLING";
    if(upper.startsWith("GRID /")||["repeatCount","repeatColumns","repeatRows","motionMode","motionBlend"].includes(key))return "MOTION";
    if(upper.startsWith("VERTEX /")||["vertexSpacing","vertexScatter","lineLength","vertexSource"].includes(key))return "VERTEX";
    if(upper.startsWith("TYPOGRAPHY /")||["tracking","lineHeight","textAlignMode","kerningMode"].includes(key)||key.startsWith("second"))return "TYPOGRAPHY";
    if(upper.startsWith("FEEDBACK /")||key.startsWith("feedback"))return "FEEDBACK";
    return "MOTION";
  };
  const availableOptions=options.filter(o=>!selected.has(o.key)&&moduleOf(o.key,o.label)===moduleTab);

  const [selectedKey,setSelectedKey]=useState<{target:string;time:number}|null>(null);
  const panel=useRef<HTMLElement>(null);
  const laneViewport=useRef<HTMLDivElement>(null);
  const targetSelect=useRef<HTMLSelectElement>(null);
  const drag=useRef<{kind:"panel"|"resize"|"ruler"|"key";pointerId:number;startX:number;startY:number;initialX:number;initialY:number;target?:string;keyTime?:number;originalFrames?:TimelineData["tracks"][number]["frames"];moved:boolean}|null>(null);
  const selected=new Set(data.tracks.map(t=>t.target));
  const time=clamp(position,0,data.duration),width=Math.max(250,data.duration*zoom);
  const tick=zoom>=85?.5:zoom>=45?1:zoom>=25?2:5;
  const ticks=Array.from({length:Math.floor(data.duration/tick)+1},(_,i)=>round(i*tick));
  const selectedFrame=selectedKey?data.tracks.find(t=>t.target===selectedKey.target)?.frames.find(f=>Math.abs(f.time-selectedKey.time)<.025):undefined;
  const changeKey=(target:string,oldTime:number,patch:Partial<{time:number;value:number;curve:Curve}>)=>{
    const nextTime=patch.time===undefined?oldTime:round(clamp(patch.time,0,data.duration));
    onChange({...data,tracks:data.tracks.map(t=>t.target!==target?t:{...t,frames:t.frames.map(f=>Math.abs(f.time-oldTime)<.015?{...f,...patch,time:nextTime}:f).sort((a,b)=>a.time-b.time)})});
    setSelectedKey({target,time:nextTime});
  };
  const trackTime=(clientX:number,el:HTMLElement)=>clamp((clientX-el.getBoundingClientRect().left)/zoom,0,data.duration);
  const panelDown=(e:ReactPointerEvent<HTMLElement>,kind:"panel"|"resize")=>{
    if(e.button!==0||(kind==="panel"&&(e.target as HTMLElement).closest("button,input,select,label")))return;
    e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
    const rect=panel.current!.getBoundingClientRect();
    drag.current={kind,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,initialX:kind==="panel"?rect.left:rect.width,initialY:kind==="panel"?rect.top:rect.height,moved:false};
  };
  const pointerMove=(e:ReactPointerEvent<HTMLElement>)=>{
    const d=drag.current;if(!d||d.pointerId!==e.pointerId)return;
    if(d.kind==="panel"){
      setPanelPosition({x:clamp(d.initialX+e.clientX-d.startX,0,Math.max(0,window.innerWidth-160)),y:clamp(d.initialY+e.clientY-d.startY,0,Math.max(0,window.innerHeight-100))});
    }else if(d.kind==="resize"){
      setPanelSize({width:clamp(d.initialX+e.clientX-d.startX,420,window.innerWidth-12),height:clamp(d.initialY+e.clientY-d.startY,175,window.innerHeight-12)});
    }
  };
  const endPointer=(e:ReactPointerEvent<HTMLElement>)=>{if(drag.current?.pointerId===e.pointerId)drag.current=null;};
  const rulerDown=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
    drag.current={kind:"ruler",pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,initialX:0,initialY:0,moved:false};
    onSeek(round(trackTime(e.clientX,e.currentTarget)));
  };
  const keyDown=(e:ReactPointerEvent<HTMLButtonElement>,target:string,keyTime:number)=>{
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);
    drag.current={kind:"key",pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,initialX:0,initialY:0,target,keyTime,originalFrames:data.tracks.find(t=>t.target===target)?.frames,moved:false};
    setSelectedKey({target,time:keyTime});onSeek(keyTime);
  };
  const laneMove=(e:ReactPointerEvent<HTMLElement>)=>{
    const d=drag.current;if(!d||d.pointerId!==e.pointerId)return;
    if(d.kind==="ruler"){onSeek(round(trackTime(e.clientX,e.currentTarget)));return;}
    if(d.kind==="key"&&d.target!==undefined&&d.keyTime!==undefined){
      if(Math.abs(e.clientX-d.startX)>2)d.moved=true;
      if(!d.moved)return;
      const nextTime=round(clamp(d.keyTime+(e.clientX-d.startX)/zoom,0,data.duration));
      const frames=(d.originalFrames||[]).map(f=>Math.abs(f.time-d.keyTime)<.015?{...f,time:nextTime}:f).sort((a,b)=>a.time-b.time);
      onChange({...data,tracks:data.tracks.map(t=>t.target===d.target?{...t,frames}:t)});
      setSelectedKey({target:d.target,time:nextTime});onSeek(nextTime);
    }
  };
  const addKey=(target:string,t:number)=>{const opt=options.find(o=>o.key===target);const keyTime=round(clamp(t,0,data.duration));onChange(upsertKey(data,target,keyTime,readValue(target),opt?.discrete?"hold":"linear"));setSelectedKey({target,time:keyTime});onSeek(keyTime);};
  const currentOpt=options.find(o=>o.key===selectedKey?.target);
  return <section id="kp-timeline-panel" ref={panel} className="kt kt-floating" aria-label="REC-10 keyframe timeline"
    style={{left:panelPosition?.x??"auto",top:panelPosition?.y??"auto",right:panelPosition? "auto":16,bottom:panelPosition?"auto":16,width:panelSize.width,height:panelSize.height}}>
    <header className="kt-top kt-handle" onPointerDown={e=>panelDown(e,"panel")} onPointerMove={pointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}>
      <strong title="Drag to move timeline">⠿ 04 / TIMELINE</strong>
      <button onClick={onPlay}>{playing?"Ⅱ PAUSE":"▶ PLAY"}</button><button onClick={()=>onSeek(0)}>↤ START</button>
      <label>DURATION <input aria-label="Timeline duration seconds" type="number" min={1} max={120} value={data.duration} onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=120)onChange({...data,duration:n,tracks:data.tracks.map(t=>({...t,frames:t.frames.filter(f=>f.time<=n)}))});}}/>s</label>
      <label><input type="checkbox" checked={data.loop} onChange={e=>onChange({...data,loop:e.target.checked})}/> LOOP</label>
      <output>{time.toFixed(2)} / {data.duration.toFixed(1)} s</output>
    </header>
    <nav className="kt-module-tabs" aria-label="Timeline parameter modules">
      {moduleTabs.map(tab=><button key={tab} type="button" className={moduleTab===tab?"is-active":""} aria-pressed={moduleTab===tab} onClick={()=>setModuleTab(tab)}>{tab}<span>{options.filter(o=>!selected.has(o.key)&&moduleOf(o.key,o.label)===tab).length}</span></button>)}
    </nav>
    <div className="kt-toolbar">
      <select ref={targetSelect} aria-label={`Animate parameter in ${moduleTab}`} disabled={!availableOptions.length}>{availableOptions.map(o=><option key={o.key} value={o.key}>{o.label.replace(/^[^/]+ \/ /,"")}</option>)}</select>
      <button disabled={!availableOptions.length} onClick={()=>{const key=targetSelect.current?.value;if(key&&availableOptions.some(o=>o.key===key))addKey(key,time);}}>+ TRACK</button>
      <label className="kt-zoom">TIME ZOOM <button title="Zoom out" onClick={()=>setZoom(z=>Math.max(12,Math.round(z/1.5)))}>−</button><input aria-label="Timeline horizontal zoom" type="range" min="12" max="240" step="1" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><button title="Zoom in" onClick={()=>setZoom(z=>Math.min(240,Math.round(z*1.5)))}>+</button></label>
      <span>{zoom} PX/S</span>
    </div>
    <div className="kt-scroll" ref={laneViewport}>
      <div className="kt-ruler-row"><div className="kt-sticky-label">PARAMETER / KEYFRAMES</div><div className="kt-time-ruler" style={{width}} onPointerDown={rulerDown} onPointerMove={laneMove} onPointerUp={endPointer} onPointerCancel={endPointer}>
        {ticks.map(t=><span key={t} className="kt-tick" style={{left:t*zoom}}>{t}s</span>)}<i className="kt-playhead" style={{left:time*zoom}}/>
      </div></div>
      {data.tracks.map(track=>{const opt=options.find(o=>o.key===track.target);return <div className="kt-track-row" key={track.target}>
        <div className="kt-sticky-label kt-track-label"><button className="kt-track-title" onClick={()=>setSelectedTarget(track.target)} title={opt?.label}>{opt?.label||track.target}</button><button title="Keyframe at playhead" onClick={()=>addKey(track.target,time)}>◇</button><button title="Remove track" onClick={()=>{onChange({...data,tracks:data.tracks.filter(t=>t.target!==track.target)});if(selectedKey?.target===track.target)setSelectedKey(null);}}>×</button></div>
        <div className="kt-lane" style={{width,backgroundSize:`${zoom*tick}px 100%`}} onDoubleClick={e=>{if((e.target as HTMLElement).closest(".kt-key"))return;addKey(track.target,trackTime(e.clientX,e.currentTarget));}} onPointerDown={e=>{if((e.target as HTMLElement).closest(".kt-key"))return;onSeek(round(trackTime(e.clientX,e.currentTarget)));}}>
          <i className="kt-playhead" style={{left:time*zoom}}/>
          {track.frames.map((frame,i)=><button key={i} className={`kt-key ${selectedKey?.target===track.target&&Math.abs(selectedKey.time-frame.time)<.015?"is-selected":""}`} style={{left:frame.time*zoom}} title={`${frame.time.toFixed(2)}s · ${frame.value} · drag to move`} aria-label={`Drag keyframe at ${frame.time.toFixed(2)} seconds`} onPointerDown={e=>keyDown(e,track.target,frame.time)} onPointerMove={laneMove} onPointerUp={endPointer} onPointerCancel={endPointer}>◆</button>)}
        </div></div>})}
    </div>
    <div className="kt-inspector">{selectedKey&&selectedFrame?<><strong>KEYFRAME / {currentOpt?.label||selectedKey.target}</strong>
      <label>TIME <input type="number" min={0} max={data.duration} step={.01} value={selectedFrame.time} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))changeKey(selectedKey.target,selectedKey.time,{time:n});}}/>s</label>
      <label>VALUE <input type="number" min={currentOpt?.min} max={currentOpt?.max} step={currentOpt?.step||.1} value={selectedFrame.value} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))changeKey(selectedKey.target,selectedKey.time,{value:clamp(n,currentOpt?.min??n,currentOpt?.max??n)});}}/></label>
      <label>CURVE <select value={selectedFrame.curve} onChange={e=>changeKey(selectedKey.target,selectedKey.time,{curve:e.target.value as Curve})}><option value="linear">LINEAR</option><option value="smooth">SMOOTH</option><option value="hold">HOLD / STEP</option></select></label>
      <button onClick={()=>{onChange({...data,tracks:data.tracks.map(t=>t.target!==selectedKey.target?t:{...t,frames:t.frames.filter(f=>Math.abs(f.time-selectedKey.time)>.015)})});setSelectedKey(null);}}>DELETE KEY</button>
      </>:<span>Double-click a lane to draw a keyframe. Drag diamonds to retime. Drag the title to move; use the corner to resize.</span>}</div>
    <div className="kt-resize" role="separator" aria-label="Resize timeline panel" title="Drag to resize timeline" onPointerDown={e=>panelDown(e,"resize")} onPointerMove={pointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}>◢</div>
  </section>;
}
