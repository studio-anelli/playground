export type Point={x:number;y:number};
export type GrowthGuide=Point&{strength:number};
export type GrowthMap={w:number;h:number;field:Float32Array;edge:Float32Array;gx:Float32Array;gy:Float32Array;guides:GrowthGuide[]};
export type GrowthSettings={seed:number;expansion:number;repulsion:number;compression:number;smoothness:number;pruning:number;width:number;influence:number;contours:number;render:"CONTOUR"|"RIBBON"};
const W=1000,H=760;
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const rand=(seed:number)=>{let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}};
function smap(a:GrowthMap|undefined,k:"field"|"edge"|"gx"|"gy",p:Point){if(!a)return 0;const x=clamp(Math.floor(p.x/W*(a.w-1)),0,a.w-1),y=clamp(Math.floor(p.y/H*(a.h-1)),0,a.h-1);return a[k][y*a.w+x]}
const hypot=(p:Point,q:Point)=>Math.hypot(p.x-q.x,p.y-q.y);
function axisFromImage(a:GrowthMap|undefined):{center:Point;angle:number;aspect:number;extent:number}{
 if(!a)return {center:{x:W*.5,y:H*.5},angle:-.26,aspect:1.38,extent:1};
 let sx=0,sy=0,sw=0;
 for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++){const m=a.field[y*a.w+x],v=Math.pow(Math.max(0,m-.12),1.4);sx+=x/a.w*W*v;sy+=y/a.h*H*v;sw+=v}
 if(sw<.0001)return {center:{x:W*.5,y:H*.5},angle:-.2,aspect:1.3,extent:1};
 const center={x:sx/sw,y:sy/sw};
 let xx=0,xy=0,yy=0;
 for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++){const v=Math.pow(Math.max(0,a.field[y*a.w+x]-.12),1.4);let dx=x/a.w*W-center.x,dy=y/a.h*H-center.y;xx+=v*dx*dx;xy+=v*dx*dy;yy+=v*dy*dy}
 xx/=sw;xy/=sw;yy/=sw;
 const angle=.5*Math.atan2(2*xy,xx-yy);
 const tr=xx+yy,root=Math.sqrt(Math.max(0,(xx-yy)*(xx-yy)+4*xy*xy));
 const major=Math.max(1,(tr+root)/2),minor=Math.max(1,(tr-root)/2);
 return {center:{x:clamp(center.x,270,W-270),y:clamp(center.y,200,H-200)},angle,aspect:clamp(Math.sqrt(major/minor),1,2.15),extent:clamp(Math.sqrt(major)/200,.75,1.35)};
}
function blurLoop(points:Point[],passes:number):Point[]{
 let result=points;
 for(let pass=0;pass<passes;pass++){const n=result.length;result=result.map((p,i)=>{let left=result[(i+n-1)%n],right=result[(i+1)%n];return{x:p.x*.5+(left.x+right.x)*.25,y:p.y*.5+(left.y+right.y)*.25}})}
 return result;
}
function resampleClosed(points:Point[],count:number):Point[]{
 const length:number[]=[0];
 for(let i=0;i<points.length;i++)length.push(length[i]+hypot(points[i],points[(i+1)%points.length]));
 const total=length[length.length-1];if(total<1)return points;
 const out:Point[]=[];let index=0;
 for(let i=0;i<count;i++){let d=i/count*total;while(index<points.length-1&&length[index+1]<d)index++;
 const start=points[index],end=points[(index+1)%points.length],t=(d-length[index])/Math.max(1e-6,length[index+1]-length[index]);
 out.push({x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t})}
 return out;
}
function makeInitial(axis:ReturnType<typeof axisFromImage>,a:GrowthMap|undefined,guides:GrowthGuide[],settings:GrowthSettings):Point[]{
 const r=rand(settings.seed);
 const center=a?axis.center:{x:W*.5,y:H*.5};
 const angle=axis.angle,aspect=axis.aspect;
 const n=140,pts:Point[]=[];
 const R=70*axis.extent+settings.expansion*.23;
 for(let i=0;i<n;i++){
  const theta=i/n*Math.PI*2;
  const lo=Math.cos(theta),hi=Math.sin(theta);
  const wave=1+.085*Math.sin(theta*3+settings.seed*.001)+.055*Math.sin(theta*5+settings.seed*.003);
  const radial=(1-settings.influence/100*.15)+settings.influence/100*.15*(.5+smap(a,"field",{x:center.x+lo*R,y:center.y+hi*R}));
  const rx=lo*R*aspect*wave*radial,ry=hi*R/aspect*.93*wave*radial;
  pts.push({x:center.x+rx*Math.cos(angle)-ry*Math.sin(angle),y:center.y+rx*Math.sin(angle)+ry*Math.cos(angle)})
 }
 return pts;
}
function growthSnapshots(a:GrowthMap|undefined,guides:GrowthGuide[],s:GrowthSettings):Point[][]{
 const axis=axisFromImage(a);
 let loop=makeInitial(axis,a,guides,s);
 const frames:Point[][]=[];
 const steps=140+Math.round(s.expansion*.9);
 const snapshotEvery=Math.max(1,Math.floor(steps/(s.contours+4)));
 const strength=s.influence/100,pressure=s.compression/100,regularity=s.smoothness/100;
 const repelDistance=17+s.repulsion*.24;
 for(let t=0;t<steps;t++){
   const n=loop.length; const evolved:Point[]=new Array(n);
   const centroid=loop.reduce((acc,p)=>({x:acc.x+p.x/n,y:acc.y+p.y/n}),{x:0,y:0});
   for(let i=0;i<n;i++){
     const p=loop[i],prev=loop[(i+n-1)%n],next=loop[(i+1)%n];
     const tangent={x:next.x-prev.x,y:next.y-prev.y};const tl=Math.hypot(tangent.x,tangent.y)||1;
     let nx=-tangent.y/tl,ny=tangent.x/tl;
     if(nx*(p.x-centroid.x)+ny*(p.y-centroid.y)<0){nx=-nx;ny=-ny}
     const mass=smap(a,"field",p),edge=smap(a,"edge",p);
     let imagePressure=(mass-.42)*strength*2.7-edge*strength*1.5;
     let pinch=0;
     if(guides.length){for(const g of guides.slice(0,4)){const d=Math.hypot(p.x-g.x*W,p.y-g.y*H);pinch+=g.strength*Math.exp(-d*d/(2*135*135))}}
     const initial=1.6+s.expansion*.031;
     const force=clamp(initial+imagePressure-pinch*pressure*2.5,0.15,5.3);
     // Coherent low-frequency waves, phase-locked to the primary contour.
     const phase=i/n*Math.PI*2,mod=(Math.sin(phase*3+s.seed*.01)+.4*Math.sin(phase*5+s.seed*.007))*(1-regularity)*.32;
     let repelX=0,repelY=0;
     if(s.repulsion>0){
       for(let j=0;j<n;j+=3){
         const separation=Math.min(Math.abs(j-i),n-Math.abs(j-i));
         if(separation<7)continue;
         const q=loop[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);
         if(d>.01&&d<repelDistance){const f=(repelDistance-d)/repelDistance;repelX+=dx/d*f;repelY+=dy/d*f}
       }
     }
     const relaxX=(prev.x+next.x-2*p.x)*(.15+regularity*.28);
     const relaxY=(prev.y+next.y-2*p.y)*(.15+regularity*.28);
     // Neighbour spacing regulates growth without costly global self-collisions.
     const prevDistance=hypot(p,prev),nextDistance=hypot(p,next);
     const spacing=(prevDistance-nextDistance)*.09;
     evolved[i]={x:p.x+nx*(force+mod)+relaxX+spacing*tangent.x/tl+clamp(repelX,-1.8,1.8)*s.repulsion*.009,y:p.y+ny*(force+mod)+relaxY+spacing*tangent.y/tl+clamp(repelY,-1.8,1.8)*s.repulsion*.009};
   }
   loop=resampleClosed(blurLoop(evolved,regularity>.55?2:1),140);
   if(t%snapshotEvery===0&&t>0)frames.push(loop.map(p=>({...p})));
 }
 frames.push(loop.map(p=>({...p})));
 // Prune temporally adjacent redundant contours rather than drawing the whole simulation.
 const chosen:Point[][]=[];
 const minDistance=7+s.pruning*.25;
 for(let i=frames.length-1;i>=0;i--){
   const candidate=frames[i];if(!chosen.length){chosen.push(candidate);continue}
   let sum=0;const last=chosen[chosen.length-1];
   for(let k=0;k<candidate.length;k+=5)sum+=hypot(candidate[k],last[k]);
   const avg=sum/Math.ceil(candidate.length/5);
   if(avg>minDistance&&chosen.length<s.contours)chosen.push(candidate);
 }
 return chosen.reverse();
}
function pathData(points:Point[]):string{
 if(points.length<3)return "";
 const mids=points.map((p,i)=>{let q=points[(i+1)%points.length];return{x:(p.x+q.x)/2,y:(p.y+q.y)/2}});
 let d=`M ${mids[mids.length-1].x.toFixed(2)} ${mids[mids.length-1].y.toFixed(2)} `;
 for(let i=0;i<points.length;i++)d+=`Q ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)} ${mids[i].x.toFixed(2)} ${mids[i].y.toFixed(2)} `;
 return d+"Z";
}
function ribbonData(points:Point[],s:GrowthSettings):string{
 const n=points.length,outer:Point[]=[],inner:Point[]=[];
 for(let i=0;i<n;i++){
  const p=points[i],prev=points[(i+n-1)%n],next=points[(i+1)%n];
  let dx=next.x-prev.x,dy=next.y-prev.y,m=Math.hypot(dx,dy)||1;
  const k=Math.abs(Math.atan2((p.x-prev.x)*(next.y-p.y)-(p.y-prev.y)*(next.x-p.x),(p.x-prev.x)*(next.x-p.x)+(p.y-prev.y)*(next.y-p.y)));
  let w=2+s.width*.09*(.5+Math.min(1,k*2));
  outer.push({x:p.x-dy/m*w,y:p.y+dx/m*w});inner.push({x:p.x+dy/m*w,y:p.y-dx/m*w});
 }
 return pathData(outer)+" "+pathData(inner.reverse());
}
export function renderGrowth(a:GrowthMap|undefined,guides:GrowthGuide[],s:GrowthSettings,background:string,ink:string):string{
 const frames=growthSnapshots(a,guides,s);
 const paths=frames.map((points,i)=>{
  const emphasis=i===frames.length-1;
  if(s.render==="RIBBON")return `<path d="${ribbonData(points,s)}" fill="${ink}" fill-rule="evenodd" opacity="${emphasis?1:.82}"/>`;
  return `<path d="${pathData(points)}" fill="none" stroke="${ink}" stroke-width="${(emphasis?2.2:1.2)+(i%4===0?s.width*.025:0)}" opacity="${emphasis?1:.8}"/>`;
 }).join("");
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${background}"/><g>${paths}</g></svg>`;
}
