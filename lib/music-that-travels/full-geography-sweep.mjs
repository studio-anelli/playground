#!/usr/bin/env node
/**
 * One collection-wide geographic evidence sweep.
 * Run from any cwd:
 *   node lib/music-that-travels/full-geography-sweep.mjs
 *   node lib/music-that-travels/full-geography-sweep.mjs --output /tmp/geography-sweep.json
 *
 * Reads the entire saved collection and all existing geographic provenance.
 * Does NOT infer origins from nationality, genres, pressing markets, or labels.
 * Does NOT edit the map, contact external services, or accept unverified claims.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'source');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const collection=read('collection.json'),origin=read('origin-collection.json'),enriched=read('enrichment.json'),mb=read('musicbrainz-area-evidence.json'),
  wd=read('wikidata-collection-evidence.json'),ledger=read('research-ledger.json'),places=read('places.json'),anchors=read('reviewed-area-anchors.json');
const entries=collection.entries,placedIds=new Set(Object.keys(origin.records)),reviewed=new Set((ledger.reviews||[]).map(v=>String(v.release_id)));
const areaByArtist=new Map(mb.records.map(v=>[String(v.discogs_artist_id),v]));
const exactWD=new Set(wd.rows.map(v=>String(v.discogs)));
const existingArtists=new Map();
for(const e of entries){
 if(!placedIds.has(String(e.id)))continue;
 for(const a of e.artists||[]){if(!existingArtists.has(String(a.id)))existingArtists.set(String(a.id),[]);existingArtists.get(String(a.id)).push(e.id)}
}
let placed=0,edition=0,both=0;
const remaining=[],eligibleWithoutMusic=[],newLocations=[];
const seenInstances=new Set(),seenEd=new Set();
for(const e of entries){
 if(seenInstances.has(e.instance_id))throw new Error('Duplicate collection copy: '+e.instance_id);
 seenInstances.add(e.instance_id);seenEd.add(e.id);
 const located=placedIds.has(String(e.id)),market=enriched.releases[String(e.id)]?.country,
   editionLocated=Boolean(market&&places[market]);
 if(located)placed++;
 if(editionLocated)edition++;
 if(located&&editionLocated)both++;
 if(located)continue;
 const isCompilation=(e.artists||[]).some(a=>a.id===194);
 const isAnonymous=(e.artists||[]).every(a=>a.id===355||a.name==='No Artist');
 const evidence=(e.artists||[]).map(a=>{
   const area=areaByArtist.get(String(a.id));
   const areaLabel=area?.status==='area_found'?area.area_labels?.[0]:null;
   const precise=areaLabel&&(anchors[areaLabel]||places[areaLabel]);
   return {discogs_artist_id:a.id,name:a.name,exact_external_identity:exactWD.has(String(a.id)),
     musicbrainz_status:area?.status||'not_checked',musicbrainz_area_labels:area?.area_labels||[],
     reviewed_area_anchor:Boolean(precise),other_located_releases:existingArtists.get(String(a.id))||[]};
 });
 const hasAnchor=evidence.some(a=>a.reviewed_area_anchor);
 const category=isCompilation?'compilation_needs_release_scope':
   isAnonymous?'anonymous_or_no_artist':
   hasAnchor?'check_identity_linked_area':
   reviewed.has(String(e.id))?'prior_review_no_geography':
   evidence.some(a=>a.exact_external_identity)?'exact_identity_but_no_place':
   'needs_first_party_or_specialist_source';
 const row={instance_id:e.instance_id,release_id:e.id,title:e.title,artists:evidence,
   edition_country:market||null,edition_placeable:editionLocated,genres:e.genres||[],styles:e.styles||[],
   formats:e.formats||[],category,decision:'unlocated_pending_evidence'};
 remaining.push(row);
 if(editionLocated)eligibleWithoutMusic.push(e.id);
 if(hasAnchor)newLocations.push(e.id);
}
const grouped={};
for(const r of remaining)grouped[r.category]=(grouped[r.category]||0)+1;
const result={
 snapshot_date:collection.fetched_at,
 copy_count:entries.length,edition_count:seenEd.size,already_placed_copies:placed,
 edition_placed_copies:edition,both_placed_copies:both,
 remaining_copies:remaining.length,remaining_unique_editions:new Set(remaining.map(r=>r.release_id)).size,
 categories:grouped,exact_identity_linked_area_candidates:newLocations,
 remaining,limits:[
  'Includes every unlocated entry; not a claim that all unplaced origins can be verified.',
  'Sourced artist associated areas are not recording or composing locations.',
  'Exact external identity and artist overlap alone never constitute publishable geography.',
  'Multiple-member collaborations and compilations may have distinct geographic threads.',
  'Collection membership reflects the saved snapshot, not a fresh Discogs account sync.'
 ]};
if(placed+remaining.length!==entries.length)throw new Error('Full collection not reconciled');
const i=process.argv.indexOf('--output');
if(i!==-1){if(!process.argv[i+1])throw new Error('--output requires path');fs.writeFileSync(process.argv[i+1],JSON.stringify(result,null,2)+'\n')}
console.log(JSON.stringify({...result,remaining:undefined},null,2));
