import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pngMovie} from '../../lib/durf-dots/mov.ts';
// A real RGBA PNG sample. Samples must survive packaging byte for byte.
const frame=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII=','base64'));
test('MOV sample table points to intact PNG frames and preserves timing',async()=>{
 const blob=pngMovie([frame,frame],64,64,30);
 const data=Buffer.from(await blob.arrayBuffer());
 const stco=data.indexOf('stco');
 const offset=data.readUInt32BE(stco+12);
 assert.deepEqual(data.subarray(offset,offset+frame.length),Buffer.from(frame));
 assert.deepEqual(data.subarray(offset+frame.length,offset+2*frame.length),Buffer.from(frame));
 const stsz=data.indexOf('stsz');assert.equal(data.readUInt32BE(stsz+12),2);assert.equal(data.readUInt32BE(stsz+16),frame.length);
 const stts=data.indexOf('stts');assert.equal(data.readUInt32BE(stts+12),2);assert.equal(data.readUInt32BE(stts+16),1);
 const mdhd=data.indexOf('mdhd');assert.equal(data.readUInt32BE(mdhd+16),30);assert.equal(data.readUInt32BE(mdhd+20),2);
 assert.equal(blob.type,'video/quicktime');
});
test('rejects invalid timing or empty samples',()=>{
 assert.throws(()=>pngMovie([],64,64,30));assert.throws(()=>pngMovie([frame],64,64,0));
});
