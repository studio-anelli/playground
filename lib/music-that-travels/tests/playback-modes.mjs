import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../source/geography.html',import.meta.url),'utf8'),audio=html.slice(html.indexOf('let soundEnabled='),html.indexOf("$('soundToggle').onclick"));
const nodes=new Map(),frames=new Map(),players=[],loads=[],volumeWrites=[];let frameId=0,now=0,hold=null;
function node(id){return {id,hidden:false,disabled:false,textContent:'',title:'',href:'',removeAttribute(name){delete this[name]},remove(){nodes.delete(this.id)},querySelector(){return null},append(){},set innerHTML(value){this.html=value;if(id==='recordAudio'){for(const key of ['youtubeTarget','audioPlayPause','audioStatus','youtubeLink','retryAudio'])nodes.delete(key);for(const match of value.matchAll(/id="([^"]+)"/g))nodes.set(match[1],node(match[1]));}},get innerHTML(){return this.html||''}}}
nodes.set('recordAudio',node('recordAudio'));nodes.set('panel',node('panel'));
class Player{
 constructor(target,opts){this.opts=opts;this.volume=100;this.state=-1;this.videoId=opts.videoId;this.destroyed=false;players.push(this);opts.events.onReady({target:this});}
 getVolume(){return this.volume}setVolume(n){assert.ok(!this.destroyed);this.volume=n;volumeWrites.push(n)}getPlayerState(){return this.state}getVideoUrl(){return 'https://www.youtube.com/watch?v='+this.videoId}unMute(){}
 loadVideoById(id){this.videoId=id;this.state=3;loads.push(id)}playVideo(){this.state=1;this.opts.events.onStateChange({target:this,data:1})}pauseVideo(){this.state=2;this.opts.events.onStateChange({target:this,data:2})}stopVideo(){this.state=0}destroy(){this.destroyed=true}
 playing(){this.playVideo()}
}
const data=id=>({videos:id===5?[]:[{id:'video'+id+'a',title:'First '+id,position:'A1'},{id:'video'+id+'b',title:'Last '+id,position:'B1'}],match:'edition',coverage:{missing:1}});
const records=[{id:1,instance_id:101},{id:2,instance_id:102},{id:5,instance_id:105},{id:3,instance_id:103}];let opened=[],detailStates=[];
const context=vm.createContext({byKey:{101:records[0]},selected:'101',filteredEntries:()=>records,recordLocation:n=>({lon:n.id*20,lat:0}),openRecord:(key,showDetails=true)=>{opened.push(key);detailStates.push(showDetails);nodes.get('panel').hidden=!showDetails;context.selected=key;context.byKey[key]=records.find(n=>String(n.instance_id)===key);vm.runInContext('playRecord(byKey[selected])',context)},URL,Date,DOMException,setTimeout,Map,Set,Math,Number,Promise,AbortController,window:{YT:{Player},location:{origin:'https://example.test'}},document:{createElement:()=>node('retryAudio')},$:id=>nodes.get(id)||null,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>frames.delete(id),fetch:async url=>{const id=Number(url.split('/').pop());if(url.startsWith('https://api.discogs.com/'))return {ok:true,status:200,json:async()=>({title:'Record',tracklist:[{position:'A1',title:'First '+id},{position:'B1',title:'Last '+id}],videos:[{uri:'https://www.youtube.com/watch?v=track'+id+'aaaaa',title:'First '+id},{uri:'https://www.youtube.com/watch?v=track'+id+'bbbbb',title:'Last '+id}]})};if((id===2||id===7)&&hold)return new Promise(resolve=>{hold.resolve=()=>resolve({ok:true,json:async()=>data(id)})});return {ok:true,json:async()=>data(id)}}});
vm.runInContext(audio+';soundEnabled=true;',context);
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
const step=async time=>{now=time;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));await flush()};
const select=id=>vm.runInContext('playRecord({id:'+id+'})',context);

vm.runInContext("playbackMode='record'",context);await select(1);const player=players[0];assert.equal(loads.at(-1),'track1aaaaa','full record starts at first track');player.playing();await step(450);vm.runInContext('closeRecordPanel()',context);assert.equal(nodes.get('panel').hidden,true);assert.equal(player.destroyed,false);assert.equal(player.state,1,'closing details keeps playback running');assert.equal(context.selected,'101');
function ended(){player.state=0;player.opts.events.onStateChange({target:player,data:0})}
vm.runInContext('vinylBudgetSequence=audioSequence',context);ended();await flush();assert.equal(vm.runInContext('vinylBudgetSequence',context),null,'each ordered-track handoff gets a fresh bounded bridge');assert.equal(loads.at(-1),'track1bbbbb','ended advances to next ordered track');player.playing();await step(900);ended();await flush();assert.equal(nodes.get('audioStatus').textContent,'Record finished.');assert.equal(loads.length,2,'full record stops at last track');assert.match(nodes.get('audioModeNote').textContent,/2 \/ 2 linked/);
vm.runInContext("playbackMode='normal'",context);await select(2);player.playing();await step(1350);const normalCount=loads.length;ended();await flush();assert.equal(loads.length,normalCount,'normal never advances automatically');
vm.runInContext("playbackMode='geographic';audioRecord='1';geographicPlayed.clear();geographicAttempts.clear();geographicPlayed.add('1')",context);const candidate=vm.runInContext('chooseGeographicRecord()',context);assert.notEqual(candidate.id,1);assert.ok(records.includes(candidate));
// A filter with one unlinked record followed by a playable record skips the empty link without looping.
context.filteredEntries=()=>[records[2],records[3]];vm.runInContext("geographicPlayed.add('3');audioPlan.ended=false",context);ended();await flush();assert.deepEqual(opened,['105','103']);assert.deepEqual(detailStates,[false,false],'automatic shuffle does not reopen closed details');assert.ok(loads.at(-1).startsWith('video3'));player.playing();await step(1800);
// Collection filters are visual controls: preserve active, paused and finished audio.
const filters=['all','travelling','local','unknown'].map(filter=>({dataset:{filter}}));
Object.assign(context,{cancelZoom(){},restoreOverview(){},compositeOverview:()=>true,perspectiveMotion:null,overviewPaint:null,viewFilter:'all',mode:'music'});
nodes.set('shelf',node('shelf'));
const renderStart=html.slice(html.indexOf('function render(){'),html.indexOf('restoreOverview();const collection=',html.indexOf('function render(){')));
vm.runInContext(renderStart+'}',context);
const filterHandler=html.slice(html.indexOf("document.querySelectorAll('[data-filter]').forEach(b=>b.onclick"),html.indexOf("document.querySelectorAll('[data-mode]').forEach(b=>b.onclick",html.indexOf("document.querySelectorAll('[data-filter]').forEach(b=>b.onclick")));
context.document.querySelectorAll=()=>filters;vm.runInContext(filterHandler,context);
const beforeFilters={loads:loads.length,sequence:vm.runInContext('audioSequence',context),player:vm.runInContext('audioPlayer',context)};
for(const state of [1,2,0]){player.state=state;for(const filter of filters){filter.onclick();assert.equal(loads.length,beforeFilters.loads,'filter never starts or changes a track');assert.equal(player.state,state,'filter preserves playing, paused or ended state');assert.equal(player.destroyed,false);assert.equal(vm.runInContext('audioSequence',context),beforeFilters.sequence);assert.equal(vm.runInContext('audioPlayer',context),beforeFilters.player);}}
assert.equal(context.mode,'edition','unknown origin still switches map perspective');
vm.runInContext('stopAudio()',context);const openCount=opened.length;ended();await flush();assert.equal(opened.length,openCount,'stopped player events cannot restart shuffle');assert.equal(players.length,1);
assert.match(html,/id="playbackMode"[^>]*aria-label="Playback mode"/);console.log('Playback modes: first-to-last sequence, final stop, normal behavior, geographic selection, unlinked skips and stale-event cleanup pass.');
