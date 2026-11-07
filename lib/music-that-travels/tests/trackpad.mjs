import fs from 'node:fs';import assert from 'node:assert/strict';
const script=fs.readFileSync('source/geography.html','utf8').split('<script>')[1].split('</script>')[0];new Function(script);
const camera=script.slice(script.indexOf('// Camera motion:'),script.indexOf('function pointer('));
let clock=0,frames=new Map(),nextID=0,renders=[];
const raf=fn=>{frames.set(++nextID,fn);return nextID};const cancel=id=>frames.delete(id);
const api=new Function('requestAnimationFrame','cancelAnimationFrame','render','pointer',`let scale=1,dx=0,dy=0,selected=null;const $=()=>({});${camera};return {zoomAt,wheelFactor,handleWheel,handleGestureStart,handleGestureChange,handleGestureEnd,cancelZoom,reset,state:()=>({scale,dx,dy,target:cameraTarget})};`)(raf,cancel,()=>renders.push(api.state()),()=>[420,310]);
function flush(){for(let i=0;frames.size&&i<300;i++){clock+=16;const work=[...frames.values()];frames.clear();for(const f of work)f(clock);}assert.equal(frames.size,0,'animation must settle');}
assert.equal(api.wheelFactor({deltaY:0,deltaMode:0}),1);
assert.ok(api.wheelFactor({deltaY:1,deltaMode:0})>.998);
assert.ok(api.wheelFactor({deltaY:10000,deltaMode:0})>.88,'a single large scroll packet is bounded');
assert.equal(api.wheelFactor({deltaY:1,deltaMode:1}),api.wheelFactor({deltaY:16,deltaMode:0}));
for(let i=0;i<100;i++)api.zoomAt(api.wheelFactor({deltaY:-1,deltaMode:0}),420,310);
assert.equal(api.state().scale,1,'wheel packets update a target, not the live camera in jumps');
assert.ok(api.state().target.scale<1.17,'tiny trackpad events must not explode into max zoom');
flush();assert.ok(Math.abs(api.state().scale-Math.exp(.15))<1e-9);
for(const frame of renders){assert.ok(Math.abs((420-frame.dx)/frame.scale-420)<1e-6);assert.ok(Math.abs((310-frame.dy)/frame.scale-310)<1e-6);}
api.zoomAt(1e9);flush();assert.equal(api.state().scale,40);
api.zoomAt(1e-9);flush();assert.equal(api.state().scale,.7);
api.zoomAt(2);assert.ok(frames.size);api.cancelZoom();assert.equal(frames.size,0);const stopped=api.state().scale;flush();assert.equal(api.state().scale,stopped);
api.reset();assert.deepEqual([api.state().scale,api.state().dx,api.state().dy],[1,0,0]);
api.handleGestureStart({scale:1,preventDefault(){}});api.handleGestureChange({scale:1.2,clientX:420,clientY:310,preventDefault(){}});const pinch=api.state().target.scale;api.handleWheel({deltaY:-5,ctrlKey:true,preventDefault(){}});assert.equal(api.state().target.scale,pinch,'native Safari pinch must not double-count wheel events');api.handleGestureEnd({preventDefault(){}});flush();assert.ok(Math.abs(api.state().scale-1.2)<1e-9);
let prevented=false;api.handleWheel({deltaY:0,preventDefault(){prevented=true}});assert.ok(prevented);assert.equal(frames.size,0);
assert.ok(script.includes('layoutStarted=markerLayout?now:now-240'));assert.ok(!script.includes('zoomAt(e.deltaY<0?1.13'));
console.log('Trackpad magnitude, unit normalization, bounded events, cursor anchoring, smooth settlement and gesture cancellation verified.');
