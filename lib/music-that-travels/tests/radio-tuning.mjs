import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../source/geography.html',import.meta.url),'utf8'),audio=html.slice(html.indexOf('let soundEnabled='),html.indexOf("$('soundToggle').onclick"));
const contexts=[];const param=()=>({value:0,events:[],setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t])},exponentialRampToValueAtTime(v,t){this.events.push(['ramp',v,t])},cancelScheduledValues(t){this.events.push(['cancel',t])}});
const node=()=>({connect(){},disconnect(){this.disconnected=true}});
class AudioContext{
 constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=8000;this.destination={};this.sources=[];this.gains=[];this.buffers=0;contexts.push(this)}
 resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}
 createBuffer(ch,length,rate){this.buffers++;assert.equal(length,rate);const data=new Float32Array(length);return {getChannelData:()=>data}}
 createBufferSource(){const s={...node(),stops:[],start(t){this.started=t},stop(t){this.stops.push(t)}};this.sources.push(s);return s}
 createBiquadFilter(){return {...node(),Q:{value:0},frequency:param()}}
 createGain(){const gain={...node(),gain:param()};this.gains.push(gain);return gain}
}
const box={hidden:false,innerHTML:''};const context=vm.createContext({Map,Set,Math,Number,Float32Array,Promise,window:{AudioContext},$:()=>box});vm.runInContext(audio,context);
vm.runInContext('startRadioTuning(1)',context);assert.equal(contexts.length,0,'sound off never creates a synth');
vm.runInContext('soundEnabled=true;audioSequence=1;startRadioTuning(1)',context);const ctx=contexts[0];assert.equal(ctx.sources.length,1);assert.equal(ctx.sources[0].loop,true);assert.equal(ctx.sources[0].stops[0],8.1);assert.ok(ctx.gains[0].gain.events.every(e=>e[0]==='cancel'||e[1]<=.08),'bridge gain is bounded');
vm.runInContext('startRadioTuning(1)',context);assert.equal(ctx.sources.length,1,'repeated callbacks reuse the current bridge');ctx.currentTime=.5;vm.runInContext('stopRadioTuning(.3,2)',context);assert.equal(ctx.sources[0].stops.length,1,'stale playback events cannot stop a newer bridge');vm.runInContext('stopRadioTuning(.3,1)',context);assert.ok(ctx.sources[0].stops.at(-1)<1);ctx.sources[0].onended();assert.equal(ctx.sources[0].disconnected,true);
ctx.currentTime=1;vm.runInContext('audioSequence=2;startRadioTuning(2)',context);assert.equal(ctx.buffers,1,'noise buffer is reused');assert.equal(ctx.sources.length,2);ctx.currentTime=9.2;ctx.sources[1].onended();vm.runInContext('startRadioTuning(2)',context);assert.equal(ctx.sources.length,2,'an exhausted transition cannot restart static');
ctx.currentTime=10;vm.runInContext('audioSequence=3;startRadioTuning(3);stopAudio()',context);assert.equal(ctx.state,'suspended');assert.equal(ctx.sources[2].disconnected,true);assert.ok(ctx.sources[2].stops.at(-1)<=10.1);
assert.match(html,/<button id="soundToggle"[^>]*aria-label="Turn sound on"[^>]*><svg/);assert.ok(!html.includes('>Sound off</button>'));
console.log('Radio bridge: opt-in audio, bounded gain/duration, buffer reuse, stale-event protection, timeout and immediate stop pass.');
