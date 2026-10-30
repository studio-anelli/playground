export type Curve = "linear" | "smooth" | "hold";
export type Keyframe = { time: number; value: number; curve: Curve };
export type TimelineTrack = { target: string; frames: Keyframe[] };
export type TimelineData = { duration: number; loop: boolean; tracks: TimelineTrack[] };
export const timelineDefaults: TimelineData = { duration: 12, loop: true, tracks: [] };
export function evaluateTrack(track: TimelineTrack, time: number): number | undefined {
  const frames = track.frames.slice().sort((a,b)=>a.time-b.time);
  if (!frames.length) return undefined;
  if (time <= frames[0].time) return frames[0].value;
  for (let i=1;i<frames.length;i++) {
    const next=frames[i], prev=frames[i-1];
    if(time>next.time) continue;
    if(prev.curve==="hold" || next.time===prev.time) return prev.value;
    let t=(time-prev.time)/(next.time-prev.time);
    if(prev.curve==="smooth") t=t*t*(3-2*t);
    return prev.value + (next.value-prev.value)*t;
  }
  return frames[frames.length-1].value;
}
export function timelineAt(data: TimelineData, time: number) {
  const duration=Math.max(.1,data.duration);
  return data.loop ? ((time%duration)+duration)%duration : Math.max(0,Math.min(duration,time));
}
export function upsertKey(data:TimelineData,target:string,time:number,value:number,curve:Curve="linear"): TimelineData {
  const t=Math.min(data.duration,Math.max(0,Math.round(time*100)/100));
  const existing=data.tracks.find(track=>track.target===target);
  const frames=(existing?.frames||[]).filter(frame=>Math.abs(frame.time-t)>.015).concat({time:t,value,curve}).sort((a,b)=>a.time-b.time);
  return {...data,tracks:existing?data.tracks.map(track=>track.target===target?{...track,frames}:track):[...data.tracks,{target,frames}]};
}

export function parseTimeline(input:unknown): TimelineData {
  if (!input || typeof input!=="object" || Array.isArray(input)) return timelineDefaults;
  const o=input as Record<string,unknown>;
  const duration=typeof o.duration==="number"&&Number.isFinite(o.duration)&&o.duration>=1&&o.duration<=120?o.duration:12;
  if(!Array.isArray(o.tracks)||o.tracks.length>60) throw new Error("Invalid timeline tracks.");
  const tracks=o.tracks.map(value=>{
    if(!value||typeof value!=="object")throw new Error("Invalid timeline track.");
    const t=value as Record<string,unknown>;
    if(typeof t.target!=="string"||t.target.length>100||!Array.isArray(t.frames)||t.frames.length>500)throw new Error("Invalid keyframe track.");
    const frames=t.frames.map(v=>{
      if(!v||typeof v!=="object")throw new Error("Invalid keyframe.");
      const f=v as Record<string,unknown>;
      if(typeof f.time!=="number"||!Number.isFinite(f.time)||f.time<0||f.time>duration||typeof f.value!=="number"||!Number.isFinite(f.value)||!["linear","smooth","hold"].includes(String(f.curve)))throw new Error("Invalid keyframe value.");
      return {time:f.time,value:f.value,curve:f.curve as Curve};
    });
    return {target:t.target as string,frames};
  });
  return {duration,loop:o.loop!==false,tracks};
}
