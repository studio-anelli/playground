import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildDots} from '../../lib/durf-dots/geometry.ts';
import {exportBounds} from '../../lib/durf-dots/export-bounds.ts';
const config={shape:'repeater',direction:'vertical',columns:5,copies:7,rows:11,width:720,height:1440,minSize:8,maxSize:71,overlap:37,spacingX:113,spacingY:55,patternX:'ascending',patternY:'ascending',offsetX:0,offsetY:10,blend:'average',motion:'invert',scrollStrength:100,exportCrop:true,exportPadding:16};
test('portrait vertical repeater uses the correct axis and stays centred',()=>{
 const dots=buildDots(config),xs=dots.map(d=>d.x),ys=dots.map(d=>d.y);
 assert.equal(dots.length,35);
 assert.ok(Math.abs((Math.min(...xs)+Math.max(...xs))/2-360)<1e-9);
 assert.ok(Math.abs((Math.min(...ys)+Math.max(...ys))/2-720)<1e-9);
 assert.equal(new Set(xs).size,7);assert.equal(new Set(ys).size,5);
});
test('fit artwork contains both animation endpoints for the reported settings',()=>{
 const dots=buildDots(config),box=exportBounds(dots,config);
 for(const dot of dots)for(const radius of [dot.radius,dot.endRadius]){
  assert.ok(dot.x-radius>=box.x&&dot.x+radius<=box.x+box.width);
  assert.ok(dot.y-radius>=box.y&&dot.y+radius<=box.y+box.height);
 }
});
test('landscape horizontal repeater remains centred',()=>{
 const c={...config,direction:'horizontal',width:1440,height:720};const dots=buildDots(c);
 assert.ok(Math.abs((Math.min(...dots.map(d=>d.x))+Math.max(...dots.map(d=>d.x)))/2-720)<1e-9);
 assert.ok(Math.abs((Math.min(...dots.map(d=>d.y))+Math.max(...dots.map(d=>d.y)))/2-360)<1e-9);
});
