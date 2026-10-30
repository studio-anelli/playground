"use client";
/** Exact path geometry extracted from the supplied DURF Logo.ai, artboard 5.
 * The paths are not a font approximation. */
const wordPaths=[
{t:"matrix(1 0 0 -1 207.0289 233.71079)",d:"M0 0H-89.262V-132.744H0C26.538-132.744 48.052-111.23 48.052-84.692V-48.052C48.052-21.514 26.538 0 0 0M14.62-77.856C14.62-89.143 5.471-98.292-5.816-98.292H-55.83V-34.452H-5.816C5.471-34.452 14.62-43.603 14.62-54.89Z"},
{t:"matrix(1 0 0 -1 682.2328 268.1631)",d:"M0 0V34.452H-60.145C-86.77 34.452-97.305 17.814-97.305-2.709V-98.292H-61.518V-63.771H-26.838V-35.148H-61.518V0Z"},
{t:"matrix(1 0 0 -1 361.8678 320.8374)",d:"M0 0C0-6.051-4.905-10.954-10.956-10.954H-37.378C-43.429-10.954-48.334-6.051-48.334 0V87.338H-86.475V-4.659C-86.475-27.164-68.231-45.408-45.726-45.408H-2.608C19.897-45.408 38.141-27.164 38.141-4.659V87.338H0Z"},
{t:"matrix(1 0 0 -1 527.8279 233.75672)",d:"M0 0H-71.094-107.058V-132.744H-71.094V-98.122H-46.585L-16.146-132.744H22.102V-124.235L-5.829-98.122H0C17.392-98.122 31.49-84.023 31.49-66.631V-31.49C31.49-14.099 17.392 0 0 0M-2.197-61.089C-2.197-65.764-5.986-69.553-10.663-69.553H-71.094V-34.407H-10.663C-5.986-34.407-2.197-38.197-2.197-42.874Z"}
];
export function OfficialDurfWordmark({className=""}:{className?:string}){
return <svg className={className} role="img" aria-label="DURF" xmlns="http://www.w3.org/2000/svg" viewBox="117.767 233.499 564.466 133.001" preserveAspectRatio="xMinYMid meet">{wordPaths.map((p,i)=><path key={i} transform={p.t} d={p.d} fill="currentColor" fillRule="evenodd"/>)}</svg>;
}
/** Exact delta artwork from the black official full lockup of Logo.ai, artboard 10. */
export function OfficialDelta({className=""}:{className?:string}){
 return <svg className={className} role="img" aria-label="DURF delta" viewBox="572 245 116 127" xmlns="http://www.w3.org/2000/svg"><path transform="matrix(1 0 0 -1 658.2451 252.82639)" fill="currentColor" fillRule="evenodd" d="M0 0-67.466-38.951C-79.821-46.084-79.821-63.917-67.466-71.049L-33.733-90.525 0-110.001C12.354-117.134 27.798-108.217 27.798-93.952V-16.049C27.798-1.783 12.354 7.132 0 0M19.279-65.152-19.59-87.593C-27.404-92.104-37.173-86.465-37.173-77.441V-32.559C-37.173-23.536-27.404-17.896-19.59-22.408L19.279-44.849C27.093-49.361 27.093-60.64 19.279-65.152"/></svg>;
}
/** Precise size and position of visible circles read from supplied LAYOUT LANDING.ai (1440px artboard). */
const heroDots=[[797,463.3,39.2],[701.6,499.3,48.1],[598.1,538.3,57],[487.7,579.9,65.9],[371.3,623.9,74.8],[249.5,669.8,83.7]];
const ambitionDots=[[153.5,965.8,19.8],[374.7,997.7,55.9],[595.9,1029.6,91.9],[817.1,1061.5,127.9],[1038.2,1093.4,163.9],[1259.4,1125.3,199.9],[1480.6,1157.2,235.9]];
const timelineDots=[[102.3,5332.6,19.5],[281,5332.6,25.7],[459.7,5332.6,31.9],[638.4,5332.6,38],[817.1,5332.6,33.7],[995.9,5332.6,27.5],[1174.6,5332.6,20.8],[1353.3,5332.6,19.5]];
export function IllustratorDots({kind}:{kind:"hero"|"ambition"|"timeline"|"cta"}){
 if(kind==="cta")return <svg className="di-source-dots di-source-cta" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">{Array.from({length:7},(_,x)=>Array.from({length:5},(_,y)=>{
 const r=[152.6,124.5,96.5,68.4,40.4][y];
 return <circle key={x+"-"+y} cx={208+x*170.6667} cy={190+y*180} r={r} fill="#F16A37"/>;
 }))}</svg>;
 const src=kind==="hero"?heroDots:kind==="ambition"?ambitionDots:timelineDots;
 const origin=kind==="hero"?0:kind==="ambition"?900:0;
 return <svg className={"di-source-dots di-source-"+kind} viewBox={kind==="hero"?"0 0 1440 850":kind==="ambition"?"0 0 1440 600":"0 0 1440 110"} preserveAspectRatio="none" aria-hidden="true">{src.map(([x,y,r],i)=><circle key={i} cx={x} cy={kind==="timeline"?y-5275:y-origin} r={r} fill={kind==="hero"?"#F8F4EC":kind==="ambition"?"#DD8EB9":"#F16A37"}/>)}</svg>;
}
