import fs from 'node:fs';import assert from 'node:assert/strict';
const script=fs.readFileSync('source/geography.html','utf8').split('<script>')[1].split('</script>')[0];new Function(script);
const functions=script.slice(script.indexOf('let scatterSeed='),script.indexOf('function route()'));
const source=`let scale=5;const geo=(lon,lat)=>[80+(lon+180)/360*1040,590-(lat+60)/150*460];`+functions+`;countries=${fs.readFileSync('source/countries.json','utf8')};return {samePlace,coverSize,setScale:s=>scale=s};`;
const {samePlace,coverSize,setScale}=new Function(source)();
const paris={lon:2.35,lat:48.86,label:'Paris',precision:'city'},france={lon:2,lat:47,label:'France',precision:'Country-level release market'},london={lon:-.12,lat:51.5,label:'London',precision:'city'};
assert.ok(samePlace(paris,{...paris}));assert.ok(samePlace(paris,france));assert.ok(samePlace(france,paris));assert.ok(!samePlace(london,france));assert.ok(!samePlace(paris,{lon:4.84,lat:45.76,label:'Lyon',precision:'city'}));assert.ok(!samePlace(paris,{lon:13,lat:53,label:'Europe',precision:'Regional release market'}));
const a={x:0,y:0},near={x:4,y:3},far={x:40,y:40};assert.ok(coverSize(a,[a,far])>coverSize(a,[a,near]));setScale(12);assert.ok(coverSize(a,[a,far])<=280);console.log('Local matches suppress unnecessary journeys in either direction; distinct cities and regional markets stay distinct. Sparse covers grow; dense covers stay compact.');
