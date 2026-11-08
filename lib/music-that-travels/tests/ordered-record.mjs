import assert from 'node:assert/strict';import worker from '../worker.js';
const original=globalThis.fetch;let calls=0;
globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({title:'Example record',tracklist:[{type_:'heading',title:'Side A'},{position:'A1',title:'First song',type_:'track'},{position:'A2',title:'M',type_:'track'},{position:'B1',title:'Missing song',type_:'track'},{position:'B2',title:'Café dub',type_:'track'}],videos:[{uri:'https://www.youtube.com/watch?v=11111111111',title:'Artist - Café dub'},{uri:'https://www.youtube.com/watch?v=22222222222',title:'Artist - M'},{uri:'https://www.youtube.com/watch?v=33333333333',title:'Artist - First song'},{uri:'https://www.youtube.com/watch?v=44444444444',title:'Unrelated remix'}]}),{status:200})};
try{const result=await worker.fetch(new Request('https://example.test/api/listen/11393080/record'),{});assert.equal(result.status,200);const d=await result.json();assert.deepEqual(d.videos.map(v=>v.position),['A1','A2','B2']);assert.deepEqual(d.videos.map(v=>v.id),['33333333333','22222222222','11111111111']);assert.equal(d.coverage.missing,1);assert.equal(d.coverage.total,4);assert.equal(calls,1);
// An explicitly identified whole-album upload plays once in its original order.
globalThis.fetch=async()=>new Response(JSON.stringify({title:'Example record',tracklist:[{position:'1',title:'Song'}],videos:[{uri:'https://www.youtube.com/watch?v=55555555555',title:'Artist - Example record (Full Album)'}]}));
const full=await(await worker.fetch(new Request('https://example.test/api/listen/11393080/record'),{})).json();assert.equal(full.coverage.fullAlbum,true);assert.equal(full.videos.length,1);
const absent=await worker.fetch(new Request('https://example.test/api/listen/999999999/record'),{});assert.equal(absent.status,404);
}finally{globalThis.fetch=original}
console.log('Record order: Discogs track positions, short/Unicode titles, missing tracks, full-album video and collection-only access pass.');
