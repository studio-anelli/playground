export type Shape="matrix"|"horizontal"|"vertical"|"repeater";
export type Pattern="uniform"|"peak"|"valley"|"ascending"|"descending";
export type Motion="invert"|"pulse"|"drift"|"none";
export type Config={shape:Shape;patternX:Pattern;patternY:Pattern;blend:"average"|"multiply"|"x"|"y";columns:number;rows:number;copies:number;direction:"horizontal"|"vertical";spacingX:number;spacingY:number;minSize:number;maxSize:number;overlap:number;offsetX:number;offsetY:number;scrollStrength:number;pointerStrength:number;pointerRadius:number;motion:Motion;speed:number;ease:number;foreground:string;background:string;transparent:boolean;width:number;height:number;videoDuration:number;fps:number;exportCrop:boolean;exportPadding:number;exportScale:1|2};
export type Dot={x:number;y:number;radius:number;endRadius:number};

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
function curve(p:Pattern,t:number,offset=0){const z=t-(offset/100)*0.5;if(p==="uniform")return .5;if(p==="ascending")return clamp(z,0,1);if(p==="descending")return 1-clamp(z,0,1);if(p==="peak")return clamp(1-Math.abs(z-.5)*2,0,1);return clamp(Math.abs(z-.5)*2,0,1)}
export function buildDots(c:Config):Dot[]{
 const dots:Dot[]=[];
 const cols=c.shape==="vertical"?1:c.shape==="horizontal"?c.columns:c.columns;
 const rows=c.shape==="horizontal"?1:c.shape==="vertical"?c.rows:c.shape==="repeater"?c.copies:c.rows;
 const padding=Math.max(c.maxSize*(1+c.overlap/100),20)+8;
 const verticalRepeater=c.shape==="repeater"&&c.direction==="vertical";
 const physicalCols=verticalRepeater?rows:cols,physicalRows=verticalRepeater?cols:rows;
 const dx=(c.width-2*padding)/Math.max(1,physicalCols-1);
 const dy=(c.height-2*padding)/Math.max(1,physicalRows-1);
 const gapX=c.spacingX/100,gapY=c.spacingY/100;
 const gridWidth=(physicalCols-1)*dx*gapX,gridHeight=(physicalRows-1)*dy*gapY;
 const x0=(c.width-gridWidth)/2,y0=(c.height-gridHeight)/2;
 const size=(z:number)=>Math.max(1,c.minSize+(c.maxSize-c.minSize)*clamp(z,0,1))*(1+c.overlap/100);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const tx=cols>1?x/(cols-1):.5,ty=rows>1?y/(rows-1):.5;
   const px=curve(c.patternX,tx,c.offsetX),py=curve(c.patternY,ty,c.offsetY);
   let k=c.blend==="multiply"?px*py:c.blend==="x"?px:c.blend==="y"?py:(px+py)/2;
   if(c.shape==="horizontal")k=px;
   if(c.shape==="vertical")k=py;
   if(c.shape==="repeater"){
     const progression=rows>1?1-y/(rows-1):1;
     const rowCurve=c.patternY==="uniform"?progression:py;
     const axis=c.direction==="vertical"?curve(c.patternX,ty,c.offsetX):px;
     k=c.patternX==="uniform"?rowCurve:.55*axis+.45*rowCurve;
   }
   const a=size(k),b=c.shape==="repeater"?size(1-k):size(1-k);
   const cx=verticalRepeater?x0+y*dx*gapX:x0+x*dx*gapX;
   const cy=verticalRepeater?y0+x*dy*gapY:y0+y*dy*gapY;
   dots.push({x:cx,y:cy,radius:a,endRadius:b});
 }
 return dots;
}
