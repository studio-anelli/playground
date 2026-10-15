"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import "../app/experiments/dot-connect/dot-connect.css";

type P={x:number;y:number;r:number;c:number};
type Group={ids:number[];pairs:[number,number][];holes:{x:number;y:number}[];id:number};
const key=(a:number,b:number)=>Math.min(a,b)+":"+Math.max(a,b);
const rng=(seed:number)=>{let a=seed>>>0;return ()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}};
const palette=["#f34c1d","#663298","#f9b539","#d70b1d","#27607e","#f48839"];
function groupNodes(pts:P[],edges:Set<string>,cols:number,rows:number):Group[]{
 const adj=pts.map(()=>[] as number[]);
 for(const edge of edges){const [a,b]=edge.split(":").map(Number);if(!pts[a]||!pts[b]||Math.max(Math.abs(pts[a].r-pts[b].r),Math.abs(pts[a].c-pts[b].c))!==1)continue;adj[a].push(b);adj[b].push(a)}
 const seen=new Set<number>(),groups:Group[]=[];
 for(let i=0;i<pts.length;i++){if(seen.has(i))continue;const ids=[i],pairs:Group["pairs"]=[],holes:Group["holes"]=[];seen.add(i);
 for(let j=0;j<ids.length;j++)for(const b of adj[ids[j]])if(!seen.has(b)){seen.add(b);ids.push(b)}
 const member=new Set(ids);
 for(const a of ids)for(const b of adj[a])if(b>a)pairs.push([a,b]);
 for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){const a=r*cols+c,b=a+1,d=a+cols,e=d+1;if(member.has(a)&&member.has(b)&&member.has(d)&&member.has(e)&&[key(a,b),key(b,e),key(e,d),key(d,a)].every(k=>edges.has(k)))holes.push({x:(pts[a].x+pts[e].x)/2,y:(pts[a].y+pts[e].y)/2})}
 groups.push({id:Math.min(...ids),ids,pairs,holes});
 }
 return groups;
}
function contour(g:Group,pts:P[],radius:number,gap:number,neck:number,fluid:number):string{
 const smooth=radius*(.2+fluid*.82),tube=radius*(.15+neck*.42);
 let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
 for(const id of g.ids){const p=pts[id];minx=Math.min(minx,p.x);miny=Math.min(miny,p.y);maxx=Math.max(maxx,p.x);maxy=Math.max(maxy,p.y)}
 const pad=radius+smooth+8,step=Math.max(1.6,Math.min(3,Math.min(gap,radius*2)/18));
 minx-=pad;miny-=pad;maxx+=pad;maxy+=pad;
 const nx=Math.ceil((maxx-minx)/step)+1,ny=Math.ceil((maxy-miny)/step)+1;
 const values=new Float32Array(nx*ny);
 const lines=g.pairs.map(([a,b])=>{const p=pts[a],q=pts[b],dx=q.x-p.x,dy=q.y-p.y;return{p,dx,dy,d2:dx*dx+dy*dy}});
 const minSmooth=(a:number,b:number,k:number)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25};
 const hr=gap*.12,wall=Math.max(radius*.35,Math.min(gap*.17,radius*.75));
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
 const px=minx+x*step,py=miny+y*step;let d=Infinity;
 for(const id of g.ids){const p=pts[id];d=Math.min(d,Math.hypot(px-p.x,py-p.y)-radius)}
 for(const l of lines){const t=Math.max(0,Math.min(1,((px-l.p.x)*l.dx+(py-l.p.y)*l.dy)/l.d2));d=minSmooth(d,Math.hypot(px-l.p.x-t*l.dx,py-l.p.y-t*l.dy)-tube,smooth)}
 for(const h of g.holes)d=minSmooth(d,Math.hypot(px-h.x,py-h.y)-(hr+wall),Math.min(smooth,radius*.7));
 values[y*nx+x]=d;
 }
 type V={id:string;x:number;y:number};
 const segments:[V,V][]=[],cache=new Map<string,V>();
 const vertex=(x:number,y:number,side:number,v:number[]):V=>{
 let ax=0,ay=0,bx=0,by=0,va=0,vb=0,id="";
 if(side===0){ax=x;ay=y;bx=x+1;by=y;va=v[0];vb=v[1];id="h"+x+":"+y}
 else if(side===1){ax=x+1;ay=y;bx=x+1;by=y+1;va=v[1];vb=v[2];id="v"+(x+1)+":"+y}
 else if(side===2){ax=x;ay=y+1;bx=x+1;by=y+1;va=v[3];vb=v[2];id="h"+x+":"+(y+1)}
 else{ax=x;ay=y;bx=x;by=y+1;va=v[0];vb=v[3];id="v"+x+":"+y}
 const old=cache.get(id);if(old)return old;
 const t=Math.max(0,Math.min(1,va/(va-vb||1))),p={id,x:minx+(ax+(bx-ax)*t)*step,y:miny+(ay+(by-ay)*t)*step};cache.set(id,p);return p;
 };
 for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
 const v=[values[y*nx+x],values[y*nx+x+1],values[(y+1)*nx+x+1],values[(y+1)*nx+x]],cross:number[]=[];
 for(let s=0;s<4;s++){const [a,b]=([[0,1],[1,2],[3,2],[0,3]] as [number,number][])[s];if((v[a]<0)!==(v[b]<0))cross.push(s)}
 if(cross.length===2)segments.push([vertex(x,y,cross[0],v),vertex(x,y,cross[1],v)]);
 else if(cross.length===4){const mid=v.reduce((a,b)=>a+b,0)/4;for(const [a,b] of ((v[0]<0)===(mid<0)?[[0,1],[2,3]]:[[0,3],[1,2]]))segments.push([vertex(x,y,a,v),vertex(x,y,b,v)])}
 }
 const adj=new Map<string,number[]>();segments.forEach((segment,i)=>segment.forEach(p=>{if(!adj.has(p.id))adj.set(p.id,[]);adj.get(p.id)!.push(i)}));
 const used=new Set<number>();let path="";
 for(let i=0;i<segments.length;i++){
 if(used.has(i))continue;const loop:V[]=[];let current=segments[i][0],start=current.id,closed=false;
 for(let n=0;n<=segments.length;n++){const next=(adj.get(current.id)||[]).find(j=>!used.has(j));if(next===undefined)break;used.add(next);loop.push(current);const seg=segments[next];current=seg[0].id===current.id?seg[1]:seg[0];if(current.id===start){closed=true;break}}
 if(!closed||loop.length<5)continue;
 const p=(j:number)=>loop[(j+loop.length)%loop.length],fmt=(v:number)=>v.toFixed(2);
 path+="M "+fmt((p(-1).x+p(0).x)/2)+" "+fmt((p(-1).y+p(0).y)/2);
 for(let j=0;j<loop.length;j++){const a=p(j),b=p(j+1);path+=" Q "+fmt(a.x)+" "+fmt(a.y)+" "+fmt((a.x+b.x)/2)+" "+fmt((a.y+b.y)/2)}path+=" Z ";
 }
 return path;
}
function makeSeed(cols:number,rows:number,density:number,seed:number){const e=new Set<string>(),random=rng(seed);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*cols+c;for(const [dx,dy] of [[1,0],[0,1],[1,1],[-1,1]]){const xx=c+dx,yy=r+dy;if(xx>=0&&xx<cols&&yy>=0&&yy<rows&&random()<density*(dx&&dy?.53:1))e.add(key(a,yy*cols+xx))}}return e}
export default function DotConnect(){
 const [cols,setCols]=useState(10),[rows,setRows]=useState(10),[spacing,setSpacing]=useState(100),[size,setSize]=useState(70),[neck,setNeck]=useState(45),[fluid,setFluid]=useState(70),[hole,setHole]=useState(55),[density,setDensity]=useState(22),[ink,setInk]=useState("#f34c1d"),[bg,setBg]=useState("#d7d7d4"),[multi,setMulti]=useState(false),[outline,setOutline]=useState(false),[tool,setTool]=useState<"connect"|"remove">("connect"),[seed,setSeed]=useState(31415);
 const [edges,setEdges]=useState<Set<string>>(()=>makeSeed(10,10,.22,31415)),[colors,setColors]=useState<Record<number,number>>({});
 const svg=useRef<SVGSVGElement>(null),drag=useRef<{start:number;last:number;moved:boolean}|null>(null);
 const base=600/Math.max(9,cols-1,rows-1),gap=base*spacing/100,radius=base*size/100*.46;
 const spanX=gap*(cols-1),spanY=gap*(rows-1),view=Math.max(700,spanX+radius*2+60,spanY+radius*2+60),offset=(700-view)/2;
 const pts=useMemo(()=>{const data:P[]=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)data.push({x:(700-spanX)/2+c*gap,y:(700-spanY)/2+r*gap,r,c});return data},[rows,cols,spanX,spanY,gap]);
 const groups=useMemo(()=>groupNodes(pts,edges,cols,rows),[pts,edges,cols,rows]);
 const holePath=(x:number,y:number,r:number)=>`M ${x-r} ${y} A ${r} ${r} 0 1 0 ${x+r} ${y} A ${r} ${r} 0 1 0 ${x-r} ${y} Z`;
 const paths=useMemo(()=>groups.map(g=>({group:g,d:g.pairs.length?contour(g,pts,radius,gap,neck/100,fluid/100)+g.holes.map(h=>holePath(h.x,h.y,gap*(.12+hole/100*.22))).join(" "):""})),[groups,pts,radius,gap,neck,fluid,hole]);
 const reSeed=(c=cols,r=rows,d=density,s=seed)=>{setEdges(makeSeed(c,r,d/100,s));setColors({})};
 const pick=(e:React.PointerEvent<SVGSVGElement>)=>{const rect=svg.current!.getBoundingClientRect();const x=offset+(e.clientX-rect.left)/rect.width*view,y=offset+(e.clientY-rect.top)/rect.height*view;let best=-1,dist=Infinity;pts.forEach((p,i)=>{const v=(p.x-x)**2+(p.y-y)**2;if(v<dist){dist=v;best=i}});return Math.sqrt(dist)<gap*.56?best:-1};
 const travel=(a:number,b:number)=>{if(a<0||b<0||a===b)return;const p=pts[a],q=pts[b],n=Math.max(Math.abs(p.r-q.r),Math.abs(p.c-q.c));setEdges(old=>{const next=new Set(old);let prev=a;for(let j=1;j<=n;j++){const r=Math.round(p.r+(q.r-p.r)*j/n),c=Math.round(p.c+(q.c-p.c)*j/n),id=r*cols+c;if(id!==prev&&Math.max(Math.abs(pts[prev].r-r),Math.abs(pts[prev].c-c))===1){const k=key(prev,id);if(tool==="connect")next.add(k);else next.delete(k)}prev=id}return next})};
 const slider=(label:string,value:number,onChange:(n:number)=>void,min:number,max:number,suffix="%")=><label className="dc-control"><span>{label}<b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={e=>onChange(+e.target.value)}/></label>;
 const exportSvg=()=>{const xml=new XMLSerializer().serializeToString(svg.current!);const blob=new Blob([xml],{type:"image/svg+xml"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`dot-connect-${cols}x${rows}-${seed}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)};
 return <main className="dc-page">
 <header className="dc-top"><Link href="/">← INDEX</Link><strong>DOT / CONNECT</strong><span>REC-11 · TEST</span><button onClick={exportSvg}>↓ SVG</button></header>
 <div className="dc-work"><section className="dc-art" aria-label="Interactive dot grid">
 <svg ref={svg} viewBox={`${offset} ${offset} ${view} ${view}`} xmlns="http://www.w3.org/2000/svg" onPointerDown={e=>{const id=pick(e);if(id<0)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={start:id,last:id,moved:false}}} onPointerMove={e=>{if(!drag.current)return;const id=pick(e);if(id<0||id===drag.current.last)return;travel(drag.current.last,id);drag.current.last=id;drag.current.moved=true}} onPointerUp={e=>{const d=drag.current;if(!d)return;const id=pick(e);if(!d.moved&&id===d.start){const g=groups.find(g=>g.ids.includes(id));if(g)setColors(c=>({...c,[g.id]:((c[g.id]||0)+1)%(multi?palette.length:2)}))}drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
 <rect x={offset} y={offset} width={view} height={view} fill={bg}/>
 {paths.map(({group:g,d})=>{const index=colors[g.id]||0,color=multi?palette[index%palette.length]:(index%2?bg:ink);return g.pairs.length?<path key={g.id} d={d} fill={outline?"none":color} fillRule="evenodd" stroke={outline?color:"none"} strokeWidth={Math.max(1.4,radius*.17)} strokeLinejoin="round"/>:<circle key={g.id} cx={pts[g.id].x} cy={pts[g.id].y} r={radius} fill={outline?"none":color} stroke={outline?color:"none"} strokeWidth={Math.max(1.4,radius*.17)}/>})}
 </svg><div className="dc-help">DRAG TO CONNECT · CLICK A GROUP TO RECOLOUR</div></section>
 <aside className="dc-panel">
 <div className="dc-control"><span>TOOL</span><div className="dc-pair"><button className={tool==="connect"?"active":""} onClick={()=>setTool("connect")}>CONNECT</button><button className={tool==="remove"?"active":""} onClick={()=>setTool("remove")}>REMOVE</button></div></div>
 <div className="dc-control"><span>RENDER</span><div className="dc-pair"><button className={!outline?"active":""} onClick={()=>setOutline(false)}>SOLID</button><button className={outline?"active":""} onClick={()=>setOutline(true)}>OUTLINE</button></div></div>
 {slider("COLUMNS",cols,n=>{setCols(n);reSeed(n,rows)},2,24,"")}
 {slider("ROWS",rows,n=>{setRows(n);reSeed(cols,n)},2,24,"")}
 {slider("SPACING",spacing,setSpacing,60,150)}
 {slider("DOT SIZE",size,setSize,30,95)}
 {slider("CONNECTION",neck,setNeck,10,90)}
 {slider("FLUIDITY",fluid,setFluid,10,100)}
 {slider("HOLE DIAMETER",hole,setHole,15,85)}
 {slider("DENSITY",density,n=>{setDensity(n);reSeed(cols,rows,n)},0,65)}
 <div className="dc-control"><span>COLOURS</span><div className="dc-pair dc-colors"><input aria-label="Ink" type="color" value={ink} onChange={e=>setInk(e.target.value)}/><input aria-label="Background" type="color" value={bg} onChange={e=>setBg(e.target.value)}/><button className={multi?"active":""} onClick={()=>{setMulti(!multi);setColors({})}}>MULTI {multi?"ON":"OFF"}</button></div></div>
 <div className="dc-pair"><button className="active" onClick={()=>{const s=Math.floor(Math.random()*999999);setSeed(s);reSeed(cols,rows,density,s)}}>↻ RANDOM</button><button onClick={()=>{setEdges(new Set());setColors({})}}>CLEAR</button></div>
 <label className="dc-control"><span>SEED</span><input type="number" value={seed} onChange={e=>{const s=Math.max(0,Math.floor(+e.target.value||0));setSeed(s);reSeed(cols,rows,density,s)}}/></label>
 </aside></div><footer className="dc-footer"><span>8-NEIGHBOUR / FLUID VECTOR CONTOURS</span><span>{edges.size} LINKS · {groups.reduce((s,g)=>s+g.holes.length,0)} HOLES</span></footer>
 </main>;
}
