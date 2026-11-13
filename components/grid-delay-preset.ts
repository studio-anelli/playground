import {beatDivisions,type BeatDivision,type DelayPatch,type DelayTarget,type DelayWave,type DelayInputGains} from "./grid-delay-patch-bay";
import type {DelayQuality} from "./grid-delay-gpu";

export type GridDelayBlend="source-over"|"multiply"|"screen"|"overlay"|"difference"|"exclusion"|"lighten"|"darken";
export type GridDelayPreset={
 kind:"grid-delay-machine";version:1;
 settings:Record<string,number>;
 waves:DelayWave[];patches:DelayPatch[];gains:DelayInputGains;
 text:string;font:string;
 align:"left"|"center"|"right";vertical:"top"|"middle"|"bottom";
 motion:"horizontal"|"vertical"|"orbit"|"rotation"|"scale";
 pattern:"wave"|"cascade"|"radial"|"random";
 deformation:"rigid"|"fisheye"|"pinch";
 ink:string;background:string;
 blend:GridDelayBlend;
 linked:boolean;grid:boolean;playing:boolean;quality:DelayQuality;
 transport?:{bpm:number;delaySync:boolean;delayDivision:BeatDivision};backgroundInside?:boolean;
 delay:{mode:"image"|"black";blackHold:number;type?:"digital"|"domain-warp"|"tape"|"ping-pong";echoMix?:number;tapeWear?:number;warpSpeed?:number;waveBlend?:"replace"|"multiply"|"screen"|"difference"};
 globalLens:{enabled:boolean;mode:"fisheye"|"pinch";strength:number;size:number;growth:number};
 feedback:{enabled:boolean;amount:number;decay:number;refresh:number;blend:GridDelayBlend;zoom?:number;drift?:number;rotation?:number;warp?:number};
 image?:string|null;
};
const object=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null&&!Array.isArray(v);
const number=(v:unknown,min:number,max:number):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
const option=(v:unknown,options:readonly string[]):v is string=>typeof v==="string"&&options.includes(v);
const color=(v:unknown):v is string=>typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v);
const blends=["source-over","multiply","screen","overlay","difference","exclusion","lighten","darken"];
const modes=["horizontal","vertical","orbit","rotation","scale"];
const patterns=["wave","cascade","radial","random"];
const shapes=["sine","triangle","square","noise","ramp"];
export function parseGridDelayPreset(input:unknown,ranges:Record<string,readonly [number,number]>,targets:readonly DelayTarget[]):GridDelayPreset{
 if(!object(input)||input.kind!=="grid-delay-machine"||input.version!==1)throw Error("This is not a supported Grid Delay preset (version 1).");
 const p=input;
 const values=p.settings;
 // Older presets may include the removed experimental edgeSoftness key.
 // Keep reading their actual controls without restoring that broken effect.
 if(!object(values))throw Error("Preset parameters are missing.");
 const validatedSettings={...values};
 delete validatedSettings.edgeSoftness;
 if(Object.keys(ranges).some(k=>!number(validatedSettings[k],ranges[k][0],ranges[k][1])))throw Error("Preset parameters are missing or outside their allowed ranges.");
 if(typeof p.text!=="string"||p.text.length>5000||typeof p.font!=="string"||p.font.length>200)throw Error("Invalid text or font in preset.");
 if(!option(p.align,["left","center","right"])||!option(p.vertical,["top","middle","bottom"])||
    !option(p.motion,modes)||!option(p.pattern,patterns)||!option(p.deformation,["rigid","fisheye","pinch"])||
    !option(p.quality,["balanced","sharp","fluid"])||!option(p.blend,blends)||
    !color(p.ink)||!color(p.background))throw Error("Preset contains an unsupported font, colour or mode.");
 if(typeof p.linked!=="boolean"||typeof p.grid!=="boolean"||typeof p.playing!=="boolean")throw Error("Invalid preset toggle settings.");
 if(!Array.isArray(p.waves)||p.waves.length!==3||p.waves.some(w=>!object(w)||!option(w.shape,shapes)||
   !number(w.rate,.01,4)||!number(w.depth,0,100)||!number(w.phase,-100000,100000)||typeof w.enabled!=="boolean"||
   (w.sync!==undefined&&typeof w.sync!=="boolean")||(w.division!==undefined&&!option(w.division,beatDivisions))))throw Error("Invalid preset wave generators.");
 if(!Array.isArray(p.patches)||p.patches.length>128||p.patches.some(c=>!object(c)||typeof c.id!=="string"||c.id.length>90||
   !Number.isInteger(c.wave)||!number(c.wave,0,2)||!targets.includes(c.target as DelayTarget)||!number(c.amount,-100,100)))throw Error("Invalid preset patch cables.");
 if(!object(p.gains)||Object.entries(p.gains).some(([key,value])=>!targets.includes(key as DelayTarget)||!number(value,0,4)))throw Error("Invalid preset input multipliers.");
 if(p.backgroundInside!==undefined&&typeof p.backgroundInside!=="boolean")throw Error("Invalid background mode.");
 if(p.transport!==undefined&&(!object(p.transport)||!number(p.transport.bpm,40,240)||
    typeof p.transport.delaySync!=="boolean"||!option(p.transport.delayDivision,beatDivisions)))throw Error("Invalid tempo settings.");
 if(!object(p.delay)||!option(p.delay.mode,["image","black"])||!number(p.delay.blackHold,0,100)||
   (p.delay.type!==undefined&&!option(p.delay.type,["digital","domain-warp","tape","ping-pong"]))||
   (p.delay.echoMix!==undefined&&!number(p.delay.echoMix,0,100))||
   (p.delay.tapeWear!==undefined&&!number(p.delay.tapeWear,0,100))||
   (p.delay.warpSpeed!==undefined&&!number(p.delay.warpSpeed,0,4))||
   (p.delay.waveBlend!==undefined&&!option(p.delay.waveBlend,["replace","multiply","screen","difference"])))throw Error("Invalid delay mode.");
 if(!object(p.globalLens)||typeof p.globalLens.enabled!=="boolean"||!option(p.globalLens.mode,["fisheye","pinch"])||
    !number(p.globalLens.strength,0,100)||!number(p.globalLens.size,15,150)||!number(p.globalLens.growth,0,3))throw Error("Invalid global lens.");
 if(!object(p.feedback)||typeof p.feedback.enabled!=="boolean"||!number(p.feedback.amount,0,100)||
    !number(p.feedback.decay,0,100)||!number(p.feedback.refresh,16,500)||!option(p.feedback.blend,blends)||
    (p.feedback.zoom!==undefined&&!number(p.feedback.zoom,-5,5))||
    (p.feedback.drift!==undefined&&!number(p.feedback.drift,-100,100))||
    (p.feedback.rotation!==undefined&&!number(p.feedback.rotation,-10,10))||
    (p.feedback.warp!==undefined&&!number(p.feedback.warp,0,100)))throw Error("Invalid feedback settings.");
 if(p.image!==undefined&&p.image!==null&&(typeof p.image!=="string"||p.image.length>10_000_000||!/^data:image\/(?:png|jpeg|webp);base64,/i.test(p.image)))throw Error("Unsupported or oversized embedded image.");
 return {...p,settings:validatedSettings} as GridDelayPreset;
}
