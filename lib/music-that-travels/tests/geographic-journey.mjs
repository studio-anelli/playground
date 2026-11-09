import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../source/geography.html',import.meta.url),'utf8'),source=html.split('<script>')[1].split('</script>')[0];
const route=source.slice(source.indexOf('function geographicDistance('),source.indexOf('function advanceGeographic('));
const paint=source.slice(source.indexOf('function paintAttribute('),source.indexOf('function showTraveler('));
const records=[
 [1,2.35,48.85],[2,2.35,48.85],[3,2.35,48.85], // Paris: begin locally.
 [4,3.06,50.63],[5,4.35,50.85],[6,4.4,51.22],[7,4.48,51.92], // Lille, Brussels, Antwerp, Rotterdam.
 [8,-.13,51.5],[9,139.7,35.7]
].map(([id,lon,lat])=>({id,instance_id:id+100,location:{lon,lat}}));
let draws=0,dWrites=0;const root={children:[],appendChild(n){this.children.push(n)},setAttribute(k,v){this[k]=v}};
const context=vm.createContext({records,byKey:Object.fromEntries(records.map(n=>[n.instance_id,n])),mode:'edition',audioRecord:'1',selected:'101',recordLocation:n=>n.location,filteredEntries:()=>records,audioIsCurrent:p=>p.current!==false,updateJourneyStats:()=>{},scheduleRender:()=>draws++,geo:(lon,lat)=>[lon,lat],dx:0,dy:0,scale:1,$:()=>root,document:{createElementNS:()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;if(k==='d')dWrites++}})}});
vm.runInContext("let playbackMode='geographic',geographicPlayed=new Set(),geographicAttempts=new Set(),geographicJourney={},listeningJourney=[],journeyRevision=0,journeyPaintKey='',journeyKm=0;"+paint+route+';resetGeographicJourney()',context);
const commit=id=>{context.audioRecord=String(id);vm.runInContext(`commitGeographicRecord({recordId:${id}})`,context)};
const next=()=>vm.runInContext('chooseGeographicRecord()',context);
commit(1);assert.equal(next().id,2,'nearby records play before moving away');commit(2);assert.equal(next().id,3);commit(3);assert.equal(next().id,4,'after three local records, travel to nearest new place');
const before=vm.runInContext('listeningJourney.length',context);next();assert.equal(vm.runInContext('listeningJourney.length',context),before,'planning a next track does not paint a false stop');
commit(4);assert.equal(next().id,5,'continue from Lille toward nearby Brussels');commit(5);assert.equal(next().id,6,'continue nearby rather than jumping to Tokyo');commit(6);assert.equal(next().id,7,'continue onward to Rotterdam');
const played=vm.runInContext('listeningJourney.length',context);vm.runInContext('commitGeographicRecord({recordId:9,current:false})',context);assert.equal(vm.runInContext('listeningJourney.length',context),played,'stale/unplayed track does not extend trail');commit(6);assert.equal(vm.runInContext('listeningJourney.length',context),played,'repeated playing events do not duplicate a stop');
vm.runInContext('renderListeningJourney()',context);assert.match(root._path.attrs.d,/^M/);assert.equal((root._path.attrs.d.match(/L/g)||[]).length,3,'same-location tracks do not create artificial travel segments');const firstWrites=dWrites;context.dx=20;vm.runInContext('renderListeningJourney()',context);assert.equal(dWrites,firstWrites,'camera changes only update trail transform');assert.equal(root.transform,'translate(20 0) scale(1)');context.mode='music';vm.runInContext('renderListeningJourney()',context);assert.equal(root._path.attrs.d,'','a different perspective never joins unrelated locations');context.mode='edition';
// Soft direction preference keeps driving forward when a comparable stop is nearby behind us.
context.filteredEntries=()=>[{id:10,instance_id:110,location:{lon:2.1,lat:0}},{id:11,instance_id:111,location:{lon:.1,lat:0}},{id:12,instance_id:112,location:{lon:100,lat:0}}];context.audioRecord='6';
vm.runInContext("listeningJourney=[];geographicPlayed.clear();geographicJourney={position:{lon:1,lat:0},heading:Math.PI/2,localPlayed:3,perspective:'edition'}",context);assert.equal(next().id,10,'prefer a nearby forward stop to a similarly near backward stop');
const distance=vm.runInContext('geographicDistance({lon:179,lat:0},{lon:-179,lat:0})',context);assert.ok(distance>220&&distance<225,'distance wraps correctly at the date line');
vm.runInContext("listeningJourney=[{lon:179,lat:0,perspective:'edition'},{lon:-179,lat:0,perspective:'edition'}];journeyRevision++;renderListeningJourney()",context);assert.equal(root._path.attrs.d,'M179 0L180 0M-180 0L-179 0','trail wraps at the date line instead of crossing the entire world');
context.selected=null;context.audioRecord='4';vm.runInContext('resetGeographicJourney()',context);assert.equal(vm.runInContext('audibleRecord().id',context),4,'filters can clear visual selection without losing the audible route origin');
vm.runInContext('resetGeographicJourney(true)',context);assert.equal(vm.runInContext('listeningJourney.length',context),0,'Reset clears the session trail');
console.log('Geographic journey: local-first progression, nearby directed travel, audible-only trail, dateline distance, retained audio origin, transform reuse and reset pass.');
