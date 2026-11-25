import * as T from '../../vendor/three.module.js';
import {CONFIG,COMBAT} from '../config.js';
import {seededRandom} from '../core/math.js';
import {poseAt} from '../core/state.js';
import {ModelRegistry} from './models.js';
import {CombatEffects} from './effects.js';
export class BattlefieldRenderer {
 constructor(canvas,camera,registry=new ModelRegistry()){
 this.canvas=canvas;this.camera=camera;this.registry=registry;this.quality='high';this.ratio=1;this.labels=true;this.debug=false;this.visibleItems=[];this.objects=new Map();this.ranges=false;this.healthBars=true;
 this.gl=new T.WebGLRenderer({canvas,antialias:true,alpha:false});this.gl.setClearColor(0x010103);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.35;
 this.scene=new T.Scene();this.effects=new CombatEffects(this.scene);this.rangeRing=new T.Mesh(new T.RingGeometry(.992,1,100),new T.MeshBasicMaterial({color:0x70d9e9,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide}));this.rangeRing.rotation.x=-Math.PI/2;this.rangeRing.visible=false;this.scene.add(this.rangeRing);this.view=new T.OrthographicCamera(-1,1,1,-1,.1,6000);this.scene.add(new T.HemisphereLight(0xb6d8ee,0x30343d,1.7));const sun=new T.DirectionalLight(0xfff1de,4.0);sun.position.set(-400,800,-550);this.scene.add(sun);const fill=new T.DirectionalLight(0x77aaff,1.2);fill.position.set(500,120,500);this.scene.add(fill);
 const rng=seededRandom(CONFIG.visuals.backgroundSeed),pos=[],col=[];for(let i=0;i<4500;i++){pos.push((rng()-.5)*6500+900,-180-rng()*400,(rng()-.5)*6500+900);const v=.18+rng()*.65;col.push(v*.85,v*.92,v);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));this.stars=new T.Points(geo,new T.PointsMaterial({size:1.25,sizeAttenuation:false,vertexColors:true,depthWrite:false,toneMapped:false}));this.scene.add(this.stars);
 this.grid=new T.GridHelper(1800,18,0x294452,0x172931);this.grid.position.set(900,-1,900);this.grid.visible=false;this.scene.add(this.grid);
 this.overlay=document.createElement('div');this.overlay.className='world-overlays';this.overlay.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';canvas.insertAdjacentElement('afterend',this.overlay);
 this.ray=new T.Raycaster();this.ndc=new T.Vector2();
 }
 resize(w,h,dpr=1,quality=this.quality){this.quality=quality;this.camera.resize(w,h);this.ratio=Math.max(1,Math.min(dpr||1,CONFIG.visuals.qualityDpr[quality]??2));this.gl.setPixelRatio(this.ratio);this.gl.setSize(this.camera.width,this.camera.height,false);this.syncCamera();}
 syncCamera(){const c=this.camera,v=this.view,a=CONFIG.camera.elevation*Math.PI/180;v.left=-c.width/(2*c.zoom);v.right=-v.left;v.top=c.height/(2*c.zoom);v.bottom=-v.top;v.position.set(c.x,2000*Math.sin(a),c.y+2000*Math.cos(a));v.up.set(0,1,0);v.lookAt(c.x,0,c.y);v.updateProjectionMatrix();v.updateMatrixWorld(true);}
 pick(x,y){this.syncCamera();this.ndc.set(2*x/this.camera.width-1,1-2*y/this.camera.height);this.ray.setFromCamera(this.ndc,this.view);const hits=this.ray.intersectObjects([...this.objects.values()].filter(o=>o.visible),true);for(const hit of hits){let obj=hit.object;while(obj&&!obj.userData.entityId)obj=obj.parent;if(obj?.userData.entityId)return obj.userData.entityId;}let best=null,d=Infinity;for(const i of this.visibleItems){const r=Math.hypot(i.screen.x-x,i.screen.y-y);if(r<14&&r<d){best=i.id;d=r;}}return best;}
 draw(state,alpha,selected=null){
 this.syncCamera();this.grid.visible=this.debug;const live=new Set();this.visibleItems=[];for(const e of state.entities){live.add(e.id);let o=this.objects.get(e.id);if(!o||o.userData.kind!==e.kind||o.userData.faction!==e.faction){if(o)this.scene.remove(o);o=this.registry.get(e.kind,e.faction);o.userData={entityId:e.id,kind:e.kind,faction:e.faction};this.objects.set(e.id,o);this.scene.add(o);}const p=poseAt(e,alpha);o.position.set(p.x,0,p.y);o.rotation.y=-p.heading;const screen=this.camera.worldToScreen(p.x,p.y);o.visible=this.camera.visible(p.x,p.y,150*this.camera.zoom);if(o.visible)this.visibleItems.push({id:e.id,e,pose:p,screen});}
 for(const [id,o] of this.objects)if(!live.has(id)){this.scene.remove(o);this.objects.delete(id);}
 const chosen=state.entities.find(e=>e.id===selected),range=chosen?COMBAT.classes[chosen.kind].range:0;this.rangeRing.visible=this.ranges&&range>0;if(this.rangeRing.visible){const p=poseAt(chosen,alpha);this.rangeRing.position.set(p.x,.1,p.y);this.rangeRing.scale.set(range,range,1);this.rangeRing.material.color.setHex(chosen.faction==='friendly'?0x70d9e9:0xf4779d);}
 this.effects.update(Math.max(0,state.time-(1-alpha)/CONFIG.clock.hz),this.visibleItems,this.quality);
 this.gl.render(this.scene,this.view);
 const visible=new Set();
 for(const i of this.visibleItems){
  const chosen=i.id===selected,showLabel=chosen||(this.labels&&this.camera.zoom>=.55),showHealth=this.healthBars&&(chosen||(state.sandbox&&this.camera.zoom>=.35));
  if(!showLabel&&!showHealth)continue;visible.add(String(i.id));
  let el=this.overlay.querySelector('[data-id="'+i.id+'"]');
  if(!el){el=document.createElement('div');el.dataset.id=i.id;el.className='ship-overlay';const bars=document.createElement('div');bars.className='ship-bars';for(const cls of ['shield','hull']){const track=document.createElement('div');track.className='ship-bar '+cls;track.append(document.createElement('i'));bars.append(track);}const label=document.createElement('div');label.className='ship-label';el.append(bars,label);this.overlay.append(el);}
  const [bars,label]=el.children;bars.hidden=!showHealth;label.hidden=!showLabel;label.textContent=i.e.label;label.style.color=i.e.faction==='friendly'?'#8bd8ec':'#f49ab0';
  bars.children[0].firstElementChild.style.width=100*Math.max(0,i.e.shield/i.e.maxShield)+'%';bars.children[1].firstElementChild.style.width=100*Math.max(0,i.e.hull/i.e.maxHull)+'%';
  el.style.left=i.screen.x+'px';el.style.top=(i.screen.y+25*this.camera.zoom)+'px';el.classList.toggle('selected',chosen);el.classList.toggle('enemy',i.e.faction==='hostile');
 }
 for(const el of [...this.overlay.children])if(!visible.has(el.dataset.id))el.remove();
 }
 addEvents(events,time){this.effects.addEvents(events,time);}
 reset(){this.effects.reset();this.rangeRing.visible=false;for(const o of this.objects.values())this.scene.remove(o);this.objects.clear();this.registry.clear();this.overlay.replaceChildren();}
 dispose(){this.reset();this.effects.dispose();this.rangeRing.geometry.dispose();this.rangeRing.material.dispose();this.stars.geometry.dispose();this.stars.material.dispose();this.grid.geometry.dispose();this.grid.material.dispose();this.gl.dispose();this.overlay.remove();}
}
