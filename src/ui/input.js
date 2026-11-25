import {CONFIG} from '../config.js';
// All input coordinates are CSS pixels. This adapter does not mutate simulation state.
export function attachInput(canvas,camera,{onSelect,onFocus,onPointer,onCamera,onPause,onFit}){
  const pointers=new Map(),keys=new Set();let gesture=null,pinch=false;
  const local=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
  function down(e){if(e.pointerType==='mouse'&&![0,1].includes(e.button))return;e.preventDefault();canvas.setPointerCapture?.(e.pointerId);const p=local(e);pointers.set(e.pointerId,p);if(pointers.size===1){gesture={id:e.pointerId,start:p,last:p,drag:e.button===1,select:e.button===0||e.pointerType!=='mouse'};pinch=false;}else{pinch=true;gesture=null;}}
  function move(e){const p=local(e);onPointer?.(p);if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,p);
    if(pointers.size>=2){const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1];const oldDist=Math.hypot(old.x-other.x,old.y-other.y),newDist=Math.hypot(p.x-other.x,p.y-other.y);const mid={x:(p.x+other.x)/2,y:(p.y+other.y)/2};camera.panPixels((p.x-old.x)/2,(p.y-old.y)/2);if(oldDist>3&&newDist>3)camera.zoomAt(newDist/oldDist,mid.x,mid.y);onCamera?.();return;}
    if(!gesture||gesture.id!==e.pointerId)return;const d=Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y);if(!gesture.drag&&d>=CONFIG.camera.dragThreshold){gesture.drag=true;camera.panPixels(p.x-gesture.start.x,p.y-gesture.start.y);onCamera?.();}else if(gesture.drag){camera.panPixels(p.x-gesture.last.x,p.y-gesture.last.y);onCamera?.();}gesture.last=p;
  }
  function up(e,cancel=false){if(!pointers.has(e.pointerId))return;const p=local(e);if(!cancel&&!pinch&&gesture?.id===e.pointerId&&!gesture.drag&&gesture.select&&Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)<CONFIG.camera.dragThreshold)onSelect?.(p);pointers.delete(e.pointerId);if(!pointers.size){gesture=null;pinch=false;}}
  function wheel(e){e.preventDefault();const p=local(e),d=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?camera.height:1);camera.zoomAt(Math.exp(-d*CONFIG.camera.wheelSensitivity),p.x,p.y);onCamera?.();}
  function dbl(e){e.preventDefault();onFocus?.(local(e));}
  function keydown(e){if(e.ctrlKey||e.metaKey||e.altKey||e.target?.matches?.('input,select,textarea,button,[contenteditable]'))return;const key=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d'].includes(key)){e.preventDefault();keys.add(key);}else if(key===' '){e.preventDefault();if(!e.repeat)onPause?.();}else if(key==='home'){e.preventDefault();if(!e.repeat)onFit?.();}}
  function keyup(e){keys.delete(e.key.toLowerCase());}function blur(){keys.clear();pointers.clear();gesture=null;pinch=false;}
  const cancel=e=>up(e,true),release=e=>up(e,false),context=e=>e.preventDefault();
  const events=[[canvas,'pointerdown',down],[canvas,'pointermove',move],[canvas,'pointerup',release],[canvas,'pointercancel',cancel],[canvas,'lostpointercapture',cancel],[canvas,'wheel',wheel,{passive:false}],[canvas,'dblclick',dbl],[canvas,'contextmenu',context],[window,'keydown',keydown],[window,'keyup',keyup],[window,'blur',blur]];
  events.forEach(([t,n,f,o])=>t.addEventListener(n,f,o));
  return {tick(dt){let x=0,y=0;if(keys.has('a')||keys.has('arrowleft'))x++;if(keys.has('d')||keys.has('arrowright'))x--;if(keys.has('w')||keys.has('arrowup'))y++;if(keys.has('s')||keys.has('arrowdown'))y--;if(x||y){const l=Math.hypot(x,y),v=CONFIG.camera.keyboardPixelsPerSecond*dt;camera.panPixels(x*v/l,y*v/l);onCamera?.();}},dispose(){events.forEach(([t,n,f,o])=>t.removeEventListener(n,f,o));blur();}};
}
