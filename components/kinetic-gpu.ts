/** GPU image passes. Typography and cached glyph atlas use browser font rasterisation. */
export type GPUStamp = { x: number; y: number; px: number; py: number; size: number; glyph?: number };
export type GPUFrame = { texture: WebGLTexture; framebuffer: WebGLFramebuffer; width: number; height: number };
export function createKineticGPU() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
  if (!gl) { console.warn("K-TIC-SYNTH: WebGL2 unavailable; using Canvas2D"); return null; }
  const shaders: WebGLShader[] = [], programs: WebGLProgram[] = [], buffers: WebGLBuffer[] = [], textures: WebGLTexture[] = [];
  const shader = (type: number, text: string) => {
    const s = gl.createShader(type)!; shaders.push(s); gl.shaderSource(s, text); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'GPU shader compilation failed');
    return s;
  };
  const program = (v: string, f: string) => {
    const p = gl.createProgram()!; programs.push(p); gl.attachShader(p, shader(gl.VERTEX_SHADER, v)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'GPU shader linking failed');
    return p;
  };
  const vertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec2 corner;
layout(location=1) in vec2 samplePixel;
layout(location=2) in vec2 position;
layout(location=3) in float size;
layout(location=4) in float glyph;
uniform vec2 atlasGrid;
uniform vec2 atlasCell;
uniform float atlasEm;
uniform highp usampler2D accepted;
uniform int acceptedWidth;
uniform int glyphCount;
uniform vec2 resolution;
uniform int shape;
uniform float lineLength;
uniform float primitiveScale;
flat out vec2 uv;
out vec2 local;
out vec2 atlasUV;
void main(){
 local=corner; uv=vec2((samplePixel.x+0.5)/resolution.x,1.0-(samplePixel.y+0.5)/resolution.y);
 vec2 offset=corner*size;
 if(shape==0||shape==1){local=corner*(1.0+2.0/max(size,1.0));offset=local*size;}
 if(shape==2){float t=lineLength/1.41421356237; float w=max(1.0,size/3.0);local=corner*vec2(1.0+2.0/max(lineLength,1.0),1.0+2.0/w);offset=vec2(local.x*t-local.y*w/1.41421356237,local.x*t+local.y*w/1.41421356237);}
 if(shape==3)offset=(corner+0.5)*primitiveScale;
 atlasUV=vec2(0);
 if(shape==4){offset=corner*size*atlasCell/atlasEm;uint rank=texelFetch(accepted,ivec2(gl_InstanceID%acceptedWidth,gl_InstanceID/acceptedWidth),0).r;float index=float((max(rank,1u)-1u)%uint(glyphCount));atlasUV=(vec2(mod(index,atlasGrid.x),floor(index/atlasGrid.x))+corner+0.5)/atlasGrid;}
 vec2 pixel=position+offset;
 gl_Position=vec4(pixel/resolution*vec2(2.0,-2.0)+vec2(-1.0,1.0),0.0,1.0);
}`;
  const fragment = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D image;
uniform float threshold;
uniform float opacity;
uniform int shape;
uniform sampler2D atlas;
flat in vec2 uv;
in vec2 local;
in vec2 atlasUV;
out vec4 color;
void main(){vec4 c=texture(image,uv);if(c.a<threshold)discard;
 float coverage=1.0;
 if(shape==0){float d=length(local);coverage=1.0-smoothstep(0.5-fwidth(d)*0.5,0.5+fwidth(d)*0.5,d);}
 if(shape==1||shape==2){vec2 edge=(vec2(0.5)-abs(local))/max(fwidth(local),vec2(0.00001));coverage=clamp(min(edge.x,edge.y)+0.5,0.0,1.0);}
 if(shape==4)coverage=texture(atlas,atlasUV).a;
 float a=c.a*opacity*coverage;color=vec4(c.rgb*opacity*coverage,a);
}`;
  const imageVertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec2 corner;
layout(location=1) in vec2 center;
layout(location=2) in vec2 extent;
uniform vec2 resolution;
uniform float rotation;
out vec2 uv;
void main(){uv=vec2(corner.x+0.5,0.5-corner.y);vec2 offset=corner*extent;float c=cos(rotation),s=sin(rotation);offset=vec2(c*offset.x-s*offset.y,s*offset.x+c*offset.y);gl_Position=vec4((center+offset)/resolution*vec2(2.0,-2.0)+vec2(-1.0,1.0),0,1);}`;
  const imageFragment = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D image;uniform float copyOpacity;in vec2 uv;out vec4 color;
void main(){vec4 c=texture(image,uv);color=c*copyOpacity;}`;
  const feedbackFragment = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D image;uniform sampler2D history;uniform float amount;uniform int mode;
