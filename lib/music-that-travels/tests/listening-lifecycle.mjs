import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../source/geography.html',import.meta.url),'utf8'),audio=html.slice(html.indexOf('let soundEnabled='),html.indexOf("$('soundToggle').onclick"));
const nodes=new Map(),frames=new Map(),players=[],loads=[],volumeWrites=[];let frameId=0,now=0,hold=null;
function node(id){return {id,hidden:false,disabled:false,textContent:'',title:'',href:'',removeAttribute(name){delete this[name]},remove(){nodes.delete(this.id)},querySelector(){return null},append(){},set innerHTML(value){this.html=value;if(id==='recordAudio'){for(const key of ['youtubeTarget','audioPlayPause','audioStatus','youtubeLink','retryAudio'])nodes.delete(key);for(const match of value.matchAll(/id="([^"]+)"/g))nodes.set(match[1],node(match[1]));}},get innerHTML(){return this.html||''}}}
nodes.set('recordAudio',node('recordAudio'));
class Player{
 constructor(target,opts){this.opts=opts;this.volume=100;this.state=-1;this.videoId=opts.videoId;this.destroyed=false;players.push(this);opts.events.onReady({target:this});}
 getVolume(){return this.volume}setVolume(n){assert.ok(!this.destroyed);this.volume=n;volumeWrites.push(n)}getPlayerState(){return this.state}getVideoUrl(){return 'https://www.youtube.com/watch?v='+this.videoId}unMute(){}
 loadVideoById(id){this.videoId=id;this.state=3;loads.push(id)}playVideo(){this.state=1;this.opts.events.onStateChange({target:this,data:1})}pauseVideo(){this.state=2;this.opts.events.onStateChange({target:this,data:2})}stopVideo(){this.state=0}destroy(){this.destroyed=true}
 playing(){this.playVideo()}
}
const data=id=>({videos:id===5?[]:[{id:'video'+id,title:'Track '+id}],match:'edition'});
const context=vm.createContext({Map,Set,Math,Number,Promise,AbortController,window:{YT:{Player},location:{origin:'https://example.test'}},document:{createElement:()=>node('retryAudio')},$:id=>nodes.get(id)||null,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>frames.delete(id),fetch:async url=>{const id=Number(url.split('/').pop());if((id===2||id===7)&&hold)return new Promise(resolve=>{hold.resolve=()=>resolve({ok:true,json:async()=>data(id)})});return {ok:true,json:async()=>data(id)}}});
vm.runInContext(audio+';soundEnabled=true;',context);
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
const step=async time=>{now=time;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));await flush()};
const select=id=>vm.runInContext('playRecord({id:'+id+'})',context);
await select(1);assert.equal(players.length,1);assert.deepEqual(loads,['video1']);const player=players[0];player.playing();await step(225);assert.equal(player.volume,38);await step(450);assert.equal(player.volume,75);
hold={};const second=select(2);await flush();assert.equal(player.volume,75,'old track stays audible while next link is fetched');assert.equal(player.state,1);assert.equal(players.length,1);hold.resolve();await flush();await step(590);assert.equal(player.volume,38);const previousData=player.getVideoUrl;player.getVideoUrl=()=>'';player.opts.events.onStateChange({target:player,data:1});assert.equal(frames.size,1,'late old PLAYING event cannot cancel the outgoing fade');player.getVideoUrl=previousData;await step(730);await second;assert.deepEqual(loads,['video1','video2']);assert.equal(players.length,1,'same player is reused');assert.equal(player.destroyed,false);assert.equal(player.volume,0);
player.playing();await step(955);assert.equal(player.volume,38);await step(1180);assert.equal(player.volume,75);
const third=select(3);await flush();await step(1230);const fourth=select(4);await flush();await step(1510);await Promise.all([third,fourth]);assert.ok(!loads.includes('video3'),'superseded cover never loads');assert.equal(loads.at(-1),'video4');assert.equal(players.length,1);player.playing();await step(1960);assert.equal(player.volume,75);
const missing=select(5);await flush();await step(2760);await missing;assert.equal(player.state,0);assert.equal(nodes.get('audioPlayPause').disabled,true);assert.match(nodes.get('audioStatus').textContent,/No linked track/);
hold={};const pending=select(7);await flush();vm.runInContext('stopAudio()',context);hold.resolve();await pending;assert.equal(players.length,1,'late fetch cannot resurrect a stopped player');assert.equal(player.destroyed,true);assert.equal(frames.size,0);assert.equal(nodes.get('recordAudio').hidden,true);
assert.ok(!html.includes('listeningSamples'));console.log('Listening lifecycle: link-before-fade, persistent iframe, actual state-triggered fade-in, rapid replacement, missing tracks and stop pass.');
