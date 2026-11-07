import worker from '../worker.js';import assert from 'node:assert/strict';
for(const [path,expected] of [['/','Chromatic Music'],['/geography','Map perspective'],['/chromatic','Chromatic Music'],['/dataset','What is still missing']]){const r=await worker.fetch(new Request('https://example.test'+path),{},undefined);assert.equal(r.status,200);assert.ok((await r.text()).includes(expected));}
const a=await(await worker.fetch(new Request('https://example.test/api/atlas'),{})).json();assert.equal(a.entries.length,610);assert.equal(Object.keys(a.release_details).length,608);assert.equal(a.audit.edition_details_saved,608);assert.ok(!JSON.stringify(a.entries).includes('date_added'));assert.ok(!JSON.stringify(a.entries).includes('rating'));
const art=await(await worker.fetch(new Request('https://example.test/api/artwork-analysis'),{})).json();assert.equal(Object.keys(art.records).length,608);
assert.equal((await worker.fetch(new Request('https://example.test/missing'),{})).status,404);assert.equal((await worker.fetch(new Request('https://example.test/api/atlas',{method:'POST'}),{})).status,405);
console.log('Independent experiment routes and complete saved-data APIs verified without cache or execution context dependencies.');

const geo=await(await worker.fetch(new Request('https://example.test/geography'),{})).text();assert.ok(!geo.includes('<button data-mode="copy"'));assert.ok(geo.includes('Follow a journey'));assert.ok(!geo.includes('id="saveCopy"'));
