import type {Config,Dot} from './geometry';
import {motionBounds} from './export-bounds';
import {formats,isPaper,layoutGrid} from '../../public/studio-layout.mjs';
export {formats,isPaper,layoutGrid};
export type PageFormat=keyof typeof formats;
export type LayoutSettings={layoutEnabled:boolean;pageFormat:PageFormat;pageMargin:number;gridColumns:number;gridRows:number;rowStart:number;rowSpan:number;gridGutter:number;columnStart:number;columnSpan:number;blockHeight:number;verticalAlign:'top'|'center'|'bottom';showGuides:boolean};
export const layoutDefaults:LayoutSettings={layoutEnabled:false,pageFormat:'custom',pageMargin:48,gridColumns:3,gridRows:1,rowStart:1,rowSpan:1,gridGutter:24,columnStart:1,columnSpan:3,blockHeight:100,verticalAlign:'center',showGuides:true};
const even=(n:number)=>Math.round(n/2)*2;
export function formatSettings(format:PageFormat):Partial<Config>{
 if(format==='custom')return {pageFormat:format};
 const f=formats[format],unit=isPaper(format)?96/25.4:1;
 return {pageFormat:format,width:even(f.width*unit),height:even(f.height*unit),pageMargin:isPaper(format)?15:48,gridGutter:isPaper(format)?5:24};
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
