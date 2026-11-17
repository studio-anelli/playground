type Dot={x:number;y:number;radius:number;endRadius:number;motionScale?:number};
type Settings={width:number;height:number;exportCrop:boolean;exportPadding:number;motion:string;scrollStrength:number};
export function motionBounds(dots:Dot[],c:Pick<Settings,'motion'|'scrollStrength'>,still=false){
 if(!dots.length)return {x:0,y:0,width:1,height:1};
 const drift=(d:Dot)=>!still&&c.motion==='drift'?26*(d.motionScale??1):0;
 const radius=(d:Dot)=>Math.max(.2,d.radius,!still&&(c.motion==='invert'||c.motion==='pulse')?d.radius+(d.endRadius-d.radius)*c.scrollStrength/100:d.radius);
 const x=Math.min(...dots.map(d=>d.x-radius(d)-drift(d)));
 const y=Math.min(...dots.map(d=>d.y-radius(d)));
 const right=Math.max(...dots.map(d=>d.x+radius(d)+drift(d)));
 const bottom=Math.max(...dots.map(d=>d.y+radius(d)));
 return {x,y,width:right-x,height:bottom-y};
}
// The video envelope is fixed across every frame. Stills can use current-frame bounds.
export function exportBounds(dots:Dot[],c:Settings,still=false){
 if(!c.exportCrop||!dots.length)return {x:0,y:0,width:c.width,height:c.height};
 const b=motionBounds(dots,c,still),left=Math.floor(b.x-c.exportPadding),top=Math.floor(b.y-c.exportPadding);
 const right=Math.ceil(b.x+b.width+c.exportPadding),bottom=Math.ceil(b.y+b.height+c.exportPadding);
 return {x:left,y:top,width:Math.max(2,Math.ceil((right-left)/2)*2),height:Math.max(2,Math.ceil((bottom-top)/2)*2)};
}
