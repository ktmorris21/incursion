import * as T from '../../vendor/three.module.js';
import {CONFIG,COMBAT} from '../config.js';
import {seededRandom} from '../core/math.js';
import {poseAt} from '../core/state.js';
import {ModelRegistry} from './models.js';
import {CombatEffects} from './effects.js';
// Cosmetic inertial filter only: authoritative positions and combat stay untouched.
// Exact first-order response to a linearly moving target, bounded to 18 world units.
const MOTION_TAU=.075,MAX_LAG=18,angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export class PresentationMotion {
 constructor(){this.poses=new Map();}
 sample(e,target,time){
  let p=this.poses.get(e.id);
  if(!p||p.kind!==e.kind||p.faction!==e.faction||time<p.time-1e-6||Math.hypot(target.x-p.tx,target.y-p.ty)>120){
   p={kind:e.kind,faction:e.faction,x:target.x,y:target.y,heading:target.heading,tx:target.x,ty:target.y,time,speed:0,pitch:0,bank:0};this.poses.set(e.id,p);
   return {x:p.x,y:p.y,heading:p.heading,speed:p.speed,pitch:p.pitch,bank:p.bank};
  }
  const dt=time-p.time;
  if(dt>1e-8){
   const vx=(target.x-p.tx)/dt,vy=(target.y-p.ty)/dt,decay=Math.exp(-dt/MOTION_TAU),ox=p.x,oy=p.y;
   p.x=target.x+(p.x-p.tx)*decay-vx*MOTION_TAU*(1-decay);
   p.y=target.y+(p.y-p.ty)*decay-vy*MOTION_TAU*(1-decay);
   const dx=p.x-target.x,dy=p.y-target.y,lag=Math.hypot(dx,dy);
   if(lag>MAX_LAG){p.x=target.x+dx*MAX_LAG/lag;p.y=target.y+dy*MAX_LAG/lag;}
   const speed=Math.hypot(p.x-ox,p.y-oy)/dt,raw=Math.hypot(vx,vy),turn=angleDelta(p.heading,target.heading);
   const ease=1-Math.exp(-dt/.10);
   p.heading+=turn*(1-Math.exp(-dt/.085));
   // Small thrust/braking pitch and banking, never a change to collision geometry.
   p.pitch+= (Math.max(-.055,Math.min(.055,(raw-speed)/270*.065))-p.pitch)*ease;
   p.bank+= (Math.max(-.085,Math.min(.085,turn*.16))-p.bank)*ease;
   p.speed=speed;p.tx=target.x;p.ty=target.y;p.time=time;
  }
  return {x:p.x,y:p.y,heading:p.heading,speed:p.speed,pitch:p.pitch,bank:p.bank};
 }
 retain(live){for(const id of this.poses.keys())if(!live.has(id))this.poses.delete(id);}
 clear(){this.poses.clear();}
}

