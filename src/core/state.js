import {CONFIG, LABELS, COMBAT} from '../config.js';
import {clamp,lerp,lerpAngle} from './math.js';
import {initCombat,combatStep} from './combat.js';

// The authoritative state contains plain records only; no renderer, input or DOM references.
export function createState(seed=CONFIG.demo.seed) {
  return {seed:String(seed), tick:0,time:0, nextId:1, entities:[], events:[], sandbox:false, engaged:false, energy:COMBAT.sandboxEnergy, energyFactor:1, outcome:null};
}
export function spawn(state, data) {
  if (!Object.hasOwn(LABELS,data.kind) || !['friendly','hostile'].includes(data.faction)) throw new TypeError('Invalid entity class or faction');
  if (data.faction==='hostile' && !['carrier','missile','destroyer'].includes(data.kind)) throw new TypeError('Unsupported hostile class');
  if (!Number.isFinite(data.x)||!Number.isFinite(data.y)||!Number.isFinite(data.heading??0)) throw new TypeError('Non-finite pose');
  const x=clamp(data.x,0,CONFIG.world.width),y=clamp(data.y,0,CONFIG.world.height),heading=data.heading??0;
  const e={id:state.nextId++,kind:data.kind,faction:data.faction,label:data.label??LABELS[data.kind],x,y,heading,prevX:x,prevY:y,prevHeading:heading,motion:data.motion?{...data.motion}:null};
  initCombat(e);state.entities.push(e);state.events.push({type:'spawned',id:e.id,tick:state.tick});return e;
}
export function destroy(state,id) {
  const i=state.entities.findIndex(e=>e.id===id);if(i<0)return false;
  const e=state.entities[i];state.entities.splice(i,1);state.events.push({type:'destroyed',id,x:e.x,y:e.y,kind:e.kind,faction:e.faction,tick:state.tick});return true;
}
export function drainEvents(state) {return state.events.splice(0);}
export function applyCommand(state, command, paused=false) {
  if(paused)return {ok:false,reason:'Simulation paused'};
  if(command?.type==='spawn') {try{return {ok:true,id:spawn(state,command.data).id};}catch(e){return {ok:false,reason:e.message};}}
  if(command?.type==='destroy')return {ok:destroy(state,command.id)};
  if(command?.type==='engage'&&state.sandbox){if(!state.entities.some(e=>e.faction==='friendly')||!state.entities.some(e=>e.faction==='hostile'))return {ok:false,reason:'Spawn both factions first'};state.engaged=true;state.outcome=null;return {ok:true};}
 if(command?.type==='position'&&state.sandbox){const e=state.entities.find(e=>e.id===command.id);if(!e||e.kind==='station'||!Number.isFinite(command.x)||!Number.isFinite(command.y))return {ok:false,reason:'Invalid position'};e.destination={x:clamp(command.x,0,CONFIG.world.width),y:clamp(command.y,0,CONFIG.world.height)};return {ok:true};}
 return {ok:false,reason:'Unknown sandbox command'};
}
export function step(state,dt=1/CONFIG.clock.hz) {
  state.tick++;state.time=state.tick/CONFIG.clock.hz;
  if(state.sandbox){for(const e of state.entities){e.prevX=e.x;e.prevY=e.y;e.prevHeading=e.heading;}combatStep(state,dt,destroy);return;}
  // A deterministic, non-gameplay animation fixture used to verify interpolation.
  for(const e of state.entities){
    e.prevX=e.x;e.prevY=e.y;e.prevHeading=e.heading;
    if(!e.motion)continue;
    const m=e.motion,a=m.phase+state.time*m.rate;
    e.x=clamp(m.cx+Math.cos(a)*m.rx,0,CONFIG.world.width);
    e.y=clamp(m.cy+Math.sin(a)*m.ry,0,CONFIG.world.height);
    e.heading=Math.atan2(Math.cos(a)*m.ry*m.rate,-Math.sin(a)*m.rx*m.rate);
  }
}
export function poseAt(e,alpha) {
  const t=clamp(alpha,0,1);return {x:lerp(e.prevX,e.x,t),y:lerp(e.prevY,e.y,t),heading:lerpAngle(e.prevHeading,e.heading,t)};
}
export function makeDemo(seed=CONFIG.demo.seed) {
  const s=createState(seed);
  // Representative artwork, not a match starting roster or a combat scenario.
  const add=(kind,faction,x,y,heading,label,motion=null)=>spawn(s,{kind,faction,x,y,heading,label,motion});
  add('station','friendly',550,1000,0,'Command station');
  add('frigate','friendly',790,930,-0.25,'Alpha · command frigate');
  add('carrier','friendly',770,1190,-0.4,'Light carrier');
  add('missile','friendly',970,1060,-0.45,'Missile cruiser');
  add('destroyer','friendly',1010,830,-0.35,'Destroyer');
  add('miner','friendly',400,1190,0.45,'Miner');
  add('constructor','friendly',380,790,0.15,'Constructor');
  add('carrier','hostile',1310,430,2.5,'Hostile light carrier');
  add('missile','hostile',1510,620,2.75,'Hostile missile cruiser');
  add('destroyer','hostile',1240,700,2.6,'Hostile destroyer');
  const m={cx:680,cy:620,rx:105,ry:65,phase:0.8,rate:CONFIG.demo.orbitSpeed};
  add('frigate','friendly',m.cx+Math.cos(m.phase)*m.rx,m.cy+Math.sin(m.phase)*m.ry,Math.atan2(Math.cos(m.phase)*m.ry,-Math.sin(m.phase)*m.rx),'Camera / motion fixture',m);
  drainEvents(s);return s;
}

export function makeBattle(preset='fleet',close=false){
 const s=createState('combat-'+preset);s.sandbox=true;
 const pair={carrier:['carrier','missile'],missile:['missile','destroyer'],destroyer:['destroyer','carrier']},gap=close?180:1200;
 const add=(kind,faction,x,y)=>spawn(s,{kind,faction,x,y,heading:faction==='friendly'?0:Math.PI});
 if(Object.hasOwn(pair,preset)){add(pair[preset][0],'friendly',900-gap/2,900);add(pair[preset][1],'hostile',900+gap/2,900);}
 else if(preset==='fleet'){const cx=390,cy=900;for(let i=0;i<6;i++){const kind=['carrier','missile','destroyer'][i%3],a=i*Math.PI/3,r=CONFIG.patrol.radii[kind];spawn(s,{kind,faction:'friendly',x:cx+r*Math.cos(a),y:cy+r*Math.sin(a),heading:a+Math.PI/2});}for(let i=0;i<6;i++)add(['carrier','missile','destroyer'][i%3],'hostile',900+510+(i%2)*80,900+(Math.floor(i/2)-1)*125);add('frigate','friendly',cx,cy);}
 drainEvents(s);return s;
}
