import fs from 'node:fs';import assert from 'node:assert/strict';
const script=fs.readFileSync('source/geography.html','utf8').split('<script>')[1].split('</script>')[0];
const {position,copy}=new Function(script.slice(script.indexOf('function threadLabelPosition('),script.indexOf('function renderThreads('))+';return {position:threadLabelPosition,copy:mapLabelText};')();
const boxes=[],cover={x:600,y:380,size:100},overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const a=position(750,400,0,cover,190,42,boxes),b=position(750,400,1,cover,190,42,boxes);assert.ok(!overlap(a,b));assert.ok(a.x>=24&&a.x+a.width<=1176);assert.ok(b.y>=45&&b.y+b.height<=640);
const long=copy({label:'A very long geographic place name beyond the label width',precision:'country',relation:'A long relationship description that needs to wrap into readable lines while keeping the source in the details panel'});assert.ok(long.title.length<=38);assert.ok(long.lines.length<=2);assert.ok(long.width<=260);
assert.ok(script.includes('class="thread-label-bg"'));assert.ok(script.includes('countryGrid=false'));assert.ok(fs.readFileSync('source/geography.html','utf8').includes('.map-side-stack{justify-content:flex-start}'));
console.log('Map label backgrounds, bounded wrapping, collision avoidance, organic default and top-anchored panel verified.');