// Persistent command insignia, independent of labels and weapon-range overlays.
// Shared geometry/materials are disposed once; each command ship gets its own group.
export class CommandMarkers {
 constructor(scene){
  this.root=new T.Group();scene.add(this.root);this.items=new Map();
  this.arc=new T.RingGeometry(76,79,20,1,.12,Math.PI/2-.24);
  this.inner=new T.RingGeometry(70,71.5,64);
  this.tick=new T.PlaneGeometry(12,4);
  const make=(color,opacity)=>new T.MeshBasicMaterial({color,opacity,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
  this.normal=make(0x80e9ff,.78);this.selected=make(0xd1fbff,1);this.detail=make(0x55b6d4,.42);
 }
 update(items,selected,zoom){
  const live=new Set();
  for(const {id,e,pose} of items){
   if(e.kind!=='frigate'||e.faction!=='friendly'||e.hull<=0)continue;
   live.add(id);let g=this.items.get(id);
   if(!g){
    g=new T.Group();g.userData.entityId=id;
    const inner=new T.Mesh(this.inner,this.detail);inner.rotation.x=-Math.PI/2;g.add(inner);
    for(let j=0;j<4;j++){
     const a=j*Math.PI/2,arc=new T.Mesh(this.arc,this.normal);arc.rotation.set(-Math.PI/2,0,a,'XYZ');g.add(arc);
     const tick=new T.Mesh(this.tick,this.normal);tick.rotation.set(-Math.PI/2,0,a,'XYZ');tick.position.set(83*Math.cos(a),0,-83*Math.sin(a));g.add(tick);
    }
    this.root.add(g);this.items.set(id,g);
   }
   g.position.set(pose.x,.35,pose.y);
   g.scale.setScalar(Math.max(1,Math.min(1.65,.52/Math.max(.01,zoom))));
   for(let j=1;j<g.children.length;j++)g.children[j].material=id===selected?this.selected:this.normal;
  }
  for(const [id,g] of this.items)if(!live.has(id)){this.root.remove(g);this.items.delete(id);}
  this.root.updateMatrixWorld(true);
 }
 clear(){this.root.clear();this.items.clear();}
 dispose(){this.clear();this.root.removeFromParent();for(const a of [this.arc,this.inner,this.tick,this.normal,this.selected,this.detail])a.dispose();}
}

export class BattlefieldRenderer {
 constructor(canvas,camera,registry=new ModelRegistry()){
 this.canvas=canvas;this.camera=camera;this.registry=registry;this.quality='high';this.ratio=1;this.labels=true;this.debug=false;this.visibleItems=[];this.objects=new Map();this.motion=new PresentationMotion();this.visualTime=0;this.ranges=false;this.healthBars=true;
 this.gl=new T.WebGLRenderer({canvas,antialias:true,alpha:false});this.gl.setClearColor(0x010103);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.35;
 this.scene=new T.Scene();this.commandMarkers=new CommandMarkers(this.scene);this.effects=new CombatEffects(this.scene);this.rangeRing=new T.Mesh(new T.RingGeometry(.992,1,100),new T.MeshBasicMaterial({color:0x70d9e9,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide}));this.rangeRing.rotation.x=-Math.PI/2;this.rangeRing.visible=false;this.scene.add(this.rangeRing);this.view=new T.OrthographicCamera(-1,1,1,-1,.1,6000);this.scene.add(new T.HemisphereLight(0xb6d8ee,0x30343d,1.7));const sun=new T.DirectionalLight(0xfff1de,4.0);sun.position.set(-400,800,-550);this.scene.add(sun);const fill=new T.DirectionalLight(0x77aaff,1.2);fill.position.set(500,120,500);this.scene.add(fill);
 const rng=seededRandom(CONFIG.visuals.backgroundSeed),pos=[],col=[];for(let i=0;i<4500;i++){pos.push((rng()-.5)*6500+900,-180-rng()*400,(rng()-.5)*6500+900);const v=.18+rng()*.65;col.push(v*.85,v*.92,v);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));this.stars=new T.Points(geo,new T.PointsMaterial({size:1.25,sizeAttenuation:false,vertexColors:true,depthWrite:false,toneMapped:false}));this.scene.add(this.stars);
 this.grid=new T.GridHelper(1800,18,0x294452,0x172931);this.grid.position.set(900,-1,900);this.grid.visible=false;this.scene.add(this.grid);
 this.overlay=document.createElement('div');this.overlay.className='world-overlays';this.overlay.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';canvas.insertAdjacentElement('afterend',this.overlay);
 this.ray=new T.Raycaster();this.ndc=new T.Vector2();
 }
 resize(w,h,dpr=1,quality=this.quality){this.quality=quality;this.camera.resize(w,h);this.ratio=Math.max(1,Math.min(dpr||1,CONFIG.visuals.qualityDpr[quality]??2));this.gl.setPixelRatio(this.ratio);this.gl.setSize(this.camera.width,this.camera.height,false);this.syncCamera();}
 syncCamera(){const c=this.camera,v=this.view,a=CONFIG.camera.elevation*Math.PI/180;v.left=-c.width/(2*c.zoom);v.right=-v.left;v.top=c.height/(2*c.zoom);v.bottom=-v.top;v.position.set(c.x,2000*Math.sin(a),c.y+2000*Math.cos(a));v.up.set(0,1,0);v.lookAt(c.x,0,c.y);v.updateProjectionMatrix();v.updateMatrixWorld(true);}
 pick(x,y){this.syncCamera();this.ndc.set(2*x/this.camera.width-1,1-2*y/this.camera.height);this.ray.setFromCamera(this.ndc,this.view);const hits=this.ray.intersectObjects([...this.objects.values()].filter(o=>o.visible),true);for(const hit of hits){let obj=hit.object;while(obj&&!obj.userData.entityId)obj=obj.parent;if(obj?.userData.entityId)return obj.userData.entityId;}const markers=this.ray.intersectObjects([...this.commandMarkers.items.values()],true);for(const hit of markers){let obj=hit.object;while(obj&&!obj.userData.entityId)obj=obj.parent;if(obj?.userData.entityId)return obj.userData.entityId;}let best=null,d=Infinity;for(const i of this.visibleItems){const r=Math.hypot(i.screen.x-x,i.screen.y-y);if(r<14&&r<d){best=i.id;d=r;}}return best;}
 draw(state,alpha,selected=null){
 this.syncCamera();this.grid.visible=this.debug;const live=new Set(),effectItems=[],visualTime=this.visualTime=Math.max(this.visualTime,state.time-(1-alpha)/CONFIG.clock.hz);this.visibleItems=[];for(const e of state.entities){live.add(e.id);let o=this.objects.get(e.id);if(!o||o.userData.kind!==e.kind||o.userData.faction!==e.faction){if(o)this.scene.remove(o);o=this.registry.get(e.kind,e.faction);o.userData={entityId:e.id,kind:e.kind,faction:e.faction};this.objects.set(e.id,o);this.scene.add(o);}const p=this.motion.sample(e,poseAt(e,alpha),visualTime);o.position.set(p.x,0,p.y);o.rotation.set(p.bank,-p.heading,p.pitch,'YXZ');const screen=this.camera.worldToScreen(p.x,p.y);o.visible=this.camera.visible(p.x,p.y,150*this.camera.zoom);const item={id:e.id,e,pose:p,screen};effectItems.push(item);if(o.visible)this.visibleItems.push(item);}
 for(const [id,o] of this.objects)if(!live.has(id)){this.scene.remove(o);this.objects.delete(id);}
 this.motion.retain(live);this.commandMarkers.update(effectItems,selected,this.camera.zoom);
 const chosen=state.entities.find(e=>e.id===selected),range=chosen?COMBAT.classes[chosen.kind].range:0;this.rangeRing.visible=this.ranges&&range>0;if(this.rangeRing.visible){const p=poseAt(chosen,alpha);this.rangeRing.position.set(p.x,.1,p.y);this.rangeRing.scale.set(range,range,1);this.rangeRing.material.color.setHex(chosen.faction==='friendly'?0x70d9e9:0xf4779d);}
 this.effects.update(visualTime,effectItems,this.quality);
 this.gl.render(this.scene,this.view);
 const visible=new Set();
 for(const i of this.visibleItems){
  const chosen=i.id===selected,showLabel=chosen||(this.labels&&this.camera.zoom>=.55),showHealth=this.healthBars&&(chosen||(state.sandbox&&this.camera.zoom>=.35));
  if(!showLabel&&!showHealth)continue;visible.add(String(i.id));
  let el=this.overlay.querySelector('[data-id="'+i.id+'"]');
  if(!el){el=document.createElement('div');el.dataset.id=i.id;el.className='ship-overlay';const bars=document.createElement('div');bars.className='ship-bars';for(const cls of ['shield','hull']){const track=document.createElement('div');track.className='ship-bar '+cls;track.append(document.createElement('i'));bars.append(track);}const label=document.createElement('div');label.className='ship-label';el.append(bars,label);this.overlay.append(el);}
  const [bars,label]=el.children;bars.hidden=!showHealth;label.hidden=!showLabel;label.textContent=i.e.label;label.style.color=i.e.faction==='friendly'?'#8bd8ec':'#f49ab0';
  bars.children[0].firstElementChild.style.width=100*Math.max(0,i.e.shield/i.e.maxShield)+'%';bars.children[1].firstElementChild.style.width=100*Math.max(0,i.e.hull/i.e.maxHull)+'%';
  el.style.left=i.screen.x+'px';el.style.top=(i.screen.y+(i.e.kind==='frigate'?57:25)*this.camera.zoom)+'px';el.classList.toggle('selected',chosen);el.classList.toggle('enemy',i.e.faction==='hostile');
 }
 for(const el of [...this.overlay.children])if(!visible.has(el.dataset.id))el.remove();
 }
 addEvents(events,time){this.effects.addEvents(events,time);}
 reset(){this.commandMarkers.clear();this.visualTime=0;this.motion.clear();this.effects.reset();this.rangeRing.visible=false;for(const o of this.objects.values())this.scene.remove(o);this.objects.clear();this.registry.clear();this.overlay.replaceChildren();}
 dispose(){this.reset();this.commandMarkers.dispose();this.effects.dispose();this.rangeRing.geometry.dispose();this.rangeRing.material.dispose();this.stars.geometry.dispose();this.stars.material.dispose();this.grid.geometry.dispose();this.grid.material.dispose();this.gl.dispose();this.overlay.remove();}
}
