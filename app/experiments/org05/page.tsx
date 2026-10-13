"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type V = { x: number; y: number };
type Guide = V & { strength: number };
type Analysis = { w: number; h: number; field: Float32Array; edge: Float32Array; gx: Float32Array; gy: Float32Array; guides: Guide[] };
type Nature = "GROWTH" | "FLOW" | "REACTION";
const W = 1000, H = 760, AW = 110, AH = 84;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const rnd=(seed:number)=>{let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}};
const noise=(x:number,y:number,s:number)=>{const v=Math.sin(x*127.1+y*311.7+s*.37)*43758.5453;return v-Math.floor(v)};
function analyze(img:HTMLImageElement,threshold:number,smoothing:number,contrast:number):Analysis{
 const c=document.createElement("canvas");c.width=AW;c.height=AH;const ctx=c.getContext("2d",{willReadFrequently:true})!;
 const scale=Math.max(AW/img.width,AH/img.height);ctx.drawImage(img,(AW-img.width*scale)/2,(AH-img.height*scale)/2,img.width*scale,img.height*scale);
 const pixels=ctx.getImageData(0,0,AW,AH).data,gray=new Float32Array(AW*AH);
 for(let i=0;i<gray.length;i++)gray[i]=1-(pixels[4*i]*.2126+pixels[4*i+1]*.7152+pixels[4*i+2]*.0722)/255;
 const blur=Math.floor(smoothing/11),field=new Float32Array(AW*AH),edge=new Float32Array(AW*AH),gx=new Float32Array(AW*AH),gy=new Float32Array(AW*AH);
 for(let y=0;y<AH;y++)for(let x=0;x<AW;x++){
 let sum=0,count=0;const step=Math.max(1,Math.floor(blur/4));
 for(let dy=-blur;dy<=blur;dy+=step)for(let dx=-blur;dx<=blur;dx+=step){sum+=gray[clamp(y+dy,0,AH-1)*AW+clamp(x+dx,0,AW-1)];count++;}
 const v=sum/count;field[y*AW+x]=clamp((v-(threshold/100-.5)*.5-.5)*(1+contrast/24)+.5,0,1);
 }
 for(let y=1;y<AH-1;y++)for(let x=1;x<AW-1;x++){
 let i=y*AW+x,dx=field[i+1]-field[i-1],dy=field[i+AW]-field[i-AW];gx[i]=dx;gy[i]=dy;edge[i]=clamp(Math.hypot(dx,dy)*2.5,0,1);
 }
 const candidates:Guide[]=[];for(let y=5;y<AH-5;y+=5)for(let x=5;x<AW-5;x+=5){
 let e=0,m=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const i=(y+dy)*AW+x+dx;e+=edge[i];m+=field[i]}
 const strength=e/25*.75+m/25*.25;candidates.push({x:x/AW,y:y/AH,strength});
 }
 candidates.sort((a,b)=>b.strength-a.strength);const guides:Guide[]=[];
 for(const p of candidates){if(guides.every(q=>Math.hypot((q.x-p.x)*W,(q.y-p.y)*H)>155))guides.push(p);if(guides.length>=5)break}
 return {w:AW,h:AH,field,edge,gx,gy,guides:guides.length?guides:[{x:.5,y:.5,strength:1}]};
}
function get(a:Analysis|undefined,kind:"field"|"edge"|"gx"|"gy",x:number,y:number){if(!a)return 0;const xi=clamp(Math.round(x*(a.w-1)),0,a.w-1),yi=clamp(Math.round(y*(a.h-1)),0,a.h-1);return a[kind][yi*a.w+xi]}
function tangent(a:Analysis|undefined,x:number,y:number,angle:number,seed:number):V{
 let gx=get(a,"gx",x,y),gy=get(a,"gy",x,y);
 const g=Math.hypot(gx,gy),noiseAng=(noise(x*13,y*12,seed)-.5)*1.3;
 const tx=g>.012?-gy/g:Math.cos(angle),ty=g>.012?gx/g:Math.sin(angle);
 const blend=.25+clamp(g*6,0,.65);return {x:Math.cos(angle+noiseAng)*(1-blend)+tx*blend,y:Math.sin(angle+noiseAng)*(1-blend)+ty*blend};
}
function line(points:V[],width:number,col:string,alpha=1){if(points.length<2)return "";return '<path d="'+points.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" ")+'" fill="none" stroke="'+col+'" stroke-width="'+width.toFixed(1)+'" opacity="'+alpha.toFixed(2)+'" stroke-linecap="round" stroke-linejoin="round"/>'}
function contours(a:Analysis|undefined,level:number){
 if(!a)return [] as V[][];
 const lines:V[][]=[],w=a.w,h=a.h,segments:[V,V][]=[];
 const pts=[[0,0],[1,0],[1,1],[0,1]];
 for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){
 const vals=[a.field[y*w+x],a.field[y*w+x+1],a.field[(y+1)*w+x+1],a.field[(y+1)*w+x]];
 const intersections:V[]=[];
 for(let k=0;k<4;k++){let n=(k+1)%4,v1=vals[k],v2=vals[n];if((v1<level)!==(v2<level)){const t=(level-v1)/(v2-v1);intersections.push({x:(x+pts[k][0]+(pts[n][0]-pts[k][0])*t)*W/(w-1),y:(y+pts[k][1]+(pts[n][1]-pts[k][1])*t)*H/(h-1)})}}
 if(intersections.length>=2)segments.push([intersections[0],intersections[1]]);
 if(intersections.length===4)segments.push([intersections[2],intersections[3]]);
 }
 // Link neighbouring marching-square edges into complete independent contours.
 const key=(p:V)=>Math.round(p.x*20)+":"+Math.round(p.y*20),adj=new Map<string,{index:number,end:0|1}[]>();
 segments.forEach((seg,i)=>seg.forEach((p,j)=>{const k=key(p),v=adj.get(k)||[];v.push({index:i,end:j as 0|1});adj.set(k,v)}));
 const used=new Set<number>();
 segments.forEach((seg,i)=>{if(used.has(i))return;used.add(i);const path:V[]=[seg[0],seg[1]];
 for(let side=0;side<2;side++){for(let iter=0;iter<500;iter++){const head=side===0?path[0]:path[path.length-1],connected=(adj.get(key(head))||[]).find(v=>!used.has(v.index));if(!connected)break;used.add(connected.index);const next=segments[connected.index][1-connected.end];if(side===0)path.unshift(next);else path.push(next)}}
 if(path.length>=5)lines.push(path);
 });
 return lines;
}

