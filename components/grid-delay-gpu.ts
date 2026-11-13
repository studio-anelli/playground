"use client";

/** WebGL2 temporal sampling. Source pixels are still authored in an offscreen
 * 2D canvas; the history, grid composition and deformation live on the GPU. */
export type DelayGeometry = {
  columns:number; rows:number; spacing:number; delay:number; pattern:number;
  delayMode:number; blackHold:number; delayType:number; echoMix:number; tapeWear:number; waveBlend:number; warpSpeed:number;
  mode:number; amount:number; frequency:number; flow:number; time:number; elapsed:number;
  globalMode:number; globalStrength:number; globalSize:number; globalGrowth:number;
  grid:boolean; background:[number,number,number]; blend:number; backgroundInside:boolean;
  feedbackEnabled:boolean;feedbackAmount:number;feedbackDecay:number;feedbackRefresh:number;feedbackBlend:number;
  feedbackZoom:number;feedbackDrift:number;feedbackRotation:number;feedbackWarp:number;
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
uniform int uDelayType;
uniform float uEchoMix;
uniform float uTapeWear;
uniform float uWarpSpeed;
uniform int uWaveBlend;
uniform int uPattern;
uniform int uNewest;
uniform int uCount;
uniform int uCapacity;
uniform int uLiveLayer;
uniform float uInterval;
uniform float uElapsed;
uniform vec3 uBackground;
uniform int uBlend;
uniform bool uBackgroundInside;
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
int historyLayer(float secondsAgo){
 if(uCount>0 && secondsAgo>max(.0001,uElapsed*.5)){
  float past=max(0.,secondsAgo-uElapsed)/max(.0001,uInterval);
  int age=min(int(floor(past+.5)),uCount-1);
  return (uNewest-age+uCapacity)%uCapacity;
 }
 return uLiveLayer;
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
vec3 waveComposite(vec3 base,vec3 wave){
 if(uWaveBlend==1)return base*wave;
 if(uWaveBlend==2)return 1.-(1.-base)*(1.-wave);
 if(uWaveBlend==3)return abs(base-wave);
 return wave;
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

 // Per-cell optical lenses. Unlike the old 14–64px quality gate, the
 // available resolution only disables refraction on genuinely tiny cells.
 // Fisheye pulls source coordinates inward (magnification); Pinch pushes
 // outward (minification). Both preserve the cell boundary exactly.
 // Restored verbatim from the original lens engine (pre-PR #108).
 // This steep surface-normal refraction is the intentional optical character
 // that later monotonic radial profiles accidentally erased.
 vec2 sampleLocal=local;
 float strength=clamp(uAmount,0.,1.);
 if(uMode!=0){
   float seed=hash21(cell+vec2(9.7,23.1));
   float seedB=hash21(cell+vec2(43.2,8.5));
   float phase=uTime*uFlow*(.48+seed*.46)+seedB*6.2831853;
   vec2 q=(local-.5)*2.;
   float radius2=dot(q,q);
   float inside=1.-smoothstep(.81,1.0,radius2);
   float glass=clamp(strength*(1.+.08*sin(phase*.55)),0.,1.);
   float bulge=sqrt(max(.045,1.-min(radius2,.955)));
   float slope=(1./bulge-1.)*inside;
   // Frequency control now tunes optical curvature, not unused noise frequency.
   float curvature=.08+clamp(uFrequency,.2,12.)*.036;
   float refraction=clamp(slope*curvature*glass,0.,.65);
   // Fisheye (1) magnifies; Pinch (2) minifies.
   vec2 ray=q*(uMode==1?1.-refraction:1.+refraction);
   sampleLocal=.5+.5*ray;
 }
 // Half-pixel inset avoids texture filtering across neighbouring cells.
 vec2 inset=min(vec2(.49),.5/max(cellSize*vec2(textureSize(uFrames,0).xy),vec2(1.)));
 sampleLocal=clamp(sampleLocal,inset,1.-inset);
 vec2 sourceUV=(cell+sampleLocal)/cells;
 // The current frame is uploaded every RAF while historical snapshots
 // occupy a separate ring. Never crossfade distinct text shapes.
 // Restore the original, stable temporal index: ONE fixed delay per tile.
 // Smoothly varying a quantised texture-layer index within a cell created
 // staircase cuts through letterforms even with the optical lens in Rigid.
 float secondsAgo=max(0.,patternValue(cell)*uDelay);
 int selectedLayer=historyLayer(secondsAgo);
 // Black mode gates each cell using its delay offset, without blending.
 // Return pure black before any texture lookup or grid decoration.
 if(uDelayMode==1){
  float blackPhase=fract((uTime-secondsAgo)*.5);
  if(blackPhase<clamp(uBlackHold,0.,1.)){outColor=vec4(0.,0.,0.,1.);return;}
 }
 // Digital leaves the original exact time-slice sampler untouched.
 vec4 sampleColor=textureLod(uFrames,vec3(sourceUV,float(selectedLayer)),0.);
 vec3 rendered=compose(sampleColor.rgb,uBackground);
 vec3 result=uBackgroundInside?rendered:mix(uBackground,rendered,clamp(sampleColor.a,0.,1.));
 if(uDelayType==1){
   // Spatial domain warping: a two-stage coupled sine field displaces
   // source coordinates. Past-frame age is fixed per tile, so typography
   // remains coherent and no layer-index tearing occurs inside glyphs.
   float strength=clamp(uEchoMix,0.,1.);
   float frequency=mix(1.5,15.,clamp(uTapeWear,0.,1.));
   float t=uTime*max(.0,uWarpSpeed);
   vec2 q=sourceUV;
   vec2 field=vec2(
      sin(q.y*frequency*6.2831853+t*.83)+.45*cos(q.x*frequency*3.1-t*.67),
      cos(q.x*frequency*6.2831853-t*.72)+.45*sin(q.y*frequency*3.4+t*.91)
   );
   vec2 nested=q+field*.035;
   vec2 warp=vec2(
      sin(nested.y*frequency*4.9+t*.58),
      cos(nested.x*frequency*5.2-t*.61)
   )+field*.35;
   vec2 warpedUV=clamp(sourceUV+warp*(strength*.08),vec2(0.),vec2(1.));
   vec4 pastSample=textureLod(uFrames,vec3(warpedUV,float(selectedLayer)),0.);
   vec3 past=compose(pastSample.rgb,uBackground);
   vec3 pastVisible=uBackgroundInside?past:mix(uBackground,past,clamp(pastSample.a,0.,1.));
   result=waveComposite(result,pastVisible);
 }
 if(uGridVisible){
   vec2 rim=min(local,1.-local)*cellSize*cells;
   if(min(rim.x,rim.y)<.006)result=mix(result,vec3(.13,.15,.13),.22);
 }
 outColor=vec4(result,1.);
}`;

// Feedback is an output-only pass: delay history still stores raw source frames.
// Use gl_FragCoord so framebuffer textures are sampled without vertical flips.
const feedbackFragment = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D uScene;
uniform sampler2D uPrevious;
uniform vec2 uResolution;
uniform float uAmount;
uniform float uDecay;
uniform int uBlendMode;
uniform bool uHasHistory;
uniform float uZoom;
uniform float uDrift;
uniform float uRotation;
uniform float uWarp;
uniform float uTime;
vec3 blendFrames(vec3 a,vec3 b){
 if(uBlendMode==1)return a*b;
 if(uBlendMode==2)return 1.-(1.-a)*(1.-b);
 if(uBlendMode==3)return mix(2.*a*b,1.-2.*(1.-a)*(1.-b),step(.5,a));
 if(uBlendMode==4)return abs(a-b);
 if(uBlendMode==5)return a+b-2.*a*b;
 if(uBlendMode==6)return max(a,b);
 if(uBlendMode==7)return min(a,b);
 return b;
}
void main(){
 vec2 uv=gl_FragCoord.xy/uResolution;
 vec3 incoming=texture(uScene,uv).rgb;
 if(!uHasHistory||uAmount<=0.){outColor=vec4(incoming,1.);return;}
 // Recursive transform: the PREVIOUS COMPOSITE is the next pass's input.
 // Each iteration expands, rotates and drifts an already transformed image.
 vec2 centered=uv-.5;
 float theta=uRotation*.01745329252;
 mat2 spin=mat2(cos(theta),-sin(theta),sin(theta),cos(theta));
 centered=spin*centered/max(.5,1.+uZoom);
 centered+=vec2(uDrift*.003,-uDrift*.0015);
 vec2 perturb=vec2(
   sin(centered.y*21.+uTime*.32),
   cos(centered.x*19.-uTime*.27)
 )*uWarp*.015;
 vec2 prevUV=centered+perturb+.5;
 // Avoid clamped-edge streaks outside the previous canvas.
 vec3 previous=incoming;
 if(all(greaterThanEqual(prevUV,vec2(0.)))&&all(lessThanEqual(prevUV,vec2(1.)))){
   previous=texture(uPrevious,prevUV).rgb;
 }
 // Retention controls how much recursive history survives each iteration,
 // while Amount controls the final image contribution.
 vec3 retained=mix(incoming,previous,clamp(uDecay,0.,.999));
 vec3 transformed=blendFrames(incoming,retained);
 vec3 result=mix(incoming,transformed,clamp(uAmount,0.,1.));
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
 const fvs=shader(gl,gl.VERTEX_SHADER,vertex),ffs=shader(gl,gl.FRAGMENT_SHADER,feedbackFragment);
 const feedbackProgram=gl.createProgram();if(!feedbackProgram)throw new Error("Feedback program allocation failed");
 gl.attachShader(feedbackProgram,fvs);gl.attachShader(feedbackProgram,ffs);gl.linkProgram(feedbackProgram);
 gl.deleteShader(fvs);gl.deleteShader(ffs);
 if(!gl.getProgramParameter(feedbackProgram,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(feedbackProgram)||"Feedback shader link failed");
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
 const uc=upload.getContext("2d",{alpha:true});
 if(!uc)throw new Error("Could not create WebGL source upload canvas");
 const uniforms=(name:string)=>gl.getUniformLocation(prog,name);
 const loc={
  frames:uniforms("uFrames"),grid:uniforms("uGrid"),gap:uniforms("uGap"),
  delay:uniforms("uDelay"),delayMode:uniforms("uDelayMode"),blackHold:uniforms("uBlackHold"),delayType:uniforms("uDelayType"),echoMix:uniforms("uEchoMix"),tapeWear:uniforms("uTapeWear"),warpSpeed:uniforms("uWarpSpeed"),waveBlend:uniforms("uWaveBlend"),pattern:uniforms("uPattern"),newest:uniforms("uNewest"),
  count:uniforms("uCount"),capacity:uniforms("uCapacity"),liveLayer:uniforms("uLiveLayer"),interval:uniforms("uInterval"),elapsed:uniforms("uElapsed"),
  background:uniforms("uBackground"),blend:uniforms("uBlend"),backgroundInside:uniforms("uBackgroundInside"),gridVisible:uniforms("uGridVisible"),
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
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
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
 // Lazily allocate output-resolution feedback buffers only when enabled.
 // The raw history texture array and feedback texture must never alias.
 type FeedbackTarget={texture:WebGLTexture;framebuffer:WebGLFramebuffer};
 let feedbackTargets:FeedbackTarget[]|null=null;
 let feedbackValid=false,feedbackActive=false,feedbackNewest=-1,feedbackLast=-Infinity;
 const feedbackUniform={
  scene:gl.getUniformLocation(feedbackProgram,"uScene"),
  previous:gl.getUniformLocation(feedbackProgram,"uPrevious"),
  resolution:gl.getUniformLocation(feedbackProgram,"uResolution"),
  amount:gl.getUniformLocation(feedbackProgram,"uAmount"),
  decay:gl.getUniformLocation(feedbackProgram,"uDecay"),
  blend:gl.getUniformLocation(feedbackProgram,"uBlendMode"),
  hasHistory:gl.getUniformLocation(feedbackProgram,"uHasHistory"),
  zoom:gl.getUniformLocation(feedbackProgram,"uZoom"),drift:gl.getUniformLocation(feedbackProgram,"uDrift"),
  rotation:gl.getUniformLocation(feedbackProgram,"uRotation"),warp:gl.getUniformLocation(feedbackProgram,"uWarp"),
  time:gl.getUniformLocation(feedbackProgram,"uTime")
 };
 const deleteFeedback=()=>{
  if(feedbackTargets)for(const target of feedbackTargets){gl.deleteFramebuffer(target.framebuffer);gl.deleteTexture(target.texture)}
  feedbackTargets=null;feedbackNewest=-1;feedbackLast=-Infinity;
 };
 const initFeedback=()=>{
  if(feedbackTargets)return true;
  const created:FeedbackTarget[]=[];
  for(let i=0;i<3;i++){
   const tex=gl.createTexture(),fb=gl.createFramebuffer();
   if(!tex||!fb){if(tex)gl.deleteTexture(tex);if(fb)gl.deleteFramebuffer(fb);break}
   gl.bindTexture(gl.TEXTURE_2D,tex);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,canvas.width,canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
   const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
   created.push({texture:tex,framebuffer:fb});
   if(!ok)break;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  if(created.length!==3){
   for(const t of created){gl.deleteFramebuffer(t.framebuffer);gl.deleteTexture(t.texture)}
   feedbackValid=false;return false;
  }
  feedbackTargets=created;feedbackNewest=-1;feedbackLast=-Infinity;return true;
 };
 const render=(p:DelayGeometry)=>{
  if(!count||gl.isContextLost())return;
  // Keep buffers alive while enabled, even when a patch briefly drives amount to zero.
  const wantFeedback=p.feedbackEnabled;
  if(!wantFeedback&&feedbackActive){deleteFeedback();feedbackActive=false}
  if(wantFeedback&&!feedbackActive){feedbackActive=true;feedbackValid=initFeedback()}
  const useFeedback=wantFeedback&&feedbackValid&&!!feedbackTargets;
  // Stage 1 renders the temporal grid either directly or to a scene texture.
  gl.bindFramebuffer(gl.FRAMEBUFFER,useFeedback?feedbackTargets![0].framebuffer:null);
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.disable(gl.BLEND);gl.useProgram(prog);gl.bindVertexArray(vao);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);
  gl.uniform1i(loc.frames,0);gl.uniform2f(loc.grid,p.columns,p.rows);
  gl.uniform1f(loc.gap,p.spacing/200);gl.uniform1f(loc.delay,p.delay);
  gl.uniform1i(loc.delayMode,p.delayMode);gl.uniform1f(loc.blackHold,p.blackHold);
  gl.uniform1i(loc.delayType,p.delayType);gl.uniform1f(loc.echoMix,p.echoMix);gl.uniform1f(loc.tapeWear,p.tapeWear);gl.uniform1f(loc.warpSpeed,p.warpSpeed);gl.uniform1i(loc.waveBlend,p.waveBlend);
  gl.uniform1i(loc.pattern,p.pattern);gl.uniform1i(loc.newest,newest);
  gl.uniform1i(loc.count,count);gl.uniform1i(loc.capacity,historyCapacity);gl.uniform1i(loc.liveLayer,liveLayer);gl.uniform1f(loc.interval,interval);gl.uniform1f(loc.elapsed,p.elapsed);
  gl.uniform3f(loc.background,...p.background);gl.uniform1i(loc.blend,p.blend);gl.uniform1i(loc.backgroundInside,p.backgroundInside?1:0);
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
  if(!useFeedback||!feedbackTargets)return;
  // Stage 2 combines the newly assembled frame with the last snapshot.
  // On refresh ticks, write the result into the opposite history target.
  // Between ticks, display the blend without changing feedback history.
  const refreshSeconds=Math.max(.016,p.feedbackRefresh);
  const due=feedbackNewest<0||p.time-feedbackLast>=refreshSeconds;
  const next=feedbackNewest<0?1:feedbackNewest===1?2:1;
  const outputTarget=due?feedbackTargets[next]:null;
  gl.bindFramebuffer(gl.FRAMEBUFFER,outputTarget?.framebuffer||null);
  gl.useProgram(feedbackProgram);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,feedbackTargets[0].texture);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,feedbackNewest>=0?feedbackTargets[feedbackNewest].texture:feedbackTargets[0].texture);
  gl.uniform1i(feedbackUniform.scene,0);gl.uniform1i(feedbackUniform.previous,1);
  gl.uniform2f(feedbackUniform.resolution,canvas.width,canvas.height);
  gl.uniform1f(feedbackUniform.amount,p.feedbackAmount);
  gl.uniform1f(feedbackUniform.decay,p.feedbackDecay);
  gl.uniform1i(feedbackUniform.blend,p.feedbackBlend);
  gl.uniform1i(feedbackUniform.hasHistory,feedbackNewest>=0?1:0);
  gl.uniform1f(feedbackUniform.zoom,p.feedbackZoom);gl.uniform1f(feedbackUniform.drift,p.feedbackDrift);
  gl.uniform1f(feedbackUniform.rotation,p.feedbackRotation);gl.uniform1f(feedbackUniform.warp,p.feedbackWarp);
  gl.uniform1f(feedbackUniform.time,p.time);
  gl.drawArrays(gl.TRIANGLES,0,3);
  if(due&&outputTarget){
   // The feedback pass already rendered to the snapshot. Present it using
   // WebGL2's framebuffer blit, without introducing a CPU canvas copy.
   gl.bindFramebuffer(gl.READ_FRAMEBUFFER,outputTarget.framebuffer);
   gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
   gl.blitFramebuffer(0,0,canvas.width,canvas.height,0,0,canvas.width,canvas.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);
   gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);
   feedbackNewest=next;feedbackLast=p.time;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 };
 return {width:tw,height:th,interval,capture,pushLive,render,dispose:()=>{
  deleteFeedback();
  if(readFramebuffer)gl.deleteFramebuffer(readFramebuffer);
  gl.deleteTexture(texture);gl.deleteVertexArray(vao);gl.deleteProgram(prog);gl.deleteProgram(feedbackProgram);
 }};
}
