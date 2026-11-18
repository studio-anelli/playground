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

export const isPaper = format => /^A[2-5]$/.test(format);
export function layoutGrid(c){
 const unit=isPaper(c.pageFormat)?96/25.4:1;
 const margin=Math.max(0,Math.min(c.pageMargin*unit,Math.min(c.width,c.height)*.45));
 const width=c.width-2*margin,height=c.height-2*margin;
 const columns=Math.max(1,Math.min(12,Math.round(c.gridColumns)));
 const gutter=columns===1?0:Math.min(Math.max(0,c.gridGutter*unit),width/(columns-1)*.8);
 const columnWidth=(width-gutter*(columns-1))/columns;
 const start=Math.max(1,Math.min(columns,Math.round(c.columnStart)));
 const span=Math.max(1,Math.min(columns-start+1,Math.round(c.columnSpan)));
 const rows=Math.max(1,Math.min(12,Math.round(c.gridRows??1)));
 const rowGutter=rows===1?0:Math.min(Math.max(0,c.gridGutter*unit),height/(rows-1)*.8);
 const rowHeight=(height-rowGutter*(rows-1))/rows;
 const rowStart=Math.max(1,Math.min(rows,Math.round(c.rowStart??1)));
 const rowSpan=Math.max(1,Math.min(rows-rowStart+1,Math.round(c.rowSpan??1)));
 const blockHeight=rows>1?rowSpan*rowHeight+(rowSpan-1)*rowGutter:height*Math.max(.1,Math.min(1,c.blockHeight/100));
 const top=rows>1?margin+(rowStart-1)*(rowHeight+rowGutter):margin+(c.verticalAlign==='top'?0:c.verticalAlign==='bottom'?height-blockHeight:(height-blockHeight)/2);
 return {margin,gutter,columnWidth,columns,start,span,rows,rowGutter,rowHeight,rowStart,rowSpan,content:{x:margin,y:margin,width,height},area:{x:margin+(start-1)*(columnWidth+gutter),y:top,width:span*columnWidth+(span-1)*gutter,height:blockHeight}};
}
