import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Exercise the actual route adapter, replacing only its TS import alias for Node.
let source=await readFile(new URL('../../../app/experiments/music-that-travels/[[...path]]/route.ts',import.meta.url),'utf8');
source=source.replace('"@/lib/music-that-travels/worker.js"',JSON.stringify(new URL('../worker.js',import.meta.url).href)).replace('request: Request','request');
const {GET}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const base='https://example.test/experiments/music-that-travels';
for(const path of ['', '/geography','/chromatic','/dataset']){
 const response=await GET(new Request(base+path));assert.equal(response.status,200);
 const html=await response.text();assert.ok(!html.includes('"/api/'));assert.ok(!/href="\/(geography|chromatic|dataset)"/.test(html));
 if(!path)assert.ok(html.includes('href="/"'));
}
const atlas=await(await GET(new Request(base+'/api/atlas'))).json();assert.equal(atlas.entries.length,610);
const origins=await(await GET(new Request(base+'/api/musical-origins'))).json();assert.equal(origins.ids.length,100);
assert.equal((await GET(new Request(base+'/missing'))).status,404);
console.log('Namespaced entry points, internal links, stable data and missing routes verified.');
