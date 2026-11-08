import fs from 'node:fs';import assert from 'node:assert/strict';import worker from '../worker.js';
const script=fs.readFileSync('source/geography.html','utf8').split('<script>')[1].split('</script>')[0];new Function(script);
const data=await(await worker.fetch(new Request('https://test/api/geography'),{})).json();
const helpers=script.slice(script.indexOf('function recordLocation('),script.indexOf('// Keep the SVG'));
const setup=`const entries=${JSON.stringify(data.entries)},music=${JSON.stringify(data.origins.records)},details=${JSON.stringify(data.release_details)},places=${JSON.stringify(JSON.parse(fs.readFileSync('source/places.json')))},copies={};let mode='edition',scale=5;const geo=(lon,lat)=>[80+(lon+180)/360*1040,590-(lat+60)/150*460];`;
const api=new Function(setup+helpers+`;countries=${JSON.stringify(data.countries)};return {filteredEntries,travelState,recordLayout,recordLocation,setFilter:f=>viewFilter=f,setMode:m=>mode=m};`)();
const all=api.filteredEntries('all'),known=all.filter(n=>api.recordLocation(n,'music')),unknown=api.filteredEntries('unknown'),travelling=api.filteredEntries('travelling'),local=api.filteredEntries('local');
assert.equal(all.length,610);assert.equal(known.length,254);assert.equal(unknown.length,356);assert.ok(unknown.every(n=>!api.recordLocation(n,'music')));assert.equal(api.filteredEntries('travelling'),travelling,'filter results reuse stable cached arrays');
assert.ok(travelling.every(n=>api.travelState(n)==='travelling'));assert.ok(local.every(n=>api.travelState(n)==='local'));assert.ok(all.filter(n=>!api.recordLocation(n,'music')).every(n=>api.travelState(n)==='unknown'),'missing origins never count as local');
assert.equal(new Set([...travelling,...local].map(n=>n.instance_id)).size,travelling.length+local.length);assert.ok(travelling.length+local.length<=known.length);
for(const filter of ['travelling','local','unknown','all']){api.setFilter(filter);const subset=api.filteredEntries(filter);for(const mode of ['music','edition']){api.setMode(mode);const rows=api.recordLayout();assert.equal(rows.length,subset.filter(n=>api.recordLocation(n)).length);assert.ok(rows.every(r=>subset.includes(r.n)));}}
const overlay=script.slice(script.indexOf('// Perspective transitions'),script.indexOf('// Reuse one painted overview'));
const position=new Function(`let scale=5,dx=0,dy=0;const screen=([x,y])=>[x*scale+dx,y*scale+dy],geo=(x,y)=>[x,y],recordLocation=n=>n.p,recordThreads=n=>n.threads;let target=null;const animateCamera=(...args)=>target=args;${overlay};return {place:selectedPlacement,ensure:ensureSelectionVisible,camera:(s,x,y)=>{scale=s;dx=x;dy=y},target:()=>target};`)();
for(const [s,x,y]of [[1,0,0],[5,-2400,-800],[12,-6000,-3200],[40,5000,5000]]){position.camera(s,x,y);for(const p of [{lon:0,lat:0},{lon:1200,lat:760},{lon:600,lat:380}]){const n={p,threads:[{...p}]},v=position.place(n);assert.ok(v.x-v.size/2>=24&&v.x+v.size/2<=1176);assert.ok(v.y-v.size/2>=52&&v.y+v.size/2<=640);assert.ok(v.x-v.size/2>=485||v.y-v.size/2>=155,'selected art stays out of heading');assert.ok(v.size>=66&&v.size<=100);}}
position.camera(12,-6000,-3200);position.ensure({p:{lon:100,lat:100}});assert.equal(position.target()[0],12,'bringing selection into view preserves zoom');
assert.ok(script.includes("if(perspectiveMotion||selected||!(cameraTarget||drag)"),'selected cover stays screen-sized during camera gestures');
console.log({all:all.length,travelling:travelling.length,samePlace:local.length,originUnknown:unknown.length,selectionBounds:'pass',filterLayouts:'pass'});

const labels=new Function(script.slice(script.indexOf('function threadLabelPosition('),script.indexOf('function renderThreads('))+';return threadLabelPosition')();
const lowerCover={x:600,y:598,size:84},label=labels(590,640,0,lowerCover);assert.ok(label.y<lowerCover.y-lowerCover.size/2,'labels move above a cover when there is no room below');
