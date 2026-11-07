import fs from 'node:fs';import assert from 'node:assert/strict';
const script=fs.readFileSync('source/geography.html','utf8').split('<script>')[1].split('</script>')[0];const fit=script.slice(script.indexOf('function fittedCoverSize('),script.indexOf('function wireImageFallback('));const fitted=new Function('const screen=p=>p;'+fit+';return fittedCoverSize;')();
assert.equal(fitted({x:700,y:400,size:180}),180);assert.equal(fitted({x:100,y:100,size:180}),0);assert.equal(fitted({x:1160,y:400,size:180}),44);assert.equal(fitted({x:700,y:700,size:180}),0);
for(let x=0;x<=1200;x+=20)for(let y=0;y<=760;y+=20){const size=fitted({x,y,size:180});if(!size)continue;assert.ok(x-size/2>=18&&x+size/2<=1182);assert.ok(y-size/2>=(x<470?140:24)&&y+size/2<=680);}
console.log('Larger covers fit inside viewport margins and avoid heading/control areas.');
