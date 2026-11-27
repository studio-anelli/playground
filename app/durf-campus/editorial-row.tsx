"use client";
import type { CSSProperties } from "react";

export type ColumnKind="text"|"image"|"empty";
export type ColumnColour="green"|"orange"|"pink"|"paper"|"ink";
export type EditorialColumn={
  kind:ColumnKind; eyebrow:string;heading:string;body:string;image:string;
  background:ColumnColour|"transparent";ink:ColumnColour;align:"left"|"center"|"right";
  padding:number;minHeight:number;imagePositionX:number;imagePositionY:number;imageFit:"cover"|"contain";
};
export type EditorialRow={id:string;title:string;ratio:number;gap:number;columns:[EditorialColumn,EditorialColumn]};
export const defaultColumn=(kind:ColumnKind="text"):EditorialColumn=>({
  kind,eyebrow:"DURF / SAMENWERKING",heading:"Samen maken we het verschil.",
  body:"Een plek waar ideeën, mensen en kennis elkaar ontmoeten.",image:"/durf-campus/photos/03.webp",
  background:"transparent",ink:"ink",align:"left",padding:20,minHeight:310,imagePositionX:50,imagePositionY:50,imageFit:"cover"
});
export const initialEditorialRows:EditorialRow[]=[{
  id:"editorial-1",title:"Beeld & verhaal",ratio:55,gap:16,
  columns:[{...defaultColumn("image"),image:"/durf-campus/photos/04.webp",padding:0,minHeight:370},
           {...defaultColumn("text"),eyebrow:"IN ONTWIKKELING",heading:"Een plek voor nieuwe verbindingen.",body:"DURF krijgt vorm door mensen, experimenten en samenwerking. Deze rij is volledig aanpasbaar.",padding:32,minHeight:370}]
}];
type Props={
 row:EditorialRow;palette:Record<ColumnColour,string>;onSelect:(column:number)=>void;
};
export function EditorialRowView({row,palette,onSelect}:Props){
 return <section className="dp-editorial-row" aria-label={row.title}>
  <div className="dp-overline"><span>EXPERIMENT / {row.title.toUpperCase()}</span><span>TWEE KOLOMMEN ↗</span></div>
  <div className="dp-editorial-grid" style={{gridTemplateColumns:`${row.ratio}fr ${100-row.ratio}fr`,gap:row.gap}}>
   {row.columns.map((column,i)=>{
    const style:CSSProperties={background:column.background==="transparent"?"transparent":palette[column.background],color:palette[column.ink],textAlign:column.align,padding:column.padding,minHeight:column.minHeight};
    return <div className="dp-editorial-col" key={i} style={style} data-editorial-id={row.id} data-editorial-column={i} onClick={e=>{e.stopPropagation();onSelect(i)}}>
     {column.kind==="image"&&<img alt={column.heading||"DURF photographic composition"} src={column.image} style={{objectFit:column.imageFit,objectPosition:`${column.imagePositionX}% ${column.imagePositionY}%`}}/>}
     {column.kind==="text"&&<div className="dp-editorial-copy"><span className="dp-mono">{column.eyebrow}</span><h2>{column.heading}</h2><p>{column.body}</p></div>}
     {column.kind==="empty"&&<div className="dp-editorial-placeholder">EMPTY COLUMN / CLICK TO EDIT</div>}
     <span className="dp-edit-hint">✎ EDIT COLUMN {i+1}</span>
    </div>
   })}
  </div>
 </section>
}
export const editorialCss=`
.dp-editorial-row{padding:65px 5.5%;background:var(--paper);border-bottom:1px solid var(--ink)}
.dp-editorial-grid{display:grid;align-items:stretch}
.dp-editorial-col{position:relative;min-width:0;overflow:hidden;cursor:pointer;transition:outline-color .15s ease;outline:1px solid transparent;outline-offset:-1px}
.dp-editorial-col:hover{outline:2px solid var(--orange);outline-offset:-2px}
.dp-editorial-col>img{width:100%;height:100%;position:absolute;inset:0;display:block}
.dp-editorial-copy{display:flex;flex-direction:column;justify-content:center;min-height:100%;gap:22px}
.dp-editorial-copy h2{font-size:clamp(26px,4vw,56px);font-weight:800;letter-spacing:-.065em;line-height:1.03;margin:0}
.dp-editorial-copy p{font-size:clamp(14px,1.6vw,20px);line-height:1.4;max-width:500px;margin:0}
.dp-edit-hint{position:absolute;right:8px;bottom:8px;font:500 9px 'IBM Plex Mono',monospace;background:var(--paper);color:var(--ink);padding:6px 8px;opacity:0;pointer-events:none}
.dp-editorial-col:hover .dp-edit-hint{opacity:1}
.dp-editorial-placeholder{border:1px dashed var(--ink);height:100%;display:flex;align-items:center;justify-content:center;font:11px 'IBM Plex Mono',monospace}
@media(max-width:600px){.dp-editorial-grid{grid-template-columns:1fr!important}.dp-editorial-row{padding:42px 7%}.dp-editorial-col{min-height:240px!important}}
`;
