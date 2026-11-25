import {CONFIG,LABELS} from './config.js';
import {makeDemo,step,applyCommand,drainEvents} from './core/state.js';
import {FixedClock} from './core/clock.js';
import {Camera} from './rendering/projection.js';
import {BattlefieldRenderer} from './rendering/renderer.js';
import {attachInput} from './ui/input.js';
const $=id=>document.getElementById(id);
function start(){
  const canvas=$('battlefield'),camera=new Camera();let state=makeDemo(),selected=null,pointer=null,frameAlpha=1,lastFrame=null,lastUI=0,frameMs=0,stepMs=0,toastTimer=0;
  const renderer=new BattlefieldRenderer(canvas,camera);const clock=new FixedClock(dt=>{const t=performance.now();step(state,dt);drainEvents(state);stepMs=stepMs*.92+(performance.now()-t)*.08;});
  const debugAllowed=new URLSearchParams(location.search).has('debug');let debugOpen=debugAllowed;const speedButtons=[...document.querySelectorAll('[data-speed]')];
  function announce(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
  function quality(){const q=$('quality').value;if(q!=='auto')return q;return navigator.maxTouchPoints>0?'medium':'high';}
  function resize(){const r=canvas.getBoundingClientRect();renderer.resize(r.width,r.height,window.devicePixelRatio||1,quality());render();updateUI(true);}
  function fit(){const es=state.entities;if(es.length){camera.fit({minX:Math.min(...es.map(e=>e.x))-100,minY:Math.min(...es.map(e=>e.y))-100,maxX:Math.max(...es.map(e=>e.x))+100,maxY:Math.max(...es.map(e=>e.y))+100},CONFIG.camera.fitPadding);camera.panPixels(0,Math.min(camera.height*.035,25));}else camera.fit();render();updateUI(true);}
  function getSelected(){return state.entities.find(e=>e.id===selected)??null;}
  function render(){renderer.draw(state,clock.paused?1:frameAlpha,selected);}
  function select(p){selected=renderer.pick(p.x,p.y);render();updateUI(true);}
  function focusEntity(e){if(!e)return;camera.focus(e.x,e.y);camera.zoom=Math.max(camera.zoom,1.25);render();updateUI(true);}
  function setPaused(value,reason){clock.setPaused(value);frameAlpha=1;lastFrame=null;render();updateUI(true);if(reason)announce(reason);}
  function togglePause(){setPaused(!clock.paused);}
  function updateUI(force=false){
    const t=state.time,min=Math.floor(t/60),sec=Math.floor(t%60),dec=Math.floor((t%1)*10+1e-6);$('time').textContent=`${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${dec}`;$('clockStatus').textContent=clock.paused?'PAUSED':'RUNNING';$('clockStatus').classList.toggle('paused',clock.paused);$('pause').textContent=clock.paused?'▶ Resume':'Ⅱ Pause';$('pause').setAttribute('aria-pressed',String(clock.paused));
    for(const b of speedButtons)b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===clock.speed));$('zoomLevel').textContent=Math.round(camera.zoom*100)+'%';
    const e=getSelected();$('entityName').textContent=e?e.label:'Select a vessel';$('entityType').textContent=e?`${e.faction==='friendly'?'Friendly':'Hostile'} • ${LABELS[e.kind]} • visual fixture`:'Click or tap any sprite to inspect it.';$('entityData').hidden=!e;$('focus').disabled=!e;
    if(e){$('entityId').textContent='#'+e.id;$('entityPosition').textContent=`${e.x.toFixed(1)}, ${e.y.toFixed(1)}`;$('entityHeading').textContent=((e.heading*180/Math.PI%360+360)%360).toFixed(1)+'°';}
    if(debugAllowed){$('step').disabled=!clock.paused;$('spawn').disabled=clock.paused;$('remove').disabled=clock.paused||!e;if(debugOpen){const world=pointer?camera.screenToWorld(pointer.x,pointer.y):null;$('diagnosticText').textContent=[`FPS (smoothed) ${frameMs>0?(1000/frameMs).toFixed(1):'—'}`,`Sim step avg   ${stepMs.toFixed(3)} ms`,`Tick / Hz      ${state.tick} / ${CONFIG.clock.hz}`,`Entities       ${state.entities.length} (${renderer.visibleItems.length} drawn)`,`Seed           ${state.seed}`,`Camera         ${camera.x.toFixed(1)}, ${camera.y.toFixed(1)}`,`Zoom / tilt    ${camera.zoom.toFixed(3)} / ${CONFIG.camera.compression}`,`CSS viewport   ${Math.round(camera.width)} × ${Math.round(camera.height)}`,`Backing store  ${canvas.width} × ${canvas.height}`,`DPR / quality  ${renderer.ratio.toFixed(2)} / ${renderer.quality}`,`Dropped sim s  ${clock.droppedSeconds.toFixed(3)}`,`Pointer world  ${world?world.x.toFixed(1)+', '+world.y.toFixed(1):'—'}`,`Sprite cache   ${renderer.registry.cache.size}`,`Selected       ${e?JSON.stringify({id:e.id,kind:e.kind,x:+e.x.toFixed(1),y:+e.y.toFixed(1)}):'none'}`].join('\n');}}
  }
  function setDebug(value){debugOpen=debugAllowed&&value;$('debugPanel').hidden=!debugOpen;$('debugToggle').hidden=!debugAllowed;$('debugToggle').setAttribute('aria-pressed',String(debugOpen));renderer.debug=debugOpen&&$('debugGrid').checked;render();updateUI(true);}
  function reset(){if(clock.paused){announce('Resume before resetting the demo.');return;}state=makeDemo();selected=null;renderer.registry.clear();clock.reset();frameAlpha=1;fit();announce('Foundation scene reset.');}
  function command(c){const r=applyCommand(state,c,clock.paused);drainEvents(state);if(!r.ok)announce(r.reason??'Command rejected');render();updateUI(true);return r;}
  const input=attachInput(canvas,camera,{onSelect:select,onFocus:p=>{select(p);focusEntity(getSelected());},onPointer:p=>pointer=p,onCamera:()=>{render();updateUI(true);},onPause:togglePause,onFit:fit});
  $('pause').onclick=togglePause;speedButtons.forEach(b=>b.onclick=()=>{clock.setSpeed(Number(b.dataset.speed));updateUI(true);});$('reset').onclick=reset;$('focus').onclick=()=>focusEntity(getSelected());$('fit').onclick=fit;$('zoomIn').onclick=()=>{camera.zoomAt(1.25);render();updateUI(true);};$('zoomOut').onclick=()=>{camera.zoomAt(.8);render();updateUI(true);};$('quality').onchange=resize;$('labels').onchange=e=>{renderer.labels=e.target.checked;render();};
  $('collapseInspector').onclick=()=>{const body=$('inspectBody');body.hidden=!body.hidden;$('collapseInspector').textContent=body.hidden?'+':'−';$('collapseInspector').setAttribute('aria-expanded',String(!body.hidden));};
  $('debugToggle').onclick=()=>setDebug(!debugOpen);$('debugClose').onclick=()=>setDebug(false);$('debugGrid').onchange=()=>setDebug(debugOpen);
  $('step').onclick=()=>{if(debugAllowed&&clock.singleStep()){frameAlpha=1;render();updateUI(true);}};
  $('spawn').onclick=()=>{if(!debugAllowed)return;const kinds=['frigate','carrier','missile','destroyer','miner','constructor'],id=state.nextId,kind=kinds[(id-1)%kinds.length],faction=id%2===0&&['carrier','missile','destroyer'].includes(kind)?'hostile':'friendly';const r=command({type:'spawn',data:{kind,faction,x:camera.x+(id%3-1)*90,y:camera.y+(id%4-1.5)*75,heading:id*.71,label:'Debug fixture '+id}});if(r.ok){selected=r.id;render();updateUI(true);}};
  $('remove').onclick=()=>{if(!debugAllowed||selected===null)return;if(command({type:'destroy',id:selected}).ok){selected=null;render();updateUI(true);}};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true,'Tab hidden — resume manually when ready.');});window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);
  if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(canvas);
  resize();fit();setDebug(debugOpen);if(document.hidden)setPaused(true);
  function loop(now){const dt=lastFrame===null?0:Math.min(.1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;if(dt>0)frameMs=frameMs?frameMs*.92+dt*1000*.08:dt*1000;input.tick(dt);const f=clock.frame(now);frameAlpha=f.alpha;render();if(now-lastUI>150){updateUI();lastUI=now;}requestAnimationFrame(loop);}
  requestAnimationFrame(loop);
  // Read-only diagnostics API for browser integration tests; never a gameplay mutation path.
  if(debugAllowed)window.incursionDiagnostics=()=>({state:JSON.parse(JSON.stringify(state)),camera:{x:camera.x,y:camera.y,zoom:camera.zoom,width:camera.width,height:camera.height},selected,paused:clock.paused,speed:clock.speed,dpr:renderer.ratio,visible:renderer.visibleItems.map(i=>({id:i.id,x:i.screen.x,y:i.screen.y})),canvas:{width:canvas.width,height:canvas.height}});
}
try{start();}catch(err){console.error(err);$('errorText').textContent=err.message+' Serve the directory over HTTP in a modern browser.';$('error').hidden=false;}
