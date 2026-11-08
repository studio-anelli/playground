import fs from 'node:fs';import assert from 'node:assert/strict';
const read=n=>JSON.parse(fs.readFileSync('source/'+n));
const entries=read('collection.json').entries,details=read('enrichment.json').releases,music=read('origin-collection.json').records,places=read('places.json');
const script=fs.readFileSync('source/geography.html','utf8').split('<script>')[1].split('</script>')[0];new Function(script);
assert.ok(script.includes('entries=a.entries;'));assert.ok(!script.includes('entries=a.entries.filter'));
const layout=script.slice(script.indexOf('function recordLocation('),script.indexOf('function route()'));
const setup=`const entries=${JSON.stringify(entries)},details=${JSON.stringify(details)},music=${JSON.stringify(music)},places=${JSON.stringify(places)},copies={};let mode='edition',scale=1;const geo=(lon,lat)=>[80+(lon+180)/360*1040,590-(lat+60)/150*460];`;
const counts=new Function(setup+layout+`;const editions=recordLayout();mode='music';const origins=recordLayout();return {editions:editions.length,music:new Set(origins.map(r=>r.n.instance_id)).size,finite:editions.concat(origins).every(r=>Number.isFinite(r.x)&&Number.isFinite(r.y))};`)();
assert.deepEqual(counts,{editions:600,music:254,finite:true});
// Opening a record without reviewed origins must still show its edition and source.
const unknown=entries.find(n=>!music[n.id]&&places[details[n.id]?.country]);
const panel={hidden:true,innerHTML:'',querySelector:()=>({}),querySelectorAll:()=>[]},close={};
const open=script.slice(script.indexOf('function openRecord('),script.indexOf('function zoomAt('));
new Function('$','render',`const ensureSelectionVisible=()=>{};let selected,selectedThread=null;const byKey=${JSON.stringify({[unknown.instance_id]:unknown})},music={},details=${JSON.stringify(details)},recordingDetails={},mode='edition',esc=s=>String(s??''),artist=n=>n.artists.map(a=>a.name).join(', ');${script.slice(script.indexOf('const THREAD_TYPES='),script.indexOf('function fitThreads('))}${open};openRecord(${unknown.instance_id});`)(id=>id==='panel'?panel:close,()=>{});
assert.equal(panel.hidden,false);assert.ok(panel.innerHTML.includes('No sourced cultural threads yet'));assert.ok(panel.innerHTML.includes(unknown.title));assert.ok(panel.innerHTML.includes('Your edition / release market'));
assert.equal(entries.length,610);assert.equal(new Set(entries.map(n=>n.instance_id)).size,610);
console.log('Full collection: 600 edition placements, 254 entries with sourced cultural threads, missing-origin panels and duplicate identities verified.');
