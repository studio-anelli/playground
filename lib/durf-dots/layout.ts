import type {Config,Dot} from './geometry';
import {motionBounds} from './export-bounds';
export const formats={
 custom:{label:'Custom',width:1080,height:1080},
 A5:{label:'A5 · 148 × 210 mm',width:148,height:210},
 A4:{label:'A4 · 210 × 297 mm',width:210,height:297},
 A3:{label:'A3 · 297 × 420 mm',width:297,height:420},
 A2:{label:'A2 · 420 × 594 mm',width:420,height:594},
 widescreen:{label:'1920 × 1080',width:1920,height:1080},
 portrait:{label:'1080 × 1920',width:1080,height:1920},
 square:{label:'1080 × 1080',width:1080,height:1080}
};
export type PageFormat=keyof typeof formats;
export type LayoutSettings={layoutEnabled:boolean;pageFormat:PageFormat;pageMargin:number;gridColumns:number;gridGutter:number;columnStart:number;columnSpan:number;blockHeight:number;verticalAlign:'top'|'center'|'bottom';showGuides:boolean};
export const layoutDefaults:LayoutSettings={layoutEnabled:false,pageFormat:'custom',pageMargin:48,gridColumns:3,gridGutter:24,columnStart:1,columnSpan:3,blockHeight:100,verticalAlign:'center',showGuides:true};
export const isPaper=(format:PageFormat)=>/^A[2-5]$/.test(format);
const even=(n:number)=>Math.round(n/2)*2;
export function formatSettings(format:PageFormat):Partial<Config>{
 if(format==='custom')return {pageFormat:format};
 const f=formats[format],unit=isPaper(format)?96/25.4:1;
 return {pageFormat:format,width:even(f.width*unit),height:even(f.height*unit),pageMargin:isPaper(format)?15:48,gridGutter:isPaper(format)?5:24};
}
export function layoutGrid(c:Config){
 const unit=isPaper(c.pageFormat)?96/25.4:1;
 const margin=Math.max(0,Math.min(c.pageMargin*unit,Math.min(c.width,c.height)*.45));
 const width=c.width-2*margin,height=c.height-2*margin;
 const columns=Math.max(1,Math.min(12,Math.round(c.gridColumns)));
 const gutter=columns===1?0:Math.min(Math.max(0,c.gridGutter*unit),width/(columns-1)*.8);
 const columnWidth=(width-gutter*(columns-1))/columns;
 const start=Math.max(1,Math.min(columns,Math.round(c.columnStart)));
 const span=Math.max(1,Math.min(columns-start+1,Math.round(c.columnSpan)));
 const blockHeight=height*Math.max(.1,Math.min(1,c.blockHeight/100));
 const top=margin+(c.verticalAlign==='top'?0:c.verticalAlign==='bottom'?height-blockHeight:(height-blockHeight)/2);
 return {margin,gutter,columnWidth,columns,start,span,content:{x:margin,y:margin,width,height},area:{x:margin+(start-1)*(columnWidth+gutter),y:top,width:span*columnWidth+(span-1)*gutter,height:blockHeight}};
}
export function fitDotsToLayout(dots:Dot[],c:Config):Dot[]{
 if(!c.layoutEnabled||!dots.length)return dots;
 const {area}=layoutGrid(c),bounds=motionBounds(dots,c);
 // Small safety inset accommodates subpixel antialiasing at the frame edge.
 const scale=Math.min(Math.max(1,area.width-2)/Math.max(1,bounds.width),Math.max(1,area.height-2)/Math.max(1,bounds.height));
 const x=area.x+(area.width-bounds.width*scale)/2,y=area.y+(area.height-bounds.height*scale)/2;
 return dots.map(d=>({...d,x:x+(d.x-bounds.x)*scale,y:y+(d.y-bounds.y)*scale,radius:d.radius*scale,endRadius:d.endRadius*scale,motionScale:(d.motionScale??1)*scale}));
}
export function paperSize(c:Config){
 if(!isPaper(c.pageFormat))return null;
 const f=formats[c.pageFormat];const portrait=c.width<=c.height;
 return {width:portrait?Math.min(f.width,f.height):Math.max(f.width,f.height),height:portrait?Math.max(f.width,f.height):Math.min(f.width,f.height)};
}
