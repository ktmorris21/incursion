import {COMBAT,CONFIG} from '../config.js';
import {clamp} from './math.js';
export const stats=e=>COMBAT.classes[e.kind];
export const multiplier=(a,b)=>COMBAT.matrix[a]?.[b]??1;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function initCombat(e){const c=stats(e);return Object.assign(e,{shield:c.shield,hull:c.hull,maxShield:c.shield,maxHull:c.hull,lastDamage:-1e9,nextAttack:0,target:null,destination:null,damageDone:0});}
export function nearest(a,entities,range=Infinity,detect=true){
 let target=null,best=Infinity;
 for(const b of entities){if(a.id===b.id||a.faction===b.faction||b.hull<=0||b.invulnerable)continue;const d=distance(a,b);if(d>range+1e-8||(detect&&d>stats(a).sensor+1e-8))continue;if(d<best-1e-8||(Math.abs(d-best)<=1e-8&&(!target||b.id<target.id))){target=b;best=d;}}
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
export function combatStep(state,dt,destroy){
 const entities=state.entities,positions=entities.map(e=>({...e}));
 // Simultaneous movement proposals avoid faction order advantage.
 for(const e of entities){if(e.hull<=0||e.kind==='station')continue;const from=positions.find(p=>p.id===e.id),target=e.destination??(state.engaged&&stats(e).damage?nearest(from,positions,Infinity,false):null);if(!target)continue;const d=distance(from,target);if(d<1e-8){if(e.destination)e.destination=null;continue;}e.heading=Math.atan2(target.y-from.y,target.x-from.x);const stop=e.destination?0:stats(e).range*.98,travel=Math.min(COMBAT.speed*dt,Math.max(0,d-stop));e.x=clamp(from.x+Math.cos(e.heading)*travel,0,CONFIG.world.width);e.y=clamp(from.y+Math.sin(e.heading)*travel,0,CONFIG.world.height);if(e.destination&&distance(e,e.destination)<.01)e.destination=null;}
 for(const e of entities){e.target=null;if(!state.engaged||e.hull<=0||!stats(e).damage||e.invulnerable)continue;const c=stats(e),target=nearest(e,entities,c.range);if(!target)continue;e.target=target.id;if(state.time+1e-8<e.nextAttack)continue;e.nextAttack=state.time+c.interval;damage(state,e,target,c.damage*multiplier(e.kind,target.kind));}
 for(const e of [...entities])if(e.hull<=0)destroy(state,e.id);
 regenerate(state,dt);
 if(state.engaged){const f=entities.some(e=>e.faction==='friendly'),h=entities.some(e=>e.faction==='hostile');if(!f||!h){state.engaged=false;state.outcome=f?'Friendly victory':h?'Hostile victory':'Mutual destruction';}}
}
