"use client";
import {useEffect} from "react";
export default function GridDelayError({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
 useEffect(()=>{console.error("[Grid Delay Machine] Runtime failure:",error)},[error]);
 return <main style={{minHeight:"100vh",background:"#171917",color:"#edeae3",padding:"min(6vw,56px)",fontFamily:"Arial,sans-serif"}}>
  <a href="/" style={{color:"inherit",fontSize:13}}>← Playground</a>
  <section style={{maxWidth:620,margin:"18vh auto 0"}}>
   <p style={{fontSize:12,letterSpacing:2}}>GRID DELAY MACHINE / ERROR</p>
   <h1 style={{fontSize:"clamp(28px,5vw,52px)",fontWeight:400}}>The experiment stopped.</h1>
   <p style={{lineHeight:1.6,color:"#b5bab2"}}>A client-side error interrupted the renderer. Try restarting the experiment. If it continues, the browser console will contain the error details.</p>
   <button onClick={reset} style={{marginTop:18,padding:"12px 20px",background:"#edeae3",color:"#171917",border:0,cursor:"pointer"}}>Restart experiment</button>
  </section>
 </main>
}
