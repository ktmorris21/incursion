import {COMBAT,CONFIG} from '../config.js';
import {clamp} from './math.js';
import {speedFactor,sensorFactor,clearance,segmentClear,routeWaypoint,navigableStep,nearestOpen,dimensions} from './terrain.js';
export const stats=e=>COMBAT.classes[e.kind];
export const multiplier=(a,b)=>COMBAT.matrix[a]?.[b]??1;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function initCombat(e){const c=stats(e);return Object.assign(e,{shield:c.shield,hull:c.hull,maxShield:c.shield,maxHull:c.hull,lastDamage:-1e9,nextAttack:0,target:null,destination:null,damageDone:0});}
export function nearest(a,entities,range=Infinity,detect=true,map=null){
 let target=null,best=Infinity;
 for(const b of entities){if(a.id===b.id||a.faction===b.faction||b.hull<=0||b.invulnerable)continue;const d=distance(a,b),factor=sensorFactor(map,a);if(d>range*factor+1e-8||(detect&&d>stats(a).sensor*factor+1e-8))continue;if(d<best-1e-8||(Math.abs(d-best)<=1e-8&&(!target||b.id<target.id))){target=b;best=d;}}
 return target;
}
export function damage(state,a,b,amount){
 if(a.faction===b.faction||a.hull<=0||b.hull<=0||b.invulnerable||!Number.isFinite(amount)||amount<=0)return 0;
 const shield=Math.min(b.shield,amount),hull=Math.min(b.hull,amount-shield);b.shield-=shield;b.hull-=hull;b.lastDamage=state.time;a.damageDone+=shield+hull;
 state.events.push({type:'hit',id:b.id,source:a.id,kind:a.kind,faction:a.faction,x:b.x,y:b.y,sx:a.x,sy:a.y,shield,hull,tick:state.tick});return shield+hull;
}
export function regenerate(state,dt){
 const jobs=[];let demand=0;
 for(const e of state.entities){if(e.hull<=0||state.time-e.lastDamage<COMBAT.delay-1e-8)continue;const shield=Math.min(e.maxShield-e.shield,e.maxShield*COMBAT.shieldRate*dt),hull=Math.min(e.maxHull-e.hull,e.maxHull*COMBAT.hullRate*dt);if(e.faction==='hostile'){e.shield+=shield;continue;}const cost=shield*COMBAT.shieldCost+hull*COMBAT.hullCost;jobs.push({e,shield,hull});demand+=cost;}
 const factor=demand?Math.min(1,state.energy/demand):1;for(const {e,shield,hull} of jobs){e.shield+=shield*factor;e.hull+=hull*factor;}state.energy=Math.max(0,state.energy-demand*factor);state.energyFactor=factor;
}
// Idle sandbox escorts, not the later fleet assignment/engagement-leash system.
export const isEscort=e=>e.faction==='friendly'&&Object.hasOwn(CONFIG.patrol.radii,e.kind);
// Assign one stable, evenly spaced angular slot per surviving escort. Preserve
// circular order and minimize angular travel when membership changes/reforming.
export function preparePatrols(entities,positions){
 const leaders=positions.filter(p=>p.kind==='frigate'&&p.faction==='friendly'&&p.hull>0);
 const groups=new Map(),byId=new Map(positions.map(p=>[p.id,p]));
 for(const e of entities){
  if(!isEscort(e)||e.hull<=0||e.destination)continue;
  const from=byId.get(e.id),leader=leaders.find(p=>p.id===e.patrol?.leaderId)??leaders.slice().sort((a,b)=>distance(from,a)-distance(from,b)||a.id-b.id)[0];
  if(!leader){e.patrol=null;continue;}
  if(!groups.has(leader.id))groups.set(leader.id,{leader,members:[]});
  const dx=from.x-leader.x,dy=from.y-leader.y;
  groups.get(leader.id).members.push({e,bearing:Math.hypot(dx,dy)>1e-8?Math.atan2(dy,dx):0});
 }
 for(const {leader,members} of groups.values()){
  const signature=members.map(m=>m.e.id).sort((a,b)=>a-b).join(',');
  if(members.every(({e})=>e.patrol?.active&&e.patrol.leaderId===leader.id&&e.patrol.signature===signature))continue;
  members.sort((a,b)=>a.bearing-b.bearing||a.e.id-b.e.id);
  const n=members.length,spacing=2*Math.PI/n;
  const base=members.reduce((sum,m,i)=>sum+m.bearing-i*spacing,0)/n;
  members.forEach(({e},i)=>{e.patrol={leaderId:leader.id,phase:base+i*spacing,active:true,signature,count:n};});
 }
}
export function patrolGoal(e,from,positions,dt,map=null){
 if(!isEscort(e)||!e.patrol?.active)return null;
 const leader=positions.find(p=>p.id===e.patrol.leaderId&&p.hull>0);
 if(!leader){e.patrol=null;return null;}
 const radius=Math.max(CONFIG.patrol.radii[e.kind],(e.patrol.count>6?88/(2*Math.sin(Math.PI/e.patrol.count)):0));
 e.patrol.phase+=CONFIG.patrol.rate*dt;
 const {width,height}=dimensions(map),x=clamp(leader.x+radius*Math.cos(e.patrol.phase),0,width),y=clamp(leader.y+radius*Math.sin(e.patrol.phase),0,height);
 return {x,y,leaderMoving:!!leader.destination};
}
// A bounded, deterministic local relaxation after movement proposals, before firing.
// No collision damage or forces on the immobile station. Give command orders priority
// over escorts when they are close, and divide corrections between ordinary hulls.
export const separationDistance=(a,b)=>CONFIG.separation.radii[a.kind]+CONFIG.separation.radii[b.kind]+CONFIG.separation.gap;
export function separateShips(entities,dt,map=null){
 const live=entities.filter(e=>e.hull>0).sort((a,b)=>a.id-b.id),budget=new Map(live.map(e=>[e.id,CONFIG.separation.correctionSpeed*dt]));
 const move=(e,dx,dy,amount)=>{
  const n=Math.min(amount,budget.get(e.id));if(n<=0)return 0;
  const {width,height}=dimensions(map),x=clamp(e.x+dx*n,0,width),y=clamp(e.y+dy*n,0,height),actual=Math.hypot(x-e.x,y-e.y);
  if(map&&!segmentClear(map,e,{x,y},clearance(e)))return 0;
  e.x=x;e.y=y;budget.set(e.id,Math.max(0,budget.get(e.id)-actual));return actual;
 };
 for(let pass=0;pass<CONFIG.separation.passes;pass++){
  for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
   const a=live[i],b=live[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),need=separationDistance(a,b)-d;
   if(need<=.001)continue;
   const angle=(a.id*1.618+b.id*2.399963)% (2*Math.PI),nx=d>1e-8?dx/d:Math.cos(angle),ny=d>1e-8?dy/d:Math.sin(angle);
   const wa=a.kind==='station'?0:a.kind==='frigate'&&b.kind!=='frigate'&&b.kind!=='station'?0:1;
   const wb=b.kind==='station'?0:b.kind==='frigate'&&a.kind!=='frigate'&&a.kind!=='station'?0:1;
   if(!wa&&!wb)continue;
   let left=need;
   if(wa)left-=move(a,-nx,-ny,need*wa/(wa+wb));
   if(wb)left-=move(b,nx,ny,Math.max(0,left));
   if(wa&&left>0)move(a,-nx,-ny,left);
  }
 }
}
export function combatStep(state,dt,destroy){
 const entities=state.entities,positions=entities.map(e=>({...e}));
 if(!state.engaged)preparePatrols(entities,positions);
 // Simultaneous movement proposals avoid faction order advantage.
 for(const e of entities){
  if(e.hull<=0||e.kind==='station')continue;
  const from=positions.find(p=>p.id===e.id);
  if((state.engaged||e.destination)&&e.patrol)e.patrol.active=false;
  const patrol=!state.engaged&&!e.destination?patrolGoal(e,from,positions,dt,state.map):null;
  const target=e.destination??(state.engaged&&stats(e).damage?nearest(from,positions,Infinity,false):patrol);
  if(!target)continue;
  const d=distance(from,target),stop=e.destination||patrol?0:stats(e).range*sensorFactor(state.map,from)*.98;
  if(d<1e-8){if(e.destination)e.destination=null;continue;}
  const desired=state.map&&stop>0?{x:target.x+(from.x-target.x)*Math.min(1,stop/d),y:target.y+(from.y-target.y)*Math.min(1,stop/d)}:target;
  const speed=(patrol&&!patrol.leaderMoving?CONFIG.patrol.settleSpeed:COMBAT.speed)*speedFactor(state.map,from);
  if(state.map){
   if(d<=stop&&!e.destination&&!patrol){e.heading=Math.atan2(target.y-from.y,target.x-from.x);continue;}
   const waypoint=routeWaypoint(state.map,e,desired,state.tick);if(!waypoint)continue;
   const p=navigableStep(state.map,e,waypoint,speed*dt);
   if(distance(e,p)>1e-8)e.heading=Math.atan2(p.y-e.y,p.x-e.x);
   e.x=p.x;e.y=p.y;
  }else{
   e.heading=Math.atan2(target.y-from.y,target.x-from.x);const travel=Math.min(speed*dt,Math.max(0,d-stop));
   e.x=clamp(from.x+Math.cos(e.heading)*travel,0,CONFIG.world.width);e.y=clamp(from.y+Math.sin(e.heading)*travel,0,CONFIG.world.height);
  }
  if(e.destination&&distance(e,e.destination)<.01){e.destination=null;e.route=null;}
 }
 separateShips(entities,dt,state.map);
 for(const e of entities){e.target=null;if(!state.engaged||e.hull<=0||!stats(e).damage||e.invulnerable)continue;const c=stats(e),target=nearest(e,entities,c.range,true,state.map);if(!target)continue;e.target=target.id;if(state.time+1e-8<e.nextAttack)continue;e.nextAttack=state.time+c.interval;damage(state,e,target,c.damage*multiplier(e.kind,target.kind));}
 for(const e of [...entities])if(e.hull<=0)destroy(state,e.id);
 regenerate(state,dt);
 if(state.engaged){const f=entities.some(e=>e.faction==='friendly'),h=entities.some(e=>e.faction==='hostile');if(!f||!h){state.engaged=false;state.outcome=f?'Friendly victory':h?'Hostile victory':'Mutual destruction';}}
}
