"use client";

/** WebGL2 temporal sampling. Source pixels are still authored in an offscreen
 * 2D canvas; the history, grid composition and deformation live on the GPU. */
export type DelayGeometry = {
  columns:number; rows:number; spacing:number; delay:number; pattern:number;
  mode:number; amount:number; frequency:number; flow:number; time:number; elapsed:number;
  liquifyProfile:number; edgeReach:number;
  grid:boolean; background:[number,number,number]; blend:number;
};
export type DelayGPU = {
  width:number; height:number; interval:number;
  push:(frame:HTMLCanvasElement)=>void;
  pushLive:(frame:HTMLCanvasElement)=>void;
  render:(params:DelayGeometry)=>void;
  dispose:()=>void;
};
const vertex = `#version 300 es
precision highp float;
out vec2 vUv;
void main(){
  vec2 p=vec2((gl_VertexID==1)?3.0:-1.0,(gl_VertexID==2)?3.0:-1.0);
  gl_Position=vec4(p,0.,1.);
  vUv=vec2((p.x+1.)*.5,1.-(p.y+1.)*.5);
}`;
const fragment = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 vUv;
out vec4 outColor;
uniform sampler2DArray uFrames;
uniform vec2 uGrid;
uniform float uGap;
uniform float uDelay;
uniform int uPattern;
uniform int uNewest;
uniform int uCount;
uniform int uCapacity;
uniform int uLiveLayer;
uniform float uInterval;
uniform float uElapsed;
uniform vec3 uBackground;
uniform int uBlend;
uniform bool uGridVisible;
uniform int uMode;
uniform float uAmount;
uniform float uFrequency;
uniform float uFlow;
uniform float uTime;
uniform int uLiquifyProfile;
uniform float uEdgeReach;
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
// Smooth, low-frequency vector field: no tiled trigonometric bands.
float smoothNoise(vec2 p){
 vec2 i=floor(p),f=fract(p);
 f=f*f*(3.-2.*f);
 float a=hash21(i),b=hash21(i+vec2(1.,0.));
 float c=hash21(i+vec2(0.,1.)),d=hash21(i+vec2(1.,1.));
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
vec2 organicField(vec2 point,float frequency,float phase){
 vec2 q=point*max(.35,frequency);
 // Different domains and slow opposing drift prevent obvious wave oscillation.
 float a=smoothNoise(q+vec2(5.3,11.1)+vec2(phase*.13,-phase*.09));
 float b=smoothNoise(q*.83+vec2(26.7,3.2)+vec2(-phase*.08,phase*.12));
 float detail=smoothNoise(q*1.91+vec2(8.9,21.3)+phase*.045);
 return vec2(a-.5,b-.5)*1.6+vec2(detail-.5,.5-detail)*.18;
}
float patternValue(vec2 cell){
 vec2 center=(cell+.5)/uGrid;
 if(uPattern==1)return (center.x+center.y)*.5;
 if(uPattern==2)return min(1.,length(center-vec2(.5))*1.42);
 if(uPattern==3)return hash21(cell);
 return .5+.5*sin(center.x*8.+center.y*5.);
}
vec3 compose(vec3 sampleColor,vec3 bg){
 if(uBlend==1)return sampleColor*bg;
 if(uBlend==2)return 1.-(1.-sampleColor)*(1.-bg);
 if(uBlend==3)return mix(2.*sampleColor*bg,1.-2.*(1.-sampleColor)*(1.-bg),step(.5,bg));
 if(uBlend==4)return abs(bg-sampleColor);
 if(uBlend==5)return bg+sampleColor-2.*bg*sampleColor;
 if(uBlend==6)return max(bg,sampleColor);
 if(uBlend==7)return min(bg,sampleColor);
 return sampleColor;
}
void main(){
 // The grid geometry is immutable: all distortion takes place inside each
 // cell's LOCAL sample coordinates, after its row/column have been identified.
 vec2 uv=vUv;
 vec2 cells=max(vec2(1.),uGrid);
 vec2 gap=vec2(uGap)/cells;
 vec2 cellSize=(1.-gap*(cells-1.))/cells;
 vec2 pitch=cellSize+gap;
 vec2 cell=floor(uv/pitch);
 vec2 local=(uv-cell*pitch)/cellSize;
 bool outside=any(lessThan(uv,vec2(0.)))||any(greaterThanEqual(uv,vec2(1.)));
 bool invalid=outside||any(lessThan(local,vec2(0.)))||any(greaterThanEqual(local,vec2(1.)))||any(greaterThanEqual(cell,cells));
 if(invalid){outColor=vec4(uBackground,1.);return;}

 // Each cell receives its own spatial seed, phase, speed and orientation.
 // Its delay identity never changes: only the content read inside the cell.
 float seed=hash21(cell+vec2(9.7,23.1));
 float seedB=hash21(cell+vec2(43.2,8.5));
 float phase=uTime*uFlow*(.48+seed*.46)+seedB*6.2831853;
 float strength=clamp(uAmount,0.,1.);
 vec2 margin=min(local,1.-local);
 float edgeFade=smoothstep(0.,.24,min(margin.x,margin.y));
 vec2 sampleLocal=local;
 if(uMode==1){
   // ELASTIC: smooth, larger-scale stretch/shear within the fragment.
   // The outside edges remain exactly where they are.
   vec2 field=organicField(local+vec2(seed*7.3,seedB*5.1),.65+uFrequency*.22,phase);
   vec2 directional=vec2(field.x*.85+field.y*.25,field.y*.85-field.x*.25);
   sampleLocal+=directional*strength*strength*.16*edgeFade;
 } else if(uMode==2){
   // LIQUIFY is local to each tile. Keep the core perfectly still.
   // Melt: max distortion at the border, softly decaying into the tile.
   // Ring: distortion peaks just inside the border, leaving the seam intact.
   float edgeDistance=min(margin.x,margin.y);
   float reach=clamp(uEdgeReach,.035,.48);
   float melt=1.-smoothstep(0.,reach,edgeDistance);
   float peak=reach*.24;
   float ring=smoothstep(0.,peak,edgeDistance)*(1.-smoothstep(peak,reach,edgeDistance));
   float edgeMask=uLiquifyProfile==1?ring:melt;
   vec2 field=organicField(local+vec2(seed*13.7,seedB*9.1),1.5+uFrequency*.55,phase);
   vec2 detail=organicField(local*1.8+vec2(seedB*17.1,seed*14.4),2.5+uFrequency*.65,-phase*.7);
   sampleLocal+=(field*.65+detail*.35)*strength*strength*.19*edgeMask;
 }
 sampleLocal=clamp(sampleLocal,vec2(0.),vec2(1.));
 vec2 sourceUV=(cell+sampleLocal)/cells;
 // The current frame is uploaded every RAF while historical snapshots
 // occupy a separate ring. Never crossfade distinct text shapes.
 float secondsAgo=max(0.,patternValue(cell)*uDelay);
 // Choose exactly ONE complete historical frame per cell: blending between
 // two text frames creates unwanted transparent-looking doubled letterforms.
 // The current (zero-delay) frame still refreshes every animation frame.
 int selectedLayer=uLiveLayer;
 if(uCount>0 && secondsAgo>max(.0001,uElapsed*.5)){
  float past=max(0.,secondsAgo-uElapsed)/max(.0001,uInterval);
  int age=min(int(floor(past+.5)),uCount-1);
  selectedLayer=(uNewest-age+uCapacity)%uCapacity;
 }
 vec3 sampleColor=texture(uFrames,vec3(sourceUV,float(selectedLayer))).rgb;
 vec3 result=compose(sampleColor,uBackground);
 if(uGridVisible){
   vec2 rim=min(local,1.-local)*cellSize*cells;
   if(min(rim.x,rim.y)<.006)result=mix(result,vec3(.13,.15,.13),.22);
 }
 outColor=vec4(result,1.);
}`;

function shader(gl:WebGL2RenderingContext,type:number,src:string){
 const s=gl.createShader(type);if(!s)throw new Error("WebGL shader allocation failed");
 gl.shaderSource(s,src);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
  const msg=gl.getShaderInfoLog(s)||"Unknown shader compile error";gl.deleteShader(s);throw new Error(msg);
 }
 return s;
}
export function createDelayGPU(canvas:HTMLCanvasElement,w:number,h:number):DelayGPU{
 const gl=canvas.getContext("webgl2",{alpha:false,antialias:false,preserveDrawingBuffer:false,powerPreference:"high-performance"});
 if(!gl)throw new Error("WebGL2 is not available in this browser.");
 const vs=shader(gl,gl.VERTEX_SHADER,vertex),fs=shader(gl,gl.FRAGMENT_SHADER,fragment);
 const prog=gl.createProgram();if(!prog)throw new Error("WebGL program allocation failed");
 gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog)||"WebGL shader link failed");
 const vao=gl.createVertexArray();if(!vao)throw new Error("WebGL vertex array allocation failed");
 const texture=gl.createTexture();if(!texture)throw new Error("WebGL history texture allocation failed");
 // ~144 MiB maximum texture history. Temporal resolution is adapted to display dimensions.
 // Resolve the image FIRST, then fit as many history layers as memory permits.
 // The former fixed 64-layer allocation shrank every frame to a thumbnail.
 const maxTexture=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,2048);
 const maxLayers=gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number;
 const budget=224*1024*1024;
 const availableLayers=Math.min(maxLayers,48);
 if(availableLayers<2)throw new Error("GPU does not support the temporal texture array");
 const minimumLayers=Math.min(availableLayers,16);
 let scale=Math.min(1,maxTexture/Math.max(1,w,h));
 const minimumBytes=minimumLayers*4*w*h*scale*scale;
 if(minimumBytes>budget)scale*=Math.sqrt(budget/minimumBytes);
 const tw=Math.max(1,Math.floor(w*scale)),th=Math.max(1,Math.floor(h*scale));
 const bytesPerFrame=tw*th*4;
 const capacity=Math.max(minimumLayers,Math.min(availableLayers,Math.floor(budget/bytesPerFrame)));
 const historyCapacity=capacity-1;
 const liveLayer=capacity-1;
 const interval=5.05/Math.max(1,historyCapacity-1);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);
 gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.RGBA8,tw,th,capacity);
 const upload=document.createElement("canvas");upload.width=tw;upload.height=th;
 const uc=upload.getContext("2d",{alpha:false});
 if(!uc)throw new Error("Could not create WebGL source upload canvas");
 const uniforms=(name:string)=>gl.getUniformLocation(prog,name);
 const loc={
  frames:uniforms("uFrames"),grid:uniforms("uGrid"),gap:uniforms("uGap"),
  delay:uniforms("uDelay"),pattern:uniforms("uPattern"),newest:uniforms("uNewest"),
  count:uniforms("uCount"),capacity:uniforms("uCapacity"),liveLayer:uniforms("uLiveLayer"),interval:uniforms("uInterval"),elapsed:uniforms("uElapsed"),
  background:uniforms("uBackground"),blend:uniforms("uBlend"),gridVisible:uniforms("uGridVisible"),
  mode:uniforms("uMode"),amount:uniforms("uAmount"),frequency:uniforms("uFrequency"),
  flow:uniforms("uFlow"),time:uniforms("uTime"),liquifyProfile:uniforms("uLiquifyProfile"),edgeReach:uniforms("uEdgeReach")
 };
 let newest=-1,count=0;
 const write=(frame:HTMLCanvasElement,layer:number)=>{
  if(gl.isContextLost())return;
  uc.clearRect(0,0,tw,th);uc.drawImage(frame,0,0,tw,th);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,tw,th,1,gl.RGBA,gl.UNSIGNED_BYTE,upload);
 };
 const push=(frame:HTMLCanvasElement)=>{newest=(newest+1)%historyCapacity;count=Math.min(historyCapacity,count+1);write(frame,newest)};
 const pushLive=(frame:HTMLCanvasElement)=>write(frame,liveLayer);
 const render=(p:DelayGeometry)=>{
  if(!count||gl.isContextLost())return;
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.disable(gl.BLEND);gl.useProgram(prog);gl.bindVertexArray(vao);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);
  gl.uniform1i(loc.frames,0);gl.uniform2f(loc.grid,p.columns,p.rows);
  gl.uniform1f(loc.gap,p.spacing/200);gl.uniform1f(loc.delay,p.delay);
  gl.uniform1i(loc.pattern,p.pattern);gl.uniform1i(loc.newest,newest);
  gl.uniform1i(loc.count,count);gl.uniform1i(loc.capacity,historyCapacity);gl.uniform1i(loc.liveLayer,liveLayer);gl.uniform1f(loc.interval,interval);gl.uniform1f(loc.elapsed,p.elapsed);
  gl.uniform3f(loc.background,...p.background);gl.uniform1i(loc.blend,p.blend);
  gl.uniform1i(loc.gridVisible,p.grid?1:0);
  gl.uniform1i(loc.mode,p.mode);gl.uniform1f(loc.amount,p.amount);
  gl.uniform1f(loc.frequency,p.frequency);gl.uniform1f(loc.flow,p.flow);
  gl.uniform1f(loc.time,p.time);
  gl.uniform1i(loc.liquifyProfile,p.liquifyProfile);gl.uniform1f(loc.edgeReach,p.edgeReach);
  gl.drawArrays(gl.TRIANGLES,0,3);
 };
 return {width:tw,height:th,interval,push,pushLive,render,dispose:()=>{gl.deleteTexture(texture);gl.deleteVertexArray(vao);gl.deleteProgram(prog)}};
}
