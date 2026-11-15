import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LockKeyhole,RotateCw,Smartphone} from 'lucide-react';
import {requestOrientationAccess,watchHeading} from './orientation.mjs';
import './style.css';

const TICKS=40, DEG=360/TICKS, combo=[32,15,7];
const mod=(n,m)=>((n%m)+m)%m;
const dist=(a,b)=>Math.min(mod(a-b,TICKS),mod(b-a,TICKS));

function App(){
 const [started,setStarted]=useState(false),[open,setOpen]=useState(false),[status,setStatus]=useState('Turn RIGHT to 32');
 const [dial,setDial]=useState(0), dialRef=useRef(0), vel=useRef(0), stage=useRef(0), passed=useRef(false), lastDir=useRef(0), settle=useRef(null);
 const [motion,setMotion]=useState('idle'),[motionAttempt,setMotionAttempt]=useState(0);
 const drag=useRef(null);
 const setDialBoth=v=>{dialRef.current=v;setDial(v)};
 const reset=()=>{stage.current=0;passed.current=false;setStatus('Turn RIGHT to 32')};
 const process=(delta,velocity)=>{
   if(open||Math.abs(delta)<.02)return;
   const dir=delta>0?1:-1; // clockwise/right positive
   const prev=dialRef.current;
   const next=prev+delta/DEG;
   setDialBoth(next); vel.current=velocity;
   const n=mod(next,TICKS);
   if(stage.current===0){
     if(dir<0 && lastDir.current>0) reset();
     if(dir<0 && lastDir.current!==0) reset();
   } else if(stage.current===1){
     if(dir>0 && lastDir.current<0 && !passed.current) reset();
     // one complete-ish counterclockwise lap after first target: cross 15 once, then return to it.
     if(dir<0 && dist(n,15)<1.2) passed.current=true;
   } else if(stage.current===2 && dir<0 && lastDir.current>0){ reset(); }
   lastDir.current=dir;
 };
 const evaluate=()=>{
   const n=mod(dialRef.current,TICKS);
   if(stage.current===0 && lastDir.current===1 && dist(n,32)<=1){stage.current=1;passed.current=false;setStatus('Now LEFT — pass 15, then stop on 15');navigator.vibrate?.(25)}
   else if(stage.current===1 && lastDir.current===-1 && passed.current && dist(n,15)<=1){stage.current=2;setStatus('RIGHT to 7');navigator.vibrate?.(25)}
   else if(stage.current===2 && lastDir.current===1 && dist(n,7)<=1){setOpen(true);setStatus('OPEN');navigator.vibrate?.([30,40,80])}
 };
 useEffect(()=>{
   if(!started||open)return;
   let timer,received=false;
   const missing=setTimeout(()=>{if(!received)setMotion(current=>current==='waiting'?'missing':current)},4000);
   const stop=watchHeading(window,{
     onReading:reading=>{received=true;setMotion(reading.source)},
     onRotate:delta=>{if(drag.current!==null)return;process(delta,delta*30);clearTimeout(timer);timer=setTimeout(evaluate,300)},
   });
   return()=>{stop();clearTimeout(timer);clearTimeout(missing)};
 },[started,open,motionAttempt]);
 useEffect(()=>()=>clearTimeout(settle.current),[]);
 const begin=async()=>{
   setMotion('waiting');
   try{
     const permission=await requestOrientationAccess(window);
     if(permission!=='granted')setMotion(permission==='denied'?'denied':permission);
   }catch(error){setMotion('error')}
   setStarted(true);setMotionAttempt(value=>value+1);
 };
 const pointer=(e)=>{const r=e.currentTarget.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;return Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI};
 const down=e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current=pointer(e)};
 const move=e=>{if(drag.current==null)return;const a=pointer(e);let d=a-drag.current;if(d>180)d-=360;if(d<-180)d+=360;drag.current=a;process(d,d*20);clearTimeout(settle.current);settle.current=setTimeout(evaluate,180)};
 const up=()=>{drag.current=null;evaluate()};
 const display=Math.round(mod(dial,TICKS));
 return <main className={open?'open':''}>
   <div className="grain"/>
   {!started?<section className="entry"><LockKeyhole size={46}/><h1>PRIVATE</h1><p>There’s something in here for you.</p><button onClick={begin}>TAP TO UNLOCK</button><small><Smartphone size={14}/> Requires motion access</small></section>:
   <section className="safe">
    <div className="postit"><b>COMBO</b><span>R32</span><span>L15</span><span>R7</span></div>
    <div className="brand">C&B<br/><small>PRIVATE RESERVE</small></div>
    <div className="index">▼</div>
    <div className="dialWrap" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="dial" style={{transform:`rotate(${dial*DEG}deg)`}}>
       {Array.from({length:TICKS},(_,i)=><div key={i} className={'tick '+(i%5===0?'major':'')} style={{transform:`rotate(${-i*DEG}deg)`}}><i/>{i%5===0&&<b>{i}</b>}</div>)}
       <div className="hub"><RotateCw size={27}/></div>
      </div>
    </div>
    <div className="readout">{display.toString().padStart(2,'0')}</div><div className="status">{status}</div>
    <p className="hint">Hold your phone flat, screen facing up.<br/>Turn it clockwise or counterclockwise like a dial.<br/>Desktop: drag the dial.</p>
    <div className="motionStatus" role="status">
     {motion==='compass'?'Compass connected':motion==='rotation'?'Rotation connected':motion==='waiting'?'Waiting for phone rotation…':motion==='denied'?'Motion access denied. Allow Motion & Orientation in your browser settings.':motion==='insecure'?'Motion needs HTTPS. Open the GitHub Pages link.':motion==='unavailable'?'Motion is unavailable in this browser. You can drag the dial.':motion==='error'?'Motion access failed. Tap below to try again.':'No rotation data received. Check motion permissions or drag the dial.'}
    </div>
    {!['compass','rotation','waiting'].includes(motion)&&<button className="motionRetry" onClick={begin}>TRY MOTION AGAIN</button>}
    {open&&<div className="inside"><div className="card"><div className="eyebrow">YOU CRACKED IT</div><h2>CODE<br/><em>&</em> BOURBON</h2><div className="rule"/><p className="date">THE NEXT MEETUP</p><p className="placeholder">DATE · TIME · LOCATION</p><p className="copy">Bring a project, a problem, or just an appetite for good code and better whiskey.</p><button onClick={()=>{setOpen(false);setDialBoth(0);reset()}}>LOCK IT BACK UP</button></div></div>}
   </section>}
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);
