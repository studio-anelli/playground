#!/usr/bin/env node
// Read-only triage. Run from repository root:
// node lib/music-that-travels/triage-origin-gaps.mjs
import fs from 'node:fs';
const base='lib/music-that-travels/source/';
const read=f=>JSON.parse(fs.readFileSync(base+f,'utf8'));
const collection=read('collection.json');
const origin=read('origin-collection.json');
const ledger=read('research-ledger.json');
const placedIds=new Set(Object.keys(origin.records));
const locatedArtistIds=new Set(collection.entries.filter(e=>placedIds.has(String(e.id))).flatMap(e=>e.artists||[]).map(a=>String(a.id)));
const reviewedIds=new Set((ledger.reviews||[]).map(r=>String(r.release_id)));
const buckets={compilation_or_various:[],anonymous_artist:[],reviewed_artist_overlap:[],reviewed_but_unplaced:[],short_format:[],album:[],other:[]};
const list=[];
for(const e of collection.entries){
 if(placedIds.has(String(e.id)))continue;
 const artistNames=(e.artists||[]).map(a=>a.name);
 const formats=(e.formats||[]).flatMap(f=>[f.name,...(f.descriptions||[])]).join(' ');
 const bucket=artistNames.includes('Various')?'compilation_or_various':
 artistNames.includes('Unknown Artist')?'anonymous_artist':
 (e.artists||[]).some(a=>locatedArtistIds.has(String(a.id)))?'reviewed_artist_overlap':
 reviewedIds.has(String(e.id))?'reviewed_but_unplaced':
 /EP|Single|7"|12"/i.test(formats)?'short_format':
 /LP|Album/i.test(formats)?'album':'other';
 const row={release_id:e.id,instance_id:e.instance_id,title:e.title,artists:e.artists||[],formats:e.formats||[],styles:e.styles||[],genres:e.genres||[],bucket,triage_status:'needs_evidence_review'};
 buckets[bucket].push(row);list.push(row);
}
const summary=Object.fromEntries(Object.entries(buckets).map(([key,arr])=>[key,arr.length]));
const output={collection_fetched_at:collection.fetched_at,generated_from:'collection.json + origin-collection.json + research-ledger.json',total_missing:list.length,summary,entries:list,limitations:[
'Buckets are prioritisation heuristics, not evidence or inferred music origins.',
'An artist ID appearing on another placed release does not automatically transfer a geographic claim (especially collaborations).',
'Reviewed means a ledger review exists, not that it provided a publishable geographic source.',
'EP/LP classification uses saved format descriptions; category is not an artistic or editorial judgement.',
'Compilations require edition/track-level work, and anonymous releases may remain unresolved.',
'No live map content is changed by running this script.'
]};
if(list.length!==collection.entries.length-Object.keys(origin.records).reduce((n,id)=>n+collection.entries.filter(e=>String(e.id)===id).length,0))throw Error('Missing-origin count mismatch');
console.log(JSON.stringify(output,null,2));
