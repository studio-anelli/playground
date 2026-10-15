"use client";
import {useMemo,useRef,useState} from "react";
import Link from "next/link";
import "./dual-grid.css";
type Pt={x:number;y:number;r:number;c:number};
type Group={id:number;ids:number[];pairs:[number,number][];cells:{x:number;y:number;closed:boolean}[]};
const key=(a:number,b:number)=>Math.min(a,b)+":"+Math.max(a,b);
const prng=(seed:number)=>{let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}};
const palette=["#f14b18","#522d8b","#dfa031","#166a80","#c51c2a"];
function seeded(cols:number,rows:number,density:number,seed:number){const e=new Set<string>(),rand=prng(seed);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)for(const [dx,dy] of [[1,0],[0,1],[1,1],[-1,1]]){const x=c+dx,y=r+dy;if(x>=0&&x<cols&&y>=0&&y<rows&&rand()<density*(dx&&dy?.45:1))e.add(key(r*cols+c,y*cols+x))}return e}
function connected(pts:Pt[],edges:Set<string>,cols:number,rows:number):Group[]{
 const adj=pts.map(()=>[] as number[]);for(const k of edges){const [a,b]=k.split(":").map(Number);if(pts[a]&&pts[b]){adj[a].push(b);adj[b].push(a)}}
 const seen=new Set<number>(),groups:Group[]=[];
 for(let i=0;i<pts.length;i++){if(seen.has(i))continue;const ids=[i],pairs:Group["pairs"]=[],cells:Group["cells"]=[];seen.add(i);for(let j=0;j<ids.length;j++)for(const b of adj[ids[j]])if(!seen.has(b)){seen.add(b);ids.push(b)}
 for(const a of ids)for(const b of adj[a])if(a<b)pairs.push([a,b]);
 const members=new Set(ids);
 for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){const a=r*cols+c,b=a+1,d=a+cols,e=d+1;
 if(![a,b,d,e].some(j=>members.has(j)))continue;
 const closed=[key(a,b),key(b,e),key(e,d),key(d,a)].every(k=>edges.has(k));
 cells.push({x:(pts[a].x+pts[e].x)/2,y:(pts[a].y+pts[e].y)/2,closed})}
 groups.push({id:Math.min(...ids),ids,pairs,cells})}
 return groups;
}
function contour(g:Group,pts:Pt[],radius:number,gap:number,neck:number,fluid:number):string{
 const smooth=radius*(.20+fluid*.82),tube=radius*(.15+neck*.42);
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
 for(const h of g.cells)if(h.closed)d=minSmooth(d,Math.hypot(px-h.x,py-h.y)-(hr+wall),Math.min(smooth,radius*.7));
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

function circularHole(x:number,y:number,r:number){return `M ${x-r} ${y} A ${r} ${r} 0 1 0 ${x+r} ${y} A ${r} ${r} 0 1 0 ${x-r} ${y} Z`}
export default function DualGrid(){
 const [cols,setCols]=useState(9),[rows,setRows]=useState(9),[spacing,setSpacing]=useState(100),[dotSize,setDotSize]=useState(76),[bridge,setBridge]=useState(70),[junction,setJunction]=useState(55),[holeSize,setHoleSize]=useState(32),[density,setDensity]=useState(22),[guides,setGuides]=useState(true),[direction,setDirection]=useState<"all"|"diagonal">("all"),[tool,setTool]=useState<"connect"|"remove">("connect"),[ink,setInk]=useState("#f14b18"),[bg,setBg]=useState("#d6d6d3"),[multi,setMulti]=useState(false),[seed,setSeed]=useState(2718),[edges,setEdges]=useState<Set<string>>(()=>seeded(9,9,.22,2718)),[outlined,setOutlined]=useState<Set<number>>(()=>new Set());
 const ref=useRef<SVGSVGElement>(null),drawing=useRef<{pointer:number;last:number;start:number;moved:boolean}|null>(null);
 const base=610/Math.max(8,cols-1,rows-1),step=base*spacing/100,r=base*dotSize/100*.46,spanX=step*(cols-1),spanY=step*(rows-1),view=Math.max(750,Math.max(spanX,spanY)+r*2+90),off=(750-view)/2;
 const pts=useMemo(()=>{const arr:Pt[]=[];for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)arr.push({x:(750-spanX)/2+col*step,y:(750-spanY)/2+row*step,r:row,c:col});return arr},[cols,rows,spanX,spanY,step]);
 const groups=useMemo(()=>connected(pts,edges,cols,rows),[pts,edges,cols,rows]);
 const outlines=useMemo(()=>groups.map(g=>({group:g,path:g.pairs.length?contour(g,pts,r,step,bridge/100,junction/100)+g.cells.filter(h=>h.closed).map(h=>circularHole(h.x,h.y,step*holeSize/200)).join(" "):""})),[groups,pts,r,step,bridge,junction,holeSize]);
 const reSeed=(c=cols,rr=rows,d=density,s=seed,dir=direction)=>{const next=seeded(c,rr,d/100,s);if(dir==="diagonal")for(const edge of next){const [a,b]=edge.split(":").map(Number);if(Math.abs(Math.floor(a/c)-Math.floor(b/c))!==1||Math.abs(a%c-b%c)!==1)next.delete(edge)}setEdges(next);setOutlined(new Set())};
 const point=(e:React.PointerEvent<SVGSVGElement>)=>{const matrix=ref.current?.getScreenCTM();if(!matrix)return null;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());return {x:p.x,y:p.y}};
 const pick=(p:{x:number;y:number})=>{let id=-1,d=Infinity;pts.forEach((q,i)=>{const z=(p.x-q.x)**2+(p.y-q.y)**2;if(z<d){d=z;id=i}});return Math.sqrt(d)<step*.58?id:-1};
 const connect=(a:number,b:number)=>{const p=pts[a],q=pts[b];if(!p||!q||a===b)return;const dr=Math.abs(p.r-q.r),dc=Math.abs(p.c-q.c);if(Math.max(dr,dc)>1||(direction==="diagonal"&&!(dr===1&&dc===1)))return;setEdges(old=>{const n=new Set(old),k=key(a,b);if(tool==="connect")n.add(k);else n.delete(k);return n})};
 const dragTo=(a:number,b:number)=>{if(a===b)return;const p=pts[a],q=pts[b],steps=Math.max(Math.abs(p.r-q.r),Math.abs(p.c-q.c));let last=a;for(let j=1;j<=steps;j++){const rr=Math.round(p.r+(q.r-p.r)*j/steps),cc=Math.round(p.c+(q.c-p.c)*j/steps),id=rr*cols+cc;if(direction==="diagonal"&&(Math.abs(pts[last].r-rr)!==1||Math.abs(pts[last].c-cc)!==1))continue;connect(last,id);last=id}};
 const onMove=(e:React.PointerEvent<SVGSVGElement>)=>{const d=drawing.current;if(!d||d.pointer!==e.pointerId)return;const p=point(e);if(!p)return;const id=pick(p);if(id>=0&&id!==d.last){dragTo(d.last,id);d.last=id;d.moved=true}};
 const changeDir=(v:"all"|"diagonal")=>{setDirection(v);if(v==="diagonal")setEdges(old=>new Set([...old].filter(k=>{const [a,b]=k.split(":").map(Number);return Math.abs(pts[a].r-pts[b].r)===1&&Math.abs(pts[a].c-pts[b].c)===1})))};
 const slider=(name:string,value:number,onChange:(v:number)=>void,min:number,max:number,suffix="%")=><label className="dg-control"><span>{name}<b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={e=>onChange(+e.target.value)}/></label>;
 const exportSvg=()=>{const src=ref.current?.cloneNode(true) as SVGSVGElement;if(!src)return;src.querySelector("#dg-guides")?.remove();src.querySelector("#dg-cursors")?.remove();src.setAttribute("width",String(Math.round(view)));src.setAttribute("height",String(Math.round(view)));const blob=new Blob([new XMLSerializer().serializeToString(src)],{type:"image/svg+xml;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="dot-connect-dual-grid-"+seed+".svg";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)};
 return <main className="dg-root"><header className="dg-header"><Link href="/experiments/dot-connect">← DOT / CONNECT</Link><strong>DOT / CONNECT <small>DUAL GRID STUDY</small></strong><button onClick={exportSvg}>↓ SVG</button></header>
 <div className="dg-layout"><section className="dg-stage"><svg ref={ref} viewBox={`${off} ${off} ${view} ${view}`} xmlns="http://www.w3.org/2000/svg" onPointerDown={e=>{if(e.pointerType==="mouse"&&e.button!==0)return;const p=point(e);if(!p)return;const id=pick(p);if(id<0)return;e.currentTarget.setPointerCapture(e.pointerId);drawing.current={pointer:e.pointerId,last:id,start:id,moved:false}}} onPointerMove={onMove} onPointerUp={e=>{const d=drawing.current;if(!d)return;onMove(e);if(!d.moved){const group=groups.find(g=>g.ids.includes(d.start));if(group)setOutlined(old=>{const n=new Set(old);if(n.has(group.id))n.delete(group.id);else n.add(group.id);return n})}drawing.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>drawing.current=null}>
 <rect x={off} y={off} width={view} height={view} fill={bg}/>
 {outlines.map(({group:g,path})=>{const color=multi?palette[g.id%palette.length]:ink,isOutline=outlined.has(g.id);return g.pairs.length?
 <path key={g.id} d={path} fill={isOutline?"none":color} fillRule="evenodd" stroke={isOutline?color:"none"} strokeWidth={Math.max(1.6,r*.16)} strokeLinejoin="round"/>:
 <circle key={g.id} cx={pts[g.id].x} cy={pts[g.id].y} r={r} fill={isOutline?"none":color} stroke={isOutline?color:"none"} strokeWidth={Math.max(1.6,r*.16)}/>})}
 {guides&&<g id="dg-guides" pointerEvents="none">{pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={r} fill="none" stroke="#4765b1" strokeOpacity=".35" strokeWidth="1"/>)}{Array.from({length:Math.max(0,(cols-1)*(rows-1))},(_,i)=>{const rr=Math.floor(i/(cols-1)),c=i%(cols-1);return <circle key={i} cx={(pts[rr*cols+c].x+pts[(rr+1)*cols+c+1].x)/2} cy={(pts[rr*cols+c].y+pts[(rr+1)*cols+c+1].y)/2} r={step*junction/200} fill="none" stroke="#d94a80" strokeOpacity=".4" strokeDasharray="3 4"/>})}</g>}
 </svg><p className="dg-hint">GRID A: MODULES · GRID B: NEGATIVE-SPACE JUNCTIONS</p></section>
 <aside className="dg-panel"><div className="dg-control"><span>TOOL</span><div className="dg-pair"><button className={tool==="connect"?"selected":""} onClick={()=>setTool("connect")}>CONNECT</button><button className={tool==="remove"?"selected":""} onClick={()=>setTool("remove")}>REMOVE</button></div></div>
 <div className="dg-control"><span>DIRECTION</span><div className="dg-pair"><button className={direction==="all"?"selected":""} onClick={()=>changeDir("all")}>ALL</button><button className={direction==="diagonal"?"selected":""} onClick={()=>changeDir("diagonal")}>DIAGONAL</button></div></div>
 {slider("COLUMNS",cols,v=>{setCols(v);reSeed(v,rows)},2,20,"")}{slider("ROWS",rows,v=>{setRows(v);reSeed(cols,v)},2,20,"")}
 {slider("SPACING",spacing,setSpacing,60,150)}{slider("GRID A / DOT SIZE",dotSize,setDotSize,30,96)}{slider("GRID A / MERGE WIDTH",bridge,setBridge,20,100)}{slider("GRID B / CURVATURE",junction,setJunction,10,95)}{slider("GRID B / HOLE",holeSize,setHoleSize,10,90)}{slider("RANDOM DENSITY",density,v=>{setDensity(v);reSeed(cols,rows,v)},0,75)}
 <label className="dg-control"><span>SHOW CONSTRUCTION GRID</span><input type="checkbox" checked={guides} onChange={e=>setGuides(e.target.checked)}/></label>
 <div className="dg-control"><span>COLOUR</span><div className="dg-pair"><input type="color" aria-label="Ink" value={ink} onChange={e=>setInk(e.target.value)}/><input type="color" aria-label="Background" value={bg} onChange={e=>setBg(e.target.value)}/><button className={multi?"selected":""} onClick={()=>setMulti(!multi)}>MULTI</button></div></div>
 <div className="dg-pair"><button className="selected" onClick={()=>{const v=Math.floor(Math.random()*999999);setSeed(v);reSeed(cols,rows,density,v)}}>↻ RANDOM</button><button onClick={()=>{setEdges(new Set());setOutlined(new Set())}}>CLEAR</button></div>
 <label className="dg-control"><span>SEED</span><input type="number" value={seed} onChange={e=>{const v=Math.max(0,Math.floor(+e.target.value||0));setSeed(v);reSeed(cols,rows,density,v)}}/></label>
 </aside></div><footer className="dg-footer"><span>DUAL GRID GEOMETRY / EXPERIMENTAL</span><span>{edges.size} CONNECTIONS</span></footer></main>
}
