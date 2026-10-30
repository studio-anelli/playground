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
