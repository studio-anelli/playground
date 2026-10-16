"use client";
import {useRef,useState} from "react";
import Link from "next/link";
import "./dual-grid.css";

type Section={id:number;color:string};
type Mode="paint"|"erase"|"select";
type EditMode="paint"|"erase"|"select";
const U=60;
const randomSource=(seed:number)=>{let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}};
const swatches=["#ef513b","#2581db","#16965b","#f3b62e","#d477bd","#202020"];
const regionKey=(cell:number,corner:number)=>cell+":"+corner;
// A corner wedge is exactly the region inside one square, outside its inscribed circle.
// Its straight sides follow the square grid; its curved edge is a true quarter-circle.
function wedgePath(cell:number,corner:number,COLS:number){
 const x=(cell%COLS)*U,y=Math.floor(cell/COLS)*U,h=U/2;
 if(corner===0)return `M ${x} ${y} L ${x+h} ${y} A ${h} ${h} 0 0 0 ${x} ${y+h} Z`;
 if(corner===1)return `M ${x+U} ${y} L ${x+U} ${y+h} A ${h} ${h} 0 0 0 ${x+h} ${y} Z`;
 if(corner===2)return `M ${x+U} ${y+U} L ${x+h} ${y+U} A ${h} ${h} 0 0 0 ${x+U} ${y+h} Z`;
 return `M ${x} ${y+U} L ${x} ${y+h} A ${h} ${h} 0 0 0 ${x+h} ${y+U} Z`;
}
function hit(x:number,y:number,COLS:number,ROWS:number){
 const W=COLS*U,H=ROWS*U;
 if(x<0||y<0||x>=W||y>=H)return null;
 const c=Math.floor(x/U),r=Math.floor(y/U),cell=r*COLS+c;
 const dx=x-(c+.5)*U,dy=y-(r+.5)*U;
 // Circle is region -1, the four quarter-square gaps are 0..3.
 const corner=dx*dx+dy*dy<=U*U/4?-1:(dy<0?(dx<0?0:1):(dx>=0?2:3));
 return {cell,corner};
}
export default function GridSections(){
 const [COLS,setCols]=useState(11),[ROWS,setRows]=useState(8),[seed,setSeed]=useState(2718),[density,setDensity]=useState(30);
 const W=COLS*U,H=ROWS*U;
 const [sections,setSections]=useState<Section[]>([{id:1,color:swatches[0]},{id:2,color:swatches[1]},{id:3,color:swatches[2]}]);
 const [painted,setPainted]=useState<Record<string,number>>({});
 const [active,setActive]=useState(1);
 const [background,setBackground]=useState("#f2f2ef"),[showGuides,setShowGuides]=useState(true);
 const svg=useRef<SVGSVGElement>(null),stroke=useRef<{id:number;last:string;mode:EditMode}|null>(null),hover=useRef("");
 const chosen=sections.find(s=>s.id===active)||sections[0];
 const locate=(e:React.PointerEvent<SVGSVGElement>)=>{const m=svg.current?.getScreenCTM();if(!m)return null;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());return hit(p.x,p.y,COLS,ROWS)};
 const apply=(loc:{cell:number;corner:number}|null)=>{if(!loc)return;const k=regionKey(loc.cell,loc.corner),mode=stroke.current?.mode||"select";
 if(stroke.current?.last===k&&mode!=="select")return;if(stroke.current)stroke.current.last=k;
 if(mode==="select"){if(painted[k])setActive(painted[k]);return}
 setPainted(prev=>{if(mode==="erase"){if(!(k in prev))return prev;const n={...prev};delete n[k];return n}if(prev[k]===active)return prev;return {...prev,[k]:active}})};
 const color=(id:number)=>sections.find(s=>s.id===id)?.color||swatches[0];
 const create=()=>{const id=Math.max(...sections.map(s=>s.id),0)+1;setSections(s=>[...s,{id,color:swatches[(id-1)%swatches.length]}]);setActive(id)};
 const generate=(n=seed,d=density)=>{const random=randomSource(n),result:Record<string,number>={},total=COLS*ROWS;
 const filled=new Set<number>(),count=Math.round(total*d/100),islands=Math.max(1,Math.min(sections.length*2,Math.ceil(total/28)));
 const walkers=Array.from({length:islands},(_,i)=>({x:Math.floor(random()*COLS),y:Math.floor(random()*ROWS),angle:random()*Math.PI*2,id:sections[i%sections.length].id}));
 // Seeded growth follows persistent directions, yielding connected ribbons and islands.
 let attempts=0;
 while(filled.size<count&&attempts++<Math.max(200,total*90)){
 const w=walkers[attempts%walkers.length],index=w.y*COLS+w.x;filled.add(index);result[regionKey(index,-1)]=w.id;
 if(random()<.11)w.angle+=(random()-.5)*Math.PI*1.8;
 const theta=w.angle+(random()-.5)*1.05,dx=Math.cos(theta),dy=Math.sin(theta);
 if(Math.abs(dx)>Math.abs(dy)){w.x+=Math.sign(dx)}else{w.y+=Math.sign(dy)}
 if(w.x<0||w.x>=COLS||w.y<0||w.y>=ROWS){w.x=Math.min(COLS-1,Math.max(0,w.x));w.y=Math.min(ROWS-1,Math.max(0,w.y));w.angle+=Math.PI*(.65+random()*.7)}
 if(attempts%19===0&&random()<.45){w.x=Math.floor(random()*COLS);w.y=Math.floor(random()*ROWS)}
 }
 // Fill corner wedges where adjacent cells belong to the same island.
 for(const cell of filled){const r=Math.floor(cell/COLS),c=cell%COLS,id=result[regionKey(cell,-1)];
 for(let corner=0;corner<4;corner++){const dy=corner<2?-1:1,dx=corner===0||corner===3?-1:1;
 const neighbours=[[r+dy,c],[r,c+dx],[r+dy,c+dx]].filter(([rr,cc])=>rr>=0&&rr<ROWS&&cc>=0&&cc<COLS);
 const matches=neighbours.filter(([rr,cc])=>result[regionKey(rr*COLS+cc,-1)]===id).length;
 if(matches>=2||(matches>=1&&random()<.42))result[regionKey(cell,corner)]=id;
 }}
 setPainted(result)};
 const resize=(c:number,r:number)=>{setCols(c);setRows(r);setPainted(old=>{const next:Record<string,number>={};for(const [k,id] of Object.entries(old)){const [index,corner]=k.split(":").map(Number),row=Math.floor(index/COLS),col=index%COLS;if(row<r&&col<c)next[regionKey(row*c+col,corner)]=id}return next})};
 const save=()=>{const element=svg.current?.cloneNode(true) as SVGSVGElement;if(!element)return;element.querySelector("#construction-grid")?.remove();element.setAttribute("width",String(W));element.setAttribute("height",String(H));const xml=new XMLSerializer().serializeToString(element),url=URL.createObjectURL(new Blob([xml],{type:"image/svg+xml;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download=`grid-sections-${COLS}x${ROWS}-${seed}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 return <main className="dg-root"><header className="dg-header"><Link href="/experiments/dot-connect">← DOT / CONNECT</Link><strong>GRID / SECTIONS <small>{COLS} × {ROWS} GEOMETRY</small></strong><button onClick={save}>↓ EXPORT SVG</button></header>
 <div className="dg-layout"><section className="dg-stage">
 <svg ref={svg} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
 onPointerDown={e=>{if(e.pointerType==="mouse"&&e.button!==0)return;const p=locate(e);if(!p)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);stroke.current={id:e.pointerId,last:"",mode:e.shiftKey?"erase":e.metaKey||e.ctrlKey?"paint":"select"};apply(p)}}
 onPointerMove={e=>{if(stroke.current?.id===e.pointerId){if(stroke.current.mode!=="select")apply(locate(e));return}const mode=e.shiftKey?"erase":e.metaKey||e.ctrlKey?"paint":null;if(!mode){hover.current="";return}const loc=locate(e);if(!loc)return;const token=mode+":"+regionKey(loc.cell,loc.corner);if(hover.current===token)return;hover.current=token;stroke.current={id:e.pointerId,last:"",mode};apply(loc);stroke.current=null}} onPointerLeave={()=>{hover.current=""}}
 onPointerUp={e=>{if(stroke.current?.id!==e.pointerId)return;apply(locate(e));stroke.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}
 onPointerCancel={()=>stroke.current=null} onLostPointerCapture={()=>stroke.current=null}>
 <rect width={W} height={H} fill={background}/>
 {Array.from({length:COLS*ROWS},(_,i)=>{const assigned=painted[regionKey(i,-1)];return assigned?<circle key={"circle-"+i} cx={(i%COLS+.5)*U} cy={(Math.floor(i/COLS)+.5)*U} r={U/2} fill={color(assigned)}/>:null})}
 {Array.from({length:COLS*ROWS*4},(_,i)=>{const cell=Math.floor(i/4),corner=i%4,assigned=painted[regionKey(cell,corner)];return assigned?<path key={"corner-"+i} d={wedgePath(cell,corner,COLS)} fill={color(assigned)}/>:null})}
 {showGuides&&<g id="construction-grid" stroke="#1e1e1e" strokeWidth=".85" fill="none" pointerEvents="none">
 {Array.from({length:COLS+1},(_,i)=><path key={"x"+i} d={`M ${i*U} 0 V ${H}`}/>)}
 {Array.from({length:ROWS+1},(_,i)=><path key={"y"+i} d={`M 0 ${i*U} H ${W}`}/>)}
 {Array.from({length:COLS*ROWS},(_,i)=><circle key={"o"+i} cx={(i%COLS+.5)*U} cy={(Math.floor(i/COLS)+.5)*U} r={U/2}/>)}
 </g>}
 </svg><p className="dg-hint">CLICK SELECT · ⌘ HOVER PAINT · SHIFT HOVER ERASE</p></section>
 <aside className="dg-panel"><div className="dg-control"><span>INTERACTION</span><span>CLICK — SELECT COLOUR</span><span>⌘ + HOVER — PAINT</span><span>SHIFT + HOVER — ERASE</span></div>
 <div className="dg-control"><span>SECTIONS</span><div className="dg-swatch">{sections.map(s=><button key={s.id} className={active===s.id?"selected":""} onClick={()=>setActive(s.id)}><i style={{background:s.color}}/>{s.id}</button>)}</div><button onClick={create}>+ NEW COLOUR / SECTION</button></div>
 <div className="dg-control"><span>SECTION {active} COLOUR</span><input type="color" value={chosen.color} onChange={e=>setSections(ss=>ss.map(s=>s.id===active?{...s,color:e.target.value}:s))}/></div>
 <div className="dg-control"><span>GRID SIZE</span><div className="dg-pair"><label>COLS <input type="number" min="2" max="30" value={COLS} onChange={e=>resize(Math.max(2,Math.min(30,Math.round(+e.target.value)||2)),ROWS)}/></label><label>ROWS <input type="number" min="2" max="30" value={ROWS} onChange={e=>resize(COLS,Math.max(2,Math.min(30,Math.round(+e.target.value)||2)))}/></label></div><span>{COLS*ROWS} circles · {COLS*ROWS*4} corner regions</span></div>
 <div className="dg-control"><span>DIRECTIONAL ISLAND GENERATOR</span><div className="dg-pair"><button className="selected" onClick={()=>generate()}>GENERATE</button><button onClick={()=>{const next=Math.floor(Math.random()*1000000000);setSeed(next);generate(next)}}>NEW SEED ↻</button></div></div>
 <label className="dg-control"><span>SEED</span><input type="number" value={seed} onChange={e=>{const n=Math.max(0,Math.floor(+e.target.value)||0);setSeed(n);generate(n,density)}}/></label>
 <label className="dg-control"><span>DENSITY <b>{density}%</b></span><input type="range" min="0" max="100" value={density} onChange={e=>{const d=+e.target.value;setDensity(d);generate(seed,d)}}/></label>
 <label className="dg-control"><span>SHOW CONSTRUCTION GRID</span><input type="checkbox" checked={showGuides} onChange={e=>setShowGuides(e.target.checked)}/></label>
 <div className="dg-control"><span>BACKGROUND</span><input type="color" value={background} onChange={e=>setBackground(e.target.value)}/></div>
 <div className="dg-pair"><button onClick={()=>setPainted({})}>CLEAR</button><button onClick={()=>{setPainted({});setActive(1)}}>RESET</button></div>
 </aside></div><footer className="dg-footer"><span>INSCRIBED CIRCLES + SELECTABLE CORNER SPACES / NO ROUNDED SHAPE EFFECTS</span><span>{Object.keys(painted).length} PAINTED REGIONS</span></footer></main>
}
