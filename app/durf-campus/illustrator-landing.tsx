"use client";
import type {CSSProperties} from "react";
import {OfficialDurfWordmark,OfficialDelta,IllustratorDots} from "./official-artwork";

export type IllustratorTypeRole="navigation"|"display"|"heading"|"condensed"|"body"|"caption"|"cta";
export type IllustratorTypeAxes={weight:number;width:number};
export type IllustratorTypeSettings=Record<IllustratorTypeRole,IllustratorTypeAxes>;
export const defaultIllustratorType:IllustratorTypeSettings={
 navigation:{weight:700,width:75},
 display:{weight:700,width:100},
 heading:{weight:700,width:100},
 condensed:{weight:700,width:85},
 body:{weight:500,width:90},
 caption:{weight:600,width:90},
 cta:{weight:700,width:100}
};
type Item={title:string;description:string};
type Props={
  palette:{green:string;orange:string;pink:string;paper:string;ink:string};
  heroTitle:string;heroText:string;introText:string;themes:Item[];functions:Item[];
  milestones:Item[];functionsLead:string;nextTitle:string;ctaTitle:string;ctaText:string;
  images:{hero:string;process1:string;process2:string};
  heroOverride?:string;process1Override?:string;process2Override?:string;
  onColumnSelect?:(id:string,index:number)=>void;
  typeSettings:IllustratorTypeSettings;
};
const partners=["Gemeente Rotterdam","Erasmus Universiteit Rotterdam","Technische Universiteit Delft","Erasmus MC","Hogeschool Rotterdam","Albeda MBO"];
function DotRibbon({count=9,color="#F16A37",type="growth",className=""}:{count?:number;color?:string;type?:"growth"|"wave"|"line";className?:string}){
 return <div className={`di-dots ${className}`} aria-hidden="true">{Array.from({length:count},(_,i)=>{
  const f=type==="growth"?(.34+.66*(i/(count-1))):type==="wave"?(1-Math.abs(i-(count-1)/2)/((count-1)/2)*.75):.40;
  return <i key={i} style={{["--dot-size" as string]:String(f),background:color}}/>;
 })}</div>
}
function DotMatrix({color}:{color:string}){
 return <div className="di-dot-matrix" aria-hidden="true">{Array.from({length:99},(_,i)=>{const x=i%9,y=Math.floor(i/9);const radius=Math.max(.30,.92-Math.abs(x-4)*.14-Math.abs(y-5)*.045+Math.sin(y*.7+x)*.12);return <i key={i} style={{transform:`scale(${radius})`,background:color}}/>})}</div>
}
function Wave({color,className="",rows=1}:{color:string;className?:string;rows?:number}){
 return <div className={`di-wave ${className}`} aria-hidden="true">{Array.from({length:rows},(_,j)=><div className="di-wave-row" key={j}>{Array.from({length:8},(_,i)=><i key={i} style={{background:color}}/>)}</div>)}</div>
}
function DurfWordmark({light=false}:{light?:boolean}){return <OfficialDurfWordmark className={`di-wordmark ${light?"is-light":""}`}/>;}
export function IllustratorLanding(p:Props){
 const {palette:c}=p;
 const artStyle:CSSProperties={"--di-paper":c.paper,"--di-green":c.green,"--di-pink":c.pink,"--di-orange":c.orange,"--di-ink":c.ink} as CSSProperties;
 for(const role of Object.keys(defaultIllustratorType) as IllustratorTypeRole[]){
  const axes={...defaultIllustratorType[role],...p.typeSettings?.[role]};
  Object.assign(artStyle,{["--di-"+role+"-weight"]:axes.weight,["--di-"+role+"-width"]:axes.width});
 }
 const hero=p.heroOverride||p.images.hero||"/durf-campus/photos/08.webp";
 const process1=p.process1Override||p.images.process1||"/durf-campus/photos/01.webp";
 const process2=p.process2Override||p.images.process2||"/durf-campus/photos/06.webp";
 // The art direction is sourced from the user's full-page Illustrator artboard; copy stays live and editable.
 return <div className="di-page" style={artStyle}>
  <header className="di-header">
   <a href="#di-top" className="di-logo"><DurfWordmark/></a>
   <nav aria-label="Sections"><a href="#di-ambition">DE AMBITIE</a><a href="#di-themes">INHOUD</a><a href="#di-functions">AANPAK</a><a href="#di-planning">PLANNING</a><a href="#di-contact">CONTACT</a></nav>
  </header>
  <section id="di-top" className="di-opening" data-edit-section="hero">
   <div className="di-hero-photo" data-edit-asset="hero"><img src={hero} alt="Rotterdam / DURF Campus" /></div><IllustratorDots kind="hero"/>
   <div className="di-slogan"><span>Droom. Denk.</span><span>Durf. Doe.</span></div>
  </section>
  <section id="di-ambition" className="di-ambition" data-edit-section="intro">
    <IllustratorDots kind="ambition"/>
    <span className="di-side-label">DE AMBITIE</span>
    <h1 data-edit-key="heroTitle">{p.heroTitle==="EEN PLEK OM HET VERSCHIL TE MAKEN."?"EEN PLEK\nOM HET VERSCHIL\nTE MAKEN.":p.heroTitle}</h1>
    <p data-edit-key="introText">{p.heroText} {p.introText}</p>
  </section>
  <section id="di-themes" className="di-themes" data-edit-section="themes">
    <DotMatrix color={c.orange}/>
    <div className="di-themes-content">
      <span className="di-side-label">INHOUD</span>
      <h2>De<br/>vraagstukken<br/>van morgen.</h2>
      <div className="di-theme-grid">
       {(p.themes.length===4?[p.themes[0],p.themes[3],p.themes[2],p.themes[1]]:p.themes).map((item,i)=>{
        const index=p.themes.indexOf(item);
        return <article data-edit-list="themes" data-edit-index={index} key={i}><h3>{item.title}</h3><p>{item.description}</p></article>;
       })}
      </div>
    </div>
  </section>
  <div className="di-fullphoto" data-edit-asset="process1"><img src={process1} alt="DURF collaboration and making" /><svg className="di-aanpak-dot-art" viewBox="0 0 1440 660" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  {[[145,125,16],[345,242,46],[572,343,78],[808,453,109],[1070,572,144],[1350,676,164]].map(([cx,cy,r],i)=><circle key={i} cx={cx} cy={cy} r={r} fill={c.paper}/>)}
</svg></div>
  <section id="di-functions" className="di-functions" data-edit-section="functions">
    <span className="di-side-label">AANPAK</span>
    <div className="di-functions-intro"><h2>VAN<br/>DENKEN<br/>NAAR<br/>DOEN.</h2><p data-edit-key="functionsLead">{p.functionsLead}</p></div>
    <div className="di-functions-grid">
      <div className="di-function-list">{p.functions.map((item,i)=><article key={i} data-edit-list="functions" data-edit-index={i}><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
      <div className="di-function-photo" data-edit-asset="process2"><img src={process2} alt="Talent and innovation" /></div>
    </div>
  </section>
  <section id="di-planning" className="di-planning" data-edit-section="next">
    <span className="di-side-label">PLANNING</span>
    <h2 data-edit-key="nextTitle">{p.nextTitle==="Samen werken aan de volgende stap."?"SAMEN WERKEN\nAAN DE\nVOLGENDE STAP.":p.nextTitle}</h2>
    <div className="di-milestones">{p.milestones.map((m,i)=><article data-edit-list="milestones" data-edit-index={i} key={i}><h3>{i===2?"STRAKS":m.title.toUpperCase()}</h3><p>{m.description}</p></article>)}</div>
    <IllustratorDots kind="timeline"/>
  </section>
  <section id="di-contact" className="di-contact" data-edit-section="cta">
   <div className="di-cta-wave"><IllustratorDots kind="cta"/><div className="di-cta-copy"><h2 data-edit-key="ctaTitle">{p.ctaTitle.toUpperCase()==="DURF JIJ OOK?"?<><span>Durf</span><span> jij ook?</span></>:p.ctaTitle}</h2><p data-edit-key="ctaText">{p.ctaText}</p></div></div>
  </section>
  <footer className="di-footer" data-edit-section="footer">
    <div className="di-partner-list">{partners.map(x=><div key={x}>{x}</div>)}</div>
    <div className="di-footer-logo"><div className="di-footer-overline">DESIGNING　 URBAN　 RESILIENT　 FUTURES</div><div className="di-footer-lockup"><DurfWordmark light/><OfficialDelta className="di-official-delta"/></div><span className="di-delta-caption">Rooted in the Rotterdam Delta</span></div>
  </footer>
 </div>;
}
export const illustratorCss=`
.di-page{background:var(--di-paper);color:var(--di-ink);font-family:'Instrument Sans',Arial,sans-serif;overflow:hidden;--di-pad:4.1%;font-feature-settings:"kern" 1}
.di-page *{box-sizing:border-box}
.di-header{display:flex;justify-content:space-between;align-items:end;gap:22px;padding:16px var(--di-pad) 12px;min-height:175px;background:var(--di-paper)}
.di-logo{text-decoration:none;color:var(--di-ink)}.di-wordmark{font-family:'Instrument Sans',sans-serif;font-size:clamp(86px,14vw,228px);font-weight:900;line-height:.69;letter-spacing:-.095em}.di-header nav{display:flex;gap:18px;flex-wrap:wrap;align-items:center;padding-bottom:3px}.di-header nav a{font-size:clamp(11px,1.1vw,16px);font-weight:800;letter-spacing:-.035em;text-decoration:none;color:var(--di-ink)}
.di-hero-photo{height:clamp(250px,32vw,490px);margin:0 var(--di-pad);overflow:hidden;position:relative;background:var(--di-green);cursor:pointer}
.di-hero-photo img,.di-fullphoto img,.di-function-photo img{position:absolute;width:100%;height:100%;inset:0;object-fit:cover}
.di-hero-dots{position:absolute!important;bottom:-34px;left:9%;right:20%;transform:rotate(-22deg);justify-content:flex-start}
.di-dots{display:flex;align-items:center;justify-content:space-between;gap:10px}.di-dots i{width:calc(var(--dot-size)*78px);height:calc(var(--dot-size)*78px);border-radius:50%;flex-shrink:0}
.di-slogan{padding:55px var(--di-pad) 63px;text-align:center;display:flex;flex-direction:column;align-items:center;font-size:clamp(46px,6.7vw,110px);line-height:.87;letter-spacing:-.077em;font-weight:800}
.di-ambition{position:relative;background:var(--di-orange);padding:280px var(--di-pad) 70px;min-height:770px;overflow:hidden}
.di-ambition h1{font-size:clamp(54px,7.1vw,110px);font-weight:800;line-height:.94;letter-spacing:-.065em;max-width:940px;color:var(--di-pink);text-transform:uppercase;white-space:pre-line;margin:0 0 80px}
.di-ambition p{font-size:clamp(17px,1.78vw,27px);font-weight:450;line-height:1.34;margin:0 0 0 42%;max-width:760px;letter-spacing:-.032em}
.di-overflow-dots{position:absolute;top:25px;left:2%;right:-10%;display:flex;justify-content:space-between;align-items:center}.di-overflow-dots i{display:block;width:190px;height:190px;border-radius:50%;flex-shrink:0;transform-origin:center}
.di-side-label{position:absolute;right:2.2%;top:35px;writing-mode:vertical-rl;transform:rotate(180deg);font-size:clamp(16px,2vw,30px);letter-spacing:-.05em;font-weight:800}
.di-themes{background:var(--di-green);padding:82px var(--di-pad) 90px;display:grid;grid-template-columns:37% 1fr;gap:24px;min-height:870px;position:relative}
.di-dot-matrix{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));grid-template-rows:repeat(11,minmax(0,1fr));align-items:center;justify-items:center;gap:0;max-width:100%;height:min(62vw,700px)}.di-dot-matrix i{display:block;background:var(--di-orange);width:100%;aspect-ratio:1;border-radius:50%}
.di-themes-content{padding:5px 5% 0 0;position:relative}.di-themes .di-side-label{top:0;right:0}
.di-themes h2{font-size:clamp(50px,6vw,93px);letter-spacing:-.083em;line-height:.86;color:var(--di-orange);font-weight:850;margin:0 0 64px;max-width:700px}
.di-theme-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:45px;row-gap:65px}
.di-theme-grid article{cursor:pointer}.di-theme-grid h3{font-size:clamp(23px,2.5vw,36px);line-height:.97;letter-spacing:-.06em;max-width:300px;margin:0 0 28px;font-weight:850}.di-theme-grid p{font-size:clamp(13px,1.1vw,17px);line-height:1.42;margin:0}
.di-fullphoto{height:clamp(390px,43vw,670px);position:relative;overflow:hidden;cursor:pointer}.di-photo-bubbles{position:absolute;bottom:-50px;left:5%;right:-6%;display:flex;align-items:end;justify-content:space-between}.di-photo-bubbles i{display:block;background:var(--di-paper);border-radius:50%;flex-shrink:0}
.di-functions{background:var(--di-paper);position:relative;padding:75px var(--di-pad) 110px}.di-functions .di-side-label{top:55px}
.di-functions-intro{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:end;margin-bottom:100px}.di-functions-intro h2{font-weight:900;font-size:clamp(64px,7.6vw,120px);letter-spacing:-.065em;line-height:.86;margin:0}.di-functions-intro p{font-size:clamp(23px,2.5vw,40px);line-height:1.1;letter-spacing:-.05em;max-width:540px;font-weight:550;margin:0 55px 0 0}
.di-functions-grid{display:grid;grid-template-columns:43% 1fr;gap:60px;align-items:end}.di-function-list{display:flex;flex-direction:column;gap:39px}.di-function-list article{cursor:pointer}.di-function-list h3{font-size:clamp(24px,2.1vw,34px);line-height:1.06;font-weight:850;letter-spacing:-.05em;margin:0 0 3px}.di-function-list p{font-size:clamp(13px,1.2vw,18px);line-height:1.42;max-width:480px;margin:0}.di-function-photo{position:relative;width:100%;aspect-ratio:1/1;overflow:hidden;cursor:pointer}
.di-planning{background:var(--di-pink);position:relative;padding:95px var(--di-pad) 45px;min-height:740px}.di-planning h2{font-size:clamp(52px,7vw,108px);font-weight:850;line-height:.96;letter-spacing:-.06em;text-transform:uppercase;color:var(--di-orange);max-width:980px;margin:0 0 110px}
.di-milestones{display:grid;grid-template-columns:repeat(3,1fr);gap:65px}.di-milestones article{cursor:pointer}.di-milestones h3{font-size:clamp(30px,3.4vw,54px);font-weight:850;line-height:1;letter-spacing:-.06em;color:var(--di-orange);margin:0 0 22px}.di-milestones p{font-size:clamp(15px,1.45vw,22px);line-height:1.35;margin:0}
.di-milestone-dots{margin-top:95px}.di-milestone-dots i{max-width:90px}
.di-contact{padding:0 4% 0;background:var(--di-pink);min-height:540px;position:relative}.di-cta-wave{min-height:510px;position:relative;padding:0 9%;display:flex;justify-content:center;flex-direction:column}
.di-wave{position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;overflow:hidden;pointer-events:none}.di-wave-row{display:flex;justify-content:space-between;gap:0;align-items:center;min-height:125px}.di-wave-row i{display:block;width:14.1%;height:auto;aspect-ratio:1;border-radius:50%;flex-shrink:0}
.di-cta-copy{position:relative;z-index:2;max-width:980px;width:100%;margin:auto;background:var(--di-orange);border-radius:90px;padding:60px 7% 70px;box-shadow:0 20px 0 var(--di-orange)}.di-cta-copy h2{font-size:clamp(64px,8vw,120px);line-height:.92;font-weight:900;letter-spacing:-.068em;margin:0 0 45px}.di-cta-copy p{font-size:clamp(17px,1.7vw,25px);line-height:1.35;font-weight:600;margin:0;max-width:960px}
.di-cta-bottom-dots{position:relative;z-index:3;transform:translateY(65px);margin:0 -2%}.di-cta-bottom-dots i{width:50px;height:50px}
.di-footer{background:var(--di-ink);color:var(--di-paper);padding:180px var(--di-pad) 50px;min-height:760px;display:flex;flex-direction:column;justify-content:space-between}
.di-partner-list{font-size:clamp(20px,2vw,30px);font-weight:550;line-height:1.48;letter-spacing:-.01em}.di-footer-logo{margin-top:130px}.di-footer-overline{font:600 14px 'IBM Plex Mono',monospace;letter-spacing:.02em}.di-footer-lockup{display:flex;gap:30px;align-items:center}.di-footer-lockup .di-wordmark{font-size:clamp(95px,12vw,190px);color:var(--di-paper);line-height:1}.di-footer-lockup svg{width:120px;height:120px;color:var(--di-paper)}.di-delta-caption{font:500 13px 'IBM Plex Mono',monospace}
.di-page [data-edit-key],.di-page [data-edit-list],.di-page [data-edit-asset]{cursor:pointer}.di-page [data-edit-key]:hover,.di-page [data-edit-list]:hover,.di-page [data-edit-asset]:hover{outline:2px solid var(--di-ink);outline-offset:3px}
@media(max-width:850px){.di-header{min-height:120px}.di-header nav{gap:10px}.di-header nav a{font-size:11px}.di-wordmark{font-size:clamp(72px,12vw,130px)}.di-themes{grid-template-columns:1fr;min-height:0}.di-dot-matrix{width:45%;height:auto;aspect-ratio:9/11}.di-theme-grid{column-gap:25px}.di-ambition{padding-top:200px;min-height:620px}.di-ambition p{margin-left:22%}.di-functions-grid{gap:30px}.di-functions-intro{gap:25px}.di-milestones{gap:25px}.di-footer{min-height:620px}}
@media(max-width:600px){.di-header{flex-direction:column;align-items:start;min-height:0;padding-top:22px}.di-header nav{padding-top:20px}.di-logo .di-wordmark{font-size:90px}.di-hero-photo{height:245px}.di-slogan{font-size:clamp(43px,11vw,66px);padding:48px 3%}.di-ambition{min-height:0;padding:160px 6% 55px}.di-overflow-dots{right:-60%;top:10px}.di-overflow-dots i{width:110px;height:110px}.di-ambition h1{font-size:clamp(42px,10.5vw,69px);margin-bottom:45px}.di-ambition p{margin-left:0;font-size:17px}.di-side-label{font-size:15px;right:2%}.di-themes{padding:45px 6% 65px}.di-dot-matrix{width:70%;margin-bottom:15px}.di-themes h2{font-size:clamp(48px,11vw,78px)}.di-theme-grid{grid-template-columns:1fr 1fr;column-gap:20px;row-gap:35px}.di-theme-grid h3{font-size:22px;margin-bottom:10px}.di-theme-grid p{font-size:12px}.di-fullphoto{height:330px}.di-functions{padding:55px 6% 70px}.di-functions-intro{grid-template-columns:1fr;margin-bottom:55px}.di-functions-intro h2{font-size:65px}.di-functions-intro p{font-size:23px;margin:0}.di-functions-grid{grid-template-columns:1fr}.di-function-list{gap:25px}.di-function-photo{aspect-ratio:4/3}.di-planning{min-height:0;padding:65px 6% 25px}.di-planning h2{font-size:clamp(48px,10vw,70px);margin-bottom:70px}.di-milestones{grid-template-columns:1fr;gap:35px}.di-milestones h3{font-size:38px;margin-bottom:12px}.di-milestones p{font-size:16px}.di-milestone-dots{margin-top:65px}.di-contact{min-height:0;padding:0 4%}.di-cta-wave{min-height:430px;padding:40px 0}.di-cta-copy{padding:50px 8%;border-radius:55px}.di-wave-row{min-height:100px}.di-cta-copy h2{font-size:clamp(50px,12vw,80px);margin-bottom:20px}.di-cta-copy p{font-size:15px}.di-footer{padding:120px 6% 40px;min-height:610px}.di-partner-list{font-size:19px}.di-footer-lockup .di-wordmark{font-size:95px}.di-footer-lockup svg{width:70px;height:70px}.di-footer-overline{font-size:9px}.di-delta-caption{font-size:11px}}

/* Illustrator measured artboard: 1440 x 7227 px; InstrumentSans-Regular throughout. */
.di-page{font-family:'Instrument Sans',sans-serif}
.di-wordmark{display:block;width:clamp(260px,43vw,650px);height:auto;color:var(--di-ink);overflow:visible}
.di-logo .di-wordmark{width:clamp(280px,43vw,650px)}
.di-header{min-height:190px;align-items:center;padding:30px 4.5% 20px}
.di-header nav{gap:18px;align-items:end}
.di-header nav a{font-family:'Instrument Sans',sans-serif;font-size:clamp(12px,1.944vw,28px);font-weight:400;letter-spacing:-.035em;white-space:nowrap}
.di-slogan{font-size:clamp(50px,6.25vw,90px);font-weight:400;line-height:.844;letter-spacing:-.045em;padding-top:58px;padding-bottom:78px}
.di-ambition{padding:280px 4.95% 70px;overflow:hidden}
.di-ambition h1{font-size:clamp(54px,6.875vw,99px);line-height:.909;font-weight:400;letter-spacing:-.02em;max-width:1000px;margin-bottom:88px}
.di-ambition p{font-size:clamp(16px,1.944vw,28px);line-height:1.214;font-weight:400;letter-spacing:0}
.di-themes h2{font-size:clamp(52px,6.25vw,90px);line-height:.8;letter-spacing:-.035em;font-weight:400}
.di-theme-grid h3{font-size:clamp(22px,2.222vw,32px);line-height:.875;font-weight:400;letter-spacing:-.015em}
.di-theme-grid p{font-size:clamp(13px,1.25vw,18px);line-height:1.55;font-weight:400}
.di-functions-intro h2{font-size:clamp(65px,6.25vw,90px);line-height:.8;font-weight:400;letter-spacing:-.035em}
.di-functions-intro p{font-size:clamp(22px,2.431vw,35px);line-height:1.31;font-weight:400;letter-spacing:0}
.di-function-list h3{font-size:clamp(24px,2.222vw,32px);font-weight:400;line-height:1.14;letter-spacing:0}
.di-function-list p{font-size:clamp(13px,1.25vw,18px);font-weight:400;line-height:1.67}
.di-planning h2{font-size:clamp(60px,6.875vw,99px);line-height:.95;letter-spacing:-.025em;font-weight:400}
.di-milestones h3{font-size:clamp(33px,3.611vw,52px);font-weight:400;line-height:1.28}
.di-milestones p{font-size:clamp(16px,1.528vw,22px);font-weight:400;line-height:1.365}
.di-cta-copy h2{font-size:clamp(65px,7.638vw,110px);font-weight:400;line-height:.97;letter-spacing:-.02em}
.di-cta-copy p{font-size:clamp(17px,1.944vw,28px);font-weight:400;line-height:1.22}
.di-partner-list{font-size:clamp(17px,1.944vw,28px);font-weight:400;line-height:1.643}
.di-footer-lockup .di-wordmark{display:block;width:clamp(240px,33vw,490px);height:auto;color:var(--di-paper)}
.di-footer-lockup .di-official-delta{display:block;width:clamp(65px,8vw,116px);height:auto;color:var(--di-paper)}
.di-footer-lockup{align-items:center;gap:30px}
.di-source-dots{position:absolute;width:100%;height:auto;pointer-events:none;z-index:2;display:block;overflow:visible}
.di-opening{position:relative}.di-opening>.di-source-hero{left:0;top:-190px;width:100%;height:850px;z-index:3}
.di-ambition .di-source-ambition{left:0;top:-30px;width:100%;height:480px}
.di-planning .di-source-timeline{position:relative;left:-4%;width:108%;height:120px;margin-top:45px}
.di-contact{height:100vh;min-height:700px;padding:0;background:var(--di-pink)}
.di-cta-wave{position:relative;height:100%;min-height:0;padding:0 4%;display:flex;align-items:center;justify-content:center}
.di-source-cta{inset:0;width:100%;height:100%;z-index:0}
.di-cta-copy{position:relative;z-index:2;max-width:1020px;margin:0;background:transparent;border-radius:0;padding:0;box-shadow:none}
.di-cta-copy h2{max-width:960px}
.di-footer{min-height:800px}
@media(max-width:600px){.di-header{min-height:0;align-items:flex-start;gap:16px}.di-logo .di-wordmark{width:min(88vw,410px)}.di-header nav a{font-size:12px}.di-slogan{font-size:clamp(47px,10vw,70px)}.di-ambition h1{font-size:clamp(42px,9vw,66px)}.di-ambition p{font-size:17px}.di-themes h2,.di-functions-intro h2{font-size:clamp(54px,10vw,72px)}.di-theme-grid h3{font-size:22px}.di-theme-grid p{font-size:12px}.di-planning h2{font-size:clamp(49px,10vw,67px)}.di-contact{height:100svh;min-height:580px}.di-cta-copy{max-width:94%;padding:0}.di-cta-copy h2{font-size:clamp(48px,12vw,78px)}.di-cta-copy p{font-size:16px}.di-footer-lockup .di-wordmark{width:min(65vw,300px)}.di-footer-lockup .di-official-delta{width:70px}.di-partner-list{font-size:19px}}

/* Recovered Illustrator PDF uses multiple frozen Instrument Sans instances.
   Explicitly assign BOTH variable axes per typography role; width 75–100, weight 400–700.
   Keep sizes from the Illustrator 1440px source, but avoid simulating width with tracking. */
.di-page{font-family:'Instrument Sans',sans-serif;font-optical-sizing:none;font-synthesis:none;font-variation-settings:'wght' 500,'wdth' 90}
.di-page :is(h1,h2,h3,p,a,.di-slogan,.di-side-label,.di-partner-list,.di-footer-overline,.di-delta-caption){font-synthesis:none}
.di-page .di-header nav a{font-size:clamp(13px,1.944vw,28px);font-weight:var(--di-navigation-weight)!important;font-stretch:75%;font-variation-settings:'wght' var(--di-navigation-weight),'wdth' var(--di-navigation-width);letter-spacing:-.012em}
.di-page .di-slogan{font-weight:var(--di-display-weight)!important;font-stretch:100%;font-variation-settings:'wght' var(--di-display-weight),'wdth' var(--di-display-width);letter-spacing:-.03em}
.di-page .di-ambition h1{font-weight:var(--di-heading-weight)!important;font-stretch:100%;font-variation-settings:'wght' var(--di-heading-weight),'wdth' var(--di-heading-width);letter-spacing:-.012em;line-height:.909}
.di-page .di-ambition p{font-weight:var(--di-body-weight)!important;font-stretch:95%;font-variation-settings:'wght' var(--di-body-weight),'wdth' var(--di-body-width);letter-spacing:-.012em}
.di-page .di-themes h2{font-weight:var(--di-heading-weight)!important;font-stretch:100%;font-variation-settings:'wght' var(--di-heading-weight),'wdth' var(--di-heading-width);letter-spacing:-.028em}
.di-page .di-theme-grid h3{font-weight:var(--di-heading-weight)!important;font-stretch:100%;font-variation-settings:'wght' var(--di-heading-weight),'wdth' var(--di-heading-width);letter-spacing:-.02em}
.di-page .di-theme-grid p{font-weight:var(--di-body-weight)!important;font-stretch:90%;font-variation-settings:'wght' var(--di-body-weight),'wdth' var(--di-body-width);letter-spacing:-.006em}
.di-page .di-functions-intro h2{font-weight:var(--di-condensed-weight)!important;font-stretch:85%;font-variation-settings:'wght' var(--di-condensed-weight),'wdth' var(--di-condensed-width);letter-spacing:-.01em}
.di-page .di-functions-intro p{font-weight:var(--di-caption-weight)!important;font-stretch:95%;font-variation-settings:'wght' var(--di-caption-weight),'wdth' var(--di-caption-width);letter-spacing:-.015em}
.di-page .di-function-list h3{font-weight:var(--di-heading-weight)!important;font-stretch:100%;font-variation-settings:'wght' var(--di-heading-weight),'wdth' var(--di-heading-width);letter-spacing:-.016em}
.di-page .di-function-list p{font-weight:var(--di-body-weight)!important;font-stretch:90%;font-variation-settings:'wght' var(--di-body-weight),'wdth' var(--di-body-width);letter-spacing:-.005em}
.di-page .di-planning h2{font-weight:var(--di-heading-weight)!important;font-stretch:100%;font-variation-settings:'wght' var(--di-heading-weight),'wdth' var(--di-heading-width);letter-spacing:-.015em}
.di-page .di-milestones h3{font-weight:var(--di-heading-weight)!important;font-stretch:100%;font-variation-settings:'wght' var(--di-heading-weight),'wdth' var(--di-heading-width);letter-spacing:-.01em}
.di-page .di-milestones p{font-weight:var(--di-caption-weight)!important;font-stretch:90%;font-variation-settings:'wght' var(--di-caption-weight),'wdth' var(--di-caption-width);letter-spacing:-.007em}
.di-page .di-cta-copy h2{font-weight:var(--di-cta-weight)!important;font-stretch:100%;font-variation-settings:'wght' var(--di-cta-weight),'wdth' var(--di-cta-width);letter-spacing:-.025em}
.di-page .di-cta-copy p{font-weight:var(--di-caption-weight)!important;font-stretch:90%;font-variation-settings:'wght' var(--di-caption-weight),'wdth' var(--di-caption-width);letter-spacing:-.012em}
.di-page .di-partner-list{font-weight:var(--di-caption-weight)!important;font-stretch:75%;font-variation-settings:'wght' var(--di-caption-weight),'wdth' var(--di-caption-width);letter-spacing:0}
.di-page .di-side-label{font-weight:var(--di-navigation-weight)!important;font-stretch:75%;font-variation-settings:'wght' var(--di-navigation-weight),'wdth' var(--di-navigation-width);letter-spacing:-.015em}
.di-page .di-footer-overline{font-weight:700!important}
.di-page .di-delta-caption{font-weight:600!important}

.di-page .di-source-dots{object-fit:contain;transform:none!important;overflow:visible}
.di-opening>.di-source-hero{height:auto!important;aspect-ratio:1440/850}
.di-ambition .di-source-ambition{height:auto!important;aspect-ratio:1440/600}
.di-planning .di-source-timeline{height:auto!important;aspect-ratio:1440/110}
.di-contact .di-source-cta{width:100%;height:100%;object-fit:cover}
.di-page .di-dot-matrix i,.di-page .di-photo-bubbles i{aspect-ratio:1;flex:none;border-radius:50%}

/* Respect source-artboard line breaks; do not let browser reflow destroy designed blocks. */
.di-page .di-ambition h1,.di-page .di-planning h2{white-space:pre-line}
.di-page .di-cta-copy h2 span:first-child{color:var(--di-ink)}
.di-page .di-cta-copy h2 span:last-child{color:var(--di-paper)}

/* Artboard-faithful section rhythm: each major scene occupies at least one viewport.
   Content can extend past the viewport rather than clipping. */
.di-page .di-opening,
.di-page .di-ambition,
.di-page .di-themes,
.di-page .di-fullphoto,
.di-page .di-functions,
.di-page .di-planning,
.di-page .di-contact,
.di-page .di-footer{min-height:100vh}
.di-page .di-opening{display:flex;flex-direction:column;justify-content:space-between}
.di-page .di-opening .di-hero-photo{flex:0 0 auto}
.di-page .di-opening .di-slogan{flex:1;justify-content:center}
.di-page .di-fullphoto{height:100vh;min-height:100vh;isolation:isolate}
.di-page .di-aanpak-dot-art{position:absolute;z-index:3;width:100%;height:auto;aspect-ratio:1440/660;left:0;top:auto;bottom:-10%;overflow:visible;pointer-events:none}
.di-page .di-fullphoto{overflow:visible;z-index:3}
.di-page .di-functions{z-index:1}
/* Unlike the discarded bubble row, the source forms a diagonal progression,
   from a small dot near the top-left to increasingly large circles
   crossing the photo's bottom edge into the cream section. */
.di-page .di-fullphoto img{object-fit:cover}
.di-page .di-contact{height:100vh;min-height:100vh}
@media(max-width:600px){
  .di-page .di-opening,.di-page .di-ambition,.di-page .di-themes,
  .di-page .di-fullphoto,.di-page .di-functions,.di-page .di-planning,
  .di-page .di-contact,.di-page .di-footer{min-height:100svh}
  .di-page .di-fullphoto{height:100svh}
  .di-page .di-contact{height:100svh}
}
`;
