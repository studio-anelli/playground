"use client";

import { useEffect, useMemo, useState } from "react";

type Item = { title: string; description: string };
type FontRole = "display" | "heading" | "lead" | "body" | "mono";
type FontStyle = { size: number; weight: number; tracking: number; lineHeight: number };
type BrandColour = "green" | "orange" | "pink" | "paper" | "ink";
const initialFonts: Record<FontRole,FontStyle> = {
  display:{size:100,weight:800,tracking:-7.5,lineHeight:.92},
  heading:{size:100,weight:800,tracking:-7,lineHeight:1.01},
  lead:{size:100,weight:400,tracking:-2.5,lineHeight:1.25},
  body:{size:100,weight:400,tracking:0,lineHeight:1.4},
  mono:{size:100,weight:500,tracking:0,lineHeight:1.5}
};
const initialPalette:Record<BrandColour,string>={green:"#507568",orange:"#F16A37",pink:"#DD8EB9",paper:"#F8F4EC",ink:"#25231F"};
const colourNames:Record<BrandColour,string>={green:"Mooi Groen",orange:"Heel Oranje",pink:"Ultra Roze",paper:"Oud Wit",ink:"Bijna Zwart"};
type Selection = {kind:"field";key:string} | {kind:"item";list:"themes"|"functions"|"milestones";index:number} | {kind:"section";key:SectionKey};
type SectionKey = "hero" | "intro" | "themes" | "functions" | "process" | "next" | "cta" | "footer";
type PageData = {
  heroTitle: string; heroText: string; introTitle: string; introText: string;
  processTitle: string; processText: string; ctaTitle: string; ctaText: string;
  themes: Item[]; functions: Item[]; milestones: Item[];
  order: SectionKey[]; hidden: SectionKey[];
  graphic: "circles" | "delta" | "type"; colour: "balanced" | "green" | "bright";
  density: number; scale: number; typeScale: number; compact: boolean;
  fonts: Record<FontRole,FontStyle>; palette:Record<BrandColour,string>;
  sectionColours:Record<"hero"|"functions"|"cta",BrandColour>;
};
const KEY = "durf-campus-lab-v1";
const original: PageData = {
  heroTitle: "EEN PLEK OM HET VERSCHIL TE MAKEN.",
  heroText: "Waar kennis, ideeën en mensen samenkomen om nieuwe oplossingen voor de stad te ontwikkelen.",
  introTitle: "De stad als plek voor verandering.",
  introText: "DURF Campus is het werkmerk van het Rotterdamse innovatie-ecosysteem voor grootstedelijke vraagstukken. In deze ontwikkelfase bouwen we met partners in de stad aan onze propositie. Samen verkennen we hoe we écht het verschil maken.",
  processTitle: "Een campus in wording.",
  processText: "DURF krijgt vorm door samenwerking. We brengen mensen, perspectieven en ideeën bij elkaar.",
  ctaTitle: "DURF JIJ OOK?",
  ctaText: "Heb jij ideeën, kennis of energie om bij te dragen? We komen graag met je in contact.",
  themes: Array.from({length:4},(_,i)=>({title:"Thema "+(i+1),description:"Voeg de vastgestelde themabeschrijving toe."})),
  functions: Array.from({length:4},(_,i)=>({title:"Functie "+(i+1),description:"Voeg de vastgestelde functiebeschrijving toe."})),
  milestones:[{title:"Nu",description:"Het concept samen verder ontwikkelen"},{title:"Straks",description:"Perspectieven en ideeën samenbrengen"},{title:"Daarna",description:"Nieuwe initiatieven concreet maken"}],
  order:["hero","intro","themes","functions","process","next","cta","footer"], hidden:[],
  graphic:"circles",colour:"balanced",density:60,scale:100,typeScale:100,compact:false,
  fonts:initialFonts,palette:initialPalette,sectionColours:{hero:"green",functions:"orange",cta:"pink"}
};
const sectionNames: Record<SectionKey,string> = {hero:"Hero",intro:"Proposition",themes:"Four themes",functions:"Four functions",process:"Development photography",next:"Next steps",cta:"Collaboration CTA",footer:"Partners / contact"};
const partners=["Gemeente Rotterdam","Erasmus Universiteit Rotterdam","Technische Universiteit Delft","Erasmus MC","Hogeschool Rotterdam","Albeda MBO"];
const clone = (x: PageData):PageData => JSON.parse(JSON.stringify(x));
function isPageData(x: unknown): x is PageData {
  if (!x || typeof x !== "object") return false;
  const d=x as Partial<PageData>;
  return typeof d.heroTitle === "string" && Array.isArray(d.themes) && Array.isArray(d.functions) && Array.isArray(d.order) && Array.isArray(d.hidden) && Array.isArray(d.milestones);
}
function Dots({density,scale}:{density:number;scale:number}) {
  const dots=useMemo(()=>Array.from({length:121},(_,i)=>{const x=i%11,y=Math.floor(i/11);const dist=Math.hypot(x-5,y-5);const wave=(Math.sin(x*2.4+y*1.8)+Math.cos(y*1.9-x*.7)+2)/4;const visible=wave*(1-dist/12)*100+Math.sin(x*13.2+y*8.6)*9>100-density;return {visible,size:Math.max(.15,1-dist/13+Math.sin(x+y)*.12)};}),[density]);
  return <div className="durf-dots" aria-hidden="true" style={{transform:`rotate(-12deg) scale(${scale/100})`}}>{dots.map((d,i)=><i key={i} style={{opacity:d.visible?1:0,transform:`scale(${d.size})`}} />)}</div>;
}
function Page({data,photo1,photo2,selected}:{data:PageData;photo1?:string;photo2?:string;selected:Selection|null}) {
  const section=(key:SectionKey)=>{
    switch(key){
    case "hero": return <section className="dp-section dp-hero" key={key}><div className="dp-art">{data.graphic==="circles"?<Dots density={data.density} scale={data.scale}/>:data.graphic==="delta"?<svg className="dp-delta" viewBox="0 0 500 500" fill="none" aria-hidden="true"><path d="M250 35L480 450H20Z" stroke="currentColor" strokeWidth="27" strokeLinejoin="round"/><path d="M250 155L370 385H130Z" stroke="currentColor" strokeWidth="10" strokeLinejoin="round"/></svg>:null}</div><div className="dp-overline"><span>ROTTERDAM / CAMPUS IN ONTWIKKELING</span><span>001</span></div><div className="dp-hero-content"><h1 data-edit-key="heroTitle">{data.heroTitle}</h1><p data-edit-key="heroText">{data.heroText}</p><a href="#durf-lab-cta" className="dp-button">Ontdek DURF <span>↗</span></a></div><div className="dp-overline"><span>SAMEN DENKEN. SAMEN DOEN.</span><span>↓ SCROLL</span></div></section>;
    case "intro":return <section className="dp-section" key={key}><div className="dp-overline"><span>01 / DE AMBITIE</span><span>ROTTERDAM</span></div><h2 data-edit-key="introTitle">{data.introTitle}</h2><p className="dp-lead" data-edit-key="introText">{data.introText}</p></section>;
    case "themes":return <section className="dp-section" key={key}><div className="dp-overline"><span>02 / INHOUD</span><span>VIER THEMA'S</span></div><h2>De vraagstukken van morgen.</h2><p className="dp-lead">Vier thema's die richting geven aan onze gezamenlijke ambitie.</p><div className="dp-grid">{data.themes.map((t,i)=><article className="dp-tile" data-edit-list="themes" data-edit-index={i} key={i}><div className="dp-tile-top"><span className="dp-mono">0{i+1}</span><i style={{background:["var(--green)","var(--orange)","var(--pink)","var(--ink)"][i]}}/></div><div><h3>{t.title}</h3><p>{t.description}</p></div></article>)}</div></section>;
    case "functions":return <section className="dp-section dp-functions" key={key}><div className="dp-overline"><span>03 / AANPAK</span><span>VIER FUNCTIES</span></div><h2>Van denken naar doen.</h2><p className="dp-lead">De functies die we samen willen ontwikkelen.</p><div className="dp-rows">{data.functions.map((t,i)=><article key={i} className="dp-function" data-edit-list="functions" data-edit-index={i}><span className="dp-mono">0{i+1}</span><div><h3>{t.title}</h3><p>{t.description}</p></div><span>↗</span></article>)}</div></section>;
    case "process":return <section className="dp-section" key={key}><div className="dp-overline"><span>04 / HET PROCES</span><span>IN ONTWIKKELING</span></div><h2 data-edit-key="processTitle">{data.processTitle}</h2><p className="dp-lead" data-edit-key="processText">{data.processText}</p><div className="dp-photos"><div className="dp-photo">{photo1?<img src={photo1} alt="DURF development process, first photograph"/>:<><span>01 / IN GESPREK</span><span>FOTO VOLGT</span></>}</div><div className="dp-photo">{photo2?<img src={photo2} alt="DURF development process, second photograph"/>:<span>02 / IN ONTWIKKELING</span>}</div></div><p className="dp-mono dp-photo-note">FOTOGRAFIE / SESSIE 17 NOVEMBER 2026</p></section>;
    case "next":return <section className="dp-section" key={key}><div className="dp-overline"><span>05 / PLANNING</span><span>VOLGENDE STAPPEN</span></div><h2>Dit staat er op de agenda.</h2><div className="dp-rows">{data.milestones.map((m,i)=><article className="dp-event" data-edit-list="milestones" data-edit-index={i} key={i}><span className="dp-mono">0{i+1} / {m.title}</span><h3>{m.description}</h3></article>)}</div></section>;
    case "cta":return <section className="dp-section dp-cta" id="durf-lab-cta" key={key}><div className="dp-overline"><span>06 / SAMENWERKEN</span><span>DOE MEE ↗</span></div><h2 data-edit-key="ctaTitle">{data.ctaTitle}</h2><p className="dp-lead" data-edit-key="ctaText">{data.ctaText}</p><a className="dp-button" href="#durf-lab-footer">Laten we verbinden <span>↗</span></a></section>;
    case "footer":return <footer className="dp-section dp-footer" id="durf-lab-footer" key={key}><div className="dp-logo">DURF <span>CAMPUS</span></div><div className="dp-mono">DE ZES KERNPARTNERS</div><div className="dp-partners">{partners.map(p=><span key={p}>{p}</span>)}</div><div className="dp-footline dp-mono"><span>ROTTERDAM / 2026</span><span>CONTACTGEGEVENS VOLGEN</span></div></footer>;
    }
  };
  return <div className={`durf-page ${data.compact?"dp-compact":""}`} style={{
  ["--display" as string]:`clamp(${46*data.typeScale/100*data.fonts.display.size/100}px,${8.3*data.typeScale/100*data.fonts.display.size/100}vw,${115*data.typeScale/100*data.fonts.display.size/100}px)`,
  ["--heading" as string]:`clamp(${32*data.fonts.heading.size/100}px,${5.5*data.fonts.heading.size/100}vw,${76*data.fonts.heading.size/100}px)`,
  ["--green" as string]:data.palette.green,["--orange" as string]:data.palette.orange,
  ["--pink" as string]:data.palette.pink,["--paper" as string]:data.palette.paper,["--ink" as string]:data.palette.ink,
  ["--hero-bg" as string]:data.palette[data.sectionColours.hero],
  ["--functions-bg" as string]:data.palette[data.sectionColours.functions],
  ["--cta-bg" as string]:data.palette[data.sectionColours.cta],
  ["--display-weight" as string]:data.fonts.display.weight,["--display-tracking" as string]:data.fonts.display.tracking/100+"em",["--display-line" as string]:data.fonts.display.lineHeight,
  ["--heading-weight" as string]:data.fonts.heading.weight,["--heading-tracking" as string]:data.fonts.heading.tracking/100+"em",["--heading-line" as string]:data.fonts.heading.lineHeight,
  ["--lead-size" as string]:data.fonts.lead.size/100,["--lead-weight" as string]:data.fonts.lead.weight,["--lead-tracking" as string]:data.fonts.lead.tracking/100+"em",["--lead-line" as string]:data.fonts.lead.lineHeight,
  ["--body-size" as string]:data.fonts.body.size/100,["--body-weight" as string]:data.fonts.body.weight,["--body-tracking" as string]:data.fonts.body.tracking/100+"em",["--body-line" as string]:data.fonts.body.lineHeight,
  ["--mono-size" as string]:data.fonts.mono.size/100,["--mono-weight" as string]:data.fonts.mono.weight,["--mono-tracking" as string]:data.fonts.mono.tracking/100+"em",["--mono-line" as string]:data.fonts.mono.lineHeight
}}><header className="dp-nav"><strong>DURF <span>CAMPUS</span></strong><nav>HET IDEE　 THEMA'S　 DOE MEE ↗</nav></header>{data.order.filter(s=>!data.hidden.includes(s)).map(key=><div className={selected?.kind==="section"&&selected.key===key?"dp-selected-section":""} data-edit-section={key} key={key}>{section(key)}</div>)}</div>;
}
export default function DurfCampusLab(){
  const [data,setData]=useState<PageData>(()=>clone(original));
  const [ready,setReady]=useState(false);
  const [view,setView]=useState<"desktop"|"mobile">("desktop");
  const [photo1,setPhoto1]=useState<string>();
  const [photo2,setPhoto2]=useState<string>();
  const [status,setStatus]=useState("");
  const [selected,setSelected]=useState<Selection|null>(null);
  useEffect(()=>{try{const saved=localStorage.getItem(KEY);if(saved){const parsed:unknown=JSON.parse(saved);if(isPageData(parsed)){setData({...clone(original),...parsed,fonts:{...initialFonts,...parsed.fonts},palette:{...initialPalette,...parsed.palette},sectionColours:{...original.sectionColours,...parsed.sectionColours}});}}}catch{}setReady(true);},[]);
  useEffect(()=>{if(!ready)return;try{localStorage.setItem(KEY,JSON.stringify(data));}catch{}},[data,ready]);
  const update=<K extends keyof PageData>(key:K,value:PageData[K])=>setData(p=>({...p,[key]:value}));
  const setFont=(role:FontRole,key:keyof FontStyle,value:number)=>setData(p=>({...p,fonts:{...p.fonts,[role]:{...p.fonts[role],[key]:value}}}));
  const updatePalette=(key:BrandColour,value:string)=>setData(p=>({...p,palette:{...p.palette,[key]:value}}));
  const updateSectionColour=(key:"hero"|"functions"|"cta",value:BrandColour)=>setData(p=>({...p,sectionColours:{...p.sectionColours,[key]:value}}));
  const selectPreview=(event:import("react").MouseEvent<HTMLDivElement>)=>{
    const target=event.target as HTMLElement;
    if(target.closest("a"))return;
    const field=target.closest<HTMLElement>("[data-edit-key]");
    const item=target.closest<HTMLElement>("[data-edit-list]");
    const section=target.closest<HTMLElement>("[data-edit-section]");
    if(field?.dataset.editKey){setSelected({kind:"field",key:field.dataset.editKey});return;}
    if(item?.dataset.editList){setSelected({kind:"item",list:item.dataset.editList as "themes"|"functions"|"milestones",index:Number(item.dataset.editIndex)});return;}
    if(section?.dataset.editSection){setSelected({kind:"section",key:section.dataset.editSection as SectionKey});}
  };
  const changeItem=(key:"themes"|"functions"|"milestones",idx:number,field:keyof Item,value:string)=>setData(p=>({...p,[key]:p[key].map((item,i)=>i===idx?{...item,[field]:value}:item)}));
  function move(key:SectionKey,by:number){setData(p=>{const order=[...p.order],i=order.indexOf(key),j=i+by;if(j<0||j>=order.length)return p;[order[i],order[j]]=[order[j],order[i]];return {...p,order};});}
  function download(text:string,name:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function importJson(file:File|undefined){if(!file)return;file.text().then(t=>{try{const parsed:unknown=JSON.parse(t);if(!isPageData(parsed))throw Error("Invalid format");setData({...clone(original),...parsed,fonts:{...initialFonts,...parsed.fonts},palette:{...initialPalette,...parsed.palette},sectionColours:{...original.sectionColours,...parsed.sectionColours}});setStatus("Imported project settings.");}catch{setStatus("Invalid DURF project JSON.");}});}
  function loadPhoto(file:File|undefined,which:1|2){if(!file)return;if(!file.type.startsWith("image/")){setStatus("Please select an image.");return;}const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==="string"){(which===1?setPhoto1:setPhoto2)(reader.result);setStatus("Photo loaded for this browser session. Images are not saved in JSON.");}};reader.readAsDataURL(file);}
  const label=(key:keyof PageData,name:string,multiline=false)=><label className="dl-field" key={key}><span>{name}</span>{multiline?<textarea value={String(data[key])} onChange={e=>update(key,e.target.value as never)} rows={3}/>:<input value={String(data[key])} onChange={e=>update(key,e.target.value as never)}/>}</label>;
  const collection=(key:"themes"|"functions"|"milestones")=><div className="dl-stack">{data[key].map((item,i)=><div className="dl-item" key={i}><label className="dl-field"><span>{String(i+1).padStart(2,"0")} / Title</span><input value={item.title} onChange={e=>changeItem(key,i,"title",e.target.value)}/></label><label className="dl-field"><span>Description</span><textarea rows={2} value={item.description} onChange={e=>changeItem(key,i,"description",e.target.value)}/></label></div>)}</div>;
  return <main className="durf-lab">
    <style>{styles}</style>
    <div className="dl-toolbar"><div className="dl-actions"><strong>DURF / WEB LAB <small>03</small></strong><button className={view==="desktop"?"active":""} onClick={()=>setView("desktop")}>Desktop</button><button className={view==="mobile"?"active":""} onClick={()=>setView("mobile")}>Mobile</button></div><div className="dl-actions"><button onClick={()=>download(JSON.stringify(data,null,2),"durf-campus-project.json","application/json")}>Export JSON ↓</button><label className="dl-upload">Import JSON<input aria-label="Import DURF JSON" type="file" accept=".json,application/json" onChange={e=>importJson(e.target.files?.[0])}/></label></div></div>
    <div className="dl-layout"><div className="dl-frame"><div className="dl-browser"><span>○ ○ ○</span><span>durf-campus / work in progress</span><span>↕ SCROLL</span></div><div className={`dl-viewport ${view==="mobile"?"mobile":""}`} onClick={selectPreview}><Page data={data} photo1={photo1} photo2={photo2} selected={selected}/></div></div>
    <aside className="dl-panel"><div className="dl-panel-title"><strong>Landing page editor</strong><p>DURF identity v1.1 · saved locally in this browser</p></div>
      <details open><summary>00 / Click to edit</summary><div className="dl-stack">
      <p className="dl-tip">Click any headline, paragraph, card or section in the preview to select it here. Selected text and cards can be edited below.</p>
      {selected?.kind==="field"&&<label className="dl-field"><span>{selected.key}</span><textarea rows={4} value={String(data[selected.key as keyof PageData]??"")} onChange={e=>update(selected.key as keyof PageData,e.target.value as never)}/></label>}
      {selected?.kind==="item"&&<div className="dl-stack"><strong>{selected.list} / 0{selected.index+1}</strong><label className="dl-field"><span>Title</span><input value={data[selected.list][selected.index]?.title??""} onChange={e=>changeItem(selected.list,selected.index,"title",e.target.value)}/></label><label className="dl-field"><span>Description</span><textarea rows={3} value={data[selected.list][selected.index]?.description??""} onChange={e=>changeItem(selected.list,selected.index,"description",e.target.value)}/></label></div>}
      {selected?.kind==="section"&&<div className="dl-stack"><strong>{sectionNames[selected.key]}</strong><p className="dl-tip">Selected section. Choose a palette background below, or use Sections & order to reposition it.</p>{(["hero","functions","cta"] as const).includes(selected.key as "hero"|"functions"|"cta")&&<label className="dl-field"><span>Background colour</span><select value={data.sectionColours[selected.key as "hero"|"functions"|"cta"]} onChange={e=>updateSectionColour(selected.key as "hero"|"functions"|"cta",e.target.value as BrandColour)}>{(Object.keys(initialPalette) as BrandColour[]).map(k=><option key={k} value={k}>{colourNames[k]}</option>)}</select></label>}</div>}
      {!selected&&<p className="dl-tip">Nothing selected yet. Click on an element in the page preview to edit it here.</p>}
      </div></details>
      <details><summary>01 / Visual language</summary><div className="dl-stack">
        <label className="dl-field"><span>Hero treatment</span><select value={data.graphic} onChange={e=>update("graphic",e.target.value as PageData["graphic"])}><option value="circles">Circular system</option><option value="type">Typography only</option><option value="delta">Delta exploration</option></select></label>
        <div className="dl-stack"><strong>Section colours</strong>{(["hero","functions","cta"] as const).map(key=><label className="dl-field" key={key}><span>{sectionNames[key]} background</span><select value={data.sectionColours[key]} onChange={e=>updateSectionColour(key,e.target.value as BrandColour)}>{(Object.keys(initialPalette) as BrandColour[]).map(k=><option key={k} value={k}>{colourNames[k]}</option>)}</select></label>)}</div>
        {([["density","Circle density",10,100],["scale","Circle scale",50,150],["typeScale","Type scale",75,125]] as const).map(([key,name,min,max])=><label className="dl-field" key={key}><span>{name} / {data[key]}%</span><input type="range" min={min} max={max} step="5" value={data[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}
        <label className="dl-checkbox"><input type="checkbox" checked={data.compact} onChange={e=>update("compact",e.target.checked)}/> Compact section spacing</label>
        <div className="dl-swatches">{(Object.keys(initialPalette) as BrandColour[]).map(k=><i key={k} title={colourNames[k]+" "+data.palette[k]} style={{background:data.palette[k]}}/>)}</div>
        <p className="dl-tip">All swatches are editable locally. Changes update every element using that colour token.</p>
        {(Object.keys(initialPalette) as BrandColour[]).map(k=><label className="dl-palette-edit" key={k}><input type="color" aria-label={colourNames[k]} value={data.palette[k]} onChange={e=>updatePalette(k,e.target.value)}/><span>{colourNames[k]}</span><code>{data.palette[k].toUpperCase()}</code><button onClick={()=>updatePalette(k,initialPalette[k])} title="Restore official colour">↺</button></label>)}
      </div></details>
      <details><summary>02 / Reusable font styles</summary><div className="dl-stack"><p className="dl-tip">Instrument Sans for display, heading, lead and body. IBM Plex Mono Medium for metadata. All values update the full page.</p>
      {(["display","heading","lead","body","mono"] as FontRole[]).map(role=><div className="dl-item" key={role}><strong>{role.toUpperCase()}</strong>
      {([["size","Scale %",60,160,5],["weight","Weight",400,800,100],["tracking","Tracking / 0.01em",-12,12,.5],["lineHeight","Line height",.8,2,.05]] as const).map(([key,title,min,max,step])=><label className="dl-field" key={key}><span>{title} · {data.fonts[role][key]}</span><input type="range" min={min} max={max} step={step} value={data.fonts[role][key]} onChange={e=>setFont(role,key,Number(e.target.value))}/></label>)}
      <button className="dl-small-button" onClick={()=>setData(p=>({...p,fonts:{...p.fonts,[role]:{...initialFonts[role]}}}))}>Reset {role}</button></div>)}
      </div></details>
      <details><summary>03 / Hero & proposition</summary><div className="dl-stack">{label("heroTitle","Hero headline",true)}{label("heroText","Hero description",true)}{label("introTitle","Proposition headline",true)}{label("introText","Proposition text",true)}</div></details>
      <details><summary>03 / Four themes</summary>{collection("themes")}</details>
      <details><summary>04 / Four functions</summary>{collection("functions")}</details>
      <details><summary>05 / Process & photography</summary><div className="dl-stack">{label("processTitle","Headline")}{label("processText","Description",true)}<label className="dl-field"><span>Photo 01 (session only)</span><input type="file" accept="image/*" onChange={e=>loadPhoto(e.target.files?.[0],1)}/></label><label className="dl-field"><span>Photo 02 (session only)</span><input type="file" accept="image/*" onChange={e=>loadPhoto(e.target.files?.[0],2)}/></label></div></details>
      <details><summary>06 / Next steps</summary>{collection("milestones")}</details>
      <details><summary>07 / Collaboration CTA</summary><div className="dl-stack">{label("ctaTitle","Headline",true)}{label("ctaText","Description",true)}</div></details>
      <details><summary>08 / Sections & order</summary><div className="dl-stack">{data.order.map((s,i)=><div className="dl-order" key={s}><label><input type="checkbox" checked={!data.hidden.includes(s)} onChange={e=>update("hidden",e.target.checked?data.hidden.filter(x=>x!==s):[...data.hidden,s])}/>{sectionNames[s]}</label><div><button title="Move up" disabled={i===0} onClick={()=>move(s,-1)}>↑</button><button title="Move down" disabled={i===data.order.length-1} onClick={()=>move(s,1)}>↓</button></div></div>)}</div></details>
      <div className="dl-bottom"><button onClick={()=>{if(confirm("Restore the original DURF prototype settings?")){setData(clone(original));setStatus("Prototype reset.");}}}>Reset prototype</button><p>Draft copy for themes and functions. Delta is schematic, not an official logo. Contact is intentionally not live.</p>{status&&<p role="status">{status}</p>}</div>
    </aside></div>
  </main>;
}
const styles = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=Instrument+Sans:wght@400;500;600;700;800&display=swap');
.durf-lab{font-family:Arial,sans-serif;color:#25231F;background:#f1f0eb;min-height:100vh;padding:16px;font-size:13px}
.durf-lab *{box-sizing:border-box}.durf-lab button,.durf-lab input,.durf-lab textarea,.durf-lab select{font:inherit}.durf-lab button{cursor:pointer}
.dl-toolbar,.dl-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.dl-toolbar{justify-content:space-between;margin-bottom:12px}.dl-actions strong{margin-right:13px;font-size:12px}.dl-actions small{opacity:.5}.dl-actions button,.dl-upload,.dl-bottom button{padding:9px 11px;background:white;border:1px solid #c8c8c0;border-radius:5px;font-size:12px;cursor:pointer}.dl-actions button.active{background:#25231F;color:#F8F4EC}.dl-upload input{display:none}
.dl-layout{display:grid;grid-template-columns:minmax(0,1fr) 285px;align-items:start;gap:13px}.dl-frame{border:1px solid #c8c8c0;border-radius:8px;overflow:hidden;min-width:0;background:white}.dl-browser{display:flex;align-items:center;justify-content:space-between;height:34px;background:#e8e7e2;padding:0 13px;font:10px 'IBM Plex Mono',monospace;color:#777}.dl-viewport{height:calc(100vh - 130px);min-height:600px;overflow:auto;background:#F8F4EC;scrollbar-width:thin}.dl-viewport.mobile{width:min(375px,100%);margin:auto;border-left:1px solid #ddd;border-right:1px solid #ddd}
.dl-panel{background:white;border:1px solid #c8c8c0;border-radius:8px;max-height:calc(100vh - 91px);min-height:600px;overflow-y:auto;scrollbar-width:thin}.dl-panel-title{padding:17px;border-bottom:1px solid #ddd}.dl-panel-title p{font-size:11px;color:#777;margin:5px 0 0;line-height:1.4}.dl-panel details{padding:0 14px;border-bottom:1px solid #ddd}.dl-panel summary{font-size:12px;font-weight:700;padding:14px 0;cursor:pointer}.dl-stack{padding-bottom:16px;display:grid;gap:12px}.dl-field{display:grid;gap:5px;font-size:11px}.dl-field>span{font-size:10px;color:#666;font-weight:700}.dl-field input:not([type=range]),.dl-field textarea,.dl-field select{border:1px solid #ccc;background:#f9f9f8;padding:8px;border-radius:4px;min-width:0;width:100%;color:#25231F}.dl-field textarea{resize:vertical}.dl-field input[type=range]{width:100%;accent-color:#507568}.dl-checkbox{display:flex;align-items:center;gap:7px;font-size:11px}.dl-swatches{display:flex;gap:3px}.dl-swatches i{height:33px;flex:1;border:1px solid #ddd}.dl-item{display:grid;gap:8px;border-bottom:1px solid #ddd;padding:0 0 12px}.dl-order{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:7px;gap:7px}.dl-order label{display:flex;gap:5px;align-items:center;font-size:11px}.dl-order button{padding:2px 6px;border:1px solid #ddd;background:#fafafa}.dl-order button:disabled{opacity:.25}.dl-bottom{padding:14px}.dl-bottom p{font-size:10px;line-height:1.6;color:#777}
.durf-page{--green:#507568;--orange:#F16A37;--pink:#DD8EB9;--paper:#F8F4EC;--ink:#25231F;background:var(--paper);color:var(--ink);font-family:'Instrument Sans',Arial,sans-serif;overflow:hidden}
.dp-nav{padding:20px 5.5%;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--ink)}.dp-nav strong{font-size:23px;font-weight:800;letter-spacing:-.075em}.dp-nav strong span,.dp-logo span{font-weight:400}.dp-nav nav{font:10px 'IBM Plex Mono',monospace}
.dp-section{padding:65px 5.5%;border-bottom:1px solid var(--ink)}.dp-overline,.dp-mono{font:500 10px 'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.01em}.dp-overline{display:flex;justify-content:space-between;gap:15px;margin-bottom:34px}.dp-section h2{font-size:var(--heading);letter-spacing:-.07em;line-height:1.01;font-weight:800;max-width:830px;margin:0 0 24px}.dp-lead{font-size:clamp(17px,2.2vw,27px);line-height:1.25;letter-spacing:-.025em;max-width:700px;margin:0}
.dp-hero{min-height:560px;background:var(--green);color:var(--paper);position:relative;display:flex;flex-direction:column;justify-content:space-between;isolation:isolate}.dp-hero>*:not(.dp-art){position:relative;z-index:2}.dp-hero-content{padding:50px 0 30px}.dp-hero h1{font-size:var(--display);font-weight:800;letter-spacing:-.075em;line-height:.92;margin:0 0 27px;max-width:1100px;overflow-wrap:break-word}.dp-hero p{font-size:17px;line-height:1.4;max-width:450px;margin:0 0 24px}.dp-button{background:var(--orange);color:var(--ink);display:inline-flex;gap:36px;align-items:center;justify-content:space-between;padding:14px 17px;text-decoration:none;font-weight:700;font-size:13px}.dp-art{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}.durf-dots{position:absolute;right:-7%;top:5%;width:53%;aspect-ratio:1;display:grid;grid-template-columns:repeat(11,1fr);grid-template-rows:repeat(11,1fr);gap:2.6%}.durf-dots i{border-radius:50%;background:var(--pink);aspect-ratio:1;width:100%;align-self:center;justify-self:center}.dp-delta{position:absolute;width:55%;height:80%;right:-7%;top:10%;color:var(--pink);opacity:.85}
.dp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--ink);border:1px solid var(--ink);margin-top:42px}.dp-tile{min-height:180px;background:var(--paper);padding:22px;display:flex;flex-direction:column;justify-content:space-between;gap:24px}.dp-tile-top{display:flex;justify-content:space-between;align-items:center}.dp-tile-top i{width:30px;height:30px;border-radius:50%}.dp-tile h3{font-size:clamp(22px,2.8vw,34px);letter-spacing:-.05em;font-weight:700;margin:0 0 8px}.dp-tile p,.dp-function p{font-size:13px;line-height:1.4;margin:0;max-width:400px}
.dp-functions{background:var(--orange)}.dp-rows{margin-top:42px}.dp-function{border-top:1px solid var(--ink);display:grid;grid-template-columns:65px 1fr 20px;gap:12px;padding:25px 0;align-items:start}.dp-function h3{font-size:clamp(24px,3vw,42px);line-height:1;letter-spacing:-.055em;margin:0 0 10px}
.dp-photos{display:grid;grid-template-columns:1.4fr 1fr;gap:9px;margin-top:37px}.dp-photo{min-height:230px;background:#c7c4ba;padding:13px;display:flex;align-items:end;justify-content:space-between;position:relative;overflow:hidden}.dp-photo:first-child{min-height:310px}.dp-photo:nth-child(2){background:#d8d3c8}.dp-photo:before{content:"";position:absolute;inset:-50%;transform:rotate(18deg);background:repeating-linear-gradient(60deg,transparent 0 45px,#50756822 45px 90px)}.dp-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}.dp-photo span{position:relative;z-index:2;background:var(--paper);font:10px 'IBM Plex Mono',monospace;padding:7px}.dp-photo-note{margin-top:15px}
.dp-event{border-top:1px solid var(--ink);padding:22px 0;display:grid;grid-template-columns:125px 1fr;gap:15px}.dp-event h3{font-size:20px;line-height:1.2;font-weight:600;margin:0}
.dp-cta{background:var(--pink)}.dp-cta h2{font-size:var(--display)}.dp-cta .dp-button{background:var(--ink);color:var(--paper);margin-top:24px}
.dp-footer{background:var(--ink);color:var(--paper);border:0}.dp-logo{font-size:clamp(45px,7vw,95px);font-weight:800;letter-spacing:-.075em;line-height:1;margin-bottom:50px}.dp-partners{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:22px 0 55px}.dp-partners span{font-size:13px;line-height:1.4}.dp-footline{border-top:1px solid #999;padding-top:18px;display:flex;justify-content:space-between;gap:15px}
.dp-green .dp-functions{background:var(--paper)}.dp-green .dp-cta{background:var(--green);color:var(--paper)}.dp-bright .dp-hero{background:var(--orange);color:var(--ink)}.dp-bright .dp-functions{background:var(--pink)}.dp-bright .dp-cta{background:var(--green);color:var(--paper)}
.dp-hero{background:var(--hero-bg)!important}.dp-functions{background:var(--functions-bg)!important}.dp-cta{background:var(--cta-bg)!important}
.dp-hero,.dp-cta{color:var(--ink)}.dp-hero .dp-button{background:var(--orange)}.dp-hero{color:var(--paper)}
.dp-hero h1,.dp-cta h2{font-weight:var(--display-weight);letter-spacing:var(--display-tracking);line-height:var(--display-line)}
.dp-section h2:not(.dp-cta h2){font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);line-height:var(--heading-line)}
.dp-lead{font-size:calc(clamp(17px,2.2vw,27px)*var(--lead-size));font-weight:var(--lead-weight);letter-spacing:var(--lead-tracking);line-height:var(--lead-line)}
.dp-hero p,.dp-tile p,.dp-function p,.dp-event h3{font-size:calc(1em * var(--body-size));font-weight:var(--body-weight);letter-spacing:var(--body-tracking);line-height:var(--body-line)}
.dp-mono,.dp-overline{font-size:calc(10px * var(--mono-size));font-weight:var(--mono-weight);letter-spacing:var(--mono-tracking);line-height:var(--mono-line)}
.dl-viewport [data-edit-key],.dl-viewport [data-edit-list],.dl-viewport [data-edit-section]{cursor:pointer}
.dl-viewport [data-edit-key]:hover,.dl-viewport [data-edit-list]:hover{outline:2px solid var(--orange);outline-offset:3px}
.dp-selected-section{outline:3px dashed var(--orange);outline-offset:-3px}
.dl-tip{font-size:11px;line-height:1.5;color:#777;margin:0}
.dl-palette-edit{display:flex;align-items:center;gap:7px;font-size:11px}.dl-palette-edit input[type=color]{width:34px;height:30px;padding:0;border:0;cursor:pointer}.dl-palette-edit span{flex:1}.dl-palette-edit code{font-size:10px}.dl-palette-edit button,.dl-small-button{background:#fafafa;border:1px solid #ddd;border-radius:4px;padding:5px;font-size:11px}
.dp-compact .dp-section{padding-top:37px;padding-bottom:37px}.dp-compact .dp-hero{min-height:430px}
.dl-viewport.mobile .durf-page{--display:48px!important;--heading:37px!important}.dl-viewport.mobile .dp-nav nav{display:none}.dl-viewport.mobile .dp-section{padding:45px 7%}.dl-viewport.mobile .dp-hero{min-height:530px}.dl-viewport.mobile .durf-dots{width:105%;right:-43%;top:15%}.dl-viewport.mobile .dp-delta{width:95%;right:-30%}.dl-viewport.mobile .dp-grid,.dl-viewport.mobile .dp-photos{grid-template-columns:1fr}.dl-viewport.mobile .dp-tile{min-height:145px}.dl-viewport.mobile .dp-function{grid-template-columns:40px 1fr 15px}.dl-viewport.mobile .dp-event{grid-template-columns:85px 1fr}.dl-viewport.mobile .dp-partners{grid-template-columns:repeat(2,1fr)}
@media(max-width:900px){.dl-layout{grid-template-columns:1fr}.dl-panel{max-height:none;min-height:0}.dl-viewport{height:670px}.durf-page{--display:clamp(44px,8vw,90px);--heading:clamp(32px,5vw,66px)}}@media(max-width:520px){.durf-lab{padding:8px}.dp-nav nav{display:none}.dp-grid,.dp-photos{grid-template-columns:1fr}.dp-partners{grid-template-columns:repeat(2,1fr)}.dp-event{grid-template-columns:80px 1fr}}
`;
