"use client";
import {useId} from "react";
type DotMode="none"|"field"|"cutout";
export function DotPhoto({src,mode="field",accent="#507568",bg="#F8F4EC"}:{src:string;mode?:DotMode;accent?:string;bg?:string}){
  const maskId=useId();
  const dots=Array.from({length:77},(_,i)=>{const x=i%11,y=Math.floor(i/11);const main=(x===3||x===7||y===3);const active=main||(x>=1&&x<=3&&y>=1&&y<=2)||(x>=7&&x<=9&&y>=4&&y<=5);return {x,y,active};});
  if(mode==="none")return null;
  return <svg className="dp-v2-dot-photo" viewBox="0 0 550 350" preserveAspectRatio="xMidYMid slice" aria-label="DURF circular grid graphic" role="img">
    <defs><pattern id="durf-v2-grid" width="50" height="50" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="17" fill="#fff"/></pattern>
      <mask id={maskId}><rect width="550" height="350" fill="#000"/>{dots.filter(d=>d.active).map(d=><circle key={d.x+"-"+d.y} cx={25+d.x*50} cy={25+d.y*50} r="18" fill="white"/>)}</mask>
    </defs>
    <rect width="550" height="350" fill={bg}/>
    {mode==="cutout"&&src?<image href={src} width="550" height="350" preserveAspectRatio="xMidYMid slice" mask={`url(#${maskId})`}/>:null}
    {mode==="field"&&dots.filter(d=>d.active).map(d=><circle key={d.x+"-"+d.y} cx={25+d.x*50} cy={25+d.y*50} r="17" fill={accent}/>)}
    {mode==="cutout"&&<path d="M0 349H550" stroke={accent}/>}
  </svg>;
}
export const editorialV2Css=`
/* DURF Editorial Grid v2. Reference interpretation: Swiss editorial typography / rhythmic dot identity / asymmetric grid. */
.dp-editorial-theme{--v2-rule:1px solid var(--ink);background:var(--paper)}
.dp-editorial-theme .dp-section-wrap{border-bottom:var(--v2-rule)}
.dp-editorial-theme .dp-section{padding:54px 4.4% 73px}
.dp-editorial-theme .dp-nav{padding:18px 4.4%;min-height:80px}
.dp-editorial-theme .dp-overline{margin-bottom:38px;border-bottom:var(--v2-rule);padding-bottom:16px}
.dp-editorial-theme .dp-hero{display:grid;grid-template-rows:auto 1fr auto;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:12px;min-height:660px;padding-top:36px}
.dp-editorial-theme .dp-hero>.dp-overline{grid-column:1/-1}
.dp-editorial-theme .dp-hero-content{grid-column:1 / span 9;max-width:none;align-self:end;margin:0;z-index:5;padding-bottom:48px}
.dp-editorial-theme .dp-hero-content h1{font-size:clamp(64px,10.2vw,148px);line-height:.87;letter-spacing:-.091em;max-width:1180px}
.dp-editorial-theme .dp-hero-content p{font-size:clamp(17px,2vw,24px);max-width:460px;line-height:1.28;margin-top:32px}
.dp-editorial-theme .dp-hero-content .dp-button{margin-top:25px}
.dp-editorial-theme .dp-art{position:absolute;right:4.4%;top:18%;height:56%;width:39%;z-index:1;border:1px solid var(--ink);background:var(--paper);overflow:hidden}
.dp-editorial-theme .dp-art .dp-hero-photo{opacity:1;object-fit:cover}
.dp-editorial-theme .dp-v2-dot-hero{position:absolute;width:46%;right:0;top:41%;z-index:2;pointer-events:none;mix-blend-mode:normal}
.dp-editorial-theme .dp-v2-dot-photo{width:100%;height:auto;display:block}
.dp-editorial-theme .dp-art .dp-brand-circles-wrap,.dp-editorial-theme .dp-art .durf-dots{opacity:.36}
.dp-editorial-theme .dp-hero .dp-overline:last-child{grid-column:1/-1;margin:0}
.dp-editorial-theme .dp-hero .dp-overline:last-child:before{display:none}
.dp-editorial-theme .dp-section h2{letter-spacing:-.073em;line-height:.95;max-width:1000px}
.dp-editorial-theme .dp-section .dp-lead{max-width:680px;margin-top:28px}
.dp-editorial-theme .dp-grid{border-left:0;border-top:var(--v2-rule);margin-top:50px}
.dp-editorial-theme .dp-grid.dp-v2-index{grid-template-columns:1fr!important;display:flex;flex-direction:column}
.dp-editorial-theme .dp-v2-index .dp-tile{display:grid;grid-template-columns:62px minmax(0,1fr) 36%;align-items:center;gap:24px;border-right:0;border-bottom:var(--v2-rule);min-height:160px;padding:24px 6px;background:transparent}
.dp-editorial-theme .dp-v2-index .dp-tile .dp-tile-top{align-self:start}
.dp-editorial-theme .dp-v2-index .dp-tile h3{font-size:clamp(31px,4.4vw,65px);margin:0;letter-spacing:-.075em}
.dp-editorial-theme .dp-v2-index .dp-tile>div:last-child{display:contents}
.dp-editorial-theme .dp-v2-index .dp-tile p{font-size:14px;line-height:1.4;max-width:300px;justify-self:end}
.dp-editorial-theme .dp-v2-index .dp-tile-top i{width:12px;height:12px}
.dp-editorial-theme .dp-v2-matrix .dp-tile{min-height:285px;position:relative;padding:22px}
.dp-editorial-theme .dp-v2-matrix .dp-tile h3{max-width:410px}
.dp-editorial-theme .dp-v2-matrix .dp-tile:nth-child(2),.dp-editorial-theme .dp-v2-matrix .dp-tile:nth-child(3){background:color-mix(in srgb,var(--paper),var(--green) 7%)}
.dp-editorial-theme .dp-functions{background:var(--paper)!important}
.dp-editorial-theme .dp-rows.dp-v2-large{display:flex!important;flex-direction:column;gap:0!important}
.dp-editorial-theme .dp-v2-large .dp-function{display:grid;grid-template-columns:80px minmax(0,1fr) 25px;gap:16px;padding:28px 5px 34px;border-top:var(--v2-rule);background:none}
.dp-editorial-theme .dp-v2-large .dp-function:last-child{border-bottom:var(--v2-rule)}
.dp-editorial-theme .dp-v2-large .dp-function h3{font-size:clamp(42px,6.3vw,92px);letter-spacing:-.08em;line-height:.86}
.dp-editorial-theme .dp-v2-large .dp-function p{font-size:clamp(13px,1.4vw,16px);margin-top:18px}
.dp-editorial-theme .dp-v2-image-spread{display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);align-items:stretch;gap:3px;border:0;background:var(--ink);margin-top:42px}
.dp-editorial-theme .dp-v2-image-spread .dp-photo{min-height:390px;margin:0}
.dp-editorial-theme .dp-v2-image-spread .dp-photo:first-child{min-height:450px}
.dp-editorial-theme .dp-v2-image-spread .dp-photo:last-child{background:var(--paper)}
.dp-editorial-theme .dp-v2-image-spread .dp-photo:last-child:before{display:none}
.dp-editorial-theme .dp-v2-photo-graphic{position:absolute;z-index:3;pointer-events:none;right:0;bottom:0;width:45%;opacity:.95}
.dp-editorial-theme .dp-v2-dot-marker{width:36px;height:36px;display:grid;grid-template-columns:repeat(3,1fr);gap:5px;flex-shrink:0}
.dp-editorial-theme .dp-v2-dot-marker i{display:block;border-radius:50%;background:var(--green)}
.dp-editorial-theme .dp-v2-dot-marker i:nth-child(4n){background:var(--orange)}
.dp-editorial-theme .dp-cta{background:var(--orange)!important}
.dp-editorial-theme .dp-cta .dp-button{border:1px solid var(--ink);border-radius:0}
.dp-editorial-theme .dp-v2-footer-mark{display:grid;grid-template-columns:repeat(3,12px);gap:13px;width:max-content;margin-bottom:35px}
.dp-editorial-theme .dp-v2-footer-mark i{width:12px;height:12px;border-radius:50%;background:var(--pink)}
.dp-editorial-theme .dp-v2-footer-mark i:nth-child(2n){background:var(--green)}
.dp-editorial-theme .dp-event{grid-template-columns:minmax(110px,22%) 1fr;border-top:var(--v2-rule);align-items:center}
.dp-editorial-theme .dp-event h3{letter-spacing:-.035em}
.dp-editorial-theme .dp-detail{border-left:2px solid var(--green);padding-left:20px}
.dp-editorial-theme .dp-editorial-row{padding:52px 4.4%}
.dp-editorial-theme .dp-editorial-grid{gap:0!important}
.dp-editorial-theme .dp-editorial-col{border:1px solid var(--ink)}
.dp-editorial-theme.dp-v2-space-compact .dp-section{padding-top:34px;padding-bottom:44px}
.dp-editorial-theme.dp-v2-space-generous .dp-section{padding-top:85px;padding-bottom:105px}
.dp-editorial-theme.dp-v2-space-generous .dp-editorial-row{padding-top:85px;padding-bottom:105px}
@media(max-width:760px){.dp-editorial-theme .dp-hero{display:block;min-height:650px}.dp-editorial-theme .dp-hero-content{position:relative;max-width:100%;padding:190px 0 40px}.dp-editorial-theme .dp-hero-content h1{font-size:clamp(48px,12vw,84px)}.dp-editorial-theme .dp-art{top:100px;width:65%;height:230px}.dp-editorial-theme .dp-v2-dot-hero{width:65%;top:250px}.dp-editorial-theme .dp-v2-index .dp-tile{grid-template-columns:45px 1fr;gap:12px}.dp-editorial-theme .dp-v2-index .dp-tile p{grid-column:2;justify-self:start}.dp-editorial-theme .dp-v2-large .dp-function{grid-template-columns:37px 1fr 15px}.dp-editorial-theme .dp-v2-image-spread{grid-template-columns:1fr}.dp-editorial-theme .dp-v2-image-spread .dp-photo{min-height:280px}}
.dl-viewport.mobile .dp-editorial-theme .dp-hero{display:block;min-height:650px}
.dl-viewport.mobile .dp-editorial-theme .dp-hero-content{max-width:100%;padding:185px 0 35px}
.dl-viewport.mobile .dp-editorial-theme .dp-art{top:95px;width:62%;height:210px}
.dl-viewport.mobile .dp-editorial-theme .dp-v2-dot-hero{width:60%;top:225px}
.dl-viewport.mobile .dp-editorial-theme .dp-v2-index .dp-tile{grid-template-columns:40px 1fr;gap:12px}
.dl-viewport.mobile .dp-editorial-theme .dp-v2-index .dp-tile p{grid-column:2;justify-self:start}
.dl-viewport.mobile .dp-editorial-theme .dp-v2-large .dp-function{grid-template-columns:35px 1fr 15px}
.dl-viewport.mobile .dp-editorial-theme .dp-v2-image-spread{grid-template-columns:1fr!important}
`;
