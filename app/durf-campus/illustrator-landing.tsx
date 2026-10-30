"use client";
import type {CSSProperties} from "react";

type Item={title:string;description:string};
type Props={
  palette:{green:string;orange:string;pink:string;paper:string;ink:string};
  heroTitle:string;heroText:string;introText:string;themes:Item[];functions:Item[];
  milestones:Item[];functionsLead:string;nextTitle:string;ctaTitle:string;ctaText:string;
  images:{hero:string;process1:string;process2:string};
  heroOverride?:string;process1Override?:string;process2Override?:string;
  onColumnSelect?:(id:string,index:number)=>void;
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
function DurfWordmark({light=false}:{light?:boolean}){return <div className={`di-wordmark ${light?"is-light":""}`} aria-label="DURF">DURF</div>}
export function IllustratorLanding(p:Props){
 const {palette:c}=p;
 const artStyle={"--di-paper":c.paper,"--di-green":c.green,"--di-pink":c.pink,"--di-orange":c.orange,"--di-ink":c.ink} as CSSProperties;
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
   <div className="di-hero-photo" data-edit-asset="hero"><img src={hero} alt="Rotterdam / DURF Campus" /><DotRibbon color={c.paper} count={8} type="growth" className="di-hero-dots"/></div>
   <div className="di-slogan"><span>Droom. Denk.</span><span>Durf. Doe.</span></div>
  </section>
  <section id="di-ambition" className="di-ambition" data-edit-section="intro">
    <div className="di-overflow-dots">{Array.from({length:8},(_,i)=><i key={i} style={{background:c.pink,transform:`scale(${.28+i*.15})`}}/>)}</div>
    <span className="di-side-label">DE AMBITIE</span>
    <h1 data-edit-key="heroTitle">{p.heroTitle}</h1>
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
  <div className="di-fullphoto" data-edit-asset="process1"><img src={process1} alt="DURF collaboration and making" /><div className="di-photo-bubbles">{Array.from({length:7},(_,i)=><i key={i} style={{width:`${25+i*20}px`,height:`${25+i*20}px`}}/>)}</div></div>
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
    <h2 data-edit-key="nextTitle">{p.nextTitle}</h2>
    <div className="di-milestones">{p.milestones.map((m,i)=><article data-edit-list="milestones" data-edit-index={i} key={i}><h3>{i===2?"STRAKS":m.title.toUpperCase()}</h3><p>{m.description}</p></article>)}</div>
    <DotRibbon color={c.orange} count={9} type="wave" className="di-milestone-dots"/>
  </section>
  <section id="di-contact" className="di-contact" data-edit-section="cta">
   <div className="di-cta-wave"><Wave color={c.orange} rows={3}/><div className="di-cta-copy"><h2 data-edit-key="ctaTitle">{p.ctaTitle.charAt(0).toUpperCase()+p.ctaTitle.slice(1).toLowerCase()}</h2><p data-edit-key="ctaText">{p.ctaText}</p></div><DotRibbon color={c.orange} count={7} type="line" className="di-cta-bottom-dots"/></div>
  </section>
  <footer className="di-footer" data-edit-section="footer">
    <div className="di-partner-list">{partners.map(x=><div key={x}>{x}</div>)}</div>
    <div className="di-footer-logo"><div className="di-footer-overline">DESIGNING　 URBAN　 RESILIENT　 FUTURES</div><div className="di-footer-lockup"><DurfWordmark light/><svg viewBox="0 0 100 100" role="img" aria-label="Delta icon"><path fill="currentColor" d="M11 46 63 9Q76 1 80 17L80 83Q76 99 63 91L11 54Q5 50 11 46Z"/><path fill="#25231F" d="M28 50 66 26V74Z"/></svg></div><span className="di-delta-caption">Rooted in the Rotterdam Delta</span></div>
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
`;