in vec2 uv;out vec4 color;
void main(){vec4 b=texture(image,uv);vec4 s=texture(history,uv);
b.rgb=b.a>0.0?b.rgb/b.a:vec3(0);s.rgb=s.a>0.0?s.rgb/s.a:vec3(0);s.a*=amount;
vec3 blend=s.rgb;
if(mode==1)blend=1.0-(1.0-b.rgb)*(1.0-s.rgb);
if(mode==2)blend=b.rgb*s.rgb;
if(mode==3)blend=mix(2.0*b.rgb*s.rgb,1.0-2.0*(1.0-b.rgb)*(1.0-s.rgb),step(vec3(0.5),b.rgb));
if(mode==4)blend=abs(b.rgb-s.rgb);
if(mode==5)blend=b.rgb+s.rgb-2.0*b.rgb*s.rgb;
if(mode==6)blend=max(b.rgb,s.rgb);
if(mode==7)blend=min(b.rgb,s.rgb);
if(mode==8){color=min(vec4(1),vec4(b.rgb*b.a+s.rgb*s.a,b.a+s.a));return;}
float a=s.a+b.a*(1.0-s.a);
vec3 c=(1.0-s.a)*b.rgb*b.a+(1.0-b.a)*s.rgb*s.a+b.a*s.a*blend;
color=vec4(c,a);}`;
  const scanVertex = `#version 300 es
precision highp float;
const vec2 vertices[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));
void main(){gl_Position=vec4(vertices[gl_VertexID],0,1);}`;
  const scanFragment = `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;
