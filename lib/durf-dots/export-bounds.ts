type Dot={x:number;y:number;radius:number;endRadius:number};
type Settings={width:number;height:number;exportCrop:boolean;exportPadding:number;motion:string;scrollStrength:number};
// One envelope for the whole animation: the crop never jumps between frames.
export function exportBounds(dots:Dot[],c:Settings){
 if(!c.exportCrop||!dots.length)return {x:0,y:0,width:c.width,height:c.height};
 const drift=c.motion==='drift'?26:0;
 const radius=(d:Dot)=>Math.max(.2,d.radius,c.motion==='invert'||c.motion==='pulse'?d.radius+(d.endRadius-d.radius)*c.scrollStrength/100:d.radius);
 const left=Math.floor(Math.min(...dots.map(d=>d.x-radius(d)-drift))-c.exportPadding);
 const top=Math.floor(Math.min(...dots.map(d=>d.y-radius(d)))-c.exportPadding);
 const right=Math.ceil(Math.max(...dots.map(d=>d.x+radius(d)+drift))+c.exportPadding);
 const bottom=Math.ceil(Math.max(...dots.map(d=>d.y+radius(d)))+c.exportPadding);
 return {x:left,y:top,width:Math.max(2,Math.ceil((right-left)/2)*2),height:Math.max(2,Math.ceil((bottom-top)/2)*2)};
}
