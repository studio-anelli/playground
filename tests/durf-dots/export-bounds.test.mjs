import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportBounds} from '../../lib/durf-dots/export-bounds.ts';
const settings={width:1080,height:1080,exportCrop:true,exportPadding:0,motion:'invert',scrollStrength:100};
const dots=[{x:100,y:150,radius:10,endRadius:30},{x:200,y:250,radius:20,endRadius:5}];
test('fixed crop fits both motion endpoints with even video dimensions',()=>{
 assert.deepEqual(exportBounds(dots,settings),{x:70,y:120,width:150,height:150});
 assert.deepEqual(exportBounds(dots,{...settings,exportPadding:8}),{x:62,y:112,width:166,height:166});
});
test('drift includes travel and disabled trim preserves original canvas',()=>{
 assert.deepEqual(exportBounds(dots,{...settings,motion:'drift'}),{x:64,y:140,width:182,height:130});
 assert.deepEqual(exportBounds(dots,{...settings,exportCrop:false}),{x:0,y:0,width:1080,height:1080});
});