uniform sampler2D image;
uniform sampler2D positions;
uniform usampler2D previous;
uniform vec2 resolution;
uniform int scanWidth;
uniform int count;
uniform int offset;
uniform float threshold;
layout(location=0) out uint result;
void main(){ivec2 p=ivec2(gl_FragCoord.xy);int index=p.x+p.y*scanWidth;
if(index>=count){result=0u;return;}
if(offset==0){vec2 pixel=texelFetch(positions,p,0).rg;vec2 uv=vec2((pixel.x+0.5)/resolution.x,1.0-(pixel.y+0.5)/resolution.y);result=texture(image,uv).a>=threshold?1u:0u;}
else {result=texelFetch(previous,p,0).r;if(index>=offset){int other=index-offset;result+=texelFetch(previous,ivec2(other%scanWidth,other/scanWidth),0).r;}}}`;
  let stamps: WebGLProgram, copies: WebGLProgram, feedback: WebGLProgram, scan: WebGLProgram;
  try { stamps=program(vertex,fragment);copies=program(imageVertex,imageFragment);feedback=program(imageVertex,feedbackFragment);scan=program(scanVertex,scanFragment); }
  catch(error){console.warn('K-TIC-SYNTH: GPU initialisation failed',error);shaders.forEach(s=>gl.deleteShader(s));programs.forEach(p=>gl.deleteProgram(p));return null;}
  const framebuffers: WebGLFramebuffer[]=[];
  const quad=gl.createBuffer()!,instances=gl.createBuffer()!;buffers.push(quad,instances);
  gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,.5,-.5,-.5,.5,-.5,.5,.5,-.5,.5,.5]),gl.STATIC_DRAW);
  const makeTexture=()=>{const t=gl.createTexture()!;textures.push(t);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;};
  const frames=new Map<string,GPUFrame>();let width=1,height=1,routeKey='';
  const target=(key:string,w=width,h=height,integer=false)=>{
    let f=frames.get(key);
    if(!f){const texture=makeTexture(),framebuffer=gl.createFramebuffer()!;framebuffers.push(framebuffer);f={texture,framebuffer,width:0,height:0};frames.set(key,f);}
    if(f.width!==w||f.height!==h){gl.bindTexture(gl.TEXTURE_2D,f.texture);gl.texImage2D(gl.TEXTURE_2D,0,integer?gl.R32UI:gl.RGBA8,w,h,0,integer?gl.RED_INTEGER:gl.RGBA,integer?gl.UNSIGNED_INT:gl.UNSIGNED_BYTE,null);f.width=w;f.height=h;gl.bindFramebuffer(gl.FRAMEBUFFER,f.framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,f.texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('GPU framebuffer incomplete');}
    return f;
  };
  const bind=(frame:GPUFrame|null)=>{gl.bindFramebuffer(gl.FRAMEBUFFER,frame?.framebuffer || null);gl.viewport(0,0,frame?.width || width,frame?.height || height);};
  const clear=(frame:GPUFrame)=>{bind(frame);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);};
  const texture=(t:WebGLTexture,unit:number,linear=false)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,linear?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,linear?gl.LINEAR:gl.NEAREST);};
  const upload=(image:HTMLCanvasElement,t:WebGLTexture,unit:number,flip=false)=>{texture(t,unit,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,flip);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);};
  const uniform=(p:WebGLProgram,name:string)=>gl.getUniformLocation(p,name);
  const imagePass=(input:GPUFrame,placements:number[],output:GPUFrame|null,p=copies,history?:GPUFrame,amount=0,mode=0,opacity=1,rotation=0)=>{
    bind(output);gl.useProgram(p);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);texture(input.texture,0,true);gl.uniform1i(uniform(p,'image'),0);gl.uniform1f(uniform(p,'copyOpacity'),opacity);gl.uniform1f(uniform(p,'rotation'),rotation);
    if(history){texture(history.texture,1,true);gl.uniform1i(uniform(p,'history'),1);gl.uniform1f(uniform(p,'amount'),amount);gl.uniform1i(uniform(p,'mode'),mode);}
    gl.uniform2f(uniform(p,'resolution'),width,height);
    gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,instances);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(placements),gl.DYNAMIC_DRAW);
    for(const [location,offset] of [[1,0],[2,8]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,16,offset);gl.vertexAttribDivisor(location,1);}gl.disableVertexAttribArray(3);gl.disableVertexAttribArray(4);
    gl.drawArraysInstanced(gl.TRIANGLES,0,6,placements.length/4);
  };
  const full=()=>[width/2,height/2,width,height];
  const copy=(input:GPUFrame,key:string)=>{const out=target(key);if(out===input)return out;clear(out);imagePass(input,full(),out);return out;};
  const atlasTexture=makeTexture(),positionsTexture=makeTexture();
  const atlasCanvas=document.createElement('canvas');atlasCanvas.width=1;atlasCanvas.height=1;upload(atlasCanvas,atlasTexture,1);
  let atlasKey='',atlasColumns=1,atlasRows=1,cellWidth=192,cellHeight=256,atlasEm=128;
  const prepareAtlas=(pattern:string,font:string,weight:number,requestedSize:number)=>{
    const characters=Array.from(pattern || '*');
    const maxTexture=gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const columns=Math.ceil(Math.sqrt(characters.length)),rows=Math.ceil(characters.length/columns);
    const wanted=2 ** Math.ceil(Math.log2(Math.max(128,requestedSize)));
    const em=Math.max(32,Math.min(1024,wanted,2 ** Math.floor(Math.log2(maxTexture / Math.max(columns*2,rows*2)))));
    const key=JSON.stringify([pattern,font,weight,em]);if(key===atlasKey)return;
    atlasEm=em;const context=atlasCanvas.getContext('2d')!;context.font=`${weight} ${em}px ${font}`;
    cellWidth=Math.min(Math.floor(maxTexture/columns),Math.max(Math.ceil(em*1.5),...characters.map(char=>Math.ceil(context.measureText(char).width)+Math.ceil(em/8))));cellHeight=Math.ceil(em*2);atlasColumns=Math.ceil(Math.sqrt(characters.length));atlasRows=Math.ceil(characters.length/atlasColumns);
    atlasCanvas.width=cellWidth*atlasColumns;atlasCanvas.height=cellHeight*atlasRows;context.font=`${weight} ${em}px ${font}`;context.fillStyle='#fff';context.textAlign='center';context.textBaseline='middle';
    characters.forEach((char,i)=>context.fillText(char,(i%atlasColumns+.5)*cellWidth,(Math.floor(i/atlasColumns)+.5)*cellHeight));upload(atlasCanvas,atlasTexture,1);atlasKey=key;
  };
  const accepted=(input:GPUFrame,points:GPUStamp[],threshold:number)=>{
    const sw=Math.min(1024,Math.max(1,points.length)),sh=Math.max(1,Math.ceil(points.length/sw)),positions=new Float32Array(sw*sh*2);
    points.forEach((p,i)=>{positions[i*2]=p.x;positions[i*2+1]=p.y;});texture(positionsTexture,3);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RG32F,sw,sh,0,gl.RG,gl.FLOAT,positions);
    const a=target('scan-a',sw,sh,true),b=target('scan-b',sw,sh,true);let source=b,destination=a;
    gl.useProgram(scan);gl.disable(gl.BLEND);texture(input.texture,0);texture(positionsTexture,3);gl.uniform1i(uniform(scan,'image'),0);gl.uniform1i(uniform(scan,'positions'),3);gl.uniform1i(uniform(scan,'previous'),2);gl.uniform2f(uniform(scan,'resolution'),width,height);gl.uniform1i(uniform(scan,'scanWidth'),sw);gl.uniform1i(uniform(scan,'count'),points.length);gl.uniform1f(uniform(scan,'threshold'),threshold);
    for(let offset=0;offset<Math.max(1,points.length);offset=offset===0?1:offset*2){bind(destination);texture(source.texture,2);gl.uniform1i(uniform(scan,'offset'),offset);gl.drawArrays(gl.TRIANGLES,0,3);const swap=source;source=destination;destination=swap;}
    return source;
  };
  let data=new Float32Array(0);
  return {
    available:()=>!gl.isContextLost(),
    begin(w:number,h:number,routes:string,feedbackOn:boolean){
      const reset=width!==w||height!==h||routeKey!==routes;width=w;height=h;routeKey=routes;
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      if(reset)for(const key of frames.keys()){if(key.startsWith('scan-'))continue;const resized=target(key);clear(resized);}
      if(!feedbackOn)clear(target('history'));return target('blank');
    },
    load(input:HTMLCanvasElement,key='typography'){const f=target(key);upload(input,f.texture,0,true);return f;},
    previous(node:string){return target('previous-'+node);},
    snapshot(node:string,input:GPUFrame){copy(input,'previous-'+node);},
    present(input:GPUFrame){bind(null);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);imagePass(input,full(),null);return canvas;},
    render(input:GPUFrame,points:GPUStamp[],shape:number,threshold:number,opacity:number,lineLength:number,key:string,mix:number,glyphs?:{pattern:string;font:string;weight:number},primitiveScale=1){
      let ranks:GPUFrame|undefined;if(glyphs){prepareAtlas(glyphs.pattern,glyphs.font,glyphs.weight,points.reduce((max,p)=>Math.max(max,p.size),128));ranks=accepted(input,points,threshold);}
      const out=target(key);clear(out);
      if(mix<1)imagePass(input,full(),out,copies,undefined,0,0,1-mix);
      gl.useProgram(stamps);bind(out);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);texture(input.texture,0);texture(atlasTexture,1,true);
      gl.uniform1i(uniform(stamps,'image'),0);gl.uniform1i(uniform(stamps,'atlas'),1);gl.uniform2f(uniform(stamps,'resolution'),width,height);gl.uniform1i(uniform(stamps,'shape'),shape);gl.uniform1f(uniform(stamps,'threshold'),threshold);gl.uniform1f(uniform(stamps,'opacity'),opacity*mix);gl.uniform1f(uniform(stamps,'lineLength'),lineLength);gl.uniform1f(uniform(stamps,'primitiveScale'),primitiveScale);gl.uniform2f(uniform(stamps,'atlasGrid'),atlasColumns,atlasRows);gl.uniform2f(uniform(stamps,'atlasCell'),cellWidth,cellHeight);gl.uniform1f(uniform(stamps,'atlasEm'),atlasEm);
      const scanFrame=ranks || target('scan-empty',1,1,true);texture(scanFrame.texture,2);gl.uniform1i(uniform(stamps,'accepted'),2);gl.uniform1i(uniform(stamps,'acceptedWidth'),scanFrame.width);gl.uniform1i(uniform(stamps,'glyphCount'),Math.max(1,Array.from(glyphs?.pattern || '*').length));bind(out);
      if(data.length<points.length*6)data=new Float32Array(points.length*6);points.forEach((p,i)=>{const j=i*6;data[j]=p.x;data[j+1]=p.y;data[j+2]=p.px;data[j+3]=p.py;data[j+4]=p.size;data[j+5]=0;});
      gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,0);gl.bindBuffer(gl.ARRAY_BUFFER,instances);gl.bufferData(gl.ARRAY_BUFFER,data.subarray(0,points.length*6),gl.DYNAMIC_DRAW);
      for(const [location,count,offset] of [[1,2,0],[2,2,8],[3,1,16],[4,1,20]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,count,gl.FLOAT,false,24,offset);gl.vertexAttribDivisor(location,1);}gl.drawArraysInstanced(gl.TRIANGLES,0,6,points.length);return out;
    },
    repeat(input:GPUFrame,placements:number[],key:string,rotation=0){const out=target(key);clear(out);imagePass(input,placements,out,copies,undefined,0,0,1,rotation);return out;},
    feedback(input:GPUFrame,amount:number,mode:number,due:boolean,key:string){const out=target(key);clear(out);imagePass(input,full(),out,feedback,target('history'),amount,mode);if(due)copy(out,'history');return out;},
    dispose(){framebuffers.forEach(f=>gl.deleteFramebuffer(f));textures.forEach(t=>gl.deleteTexture(t));buffers.forEach(b=>gl.deleteBuffer(b));programs.forEach(p=>gl.deleteProgram(p));shaders.forEach(s=>gl.deleteShader(s));}
  };
}
