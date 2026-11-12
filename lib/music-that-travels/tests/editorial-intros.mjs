import fs from 'node:fs';import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync('source/'+p,'utf8'));
const intros=read('editorial-excerpts.json'),evidence=read('editorial-sources.json'),origins=read('origin-collection.json').records,collection=read('collection.json').entries,ledger=read('research-ledger.json');
assert.deepEqual(Object.keys(intros).sort(),Object.keys(origins).sort());assert.deepEqual(Object.keys(intros).sort(),Object.keys(evidence).sort());
const knownURLs=new Set(Object.values(ledger.sources).filter(s=>s.retrieval==='read').map(s=>s.url));for(const row of Object.values(origins))for(const t of row.threads)for(const key of ['source','location_source'])if(t[key])knownURLs.add(t[key]);
for(const [id,text]of Object.entries(intros)){assert.ok(text.trim().length>20,id);assert.ok(text.split(/\s+/).length<=90,id);assert.ok(evidence[id].sources.length,id);for(const url of evidence[id].sources){assert.ok(/^https?:\/\//.test(url),id);assert.ok(knownURLs.has(url),'Intro added an unrecorded source: '+id+' '+url)}}
const html=fs.readFileSync('source/geography.html','utf8'),script=html.split('<script>')[1].split('</script>')[0];
const story=script.slice(script.indexOf('function storyPanel('),script.indexOf('function setPanelTab('));
const render=new Function('editorialExcerpts','editorialSources',`const researchContexts={},esc=s=>String(s??'').replaceAll('<','&lt;');${story};return storyPanel;`)(intros,Object.fromEntries(Object.entries(evidence).map(([k,v])=>[k,v.sources])));
assert.ok(render({id:110}).includes('Wizard radio'));assert.ok(render({id:972054}).includes('Cologne'));assert.ok(render({id:972054}).includes('Berlin'));assert.ok(render({id:27478812}).includes('Andreas Tilliander'));assert.ok(render({id:'unknown'}).includes('still waiting to be documented'));
console.log({intros:Object.keys(intros).length,copies:collection.filter(n=>intros[n.id]).length,tailored:Object.values(evidence).filter(v=>v.basis!=='geographic-note').length,shortGeographicNotes:Object.values(evidence).filter(v=>v.basis==='geographic-note').length,allSourcesAlreadySaved:true});
