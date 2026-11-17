import {test} from 'node:test';
import assert from 'node:assert/strict';
import {layoutDefaults,formatSettings,layoutGrid,paperSize} from '../../lib/durf-dots/layout.ts';
import {buildDots} from '../../lib/durf-dots/geometry.ts';
import {motionBounds,exportBounds} from '../../lib/durf-dots/export-bounds.ts';
const cfg={...layoutDefaults,...formatSettings('A4'),layoutEnabled:true,shape:'repeater',direction:'vertical',columns:5,copies:7,rows:11,minSize:8,maxSize:71,overlap:37,spacingX:113,spacingY:55,patternX:'ascending',patternY:'ascending',offsetX:0,offsetY:10,blend:'average',motion:'invert',scrollStrength:100,exportCrop:false,exportPadding:0};
for(const format of ['A5','A4','A3','A2','widescreen','portrait','square'])for(const motion of ['none','invert','pulse','drift'])for(const span of [1,2,3])test(`${format}: ${motion} fits ${span} columns throughout motion`,()=>{
 const c={...cfg,...formatSettings(format),motion,columnSpan:span,columnStart:4-span,blockHeight:45,verticalAlign:'bottom'};
 const {area}=layoutGrid(c),dots=buildDots(c),bounds=motionBounds(dots,c);
 assert.ok(bounds.x>=area.x-1e-6&&bounds.y>=area.y-1e-6);
 assert.ok(bounds.x+bounds.width<=area.x+area.width+1e-6&&bounds.y+bounds.height<=area.y+area.height+1e-6);
 assert.ok(bounds.width>0&&bounds.height>0);
});
test('full-page and artwork export keep separate frames',()=>{
 const c={...cfg,columnSpan:1,columnStart:3},dots=buildDots(c);
 const full=exportBounds(dots,c),art=exportBounds(dots,{...c,exportCrop:true});
 assert.equal(full.width,c.width);assert.equal(full.height,c.height);
 assert.ok(art.width<full.width);assert.ok(art.x>0);
 const still=exportBounds(dots,{...c,exportCrop:true},true);
 assert.ok(still.width<=art.width&&still.height<=art.height);
});
test('paper SVG sizes rotate and stay in millimetres',()=>{
 assert.deepEqual(paperSize(cfg),{width:210,height:297});
 assert.deepEqual(paperSize({...cfg,width:cfg.height,height:cfg.width}),{width:297,height:210});
});
test('column changes clamp invalid spans and gutters',()=>{
 const grid=layoutGrid({...cfg,gridColumns:2,columnStart:3,columnSpan:3,gridGutter:500});
 assert.equal(grid.start,2);assert.equal(grid.span,1);assert.ok(grid.area.width>0);
});
