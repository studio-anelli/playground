import fs from 'node:fs';import assert from 'node:assert/strict';
const script=fs.readFileSync('source/geography.html','utf8').split('<script>')[1].split('</script>')[0];
let allocations=0,geographicChecks=0;
const node=()=>({dataset:{},children:[],style:{},setAttribute(){},append(...els){this.children.push(...els)},appendChild(el){this.children.push(el)},replaceChildren(){this.children=[]}});
const layers=Object.fromEntries(['routes','map','mapLabels','traveler'].map(id=>[id,node()]));layers.routes.nextElementSibling=layers.mapLabels;
const document={createElementNS(){allocations++;return node()}};
const helpers=script.slice(script.indexOf('// Geographic relationships'),script.indexOf('function renderThreads('));
const api=new Function('$','document','samePlace',`let entries=[{id:1}],music={},details={},selected=null,byKey={},scale=1,dx=0,dy=0;const geo=(x,y)=>[x,y],screen=p=>p,recordLocation=()=>({lon:3,lat:4}),allLocations=()=>[{lon:1,lat:2}];${helpers};return {route,overviewRoutes,move:()=>dx++,replace:()=>entries=[{id:2}]};`)(id=>layers[id],document,()=>{geographicChecks++;return false});
api.route();const first=allocations;for(let i=0;i<60;i++){api.move();api.route();}assert.equal(allocations,first,'camera redraws reuse paths and circles');assert.equal(geographicChecks,1,'source relationships resolved once, not every camera frame');assert.equal(layers.routes.children.length,1);
// A selected thread replaces route children; returning to the overview rebuilds safely.
layers.routes.dataset.kind='threads';layers.routes.replaceChildren();api.route();assert.equal(layers.routes.children.length,1);assert.equal(geographicChecks,1);
api.replace();api.route();assert.equal(geographicChecks,2,'new snapshot invalidates relationship cache');
const sizeFunction=script.slice(script.indexOf('function coverSize('),script.indexOf('function artworkURL('));
const sizes=new Function(`let scale=1;const zoomLevel=()=>scale<2.5?'world':scale<8?'countries':'places';${sizeFunction};return {coverSize,setScale:s=>scale=s}`)();
let seed=1234;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const rows=Array.from({length:610},()=>({x:random()*1200,y:random()*760})).sort((a,b)=>a.x-b.x);rows.push({...rows[0]});rows.sort((a,b)=>a.x-b.x);
for(const scale of [1,5,12,40]){sizes.setScale(scale);for(let i=0;i<rows.length;i++)assert.ok(Math.abs(sizes.coverSize(rows[i],rows,i)-sizes.coverSize(rows[i],rows))<1e-8,'pruned nearest-neighbour sizes match exhaustive comparisons');}
console.log({redraws:61,relationshipChecks:1,svgAllocations:first,additionalCameraAllocations:0,exactCoverSizes:rows.length*4});
