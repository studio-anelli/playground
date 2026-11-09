#!/usr/bin/env node
// Run from repository root: node lib/music-that-travels/audit-geographic-coverage.mjs
// Read only: this script does not modify the collection or live map.
import fs from 'node:fs';
import path from 'node:path';

const base=path.resolve('lib/music-that-travels/source');
const read=name=>JSON.parse(fs.readFileSync(path.join(base,name),'utf8'));
const snapshot=read('collection.json');
const audit=read('dataset-audit.json');
const origin=read('origin-collection.json');
const entries=snapshot.entries;
const placed=new Set(Object.keys(origin.records));
const records=Array.isArray(audit.records)?audit.records:Object.values(audit.records);
const editionPlaced=new Set(records.filter(r=>r.edition?.eligible).map(r=>String(r.instance_id)));
const counts={both:0,edition_only:0,music_only:0,neither:0};
const uniqueEd=new Set(), originEd=new Set(), unknownEd=new Set(), instances=new Set();
const unresolvedMarkets=[], unresolvedMusic=[];
for(const e of entries){
 const id=String(e.id),instance=String(e.instance_id);
 if(instances.has(instance))throw Error('Duplicate instance_id '+instance);
 instances.add(instance);uniqueEd.add(id);
 const music=placed.has(id), edition=editionPlaced.has(instance);
 counts[music&&edition?'both':edition?'edition_only':music?'music_only':'neither']++;
 if(music)originEd.add(id);else{unknownEd.add(id);unresolvedMusic.push({release_id:e.id,instance_id:e.instance_id,title:e.title,artists:e.artists?.map(a=>a.name)??[]});}
}
for(const r of records)if(!r.edition?.eligible)unresolvedMarkets.push({release_id:r.release_id,instance_id:r.instance_id,title:r.title,country:r.edition?.country??null,reason:r.edition?.reason??'unknown'});
const result={
  collection_fetched_at:snapshot.fetched_at,audit_created_at:audit.audited_at,
  copies:entries.length,unique_editions:uniqueEd.size,duplicate_edition_copies:entries.length-uniqueEd.size,
  edition_placed:counts.both+counts.edition_only,
  music_placed:counts.both+counts.music_only,
  music_placed_unique_editions:originEd.size,
  unknown_music_unique_editions:unknownEd.size,
  counts,thread_count:origin.thread_count,
  unresolved_markets:unresolvedMarkets,unresolved_music:unresolvedMusic,
  caveats:['Music placed means one or more sourced cultural/geographic threads, NOT necessarily a recording location.',
  'Edition placed means an eligible edition market, NOT an exact physical production or shipping origin.',
  'Unresolved markets may be intentionally unplaceable composite regions.',
  'Counts reflect the saved collection snapshot, not necessarily the current remote Discogs collection.']
};
if(Object.values(counts).reduce((a,b)=>a+b,0)!==entries.length)throw Error('Coverage does not reconcile');
if(Object.keys(origin.records).some(id=>!uniqueEd.has(id)))throw Error('Origin includes unknown edition IDs');
console.log(JSON.stringify(result,null,2));
