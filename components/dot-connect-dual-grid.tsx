"use client";
import {useMemo,useRef,useState} from "react";
import Link from "next/link";
import "./dual-grid.css";

type Section={id:number;color:string;margin:number;corner:number};
type Point={x:number;y:number};
const colors=["#ec5238","#2b80dd","#19a05d","#f0bb36","#db67b7","#272727"];
const pair=(p:Point)=>p.x+","+p.y;
function shapes(indices:number[],cols:number,unit:number,corner:number){
 const cells=new Set(indices),segments=new Map<string,Point[]>();
 const add=(a:Point,b:Point)=>{const k=pair(a);segments.set(k,[...(segments.get(k)||[]),b])};
 for(const id of indices){const r=Math.floor(id/cols),c=id%cols,x=c*unit,y=r*unit;
 if(!cells.has(id-cols))add({x,y},{x:x+unit,y});
 if(!cells.has(id+1)||c===cols-1)add({x:x+unit,y},{x:x+unit,y:y+unit});
 if(!cells.has(id+cols))add({x:x+unit,y:y+unit},{x,y:y+unit});
 if(!cells.has(id-1)||c===0)add({x,y:y+unit},{x,y});
 }
 const paths:string[]=[];let budget=indices.length*4+4;
 while(segments.size&&budget-->0){const startKey=segments.keys().next().value as string,vertices:Point[]=[];let k=startKey,closed=false;
 for(let j=0;j<indices.length*4+4;j++){const n=segments.get(k);if(!n?.length)break;const [x,y]=k.split(",").map(Number);vertices.push({x,y});const next=n.pop()!;if(!n.length)segments.delete(k);k=pair(next);if(k===startKey){closed=true;break}}
 if(!closed||vertices.length<3)continue;
 const fmt=(v:number)=>Number(v.toFixed(2));
 const c=vertices.map((v,i)=>{const prev=vertices[(i+vertices.length-1)%vertices.length],next=vertices[(i+1)%vertices.length];const before=Math.hypot(v.x-prev.x,v.y-prev.y),after=Math.hypot(v.x-next.x,v.y-next.y),rr=Math.min(corner,before*.48,after*.48);
 return {entry:{x:v.x+(prev.x-v.x)*rr/before,y:v.y+(prev.y-v.y)*rr/before},exit:{x:v.x+(next.x-v.x)*rr/after,y:v.y+(next.y-v.y)*rr/after},v}});
 let d="M "+fmt(c[0].entry.x)+" "+fmt(c[0].entry.y);
 for(let i=0;i<c.length;i++){const a=c[i];d+=" Q "+fmt(a.v.x)+" "+fmt(a.v.y)+" "+fmt(a.exit.x)+" "+fmt(a.exit.y);const next=c[(i+1)%c.length];d+=" L "+fmt(next.entry.x)+" "+fmt(next.entry.y)}paths.push(d+" Z");
 }
 return paths.join(" ");
}
export default function GridSections(){
 const cols=11,rows=8;const [sections,setSections]=useState<Section[]>([{id:1,color:colors[0],margin:5,corner:32},{id:2,color:colors[1],margin:5,corner:32},{id:3,color:colors[2],margin:5,corner:32},{id:4,color:colors[3],margin:5,corner:32}]);
 const [cells,setCells]=useState<Record<number,number>>({});
 const [active,setActive]=useState(1),[tool,setTool]=useState<"paint"|"erase"|"select">("paint"),[showGrid,setShowGrid]=useState(true),[background,setBackground]=useState("#f0f0ed");
 const ref=useRef<SVGSVGElement>(null),drag=useRef<number|null>(null);
 const unit=60,viewW=cols*unit,viewH=rows*unit,chosen=sections.find(x=>x.id===active)||sections[0];
 const paths=useMemo(()=>sections.map(s=>({section:s,ids:Object.keys(cells).map(Number).filter(k=>cells[k]===s.id&&k>=0&&k<cols*rows),path:""})).map(x=>({...x,path:shapes(x.ids,cols,unit,x.section.corner)})),[sections,cells,cols,rows]);
 const edit=(id:number)=>{if(id<0||id>=cols*rows)return;if(tool==="select"){const sectionId=cells[id];if(sectionId)setActive(sectionId);return}setCells(prev=>{const next={...prev};if(tool==="erase")delete next[id];else next[id]=active;return next})};
 const locate=(e:React.PointerEvent<SVGSVGElement>)=>{const matrix=ref.current?.getScreenCTM();if(!matrix)return -1;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()),c=Math.floor(p.x/unit),r=Math.floor(p.y/unit);return c>=0&&c<cols&&r>=0&&r<rows?r*cols+c:-1};
 const updateSection=(changes:Partial<Section>)=>setSections(old=>old.map(s=>s.id===active?{...s,...changes}:s));
 const newSection=()=>{const id=Math.max(0,...sections.map(x=>x.id))+1;setSections(old=>[...old,{id,color:colors[(id-1)%colors.length],margin:5,corner:32}]);setActive(id);setTool("paint")};
 const exportSvg=()=>{const node=ref.current?.cloneNode(true) as SVGSVGElement;if(!node)return;node.querySelector("#construction-grid")?.remove();node.setAttribute("width",String(viewW));node.setAttribute("height",String(viewH));const content=new XMLSerializer().serializeToString(node),url=URL.createObjectURL(new Blob([content],{type:"image/svg+xml"})),a=document.createElement("a");a.href=url;a.download="grid-sections.svg";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)};
 const slider=(label:string,value:number,change:(n:number)=>void,max:number)=><label className="dg-control"><span>{label}<b>{value}px</b></span><input type="range" min="0" max={max} value={value} onChange={e=>change(+e.target.value)}/></label>;
 return <main className="dg-root"><header className="dg-header"><Link href="/experiments/dot-connect">← DOT / CONNECT</Link><strong>GRID / SECTIONS <small>SHAPE BUILDER</small></strong><button onClick={exportSvg}>↓ EXPORT SVG</button></header>
 <div className="dg-layout"><section className="dg-stage"><svg ref={ref} viewBox={`0 0 ${viewW} ${viewH}`} xmlns="http://www.w3.org/2000/svg" onPointerDown={e=>{if(e.pointerType==="mouse"&&e.button!==0)return;const id=locate(e);if(id<0)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current=e.pointerId;edit(id)}} onPointerMove={e=>{if(drag.current===e.pointerId)edit(locate(e))}} onPointerUp={e=>{if(drag.current===e.pointerId)drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>drag.current=null} onLostPointerCapture={()=>drag.current=null}>
 <rect width={viewW} height={viewH} fill={background}/>
 {paths.map(({section:s,path})=>path?<path key={s.id} d={path} fill={s.color} fillRule="evenodd" stroke={background} strokeWidth={s.margin*2} strokeLinejoin="round" strokeLinecap="round"/>:null)}
 {showGrid&&<g id="construction-grid" pointerEvents="none" fill="none" stroke="#202020" strokeWidth="1">{Array.from({length:cols+1},(_,i)=><path key={"c"+i} d={`M ${i*unit} 0 V ${viewH}`}/>)}{Array.from({length:rows+1},(_,i)=><path key={"r"+i} d={`M 0 ${i*unit} H ${viewW}`}/>)}{Array.from({length:cols*rows},(_,i)=><circle key={"dot"+i} cx={(i%cols+.5)*unit} cy={(Math.floor(i/cols)+.5)*unit} r={unit/2}/>)}</g>}
 </svg><p className="dg-hint">PAINT CELLS TO BUILD SHAPES · SELECT TO EDIT EACH SECTION · SVG EXPORT</p></section>
 <aside className="dg-panel"><div className="dg-control"><span>DRAW MODE</span><div className="dg-pair">{(["paint","select","erase"] as const).map(t=><button key={t} className={tool===t?"selected":""} onClick={()=>setTool(t)}>{t.toUpperCase()}</button>)}</div></div>
 <div className="dg-control"><span>SECTIONS</span><div className="dg-swatch">{sections.map(s=><button key={s.id} className={s.id===active?"selected":""} onClick={()=>{setActive(s.id);setTool("paint")}} title={"Section "+s.id}><i style={{background:s.color}}/>{s.id}</button>)}</div><button onClick={newSection}>+ NEW SECTION</button></div>
 <div className="dg-control"><span>ACTIVE SECTION {active}</span><input type="color" aria-label="Section colour" value={chosen.color} onChange={e=>updateSection({color:e.target.value})}/></div>
 {slider("SECTION MARGIN",chosen.margin,n=>updateSection({margin:n}),25)}
 {slider("CORNER RADIUS",chosen.corner,n=>updateSection({corner:n}),35)}
 <div className="dg-control"><span>FIXED GRID <b>11 × 8</b></span></div>
 <label className="dg-control"><span>SHOW CONSTRUCTION GRID</span><input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)}/></label>
 <div className="dg-control"><span>BACKGROUND</span><input type="color" value={background} onChange={e=>setBackground(e.target.value)}/></div>
 <div className="dg-pair"><button onClick={()=>setCells({})}>CLEAR CELLS</button><button onClick={()=>{setCells({});setSections([{id:1,color:colors[0],margin:5,corner:32}]);setActive(1)}}>RESET</button></div>
 </aside></div><footer className="dg-footer"><span>INDIVIDUAL SECTION MARGINS / ROUNDED CORNERS / COLOUR</span><span>{sections.length} SECTIONS</span></footer></main>
}
