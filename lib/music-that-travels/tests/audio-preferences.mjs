import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const script=fs.readFileSync('source/geography.html','utf8').split('<script>')[1].split('</script>')[0];
const code=script.slice(script.indexOf('let savedVideoVolumes='),script.indexOf("document.addEventListener('visibilitychange'"));
const context=vm.createContext({localStorage:{getItem:key=>key.includes('volumes')?'{"loud":35,"bad":"90","overflow":150}':'{"7":"chosen"}'},Math});vm.runInContext(code,context);
assert.equal(vm.runInContext("videoVolume('loud')",context),35);assert.equal(vm.runInContext("videoVolume('bad')",context),75);assert.equal(vm.runInContext("videoVolume('overflow')",context),100);assert.equal(vm.runInContext("videoVolume('new')",context),75);
assert.equal(vm.runInContext("chooseAudioTrack([{id:'a',title:'Vinyl rip'},{id:'b',title:'Official Audio'}],null,8)",context),1);
assert.equal(vm.runInContext("chooseAudioTrack([{id:'chosen',title:'Track'},{id:'b',title:'HQ'}],null,7)",context),0);
console.log('Video volume validated and bounded; explicit source choices override title hints.');
