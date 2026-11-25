import * as T from '../vendor/three.module.js';
import {CONFIG,COMBAT} from '../src/config.js';
import {createState,makeBattle,makeDemo,spawn,destroy,drainEvents,step,poseAt,applyCommand,canPosition} from '../src/core/state.js';
import {FixedClock} from '../src/core/clock.js';
import {seededRandom} from '../src/core/math.js';
import {Camera,canvasSize,resizeCanvas,depthSort,headingFrame} from '../src/rendering/projection.js';
import {SpriteRegistry} from '../src/rendering/sprites.js';
import {BattlefieldRenderer,PresentationMotion,CommandMarkers} from '../src/rendering/renderer.js';
import {ModelRegistry} from '../src/rendering/models.js';
import {CombatEffects} from '../src/rendering/effects.js';
export function assert(ok,message='Assertion failed'){if(!ok)throw Error(message);}
const near=(a,b,epsilon=1e-7)=>assert(Math.abs(a-b)<epsilon,`${a} differs from ${b}`);
const eq=(a,b)=>assert(JSON.stringify(a)===JSON.stringify(b),`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
import {multiplier,nearest,damage,regenerate,separationDistance} from '../src/core/combat.js';
export const coreTests=[
  ['Projection: world/screen round-trip across pans, zooms and resize',()=>{
    const c=new Camera();const rand=seededRandom('projection-fixtures');
    for(const [w,h] of [[1440,900],[390,844],[844,390],[2560,1440]]){c.resize(w,h);for(let i=0;i<200;i++){c.focus(rand()*1800,rand()*1800);c.zoom=CONFIG.camera.minZoom+rand()*(CONFIG.camera.maxZoom-CONFIG.camera.minZoom);const x=rand()*1800,y=rand()*1800,p=c.worldToScreen(x,y),q=c.screenToWorld(p.x,p.y);near(q.x,x);near(q.y,y);}}
  }],
  ['Projection: exact vertical compression and pan displacement',()=>{const c=new Camera(1000,700);c.zoom=1.5;let p=c.worldToScreen(c.x+100,c.y+100);near(p.x,650);near(p.y,350+100*1.5*CONFIG.camera.compression);c.panPixels(120,-50);p=c.worldToScreen(900,900);near(p.x,620);near(p.y,300);}],
  ['Projection: cursor-anchored zoom and bounds',()=>{const c=new Camera(1000,800);let w=c.screenToWorld(280,520);c.zoomAt(1.4,280,520);const w2=c.screenToWorld(280,520);near(w.x,w2.x);near(w.y,w2.y);c.zoomAt(1e6);near(c.zoom,CONFIG.camera.maxZoom);c.zoomAt(1e-6);near(c.zoom,CONFIG.camera.minZoom);c.panPixels(1e8,-1e8);near(c.x,0);near(c.y,1800);}],
  ['Projection: fit bounds, preserve center on resize',()=>{const c=new Camera(900,560);c.fit({minX:200,minY:300,maxX:1400,maxY:1300});near(c.x,800);near(c.y,800);const p=c.worldToScreen(200,300),q=c.worldToScreen(1400,1300);assert(p.x>=0&&p.y>=0&&q.x<=900&&q.y<=560);c.resize(560,900);const center=c.worldToScreen(800,800);near(center.x,280);near(center.y,450);}],
  ['Depth: projected depth sort and deterministic ID ties',()=>{const original=[{id:5,screen:{y:10}},{id:3,screen:{y:10}},{id:2,screen:{y:-5}},{id:1,screen:{y:20}}];eq(depthSort(original).map(e=>e.id),[2,3,5,1]);eq(original.map(e=>e.id),[5,3,2,1]);}],
  ['DPR: backing dimensions and quality cap, no CSS-coordinate changes',()=>{eq(canvasSize(801,450,2),{width:1602,height:900,ratio:2});eq(canvasSize(801,450,3,1.5),{width:1202,height:675,ratio:1.5});eq(canvasSize(0,0,0),{width:1,height:1,ratio:1});let mock={width:0,height:0};resizeCanvas(mock,640,360,1.25);eq(mock,{width:800,height:450});const c=new Camera(640,360);const p=c.worldToScreen(600,650);resizeCanvas(mock,640,360,2);eq(c.worldToScreen(600,650),p);}],
  ['Lifecycle: stable IDs, plain records, single destruction event',()=>{const s=createState();const d={kind:'carrier',faction:'friendly',x:10,y:15};const a=spawn(s,d),b=spawn(s,d);eq([a.id,b.id],[1,2]);assert(destroy(s,1));assert(!destroy(s,1));const c=spawn(s,d);eq(c.id,3);eq(s.entities.map(e=>e.id),[2,3]);eq(drainEvents(s).map(e=>[e.type,e.id]),[['spawned',1],['spawned',2],['destroyed',1],['spawned',3]]);eq(drainEvents(s),[]);assert(JSON.stringify(s).includes('entities'));}],
  ['Lifecycle: validate commands, world bounds, pause rejects mutations',()=>{const s=createState();const good={type:'spawn',data:{kind:'frigate',faction:'friendly',x:-50,y:1900}};assert(!applyCommand(s,good,true).ok);eq(s.entities.length,0);assert(!applyCommand(s,{type:'spawn',data:{...good.data,kind:'bogus'}}).ok);assert(!applyCommand(s,{type:'spawn',data:{...good.data,kind:'constructor',faction:'hostile'}}).ok);assert(!applyCommand(s,{type:'spawn',data:{...good.data,x:NaN}}).ok);const result=applyCommand(s,good);assert(result.ok);eq([s.entities[0].x,s.entities[0].y],[0,1800]);assert(!applyCommand(s,{type:'destroy',id:result.id},true).ok);assert(applyCommand(s,{type:'destroy',id:result.id}).ok);}],
  ['Clock: fixed 20 Hz and all simulation speeds',()=>{let dtSum=0;for(const speed of [.5,1,2]){let n=0;const c=new FixedClock(dt=>{near(dt,.05);n++;dtSum+=dt;});assert(c.setSpeed(speed));for(let i=0;i<120;i++)c.advance(1/60);eq(n,40*speed);}assert(dtSum>0);const c=new FixedClock(()=>{});assert(!c.setSpeed(3));eq(c.speed,1);}],
  ['Clock: pause clears partial time and hidden-tab gap cannot catch up',()=>{let n=0;const c=new FixedClock(()=>n++);c.frame(100);c.frame(130);eq(n,0);c.setPaused(true);c.frame(100000);eq(n,0);c.setPaused(false);c.frame(200000);eq(n,0);c.frame(200049);eq(n,0);c.frame(200050);eq(n,1);c.setPaused(true);assert(c.singleStep());eq(n,2);c.setPaused(false);assert(!c.singleStep());}],
  ['Clock: bounded catch-up and explicit dropped-time metric',()=>{let n=0;const c=new FixedClock(()=>n++);c.setSpeed(2);const r=c.advance(50);eq(n,10);eq(r.steps,10);assert(c.droppedSeconds>99);assert(r.alpha>=0&&r.alpha<=1);}],
  ['Simulation: identical state after 10 seconds at 30, 60 and 144 FPS',()=>{const results=[];for(const fps of [30,60,144]){const s=makeDemo(),c=new FixedClock(dt=>step(s,dt));for(let i=0;i<fps*10;i++)c.advance(1/fps);eq(s.tick,200);near(s.time,10);results.push(s);}eq(results[0],results[1]);eq(results[0],results[2]);}],
  ['Simulation: interpolation is read-only and angle wraps shortest way',()=>{const s=makeDemo(),e=s.entities.at(-1);step(s);const snapshot=JSON.stringify(s);const p=poseAt(e,.5);near(p.x,(e.x+e.prevX)/2);near(p.y,(e.y+e.prevY)/2);const a=poseAt({x:0,y:0,prevX:0,prevY:0,prevHeading:Math.PI-.1,heading:-Math.PI+.1},.5);near(a.heading,Math.PI);eq(JSON.stringify(s),snapshot);}],
  ['Reset: clean demo state and deterministic IDs',()=>{const a=makeDemo();step(a);destroy(a,1);spawn(a,{kind:'carrier',faction:'friendly',x:100,y:100});const b=makeDemo();eq(b,makeDemo());eq(b.tick,0);eq(b.entities.length,11);eq(b.entities[0].id,1);eq(b.events,[]);}]
];
coreTests.push(
 ['Combat: all ordered counter and neutral multipliers',()=>{const kinds=['carrier','missile','destroyer','frigate'];const expected=[[1,2,.75,1],[.75,1,2,1],[2,.75,1,1],[1,1,1,1]];for(let i=0;i<4;i++)for(let j=0;j<4;j++)eq(multiplier(kinds[i],kinds[j]),expected[i][j]);}],
 ['Combat: shield overflow, no friendly fire, one destruction',()=>{const s=makeBattle('carrier',true),[a,b]=s.entities;damage(s,a,b,b.shield+10);near(b.shield,0);near(b.hull,b.maxHull-10);eq(damage(s,a,a,100),0);damage(s,a,b,1000);step(s);eq(s.entities.length,1);eq(s.events.filter(e=>e.type==='destroyed').length,1);}],
 ['Target: nearest eligible, stable ties, detection and immunity',()=>{const s=createState(),a=spawn(s,{kind:'carrier',faction:'friendly',x:500,y:500}),b=spawn(s,{kind:'missile',faction:'hostile',x:550,y:500}),c=spawn(s,{kind:'destroyer',faction:'hostile',x:450,y:500});eq(nearest(a,s.entities,160).id,b.id);b.invulnerable=true;eq(nearest(a,s.entities,160).id,c.id);eq(nearest(a,s.entities,40),null);c.x=1400;eq(nearest(a,s.entities),null);}],
 ['Regeneration: delay, costs, enemy shields only and common factor',()=>{const s=makeBattle('carrier',true),[a,b]=s.entities;a.shield=b.shield=0;a.hull-=20;b.hull-=20;a.lastDamage=b.lastDamage=0;s.time=3.9;regenerate(s,1);eq(a.shield,0);s.time=4;s.energy=1;regenerate(s,1);assert(a.shield>0&&a.shield<a.maxShield*.08);near(s.energy,0);near(b.shield,b.maxShield*.08);near(b.hull,b.maxHull-20);assert(s.energyFactor<1);}],
 ['Combat: equal-cost counter duels starting in and out of range',()=>{for(const preset of ['carrier','missile','destroyer'])for(const close of [true,false]){const s=makeBattle(preset,close);applyCommand(s,{type:'engage'});for(let i=0;i<2400&&s.engaged;i++){step(s);drainEvents(s);}assert(s.outcome==='Friendly victory',preset+' close='+close+': '+s.outcome);}}],
 ['Combat: range and common movement speed; approach costs no energy',()=>{const s=makeBattle('carrier');applyCommand(s,{type:'engage'});let x=s.entities[0].x;step(s);near(s.entities[0].x-x,COMBAT.speed/20);eq(s.energy,COMBAT.sandboxEnergy);eq(s.events.filter(e=>e.type==='hit').length,0);}],
 ['Combat: no firing energy cost and counters win with reversed factions',()=>{for(const preset of ['carrier','missile','destroyer'])for(const close of [true,false]){const s=makeBattle(preset,close);for(const e of s.entities)e.faction=e.faction==='friendly'?'hostile':'friendly';applyCommand(s,{type:'engage'});if(close){step(s);assert(s.events.some(e=>e.type==='hit'));eq(s.energy,COMBAT.sandboxEnergy);}for(let i=0;i<2400&&s.engaged;i++){step(s);drainEvents(s);}eq(s.outcome,'Hostile victory');}}],
 ['Combat: reproducible fleet battle at different render rates',()=>{const results=[];for(const fps of [30,60,144]){const s=makeBattle();applyCommand(s,{type:'engage'});const c=new FixedClock(dt=>{step(s,dt);drainEvents(s);});for(let i=0;i<fps*15;i++)c.advance(1/fps);results.push(s);}eq(results[0],results[1]);eq(results[0],results[2]);}],
 ['Sandbox: positioning, pause and invalid commands',()=>{const s=makeBattle('empty');assert(!applyCommand(s,{type:'engage'}).ok);const a=spawn(s,{kind:'carrier',faction:'friendly',x:500,y:500});assert(!applyCommand(s,{type:'position',id:a.id,x:600,y:500},true).ok);assert(applyCommand(s,{type:'position',id:a.id,x:600,y:500}).ok);for(let i=0;i<40;i++)step(s);near(a.x,600);eq(a.destination,null);}]
);

 // CPU-only mesh checks: real Three.js raycasts ignore material color and labels.
 coreTests.push(
 ['3D roles: physical proportions and role-defining negative space',()=>{
  const r=new ModelRegistry();
  try{
   const models=Object.fromEntries(['missile','frigate','miner','constructor'].map(k=>[k,r.get(k,'friendly')]));
   const hostile=r.get('missile','hostile'),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
   for(const g of [...Object.values(models),hostile])g.updateMatrixWorld(true);
   const hit=(g,x,z)=>{ray.set(new T.Vector3(x*g.scale.x,100,z*g.scale.z),down);return ray.intersectObject(g,true).length>0;};
   const size=g=>new T.Box3().setFromObject(g).getSize(new T.Vector3());
   for(const g of [models.missile,hostile]){
    assert(hit(g,20,0)&&hit(g,20,24)&&hit(g,20,-24),'cruiser keel and two launcher banks');
    assert(!hit(g,20,13)&&!hit(g,20,-13),'cruiser open magazine channels');
   }
   const f=models.frigate,m=models.miner,c=models.constructor;
   assert(hit(f,48,0)&&!hit(f,48,12)&&hit(f,-25,26),'frigate spear and aft communications outriggers');
   assert(size(f).y>size(models.missile).y*1.5,'frigate elevated command bridge');
   assert(size(m).x/size(m).z<1.25&&hit(m,25,0)&&hit(m,25,21),'miner compact solid industrial body');
   assert(!hit(c,38,0)&&hit(c,38,20)&&hit(c,38,-20),'constructor open fabrication fork');
   for(const [kind,g] of Object.entries(models)){const s=size(g);if(kind==='frigate'){assert(s.x>115&&s.x<140&&s.z>50&&s.z<90,'command ship roughly twice the length');}else assert(s.x>35&&s.x<70&&s.z>25&&s.z<45,'model remains at reviewed battlefield scale');}
  }finally{r.clear();}
 }],
 ['3D roles: projected silhouettes differ at five headings without color or labels',()=>{
  const r=new ModelRegistry();
  try{
   const kinds=['missile','frigate','miner','constructor'],models=kinds.map(k=>r.get(k,'friendly'));
   const camera=new T.OrthographicCamera(-38,38,38,-38,.1,500);
   const a=CONFIG.camera.elevation*Math.PI/180;
   camera.position.set(0,100*Math.sin(a),100*Math.cos(a));camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
   const ray=new T.Raycaster(),p=new T.Vector2();
   for(const heading of [0,Math.PI/4,Math.PI/2,3*Math.PI/4,Math.PI]){
    const masks=models.map(g=>{
     g.rotation.y=heading;g.updateMatrixWorld(true);
     const mask=[];
     for(let iy=-12;iy<=12;iy++)for(let ix=-12;ix<=12;ix++){
      ray.setFromCamera(p.set(ix*.08,iy*.08),camera);mask.push(ray.intersectObject(g,true).length>0);
     }
     return mask;
    });
    for(let i=0;i<masks.length;i++)for(let j=i+1;j<masks.length;j++){
     let intersection=0,union=0;
     for(let k=0;k<masks[i].length;k++){intersection+=Number(masks[i][k]&&masks[j][k]);union+=Number(masks[i][k]||masks[j][k]);}
     assert(union>0&&intersection/union<.80,kinds[i]+' / '+kinds[j]+' at heading '+heading+': projected overlap '+intersection/union);
    }
   }
  }finally{r.clear();}
 }]
 );

coreTests.push(['Combat: naval range tuning and stand-off distances',()=>{
 const c=COMBAT.classes;eq(COMBAT.speed,270);eq([c.carrier.range,c.missile.range,c.destroyer.range,c.frigate.range],[480,660,330,390]);assert(c.missile.range>c.carrier.range&&c.carrier.range>c.destroyer.range);
 for(const kind of ['carrier','missile','destroyer','frigate'])assert(c[kind].sensor>=c[kind].range);
 const s=makeBattle('missile');const [a,b]=s.entities;assert(b.x-a.x>c.missile.range);applyCommand(s,{type:'engage'});
 let first=null;for(let i=0;i<100&&!first;i++){step(s);first=drainEvents(s).find(e=>e.type==='hit');}
 assert(first&&first.kind==='missile');const d=Math.hypot(first.x-first.sx,first.y-first.sy);assert(d>c.destroyer.range&&d<=c.missile.range);
}]);
coreTests.push(
 ['3D effects: weapon families, shield impacts, destruction, trails and bounded lifetime',()=>{
  const scene=new T.Scene(),fx=new CombatEffects(scene);
  const events=['carrier','missile','destroyer','frigate'].map((kind,i)=>({type:'hit',id:i+2,source:1,kind,faction:i%2?'hostile':'friendly',x:400+i*10,y:300,sx:0,sy:300,shield:10,hull:0}));
  events.push({type:'destroyed',kind:'carrier',faction:'hostile',id:10,x:300,y:300});
  const item={id:1,e:{kind:'carrier',faction:'friendly',x:20,y:10,prevX:0,prevY:10},pose:{x:20,y:10,heading:0}};
  const snapshot=JSON.stringify([events,item]);
  try{
   fx.addEvents(events,0);eq(fx.events.length,5);
   for(const t of [0,.15,.4,.7,1]){fx.update(t,[item]);fx.root.traverse(o=>assert([...o.position.toArray(),...o.scale.toArray(),...o.quaternion.toArray()].every(Number.isFinite)));eq(fx.trails.size,1);}
   fx.update(2,[]);eq(fx.events.length,0);eq(fx.trails.size,0);
   fx.addEvents(Array.from({length:180},()=>events[0]),3);eq(fx.events.length,160);fx.reset();eq(fx.root.children.length,0);eq(JSON.stringify([events,item]),snapshot);
  }finally{fx.dispose();}eq(fx.materials.size,0);eq(scene.children.length,0);
 }],
 ['Combat: mixed fleet actual 3D effects do not alter outcomes at any quality',()=>{
  const results=[];const kinds=new Set();
  for(const quality of ['low','medium','high']){
   const s=makeBattle(),fx=new CombatEffects(new T.Scene());applyCommand(s,{type:'engage'});
   try{for(let i=0;i<600;i++){
    step(s);const ev=drainEvents(s);for(const e of ev)if(e.type==='hit')kinds.add(e.kind);
    fx.addEvents(ev,s.time);fx.update(s.time,s.entities.map(e=>({id:e.id,e,pose:poseAt(e,1)})),quality);
   }results.push(s);}finally{fx.dispose();}
  }eq(results[0],results[1]);eq(results[0],results[2]);assert(results[0].outcome!==null);for(const k of ['carrier','missile','destroyer','frigate'])assert(kinds.has(k),'Missing '+k);
 }]
);
coreTests.push(['3D fighters: persistent escort, travel, targeted strikes, pause, return and cleanup',()=>{
 const s=makeBattle('carrier'),[carrier,enemy]=s.entities,fx=new CombatEffects(new T.Scene());
 carrier.x=carrier.prevX=100;carrier.y=carrier.prevY=100;enemy.x=enemy.prevX=580;enemy.y=enemy.prevY=100;
 const items=()=>s.entities.map(e=>({id:e.id,e,pose:poseAt(e,1)}));
 try{
  fx.update(0,items(),'low');const squad=fx.squadrons.get(carrier.id),craft=squad.fighters.map(f=>f.craft);
  eq(craft.length,6);eq(fx.squadrons.size,1);assert(craft.every(f=>f.position.distanceTo(new T.Vector3(100,0,100))<65));
  // Move parent while idle; the persistent escort follows.
  carrier.x=carrier.prevX=150;fx.update(.05,items());assert(squad.center.x>100&&squad.center.x<150);
  for(let i=2;i<=30;i++)fx.update(i*.05,items());near(squad.center.x,150,.1);
  carrier.target=enemy.id;const before=JSON.stringify(s);fx.update(1.55,items());assert(squad.center.x>150&&squad.center.x<170);
  assert(squad.velocity.length()>0&&squad.velocity.length()<420);
  let shots=0;
  for(let i=32;i<=130;i++){fx.update(i*.05,items(),'high');shots+=squad.fighters.filter(f=>f.bolt.visible).length;}
  near(squad.center.x,580,.1);assert(shots>0);assert(squad.fighters.every(f=>f.craft.position.distanceTo(new T.Vector3(580,0,100))<90));
  eq(JSON.stringify(s),before);assert(squad.fighters.every((f,i)=>f.craft===craft[i]));
  const frozen=craft.map(f=>f.position.toArray());fx.update(6.5,items(),'low');eq(craft.map(f=>f.position.toArray()),frozen);
  // A destroyed target must not leave attacking fighters or bolts behind.
  destroy(s,enemy.id);for(let i=131;i<=200;i++)fx.update(i*.05,items());
  near(squad.center.x,150,.1);eq(squad.targetId,null);assert(squad.fighters.every(f=>!f.bolt.visible));
  assert(squad.fighters.every((f,i)=>f.craft===craft[i]));
  destroy(s,carrier.id);fx.update(10.05,items());eq(fx.squadrons.size,0);assert(!squad.g.parent);
  fx.update(11,[]);fx.reset();eq(fx.root.children.length,0);
 }finally{fx.dispose();}
}]);
coreTests.push(
 ['Presentation inertia: gradual starts/stops, bounded lag, pause, deterministic simulation',()=>{
  const s=makeBattle('empty'),e=spawn(s,{kind:'miner',faction:'friendly',x:100,y:100}),m=new PresentationMotion();
  applyCommand(s,{type:'position',id:e.id,x:370,y:100});const reference=JSON.stringify(s),p0=m.sample(e,poseAt(e,1),0);eq(JSON.stringify(s),reference);eq(p0.speed,0);
  let first,cruise,last,previous=0;
  for(let i=1;i<=40;i++){
   step(s);const snapshot=JSON.stringify(s),p=m.sample(e,poseAt(e,1),s.time);eq(JSON.stringify(s),snapshot);
   assert(Math.hypot(p.x-e.x,p.y-e.y)<=18.000001);assert(p.x>=previous);previous=p.x;
   if(i===1)first=p;if(i===10)cruise=p;if(i===21)last=p;
   if(i===40){near(p.x,370,.01);assert(p.speed<1);eq(m.sample(e,poseAt(e,1),s.time),p);}
  }
  assert(first.speed>0&&first.speed<COMBAT.speed);near(cruise.speed,COMBAT.speed,.01);assert(last.speed>0&&last.speed<COMBAT.speed);assert(first.pitch>0&&last.pitch<0);
  m.retain(new Set());eq(m.poses.size,0);m.clear();
 }],
 ['3D fighters: smooth individual path variation and stable pause',()=>{
  const s=makeBattle('carrier'),fx=new CombatEffects(new T.Scene()),[carrier]=s.entities;
  const items=()=>s.entities.map(e=>({id:e.id,e,pose:poseAt(e,1)}));
  try{
   fx.update(0,items());const squad=fx.squadrons.get(carrier.id),radii=[],frames=[];
   for(let i=0;i<=720;i++){fx.update(i/60,items());const p=squad.fighters.map(f=>f.craft.position.clone());radii.push(p.map(v=>v.distanceTo(squad.center)));
    if(frames.length)for(let j=0;j<p.length;j++)assert(p[j].distanceTo(frames[frames.length-1][j])<4,'smooth motion');
    frames.push(p);}
   for(let j=0;j<6;j++){const v=radii.map(r=>r[j]);assert(Math.max(...v)-Math.min(...v)>4,'individual changing radius');}
   assert(radii.some(r=>Math.abs(r[0]-r[1])>3),'not identical orbital tracks');
   const snapshot=squad.fighters.map(f=>[f.craft.position.toArray(),f.craft.quaternion.toArray()]);fx.update(12,items());eq(squad.fighters.map(f=>[f.craft.position.toArray(),f.craft.quaternion.toArray()]),snapshot);
  }finally{fx.dispose();}
 }]
);
coreTests.push(
 ['Command patrol: slow, spaced escorts, command movement and battle transition',()=>{
  const s=makeBattle(),f=s.entities.find(e=>e.kind==='frigate'),escorts=s.entities.filter(e=>e.faction==='friendly'&&e!==f),hostile=s.entities.find(e=>e.faction==='hostile');
  const start=escorts.map(e=>({x:e.x,y:e.y})),h={x:hostile.x,y:hostile.y};
  assert(canPosition(s,f));assert(!canPosition(s,escorts[0]));assert(!applyCommand(s,{type:'position',id:escorts[0].id,x:700,y:900}).ok);
  for(let i=0;i<100;i++)step(s);
  escorts.forEach((e,i)=>{near(Math.hypot(e.x-f.x,e.y-f.y),CONFIG.patrol.radii[e.kind],.01);assert(Math.hypot(e.x-start[i].x,e.y-start[i].y)>70);assert(Math.hypot(e.x-e.prevX,e.y-e.prevY)/.05<28);eq(e.patrol.leaderId,f.id);});
  near(hostile.x,h.x);near(hostile.y,h.y);
  assert(applyCommand(s,{type:'position',id:f.id,x:690,y:900}).ok);
  for(let i=0;i<150;i++)step(s);
  near(f.x,690);escorts.forEach(e=>near(Math.hypot(e.x-f.x,e.y-f.y),CONFIG.patrol.radii[e.kind],.1));
  assert(applyCommand(s,{type:'engage'}).ok);step(s);assert(escorts.every(e=>!e.patrol.active));
  s.engaged=false;step(s);assert(escorts.every(e=>e.patrol.active));
  destroy(s,f.id);step(s);assert(escorts.every(e=>e.patrol===null));assert(canPosition(s,escorts[0]));
 }],
 ['Command patrol: deterministic with multiple leaders, civilians independent and world bounds',()=>{
  const run=fps=>{const s=makeBattle('empty'),a=spawn(s,{kind:'frigate',faction:'friendly',x:35,y:35}),b=spawn(s,{kind:'frigate',faction:'friendly',x:1200,y:1200}),e=spawn(s,{kind:'carrier',faction:'friendly',x:35,y:35}),m=spawn(s,{kind:'miner',faction:'friendly',x:350,y:350}),c=new FixedClock(dt=>step(s,dt));for(let i=0;i<fps*10;i++)c.advance(1/fps);eq(e.patrol.leaderId,a.id);eq([m.x,m.y],[350,350]);assert(e.x>=0&&e.y>=0&&e.x<=1800&&e.y<=1800);destroy(s,a.id);step(s);eq(e.patrol.leaderId,b.id);return s;};
  eq(run(30),run(144));
 }],
 ['3D command insignia: persistent, selectable, selected state and cleanup',()=>{
  const scene=new T.Scene(),markers=new CommandMarkers(scene),s=makeBattle(),f=s.entities.find(e=>e.kind==='frigate'),items=()=>s.entities.map(e=>({id:e.id,e,pose:poseAt(e,1)})),before=JSON.stringify(s);
  try{markers.update(items(),null,1);eq(markers.items.size,1);const g=markers.items.get(f.id);eq(g.children.length,9);eq(g.userData.entityId,f.id);
   const ray=new T.Raycaster(new T.Vector3(f.x+77.5*Math.cos(.6),100,f.y-77.5*Math.sin(.6)),new T.Vector3(0,-1,0));assert(ray.intersectObject(g,true).length>0,'ring must be pickable');
   markers.update(items(),f.id,.3);eq(markers.items.get(f.id),g);assert(g.scale.x>1);eq(g.children[1].material,markers.selected);eq(JSON.stringify(s),before);
   destroy(s,f.id);markers.update(items(),null,1);eq(markers.items.size,0);assert(!g.parent);markers.clear();eq(markers.root.children.length,0);
  }finally{markers.dispose();}eq(scene.children.length,0);
 }]
);
coreTests.push(
 ['Command ship: name and physical scale',()=>{
  const s=makeBattle(),f=s.entities.find(e=>e.kind==='frigate'),registry=new ModelRegistry();
  try{eq(f.label,'Command ship');const sizes=['frigate','carrier','missile','destroyer'].map(k=>new T.Box3().setFromObject(registry.get(k,'friendly')).getSize(new T.Vector3()).x);
   assert(sizes.slice(1).every(x=>sizes[0]/x>1.75&&sizes[0]/x<2.5),'roughly twice other hull lengths '+sizes);
  }finally{registry.clear();}
 }],
 ['Command patrol: survivors redistribute into equally spaced slots after combat and losses',()=>{
  const s=makeBattle(),f=s.entities.find(e=>e.kind==='frigate'),escorts=s.entities.filter(e=>e.faction==='friendly'&&e!==f);
  s.engaged=true;step(s);s.engaged=false;
  escorts.forEach((e,i)=>{e.x=f.x+145+i*3;e.y=f.y+4;});
  const verify=()=>{const live=s.entities.filter(e=>e.faction==='friendly'&&e!==f),angles=live.map(e=>(Math.atan2(e.y-f.y,e.x-f.x)+2*Math.PI)%(2*Math.PI)).sort((a,b)=>a-b);for(let i=0;i<angles.length;i++)near((angles[(i+1)%angles.length]-angles[i]+2*Math.PI)%(2*Math.PI),2*Math.PI/live.length,.04);for(const e of live)near(Math.hypot(e.x-f.x,e.y-f.y),CONFIG.patrol.radii[e.kind],.2);};
  for(let i=0;i<280;i++)step(s);verify();destroy(s,escorts[2].id);for(let i=0;i<240;i++)step(s);verify();
 }],
 ['Spacing: both factions and civilian hulls separate, exact overlap and boundaries',()=>{
  const s=makeBattle('empty'),f=spawn(s,{kind:'frigate',faction:'friendly',x:600,y:600}),a=spawn(s,{kind:'carrier',faction:'friendly',x:600,y:600}),b=spawn(s,{kind:'missile',faction:'hostile',x:600,y:600}),m=spawn(s,{kind:'miner',faction:'friendly',x:600,y:600}),n=spawn(s,{kind:'destroyer',faction:'hostile',x:0,y:0}),p=spawn(s,{kind:'constructor',faction:'friendly',x:0,y:0});
  for(let i=0;i<300;i++)step(s);
  eq([f.x,f.y],[600,600]);for(const e of s.entities)assert(Number.isFinite(e.x)&&Number.isFinite(e.y)&&e.x>=0&&e.y>=0&&e.x<=1800&&e.y<=1800);
  for(let i=0;i<s.entities.length;i++)for(let j=i+1;j<s.entities.length;j++){const u=s.entities[i],v=s.entities[j];assert(Math.hypot(u.x-v.x,u.y-v.y)>=separationDistance(u,v)-1,'separation '+u.id+'/'+v.id);}
 }]
);
export const browserTests=[
 ['WebGL: live combat draws effects and health overlays at all qualities',()=>{const canvas=document.createElement('canvas'),c=new Camera(800,500),r=new BattlefieldRenderer(canvas,c),s=makeBattle();applyCommand(s,{type:'engage'});try{for(const q of ['low','medium','high']){r.resize(800,500,1,q);for(let i=0;i<40;i++){step(s);r.addEvents(drainEvents(s),s.time);r.draw(s,1);}assert(r.gl.info.render.triangles>0);assert(r.gl.getContext().getError()===0);}assert(r.overlay.children.length>0);assert(r.effects.materials.size>0);r.reset();eq(r.effects.events.length,0);eq(r.effects.root.children.length,0);}finally{r.dispose();}}],
 ['WebGL: models render, pick and resize without mutating simulation',()=>{const canvas=document.createElement('canvas'),c=new Camera(800,500),r=new BattlefieldRenderer(canvas,c),s=makeDemo(),before=JSON.stringify(s);r.resize(800,500,2,'high');r.draw(s,1);eq([canvas.width,canvas.height],[1600,1000]);assert(r.gl.info.render.triangles>0);assert(r.gl.getContext().getError()===0);const e=s.entities[0];c.focus(e.x,e.y);r.draw(s,1);assert(r.pick(400,250)!==null);r.resize(390,844,3,'medium');r.draw(s,1);eq([canvas.width,canvas.height],[585,1266]);eq(JSON.stringify(s),before);r.dispose();eq(r.registry.cache.size,0);}],
 ['WebGL: mesh assets and resource ownership',()=>{const r=new ModelRegistry();for(const [kind,faction] of [['station','friendly'],['frigate','friendly'],['carrier','friendly'],['missile','friendly'],['destroyer','friendly'],['miner','friendly'],['constructor','friendly'],['carrier','hostile'],['missile','hostile'],['destroyer','hostile']]){const a=r.get(kind,faction),b=r.get(kind,faction);assert(a!==b);let count=0;a.traverse(o=>{if(o.isMesh){count++;assert(o.geometry.attributes.position.count>0);assert(o.material.isMeshStandardMaterial);}});assert(count>5);}assert(r.geometry.size>0);r.clear();eq(r.geometry.size,0);eq(r.materials.size,0);}],
 ['WebGL: projection matches real 3D camera across zoom and pan',()=>{const canvas=document.createElement('canvas'),c=new Camera(640,400),r=new BattlefieldRenderer(canvas,c),s=makeDemo();r.resize(640,400,1,'low');for(const q of ['low','medium','high']){r.resize(640,400,1,q);c.zoomAt(1.2);c.panPixels(10,20);r.draw(s,.5);for(const i of r.visibleItems){const o=r.objects.get(i.id),v=o.position.clone().project(r.view);near((v.x+1)*320,i.screen.x,1e-5);near((1-v.y)*200,i.screen.y,1e-5);}}r.dispose();}]
];
export async function runTests(tests){const results=[];for(const [name,fn] of tests){const start=performance.now();try{await fn();results.push({name,ok:true,ms:performance.now()-start});}catch(e){results.push({name,ok:false,error:e.stack||String(e),ms:performance.now()-start});}}return results;}
