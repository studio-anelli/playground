/** GPU image passes. Typography and glyph stamps retain browser font rasterisation. */
export type GPUStamp = { x: number; y: number; px: number; py: number; size: number };
export function createKineticGPU() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;
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
layout(location=0) in vec2 corner;
layout(location=1) in vec2 samplePixel;
layout(location=2) in vec2 position;
layout(location=3) in float size;
uniform vec2 resolution;
uniform int shape;
uniform float lineLength;
flat out vec2 uv;
out vec2 local;
void main(){
 local=corner; uv=(samplePixel+0.5)/resolution;
 vec2 offset=corner*size;
 if(shape==2){float t=lineLength/1.41421356237; float w=max(1.0,size/3.0);offset=vec2(corner.x*t-corner.y*w/1.41421356237,corner.x*t+corner.y*w/1.41421356237);}
 if(shape==3)offset=(corner+0.5);
 vec2 pixel=position+offset;
 gl_Position=vec4(pixel/resolution*vec2(2.0,-2.0)+vec2(-1.0,1.0),0.0,1.0);
}`;
  const fragment = `#version 300 es
precision highp float;
uniform sampler2D image;
uniform float threshold;
uniform float opacity;
uniform int shape;
uniform float pixelScale;
flat in vec2 uv;
in vec2 local;
out vec4 color;
void main(){vec4 c=texture(image,uv);if(c.a<threshold)discard;
 float coverage=1.0;
 if(shape==0){float d=length(local);coverage=1.0-smoothstep(0.5-fwidth(d),0.5,d);}
 float a=c.a*opacity*coverage;color=vec4(c.rgb*a,a);
}`;
  const imageVertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 corner;
layout(location=1) in vec2 center;
layout(location=2) in vec2 extent;
uniform vec2 resolution;
out vec2 uv;
void main(){uv=corner+0.5;gl_Position=vec4((center+corner*extent)/resolution*vec2(2.0,-2.0)+vec2(-1.0,1.0),0,1);}`;
  const imageFragment = `#version 300 es
precision highp float;
uniform sampler2D image;in vec2 uv;out vec4 color;
void main(){vec4 c=texture(image,uv);color=vec4(c.rgb*c.a,c.a);}`;
  const feedbackFragment = `#version 300 es
precision highp float;
uniform sampler2D image;uniform sampler2D history;uniform float amount;uniform int mode;
in vec2 uv;out vec4 color;
void main(){vec4 b=texture(image,uv);vec4 s=texture(history,uv);s.a*=amount;
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
  let stamps: WebGLProgram, copies: WebGLProgram, feedback: WebGLProgram;
  try { stamps = program(vertex, fragment); copies=program(imageVertex,imageFragment);feedback=program(imageVertex,feedbackFragment); } catch { shaders.forEach(s=>gl.deleteShader(s));programs.forEach(p=>gl.deleteProgram(p));return null; }
  const quad = gl.createBuffer()!, instances = gl.createBuffer()!; buffers.push(quad, instances);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.5,-.5,.5,-.5,-.5,.5,-.5,.5,.5,-.5,.5,.5]), gl.STATIC_DRAW);
  const tex = gl.createTexture()!; textures.push(tex);
  gl.bindTexture(gl.TEXTURE_2D, tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const historyTexture=gl.createTexture()!;textures.push(historyTexture);
  const upload=(image:HTMLCanvasElement,texture:WebGLTexture,unit:number)=>{
    gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  };
  const imagePass=(input:HTMLCanvasElement, placements:number[], p:WebGLProgram, history?:HTMLCanvasElement,amount=0,mode=0)=>{
    if(gl.isContextLost())return null;
    if(canvas.width!==input.width||canvas.height!==input.height){canvas.width=input.width;canvas.height=input.height;}
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(p);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    upload(input,tex,0);gl.uniform1i(gl.getUniformLocation(p,'image'),0);
    if(history){upload(history,historyTexture,1);gl.uniform1i(gl.getUniformLocation(p,'history'),1);gl.uniform1f(gl.getUniformLocation(p,'amount'),amount);gl.uniform1i(gl.getUniformLocation(p,'mode'),mode);}
    gl.uniform2f(gl.getUniformLocation(p,'resolution'),canvas.width,canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,instances);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(placements),gl.DYNAMIC_DRAW);
    for(const [location,offset] of [[1,0],[2,8]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,16,offset);gl.vertexAttribDivisor(location,1);}gl.disableVertexAttribArray(3);
    gl.drawArraysInstanced(gl.TRIANGLES,0,6,placements.length/4);return canvas;
  };
  let data = new Float32Array(0);
  return {
    available: () => !gl.isContextLost(),
    render(input: HTMLCanvasElement, points: GPUStamp[], shape: number, threshold: number, opacity: number, lineLength: number) {
      if(gl.isContextLost())return null;
      if(canvas.width!==input.width||canvas.height!==input.height){canvas.width=input.width;canvas.height=input.height;}
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(stamps);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,input);
      gl.uniform1i(gl.getUniformLocation(stamps,'image'),0);gl.uniform2f(gl.getUniformLocation(stamps,'resolution'),canvas.width,canvas.height);gl.uniform1i(gl.getUniformLocation(stamps,'shape'),shape);gl.uniform1f(gl.getUniformLocation(stamps,'threshold'),threshold);gl.uniform1f(gl.getUniformLocation(stamps,'opacity'),opacity);gl.uniform1f(gl.getUniformLocation(stamps,'lineLength'),lineLength);
      if(data.length<points.length*5)data=new Float32Array(points.length*5);
      points.forEach((p,i)=>{const j=i*5;data[j]=p.x;data[j+1]=p.y;data[j+2]=p.px;data[j+3]=p.py;data[j+4]=p.size;});
      gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,instances);gl.bufferData(gl.ARRAY_BUFFER,data.subarray(0,points.length*5),gl.DYNAMIC_DRAW);
      for(const [location,count,offset] of [[1,2,0],[2,2,8],[3,1,16]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,count,gl.FLOAT,false,20,offset);gl.vertexAttribDivisor(location,1);}
      gl.drawArraysInstanced(gl.TRIANGLES,0,6,points.length);
      return canvas;
    },
    repeat(input:HTMLCanvasElement, placements:number[]){return imagePass(input,placements,copies);},
    feedback(input:HTMLCanvasElement, history:HTMLCanvasElement, amount:number,mode:number){return imagePass(input,[input.width/2,input.height/2,input.width,input.height],feedback,history,amount,mode);},
    dispose(){textures.forEach(t=>gl.deleteTexture(t));buffers.forEach(b=>gl.deleteBuffer(b));programs.forEach(p=>gl.deleteProgram(p));shaders.forEach(s=>gl.deleteShader(s));}
  };
}
