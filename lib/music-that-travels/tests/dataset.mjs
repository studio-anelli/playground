import fs from 'node:fs';import assert from 'node:assert/strict';
const read=n=>JSON.parse(fs.readFileSync(new URL('../source/'+n,import.meta.url),'utf8'));
const c=read('collection.json'),e=read('enrichment.json'),a=read('dataset-audit.json'),m=read('music-locations-enriched.json'),p=read('places.json'),art=read('artwork-analysis.json');
assert.equal(c.entries.length,610);assert.equal(new Set(c.entries.map(n=>n.instance_id)).size,610);assert.equal(new Set(c.entries.map(n=>n.id)).size,608);assert.equal(a.records.length,610);assert.equal(a.edition_details_saved,608,'All distinct editions have been audited');
for(const row of a.records){const d=e.releases[row.release_id];assert.ok(d);assert.equal(row.edition.eligible,Boolean(p[d.country]));assert.equal(row.music.eligible,Boolean(m[row.release_id]));assert.equal(row.copy.eligible,false,'Never assume a personal location');}
for(const [id,r] of Object.entries(m)){assert.ok(r.locations.length);for(const l of r.locations){assert.ok(Number.isFinite(l.lon)&&Number.isFinite(l.lat));assert.ok(l.credit_source?.startsWith('https://'));assert.ok(l.location_source?.startsWith('https://'));}}
assert.equal(Object.keys(art.records).length,608);for(const r of Object.values(art.records)){if(!r.available)continue;assert.ok(r.palette.length);assert.ok(Math.abs(r.palette.reduce((s,c)=>s+c.share,0)-1)<.001);assert.equal(r.dominant_rgb.length,3);assert.ok(r.image_sha256.length===64);}
console.log('Complete edition audit; copy identities preserved; geography eligibility and artwork palettes verified.');console.log(a.coverage);
