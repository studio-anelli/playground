"use client";
import type {EditorialRow,EditorialColumn,ColumnKind,ColumnColour} from "./editorial-row";
const photos=Array.from({length:10},(_,i)=>"/durf-campus/photos/"+String(i+1).padStart(2,"0")+".webp");
const names:Record<ColumnColour,string>={green:"Mooi Groen",orange:"Heel Oranje",pink:"Ultra Roze",paper:"Oud Wit",ink:"Bijna Zwart"};
export function EditorialColumnInspector({row,index,onChange}:{row:EditorialRow;index:number;onChange:(patch:Partial<EditorialColumn>)=>void}){
 const col=row.columns[index];
 return <div className="dl-stack">
  <strong>{row.title} / Column {index+1}</strong>
  <label className="dl-field"><span>Content type</span><select value={col.kind} onChange={e=>onChange({kind:e.target.value as ColumnKind})}><option value="text">Text</option><option value="image">Image</option><option value="empty">Empty</option></select></label>
  {col.kind==="text"&&<>
    <label className="dl-field"><span>Eyebrow</span><input value={col.eyebrow} onChange={e=>onChange({eyebrow:e.target.value})}/></label>
    <label className="dl-field"><span>Heading</span><textarea rows={3} value={col.heading} onChange={e=>onChange({heading:e.target.value})}/></label>
    <label className="dl-field"><span>Body</span><textarea rows={4} value={col.body} onChange={e=>onChange({body:e.target.value})}/></label>
  </>}
  {col.kind==="image"&&<>
    <div className="dl-asset-grid">{photos.map((url,i)=><button type="button" key={url} title={"Photo "+(i+1)} className={col.image===url?"active":""} onClick={()=>onChange({image:url})}><img src={url} alt={"Select photo "+(i+1)}/><span>{i+1}</span></button>)}</div>
    <label className="dl-field"><span>Image source</span><input value={col.image} onChange={e=>onChange({image:e.target.value})}/></label>
    <label className="dl-field"><span>Horizontal crop: {col.imagePositionX}%</span><input type="range" min="0" max="100" value={col.imagePositionX} onChange={e=>onChange({imagePositionX:Number(e.target.value)})}/></label>
    <label className="dl-field"><span>Vertical crop: {col.imagePositionY}%</span><input type="range" min="0" max="100" value={col.imagePositionY} onChange={e=>onChange({imagePositionY:Number(e.target.value)})}/></label>
    <label className="dl-field"><span>Fit</span><select value={col.imageFit} onChange={e=>onChange({imageFit:e.target.value as EditorialColumn["imageFit"]})}><option value="cover">Cover</option><option value="contain">Contain</option></select></label>
  </>}
  <label className="dl-field"><span>Padding: {col.padding}px</span><input type="range" min="0" max="100" value={col.padding} onChange={e=>onChange({padding:Number(e.target.value)})}/></label>
  <label className="dl-field"><span>Min height: {col.minHeight}px</span><input type="range" min="160" max="720" step="10" value={col.minHeight} onChange={e=>onChange({minHeight:Number(e.target.value)})}/></label>
  <label className="dl-field"><span>Alignment</span><select value={col.align} onChange={e=>onChange({align:e.target.value as EditorialColumn["align"]})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
  <label className="dl-field"><span>Text colour</span><select value={col.ink} onChange={e=>onChange({ink:e.target.value as ColumnColour})}>{Object.entries(names).map(([k,n])=><option key={k} value={k}>{n}</option>)}</select></label>
  <label className="dl-field"><span>Background</span><select value={col.background} onChange={e=>onChange({background:e.target.value as EditorialColumn["background"]})}><option value="transparent">Transparent</option>{Object.entries(names).map(([k,n])=><option key={k} value={k}>{n}</option>)}</select></label>
 </div>;
}
