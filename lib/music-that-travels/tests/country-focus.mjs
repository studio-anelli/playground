import fs from 'node:fs';import assert from 'node:assert/strict';
const script=fs.readFileSync('source/geography.html','utf8').split('<script>')[1].split('</script>')[0];
const countryData=JSON.parse(fs.readFileSync('source/countries.json'));
const layout=script.slice(script.indexOf('let scatterSeed='),script.indexOf('function route()'));
const run=new Function('countryData',`
let entries=Array.from({length:24},(_,i)=>({id:i,instance_id:i+1})),mode='edition',scale=12,viewFilter='all';
const filteredEntries=()=>entries,geo=(lon,lat)=>[80+(lon+180)/360*1040,590-(lat+60)/150*460];
let location={lon:12,lat:43,label:'Italy',precision:'country'};const recordLocation=()=>location;
${layout}
countries=countryData;const result=[];
for(const [iso,label,lon,lat] of [['ITA','Italy',12,43],['JAM','Jamaica',-77,18]]){
 location={lon,lat,label,precision:'country'};focusedCountry=iso;const rows=recordLayout();
 result.push({iso,count:rows.length,minimum:Math.min(...rows.map(r=>r.size)),separated:rows.every((a,i)=>rows.every((b,j)=>i===j||Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))*scale>=(a.size+b.size)/2)),preserved:rows.every(r=>r.p.lon===lon&&r.p.lat===lat)});
}return result;`);
for(const r of run(countryData)){assert.equal(r.count,24,r.iso);assert.ok(r.minimum>=44,r.iso);assert.ok(r.separated,r.iso);assert.ok(r.preserved,r.iso)}
console.log('Italy and Jamaica: 24 readable, nonoverlapping covers; original coordinates preserved.');
