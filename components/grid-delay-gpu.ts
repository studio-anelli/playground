"use client";

/** WebGL2 temporal sampling. Source pixels are still authored in an offscreen
 * 2D canvas; the history, grid composition and deformation live on the GPU. */
export type DelayGeometry = {
  columns:number; rows:number; spacing:number; delay:number; pattern:number;
  delayMode:number; blackHold:number;
  mode:number; amount:number; frequency:number; flow:number; time:number; elapsed:number;
  globalMode:number; globalStrength:number; globalSize:number; globalGrowth:number;
  grid:boolean; background:[number,number,number]; blend:number;
};
export type DelayQuality="balanced"|"sharp"|"fluid";
export type DelayGPU = {
  width:number; height:number; interval:number;
  capture:(frame:HTMLCanvasElement)=>void;
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
uniform int uDelayMode;
uniform float uBlackHold;
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
uniform int uGlobalMode;
uniform float uGlobalStrength;
uniform float uGlobalSize;
uniform float uGlobalGrowth;
uniform float uAspect;
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
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
 // Global glass refracts the ALREADY ASSEMBLED temporal grid.
 // Evaluate the final pixel at a shifted screen coordinate BEFORE cell lookup:
 // grid boundaries, time slices and per-cell lenses all bend together.
 vec2 uv=vUv;
 if(uGlobalMode!=0 && uGlobalStrength>0.){
   vec2 aspect=vec2(max(.01,uAspect),1.);
   vec2 delta=(vUv-.5)*aspect;
   float radiusMax=max(.10,uGlobalSize);
   // Smooth growth and contraction, rather than resetting at the end of a loop.
   float cycle=uGlobalGrowth>0.001?
      (.5-.5*cos(uTime*uGlobalGrowth*1.5707963)):1.;
   float radius=mix(.06,radiusMax,cycle);
   float normalizedDistance=length(delta)/radius;
   float inside=1.-smoothstep(.78,1.,normalizedDistance);
   float lensSlope=pow(max(0.,1.-normalizedDistance*normalizedDistance),2.);
   float lens=uGlobalStrength*inside*lensSlope*.68;
   // Convex samples the inner region; concave samples farther out.
   float direction=uGlobalMode==1?-1.:1.;
   uv=vUv+delta/aspect*direction*lens;
 }

 vec2 cells=max(vec2(1.),uGrid);
 vec2 gap=vec2(uGap)/cells;
 vec2 cellSize=(1.-gap*(cells-1.))/cells;
 vec2 pitch=cellSize+gap;
 vec2 cell=floor(uv/pitch);
 vec2 local=(uv-cell*pitch)/cellSize;
 bool outside=any(lessThan(uv,vec2(0.)))||any(greaterThanEqual(uv,vec2(1.)));
 bool invalid=outside||any(lessThan(local,vec2(0.)))||any(greaterThanEqual(local,vec2(1.)))||any(greaterThanEqual(cell,cells));
 if(invalid){outColor=vec4(uBackground,1.);return;}

 // Optical refraction is evaluated independently in each stationary cell.
 // The actual source pixels available in the tile determine lens quality:
 // a 24-pixel tile cannot resolve a full glass curvature without aliasing.
 vec2 sampleLocal=local;
 vec2 tilePixels=max(vec2(1.),cellSize*vec2(textureSize(uFrames,0).xy));
 float minPixels=min(tilePixels.x,tilePixels.y);
 float detailBudget=smoothstep(14.,64.,minPixels);
 float strength=clamp(uAmount,0.,1.)*detailBudget;
 if(uMode!=0 && detailBudget>.001){
   float seed=hash21(cell+vec2(9.7,23.1));
   float seedB=hash21(cell+vec2(43.2,8.5));
   float phase=uTime*uFlow*(.48+seed*.46)+seedB*6.2831853;
   vec2 q=(local-.5)*2.;
   float radius2=dot(q,q);
   float inside=1.-smoothstep(.68,1.0,radius2);
   float glass=clamp(strength*(1.+.08*sin(phase*.55)),0.,1.);
   float bulge=sqrt(max(.045,1.-min(radius2,.955)));
   float slope=(1./bulge-1.)*inside;
   // Lower curvature as tile resolution shrinks. Otherwise small tiles
   // become dozens of hard-edged repeats instead of a readable lens.
   float curvature=(.08+clamp(uFrequency,.2,12.)*.036)*mix(.65,1.,detailBudget);
   // Smooth saturation instead of a hard displacement clamp. This keeps
   // derivatives continuous and reduces stair-stepping around strong lenses.
   float rawRefraction=max(0.,slope*curvature*glass);
   float refraction=.58*(1.-exp(-rawRefraction/.58));
   vec2 ray=q*(uMode==1?1.-refraction:1.+refraction);
   sampleLocal=.5+.5*ray;
 }
 // Half-pixel inset avoids texture filtering across neighbouring cells.
 vec2 inset=min(vec2(.49),.5/max(cellSize*vec2(textureSize(uFrames,0).xy),vec2(1.)));
 sampleLocal=clamp(sampleLocal,inset,1.-inset);
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
 // Black mode gates each cell using its delay offset, without blending.
 // Return pure black before any texture lookup or grid decoration.
 if(uDelayMode==1){
  float blackPhase=fract((uTime-secondsAgo)*.5);
  if(blackPhase<clamp(uBlackHold,0.,1.)){outColor=vec4(0.,0.,0.,1.);return;}
 }
 // The image mode and the visible interval of black mode share the sample.
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
export function createDelayGPU(canvas:HTMLCanvasElement,w:number,h:number,quality:DelayQuality="balanced"):DelayGPU{
 const gl=canvas.getContext("webgl2",{alpha:false,antialias:false,preserveDrawingBuffer:false,powerPreference:"high-performance"});
 if(!gl)throw new Error("WebGL2 is not available in this browser.");
 const vs=shader(gl,gl.VERTEX_SHADER,vertex),fs=shader(gl,gl.FRAGMENT_SHADER,fragment);
 const prog=gl.createProgram();if(!prog)throw new Error("WebGL program allocation failed");
 gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog)||"WebGL shader link failed");
 const vao=gl.createVertexArray();if(!vao)throw new Error("WebGL vertex array allocation failed");
 const texture=gl.createTexture();if(!texture)throw new Error("WebGL history texture allocation failed");
 // 224 MiB maximum texture history. Temporal resolution is adapted to display dimensions.
 // Resolve the image FIRST, then fit as many history layers as memory permits.
 // The former fixed 64-layer allocation shrank every frame to a thumbnail.
 const maxTexture=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,2048);
 const maxLayers=gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number;
 // Budget texture memory by quality instead of blindly raising resolution.
 // Sharp favours source detail; Fluid favours more chronological samples.
 const budget=(quality==="sharp"?256:quality==="fluid"?192:224)*1024*1024;
 const availableLayers=Math.min(maxLayers,quality==="fluid"?112:quality==="sharp"?48:72);
 if(availableLayers<2)throw new Error("GPU does not support the temporal texture array");
 const minimumLayers=Math.min(availableLayers,quality==="sharp"?12:quality==="fluid"?32:20);
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
  delay:uniforms("uDelay"),delayMode:uniforms("uDelayMode"),blackHold:uniforms("uBlackHold"),pattern:uniforms("uPattern"),newest:uniforms("uNewest"),
  count:uniforms("uCount"),capacity:uniforms("uCapacity"),liveLayer:uniforms("uLiveLayer"),interval:uniforms("uInterval"),elapsed:uniforms("uElapsed"),
  background:uniforms("uBackground"),blend:uniforms("uBlend"),gridVisible:uniforms("uGridVisible"),
  mode:uniforms("uMode"),amount:uniforms("uAmount"),frequency:uniforms("uFrequency"),
  flow:uniforms("uFlow"),time:uniforms("uTime"),
  globalMode:uniforms("uGlobalMode"),globalStrength:uniforms("uGlobalStrength"),globalSize:uniforms("uGlobalSize"),globalGrowth:uniforms("uGlobalGrowth"),aspect:uniforms("uAspect")
 };
 // Capture a history snapshot by copying the live texture layer on the GPU.
 // This avoids a second full-canvas CPU->GPU upload on every capture.
 const readFramebuffer=gl.createFramebuffer();
 let fastCapture=!!readFramebuffer;
 let verifyCapture=true;
 if(readFramebuffer){
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,readFramebuffer);
  gl.framebufferTextureLayer(gl.READ_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,texture,0,liveLayer);
  fastCapture=gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);
 }
 let newest=-1,count=0;
 const write=(frame:HTMLCanvasElement,layer:number)=>{
  if(gl.isContextLost())return;
  // Avoid a redundant 2D resample if the source already matches the GPU frame.
  const pixels=frame.width===tw&&frame.height===th?frame:upload;
  if(pixels===upload){uc.clearRect(0,0,tw,th);uc.drawImage(frame,0,0,tw,th)}
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,tw,th,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 };
 const capture=(frame:HTMLCanvasElement)=>{
  newest=(newest+1)%historyCapacity;
  count=Math.min(historyCapacity,count+1);
  if(fastCapture&&readFramebuffer&&!gl.isContextLost()){
   gl.bindFramebuffer(gl.READ_FRAMEBUFFER,readFramebuffer);
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);
   gl.copyTexSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,newest,0,0,tw,th);
   gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);
   // Validate the copy once (not every frame). Safari/driver failures use the
   // original CPU upload path rather than silently leaving empty history.
   if(verifyCapture){
    verifyCapture=false;
    if(gl.getError()!==gl.NO_ERROR){
     fastCapture=false;
     write(frame,newest);
    }
   }
  }else{
   write(frame,newest);
  }
 };
 const pushLive=(frame:HTMLCanvasElement)=>write(frame,liveLayer);
 const render=(p:DelayGeometry)=>{
  if(!count||gl.isContextLost())return;
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.disable(gl.BLEND);gl.useProgram(prog);gl.bindVertexArray(vao);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);
  gl.uniform1i(loc.frames,0);gl.uniform2f(loc.grid,p.columns,p.rows);
  gl.uniform1f(loc.gap,p.spacing/200);gl.uniform1f(loc.delay,p.delay);
  gl.uniform1i(loc.delayMode,p.delayMode);gl.uniform1f(loc.blackHold,p.blackHold);
  gl.uniform1i(loc.pattern,p.pattern);gl.uniform1i(loc.newest,newest);
  gl.uniform1i(loc.count,count);gl.uniform1i(loc.capacity,historyCapacity);gl.uniform1i(loc.liveLayer,liveLayer);gl.uniform1f(loc.interval,interval);gl.uniform1f(loc.elapsed,p.elapsed);
  gl.uniform3f(loc.background,...p.background);gl.uniform1i(loc.blend,p.blend);
  gl.uniform1i(loc.gridVisible,p.grid?1:0);
  gl.uniform1i(loc.mode,p.mode);gl.uniform1f(loc.amount,p.amount);
  gl.uniform1f(loc.frequency,p.frequency);gl.uniform1f(loc.flow,p.flow);
  gl.uniform1f(loc.time,p.time);
  gl.uniform1i(loc.globalMode,p.globalMode);
  gl.uniform1f(loc.globalStrength,p.globalStrength);
  gl.uniform1f(loc.globalSize,p.globalSize);
  gl.uniform1f(loc.globalGrowth,p.globalGrowth);
  gl.uniform1f(loc.aspect,canvas.width/Math.max(1,canvas.height));
  gl.drawArrays(gl.TRIANGLES,0,3);
 };
 return {width:tw,height:th,interval,capture,pushLive,render,dispose:()=>{
  if(readFramebuffer)gl.deleteFramebuffer(readFramebuffer);
  gl.deleteTexture(texture);gl.deleteVertexArray(vao);gl.deleteProgram(prog);
 }};
}
