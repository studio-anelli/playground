import fs from 'node:fs';import assert from 'node:assert/strict';import worker from '../worker.js';
const source=JSON.parse(fs.readFileSync(new URL('../source/listening-catalog.json',import.meta.url),'utf8'));
const atlas=await(await worker.fetch(new Request('https://example.test/api/atlas'),{})).json();
const ids=[...new Set(atlas.entries.map(n=>n.id))];assert.equal(Object.keys(source).length,ids.length,'every collection edition has a research result');
const originalFetch=globalThis.fetch;let upstreamCalls=0;globalThis.fetch=async()=>{upstreamCalls++;throw Error('Saved listening coverage must not need an upstream lookup')};
let linked=0,videos=0,family=0;
try{for(const id of ids){const row=source[String(id)];assert.ok(row,'missing edition '+id);assert.notEqual(row.status,'fetch-error','unresolved research error '+id);assert.ok(Number.isFinite(Date.parse(row.checked_at)));assert.match(row.source,/^https:\/\/www\.discogs\.com\/(release|master)\/\d+$/);
 const r=await worker.fetch(new Request('https://example.test/api/listen/'+id),{});assert.equal(r.status,200);const d=await r.json();assert.equal(d.saved,true);assert.ok(d.videos.length<=12);assert.equal(new Set(d.videos.map(v=>v.id)).size,d.videos.length);for(const v of d.videos){assert.match(v.id,/^[\w-]{11}$/);assert.ok(v.title.length<=240)}if(d.videos.length){linked++;videos+=d.videos.length;if(d.match==='release-family')family++;}
 }}finally{globalThis.fetch=originalFetch}
assert.equal(upstreamCalls,0);console.log(JSON.stringify({editionsChecked:ids.length,linkedEditions:linked,noLinkedVideo:ids.length-linked,videoLinks:videos,releaseFamilyFallbacks:family,upstreamCalls}));