function createGraphic(a:Analysis|undefined,guides:Guide[],nature:Nature,seed:number,density:number,variation:number,width:number,influence:number,palette:string[],background:string):string{
 const random=rnd(seed),out:string[]=[];
 const anchors=guides.length?guides:[{x:.5,y:.5,strength:1}];
 const amount=Math.max(0,Math.min(1,influence/100));
 const nw=(v:V)=>Math.hypot(v.x,v.y)||1;
 const unit=(v:V):V=>{let l=nw(v);return{x:v.x/l,y:v.y/l}};
 if(nature==="GROWTH"){
  // Differential growth: periodic closed polylines undergo growth, neighbor
  // relaxation, repulsion, adaptive splitting, and image-weighted expansion.
  const loops:V[][]=[];
  anchors.slice(0,Math.max(1,Math.min(4,anchors.length))).forEach((p,g)=>{
    const cx=p.x*W,cy=p.y*H,radius=28+density*.46+g*11,n=18+Math.round(density*.08);
    const nodes:V[]=[];for(let i=0;i<n;i++){let angle=i/n*Math.PI*2,rr=radius*(.87+random()*.26);nodes.push({x:cx+rr*Math.cos(angle),y:cy+rr*Math.sin(angle)})}loops.push(nodes);
  });
  const iterations=35+Math.floor(density*.5),maxGap=20-width*.09,repelDist=30+variation*.16;
  for(let t=0;t<iterations;t++){
   for(let k=0;k<loops.length;k++){
    let nodes=loops[k];if(nodes.length>460)continue;
    const center=nodes.reduce((m,p)=>({x:m.x+p.x/nodes.length,y:m.y+p.y/nodes.length}),{x:0,y:0});
    const updated=nodes.map((p,i)=>{
      let prev=nodes[(i+nodes.length-1)%nodes.length],next=nodes[(i+1)%nodes.length];
      const tangent=unit({x:next.x-prev.x,y:next.y-prev.y});
      let normal={x:-tangent.y,y:tangent.x};
      if(normal.x*(p.x-center.x)+normal.y*(p.y-center.y)<0)normal={x:-normal.x,y:-normal.y};
      let repX=0,repY=0;
      for(let j=0;j<nodes.length;j++){let distIdx=Math.min(Math.abs(i-j),nodes.length-Math.abs(i-j));if(distIdx<=2)continue;
        let dx=p.x-nodes[j].x,dy=p.y-nodes[j].y,d=Math.hypot(dx,dy);
        if(d>0.1&&d<repelDist){let force=(repelDist-d)/repelDist;repX+=dx/d*force;repY+=dy/d*force}
      }
      const x=Math.max(0,Math.min(1,p.x/W)),y=Math.max(0,Math.min(1,p.y/H));
      const mass=get(a,"field",x,y),edge=get(a,"edge",x,y);
      const pressure=(2.1+(mass-.43)*5*amount+edge*3*amount);
      const drift=(noise(x*13+t*.03,y*13,k+seed)-.5)*variation*.015;
      return {x:p.x+normal.x*pressure+repX*.7+tangent.x*drift,y:p.y+normal.y*pressure+repY*.7+tangent.y*drift};
    });
    const split:V[]=[];
    for(let i=0;i<updated.length;i++){let p=updated[i],q=updated[(i+1)%updated.length];split.push(p);if(Math.hypot(p.x-q.x,p.y-q.y)>maxGap)split.push({x:(p.x+q.x)/2,y:(p.y+q.y)/2})}
    loops[k]=split;
   }
  }
  loops.forEach((nodes,i)=>{
   let closed=[...nodes,nodes[0]];
   out.push(line(closed,1.3+width*.035,palette[i%palette.length],.96));
   out.push(line(closed,4+width*.07,palette[i%palette.length],.24));
  });
 }
 if(nature==="FLOW"){
   // Streamline trajectories move under an image-gradient-derived vector field
   // with a soft noise perturbation and attraction to their starting anchor.
   const agents=30+Math.floor(density*1.7);
   for(let i=0;i<agents;i++){
     let origin=anchors[i%anchors.length],x=origin.x*W+(random()-.5)*(55+variation*2),y=origin.y*H+(random()-.5)*(55+variation*2);
     let angle=random()*Math.PI*2,points:V[]=[];
     const steps=23+Math.floor(random()*(25+density*.35));
     for(let j=0;j<steps;j++){
       let u=Math.max(0,Math.min(1,x/W)),v=Math.max(0,Math.min(1,y/H));
       let gx=get(a,"gx",u,v),gy=get(a,"gy",u,v),grad=Math.hypot(gx,gy);
       let tangent=grad>.012?{x:-gy/grad,y:gx/grad}:{x:Math.cos(angle),y:Math.sin(angle)};
       let turn=(noise(u*17+j*.016,v*17+i*.09,seed)-.5)*(0.35+variation*.02);
       angle=Math.atan2(tangent.y*amount+Math.sin(angle)*(1-amount),tangent.x*amount+Math.cos(angle)*(1-amount))+turn;
       x+=Math.cos(angle)*(5+variation*.09);y+=Math.sin(angle)*(5+variation*.09);
       points.push({x,y});if(x<-30||x>W+30||y<-30||y>H+30)break;
     }
     out.push(line(points,(i%9===0?4.5:0.7+random()*1.7)+width*.018,palette[i%palette.length],.55+random()*.37));
   }
 }
 if(nature==="REACTION"){
   // Deterministic Gray-Scott reaction-diffusion on a coarse lattice; the
   // source image drives the initial concentration and spatial feed rate.
   const w=110,h=84,A=new Float32Array(w*h),B=new Float32Array(w*h); A.fill(1);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let k=y*w+x,u=x/(w-1),v=y/(h-1),mass=get(a,"field",u,v),edge=get(a,"edge",u,v);
      B[k]=Math.min(1,Math.max(0,mass*.28*amount+edge*.31*amount+noise(x*.24,y*.24,seed)*.13));}
   let feed=.028+density*.00036,kill=.053+variation*.00018;
   for(let it=0;it<125;it++){
     const nextA=new Float32Array(w*h),nextB=new Float32Array(w*h);
     for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        let k=y*w+x,aa=A[k],bb=B[k],lapA=A[k-1]+A[k+1]+A[k-w]+A[k+w]-4*aa,lapB=B[k-1]+B[k+1]+B[k-w]+B[k+w]-4*bb;
        let localFeed=feed+get(a,"field",x/(w-1),y/(h-1))*.009*amount;
        let localKill=kill-get(a,"edge",x/(w-1),y/(h-1))*.007*amount;
        let reaction=aa*bb*bb;
        nextA[k]=Math.max(0,Math.min(1,aa+lapA-reaction+localFeed*(1-aa)));
        nextB[k]=Math.max(0,Math.min(1,bb+(.5+variation*.002)*lapB+reaction-(localKill+localFeed)*bb));
     }
     A.set(nextA);B.set(nextB);
   }
   // Marching squares: contour lines from simulated concentration (not
   // contours of the source pixels). Kept as vector paths for SVG export.
   const levels=5+Math.floor(density*.06);
   for(let l=0;l<levels;l++){
      const level=.1+l/levels*.68;
      for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){
       let vals=[B[y*w+x],B[y*w+x+1],B[(y+1)*w+x+1],B[(y+1)*w+x]];
       let corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]];
       const intersections:V[]=[];
       for(let q=0;q<4;q++){let p=(q+1)%4,v1=vals[q],v2=vals[p];
         if((v1<level)!==(v2<level)){let t=(level-v1)/(v2-v1);intersections.push({x:(corners[q][0]+(corners[p][0]-corners[q][0])*t)*W/(w-1),y:(corners[q][1]+(corners[p][1]-corners[q][1])*t)*H/(h-1)})}
       }
       if(intersections.length>=2)out.push(line([intersections[0],intersections[1]],1.2+width*.027,palette[l%palette.length],.8));
       if(intersections.length===4)out.push(line([intersections[2],intersections[3]],1.2+width*.027,palette[l%palette.length],.8));
      }
   }
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"><rect width="'+W+'" height="'+H+'" fill="'+background+'"/><g>'+out.join("")+'</g></svg>';
}
export default function Org05(){
 const imgRef=useRef<HTMLImageElement|null>(null),drag=useRef<number|null>(null),analysisRef=useRef<HTMLCanvasElement>(null);
 const [sourceName,setSourceName]=useState("No image — use the synthetic study or upload one"),[revision,setRevision]=useState(0);
 const [threshold,setThreshold]=useState(48),[smoothing,setSmoothing]=useState(35),[contrast,setContrast]=useState(42),[analysis,setAnalysis]=useState<Analysis|undefined>(),[guides,setGuides]=useState<Guide[]>([{x:.37,y:.44,strength:1},{x:.66,y:.63,strength:1}]);
 const [nature,setNature]=useState<Nature>("GROWTH"),[seed,setSeed]=useState(2718),[density,setDensity]=useState(50),[variation,setVariation]=useState(62),[width,setWidth]=useState(32),[influence,setInfluence]=useState(75),[showAnalysis,setShowAnalysis]=useState(true),[palette,setPalette]=useState("ink");
 const palettes:Record<string,{bg:string;ink:string[]}>={ink:{bg:"#f4eadd",ink:["#0e232f","#16383a","#192634"]},signal:{bg:"#f1dbbf",ink:["#ed643b","#153c50","#624687","#25252a"]},acid:{bg:"#f1f1c8",ink:["#002e24","#2f8f4b","#f26d21","#111b18"]},mono:{bg:"#eaeaea",ink:["#111111","#555555","#999999"]}};
 useEffect(()=>{if(!imgRef.current)return;setAnalysis(analyze(imgRef.current,threshold,smoothing,contrast));},[threshold,smoothing,contrast,revision]);
 useEffect(()=>{if(analysis)setGuides(analysis.guides);},[analysis]);
 const svg=useMemo(()=>createGraphic(analysis,guides,nature,seed,density,variation,width,influence,palettes[palette].ink,palettes[palette].bg),[analysis,guides,nature,seed,density,variation,width,influence,palette]);
 useEffect(()=>{const c=analysisRef.current;if(!c||!analysis||!showAnalysis)return;c.width=AW*3;c.height=AH*3;const ctx=c.getContext("2d")!,im=ctx.createImageData(c.width,c.height);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const v=analysis.field[Math.floor(y/3)*AW+Math.floor(x/3)],edge=analysis.edge[Math.floor(y/3)*AW+Math.floor(x/3)];const z=(y*c.width+x)*4,gray=Math.round(247-v*220-edge*55);im.data.set([gray,gray,gray,255],z)}ctx.putImageData(im,0,0);ctx.fillStyle="#fb6233";guides.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x*c.width,p.y*c.height,8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="14px sans-serif";ctx.fillText(String(i+1),p.x*c.width+12,p.y*c.height);ctx.fillStyle="#fb6233";});},[analysis,guides,showAnalysis]);
 const loadFile=(file?:File)=>{if(!file)return;const reader=new FileReader();reader.onload=()=>{const im=new Image();im.onload=()=>{imgRef.current=im;setSourceName(file.name);setRevision(v=>v+1)};im.src=String(reader.result)};reader.readAsDataURL(file)};
 const pointer=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(drag.current===null)return;const b=e.currentTarget.getBoundingClientRect();const x=clamp((e.clientX-b.left)/b.width,0,1),y=clamp((e.clientY-b.top)/b.height,0,1);setGuides(v=>v.map((p,i)=>i===drag.current?{...p,x,y}:p));};
 const slider=(label:string,val:number,onChange:(v:number)=>void)=><label style={{display:"block",fontSize:11,marginBottom:16}}><span style={{display:"flex",justifyContent:"space-between"}}>{label}<span style={{color:"#aaa"}}>{val}</span></span><input type="range" min="0" max="100" value={val} onChange={e=>onChange(+e.target.value)} style={{display:"block",width:"100%",accentColor:"#ff6739",marginTop:9}}/></label>;
 const download=()=>{const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));link.download="ORG-LINE-"+nature+"-"+seed+".svg";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)};
 return <main style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 326px",height:"100dvh",background:"#242424",color:"#eee",fontFamily:"Arial,Helvetica,sans-serif"}}>
 <section style={{minWidth:0,display:"flex",flexDirection:"column"}}>
 <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"15px 24px",background:"#101010",borderBottom:"1px solid #333"}}><div><b style={{fontSize:23}}>ORG/MATH</b> <span style={{fontSize:10,letterSpacing:2,color:"#999",marginLeft:12}}>IMAGE-STEERED MATHEMATICAL SYSTEMS</span></div><a href="/" style={{color:"#aaa",fontSize:12}}>← INDEX</a></header>
 <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,minHeight:0}}><div style={{width:"100%",maxWidth:1100,maxHeight:"100%",aspectRatio:"1000 / 760",boxShadow:"0 12px 42px #0007",background:"#f4eadd"}} dangerouslySetInnerHTML={{__html:svg}}/></div>
 <footer style={{background:"#111",padding:"12px 24px",fontSize:10,letterSpacing:1,color:"#aaa"}}>IMAGE → STRUCTURE → LINE GRAMMAR · PRIVATE DEVELOPMENT PREVIEW</footer>
 </section>
 <aside style={{overflowY:"auto",background:"#111",borderLeft:"1px solid #383838",padding:18}}>
 <div style={{fontSize:10,letterSpacing:2,color:"#999",marginBottom:15}}>01 / SOURCE + ANALYSIS</div>
 <input type="file" accept="image/*" aria-label="Upload an image" onChange={e=>loadFile(e.target.files?.[0])} style={{fontSize:11,width:"100%"}}/><p style={{fontSize:10,color:"#888",lineHeight:1.5}}>{sourceName}</p>
 <button onClick={()=>setShowAnalysis(v=>!v)} style={{width:"100%",padding:9,background:"#303030",border:"1px solid #555",color:"#eee",cursor:"pointer"}}>{showAnalysis?"HIDE ANALYSIS":"SHOW ANALYSIS"}</button>
 {showAnalysis&&<div style={{marginTop:9}}>{analysis?<canvas ref={analysisRef} style={{width:"100%",touchAction:"none",cursor:"crosshair"}} onPointerDown={e=>{const rect=e.currentTarget.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;let index=-1,dist=25;guides.forEach((p,i)=>{const d=Math.hypot((p.x-x)*rect.width,(p.y-y)*rect.height);if(d<dist){dist=d;index=i}});if(index>=0){drag.current=index;e.currentTarget.setPointerCapture(e.pointerId)}}} onPointerMove={pointer} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}/>:<div style={{background:"#292929",padding:16,fontSize:11}}>Upload a source to reveal its analysis.</div>}<p style={{fontSize:10,color:"#999"}}>Move the orange guides to redirect generated line families.</p><button onClick={()=>setGuides(v=>[...v,{x:.5,y:.5,strength:1}])}>+ GUIDE</button><button onClick={()=>setGuides(v=>v.slice(0,-1))} style={{marginLeft:8}}>− GUIDE</button></div>}
 <div style={{borderTop:"1px solid #383838",paddingTop:17,marginTop:20}}>{slider("Threshold",threshold,setThreshold)}{slider("Simplify / blur",smoothing,setSmoothing)}{slider("Contrast",contrast,setContrast)}</div>
 <div style={{borderTop:"1px solid #383838",paddingTop:17,marginTop:6}}><div style={{fontSize:10,letterSpacing:2,color:"#999",marginBottom:13}}>02 / LINE NATURE</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>{(["GROWTH","FLOW","REACTION"] as Nature[]).map(n=><button key={n} onClick={()=>setNature(n)} style={{padding:"12px 4px",fontSize:11,background:n===nature?"#eee":"#262626",color:n===nature?"#111":"#ddd",border:"1px solid #555",cursor:"pointer"}}>{n}</button>)}</div><p style={{fontSize:10,color:"#888",lineHeight:1.6}}>{nature==="FLOW"?"Adaptive node subdivision, self-repulsion, and image-driven growth.":nature==="GROWTH"?"Differential growth: closed lines expand and repel.":nature==="REACTION"?"Gray-Scott reaction–diffusion driven by the image.":"Autonomous agents integrate an image-derived vector field."}</p></div>
 <div style={{borderTop:"1px solid #383838",paddingTop:18}}>{slider("Density",density,setDensity)}{slider("Variation",variation,setVariation)}{slider("Width contrast",width,setWidth)}{slider("Image influence",influence,setInfluence)}</div>
 <div style={{borderTop:"1px solid #383838",paddingTop:18}}><label style={{fontSize:11}}>Palette<select value={palette} onChange={e=>setPalette(e.target.value)} style={{display:"block",width:"100%",background:"#252525",padding:10,marginTop:9,color:"#eee",border:"1px solid #555"}}><option value="ink">Ink / Paper</option><option value="signal">Signal / Pop</option><option value="acid">Acid / Botanical</option><option value="mono">Monochrome</option></select></label><label style={{display:"flex",justifyContent:"space-between",fontSize:11,alignItems:"center",margin:"17px 0"}}>Seed <input type="number" value={seed} onChange={e=>setSeed(Number(e.target.value))} style={{width:96,padding:8,color:"#eee",background:"#252525",border:"1px solid #555"}}/></label><button onClick={()=>setSeed(Math.floor(Math.random()*999999))} style={{width:"100%",padding:12,background:"#f16c39",border:0,cursor:"pointer",fontWeight:700}}>↻ NEW INTERPRETATION</button><button onClick={download} style={{width:"100%",marginTop:7,padding:11,background:"#222",color:"#eee",border:"1px solid #555",cursor:"pointer"}}>EXPORT SVG ↗</button></div>
 <p style={{fontSize:10,lineHeight:1.5,color:"#777",marginTop:18}}>Three mathematical engines, not visual presets. Draft experiment — not on the public index.</p>
 </aside></main>;
}
