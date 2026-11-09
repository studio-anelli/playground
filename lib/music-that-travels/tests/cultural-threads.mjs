import fs from 'node:fs';import assert from 'node:assert/strict';
const read=n=>JSON.parse(fs.readFileSync('source/'+n)),origins=read('origin-collection.json'),entries=read('collection.json').entries,details=read('enrichment.json').releases;
assert.equal(origins.schema_version,3);assert.ok(origins.distinct_editions>=252);assert.ok(origins.copy_count>=254);assert.ok(origins.thread_count>=408);
for(const r of Object.values(origins.records)){assert.ok(r.threads.length);assert.ok(r.threads.some(t=>t.id===r.primary_thread_id)||r.threads.some(t=>t.lon===r.lon&&t.lat===r.lat));for(const t of r.threads){assert.ok(['artist','repertoire','recording'].includes(t.kind));assert.ok(t.source.startsWith('https://'));assert.ok(t.relation&&t.label&&t.subject);assert.ok(Number.isFinite(t.lon)&&Number.isFinite(t.lat));assert.ok(['country','city','region'].includes(t.precision));}}
const on=origins.records[11758168];assert.ok(on.threads.some(t=>t.kind==='artist'&&t.label==='Amsterdam'));assert.ok(on.threads.some(t=>t.kind==='repertoire'&&t.label==='Turkey'&&t.precision==='country'));assert.equal(details[11758168].country,'Switzerland');assert.ok(!on.threads.some(t=>t.label==='Switzerland'));
const disco=origins.records[12343877];assert.ok(disco.threads.some(t=>t.kind==='artist'&&t.label==='Chicago'));assert.ok(disco.threads.some(t=>t.kind==='recording'&&t.label==='Milan'&&t.period==='January 1978'));assert.ok(!origins.records[8036642].threads.some(t=>t.label==='Chicago'),'Mall Grab’s Sun Ra EP does not inherit Sun Ra artist facts from its title');
// Directly reviewed artist associations, never borrowed from unrelated collaborators.
const ellen=origins.records[8440937],roni=origins.records[1596994];
assert.ok(ellen?.threads.some(t=>t.subject==='Ellen Allien'&&t.label==='Berlin'&&t.kind==='artist'));
assert.ok(roni?.threads.some(t=>t.subject==='Roni Size'&&t.label==='Bristol'&&t.kind==='artist'));
assert.ok(!roni.threads.some(t=>t.subject==='Jocelyn Brown'&&t.label==='Bristol'),'Do not assign Roni Size geography to Jocelyn Brown');
assert.equal(entries.length,610,'Full saved collection must remain intact');
const addedArtistLocations=[
 [8707425,'Shinichi Atobe','Saitama'],
 [8290274,'Frits Wentink','Amsterdam'],
 [13289860,'B.B. Seaton','Kingston'],
 [8205159,'Vivien Goldman','London']
];
for(const [releaseId,subject,place] of addedArtistLocations){
 assert.ok(origins.records[releaseId]?.threads.some(t=>t.kind==='artist'&&t.subject===subject&&t.label===place),
  'Missing documented artist place for '+subject);
}

const script=fs.readFileSync('source/geography.html','utf8').split('<script>')[1].split('</script>')[0];new Function(script);
const functions=script.slice(script.indexOf('function recordLocation('),script.indexOf('function route()'));
const setup=`const entries=${JSON.stringify(entries)},details=${JSON.stringify(details)},music=${JSON.stringify(origins.records)},places=${JSON.stringify(read('places.json'))},copies={};let mode='music',scale=1,selectedThread=null;const geo=(lon,lat)=>[80+(lon+180)/360*1040,590-(lat+60)/150*460],esc=s=>String(s??'');`;
const output=new Function(setup+functions+`;const rows=recordLayout();return {count:rows.length,unique:new Set(rows.map(r=>r.n.instance_id)).size,markup:threadPanel(entries.find(n=>n.id===11758168))};`)();assert.equal(output.count,origins.copy_count);assert.equal(output.unique,origins.copy_count);assert.ok(output.markup.includes('Repertoire & traditions'));assert.ok(output.markup.includes('Amsterdam')&&output.markup.includes('Turkey'));assert.ok(output.markup.includes('country-level'));assert.ok(!output.markup.includes('Switzerland'));
assert.ok(script.includes("e.target.closest('.individual-record, #travelCover, .thread-target')"));assert.ok(script.includes('data-thread-map'));assert.ok(script.includes("map.insertBefore(layer,$('traveler'))"));assert.ok(script.includes("classList.toggle('has-selection'"));assert.ok(script.includes('selectedThread=null;openRecord(selected);fitThreads'));
console.log('Sourced typed threads, one cover per entry, distinct edition markets, artist identity separation and accessible thread controls verified.');
