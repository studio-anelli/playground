import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../source/geography.html',import.meta.url),'utf8'),audio=html.slice(html.indexOf('let soundEnabled='),html.indexOf("$('soundToggle').onclick"));
const nodes=new Map(),frames=new Map(),players=[],loads=[],volumeWrites=[];let frameId=0,now=0,hold=null;
function node(id){return {id,hidden:false,disabled:false,textContent:'',title:'',href:'',removeAttribute(name){delete this[name]},remove(){nodes.delete(this.id)},querySelector(){return null},append(child){nodes.set(child.id,child)},set innerHTML(value){this.html=value;if(id==='recordAudio'){for(const key of ['youtubeTarget','audioPlayPause','audioStatus','youtubeLink','retryAudio'])nodes.delete(key);for(const match of value.matchAll(/id="([^"]+)"/g))nodes.set(match[1],node(match[1]));}},get innerHTML(){return this.html||''}}}
nodes.set('recordAudio',node('recordAudio'));
class Player{
 constructor(target,opts){this.opts=opts;this.volume=100;this.state=-1;this.videoId=opts.videoId;this.destroyed=false;players.push(this);opts.events.onReady({target:this});}
 getVolume(){return this.volume}setVolume(n){assert.ok(!this.destroyed);this.volume=n;volumeWrites.push(n)}getPlayerState(){return this.state}getVideoUrl(){return 'https://www.youtube.com/watch?v='+this.videoId}unMute(){}
 loadVideoById(id){this.videoId=id;this.state=3;loads.push(id)}playVideo(){this.state=1;this.opts.events.onStateChange({target:this,data:1})}pauseVideo(){this.state=2;this.opts.events.onStateChange({target:this,data:2})}stopVideo(){this.state=0}destroy(){this.destroyed=true}
 playing(){this.playVideo()}
}
const data=id=>({videos:id===5?[]:[{id:'video'+id,title:'Track '+id}],match:'edition'});
const context=vm.createContext({Map,Set,Math,Number,Promise,AbortController,setInterval(){},esc:s=>String(s??''),window:{YT:{Player},location:{origin:'https://example.test'}},document:{addEventListener(){},createElement:()=>node('retryAudio')},$:id=>nodes.get(id)||null,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>frames.delete(id),fetch:async url=>{const id=Number(url.split('/').pop());if((id===2||id===7)&&hold)return new Promise(resolve=>{hold.resolve=()=>resolve({ok:true,json:async()=>data(id)})});return {ok:true,json:async()=>data(id)}}});
context.bridgeEvents=[];vm.runInContext(audio+';soundEnabled=true;startVinylCrackle=sequence=>bridgeEvents.push(["start",sequence]);stopVinylCrackle=(seconds,sequence)=>bridgeEvents.push(["stop",seconds,sequence]);',context);
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
const step=async time=>{now=time;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));await flush()};
const select=id=>vm.runInContext('playRecord({id:'+id+'})',context);
await select(1);const player=players[0];
now=19999;vm.runInContext('checkAudioBuffering()',context);assert.equal(nodes.has('retryStream'),false);
now=20000;vm.runInContext('checkAudioBuffering()',context);assert.equal(nodes.get('retryStream').textContent,'Retry stream');assert.match(nodes.get('audioStatus').textContent,/taking longer/);
const retry=nodes.get('retryStream');player.opts.events.onStateChange({target:player,data:3});vm.runInContext('checkAudioBuffering()',context);assert.equal(nodes.get('retryStream'),retry,'repeated buffering events do not reset or duplicate recovery');
retry.onclick();await flush();assert.deepEqual(loads,['video1','video1']);assert.equal(nodes.has('retryStream'),false);
player.playing();now=50000;vm.runInContext('checkAudioBuffering()',context);assert.equal(nodes.has('retryStream'),false,'playing clears buffering');
vm.runInContext('watchAudioBuffering(audioPlan)',context);player.pauseVideo();now=80000;vm.runInContext('checkAudioBuffering()',context);assert.equal(nodes.has('retryStream'),false,'deliberate pause is respected');
vm.runInContext('watchAudioBuffering(audioPlan);audioPlan.videos.push({id:"another",title:"Another upload"})',context);now=110000;vm.runInContext('checkAudioBuffering()',context);assert.equal(nodes.get('nextStream').textContent,'Try another upload');
const stale=nodes.get('nextStream');vm.runInContext('stopAudio()',context);stale.onclick();await flush();assert.deepEqual(loads,['video1','video1'],'stale recovery cannot restart playback');
console.log('Buffering recovery: timeout, repeated events, retry, resumed playback, pause, alternate upload and stale callbacks pass.');
