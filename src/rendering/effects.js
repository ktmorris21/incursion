import * as T from '../../vendor/three.module.js';
// Cosmetic only: damage is calculated by the simulation, never by these meshes.
const Y=new T.Vector3(0,1,0),clamp=t=>Math.max(0,Math.min(1,t)),MAX=160;
const FIGHTERS=6,ESCORT_RATE=.62,ATTACK_RATE=1.65,TRANSIT_SPEED=420,TRANSIT_ACCEL=2300;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const smooth=(a,b,t)=>a+(b-a)*(1-Math.exp(-t));
const colors={friendly:[0x58d6ff,0xc5f6ff],hostile:[0xff507d,0xffc4aa]};
export class CombatEffects {
 constructor(scene){
  this.root=new T.Group();scene.add(this.root);this.events=[];this.trails=new Map();this.squadrons=new Map();this.materials=new Map();
  this.geos={rod:new T.CylinderGeometry(1,1,1,6),ball:new T.SphereGeometry(1,12,8),ring:new T.TorusGeometry(1,.045,6,36),debris:new T.BoxGeometry(1,1,1)};
  // Low-poly winged fighter, nose along +X, readable at tactical zoom.
  const shape=new T.Shape(),outline=[[8,0],[1,1.9],[-3,5.8],[-6,5.8],[-4,1.9],[-7,1.5],[-7,-1.5],[-4,-1.9],[-6,-5.8],[-3,-5.8],[1,-1.9]];
  outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  this.geos.fighter=new T.ExtrudeGeometry(shape,{depth:1.45,bevelEnabled:false});this.geos.fighter.rotateX(-Math.PI/2);
 }
 mesh(g,geo,color,opacity=1,additive=true){
  const key=[color,opacity,additive].join(':');
  if(!this.materials.has(key))this.materials.set(key,new T.MeshBasicMaterial({color,opacity,transparent:opacity<1||additive,blending:additive?T.AdditiveBlending:T.NormalBlending,depthWrite:!additive&&opacity===1,toneMapped:false}));
  const m=new T.Mesh(this.geos[geo],this.materials.get(key));g.add(m);return m;
 }
 rod(g,c,o=1){return this.mesh(g,'rod',c,o);}
 segment(m,a,b,w){const d=b.clone().sub(a),l=d.length();m.visible=l>.01;if(!m.visible)return;m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(Y,d.divideScalar(l));m.scale.set(w,l,w);}
 addEvents(events,time){
  for(const e of events){
   if(!['hit','destroyed'].includes(e.type))continue;
   const g=new T.Group(),[c,core]=colors[e.faction]??colors.friendly;
   const f={e:{...e},g,start:time,parts:[],travel:0,duration:.33};g.visible=false;this.root.add(g);
   if(e.type==='destroyed'){
    f.duration=1.35;f.flash=this.mesh(g,'ball',0xffa84e,.6);f.wave=this.mesh(g,'ring',0xff9b40,.85);f.wave.rotation.x=-Math.PI/2;
    for(let j=0;j<10;j++)f.parts.push(this.mesh(g,'debris',j%2?0xffc47b:0xa6abb5,.85,false));
   }else{
    const d=Math.hypot(e.x-e.sx,e.y-e.sy);
    if(e.kind==='missile'){
     f.travel=Math.max(.25,Math.min(.85,d/650));f.duration=f.travel+.32;
     for(let j=0;j<4;j++)f.parts.push({head:this.mesh(g,'ball',core),glow:this.mesh(g,'ball',c,.35),tail:this.rod(g,c,.8)});
    }else if(e.kind==='carrier'){
     // The persistent squadron owns the craft and shots; this event owns the impact only.
     f.duration=.33;
    }else if(e.kind==='destroyer'){
     f.beam=this.rod(g,c,.5);f.core=this.rod(g,core,.95);
    }else{
     f.travel=Math.max(.1,Math.min(.32,d/1100));f.duration=f.travel+.25;f.parts.push({head:this.mesh(g,'ball',core),tail:this.rod(g,c,.8)});
    }
    f.impact=this.mesh(g,'ball',e.shield>0?0xb0eaff:0xffae53,.5);
    if(e.shield>0){f.shield=this.mesh(g,'ball',0x70bfff,.17);f.ripple=this.mesh(g,'ring',0x9bddff,.65);f.ripple.rotation.x=-Math.PI/2;}
   }
   this.events.push(f);while(this.events.length>MAX)this.root.remove(this.events.shift().g);
  }
 }
 update(time,items,quality='high'){
  const poses=new Map(items.map(i=>[i.id,i.pose])),kinds=new Map(items.map(i=>[i.id,i.e.kind]));
  for(let i=this.events.length-1;i>=0;i--){
   const f=this.events[i],e=f.e,t=time-f.start;
   if(t>=f.duration){this.root.remove(f.g);this.events.splice(i,1);continue;}
   f.g.visible=t>=0;if(t<0)continue;
   const p=clamp(t/f.duration),u=f.travel?clamp(t/f.travel):1;
   const src=poses.get(e.source),dst=poses.get(e.id);
   const a=new T.Vector3(src?.x??e.sx??e.x,7,src?.y??e.sy??e.y),b=new T.Vector3(dst?.x??e.x,6,dst?.y??e.y);
   const side=new T.Vector3(-(b.z-a.z),0,b.x-a.x).normalize();
   const at=(q,offset=0,lift=0)=>a.clone().lerp(b,clamp(q)).addScaledVector(side,offset).add(new T.Vector3(0,lift,0));
   if(e.type==='destroyed'){
    f.flash.position.set(e.x,6,e.y);f.flash.scale.setScalar((5+29*Math.sin(Math.PI*p*.85))*(1-p*.65));
    f.wave.position.set(e.x,2,e.y);f.wave.scale.setScalar(8+58*p);
    f.parts.forEach((m,j)=>{const ang=j*2.399963+e.id*.71,r=(22+j%4*13)*p;m.position.set(e.x+Math.cos(ang)*r,6+18*Math.sin(Math.PI*p),e.y+Math.sin(ang)*r);m.rotation.set(p*8+j,p*5,0);m.scale.setScalar(Math.max(.05,(3+j%3)*(1-p)));m.visible=quality!=='low'||j<5;});continue;
   }
   if(e.kind==='missile'){
    f.parts.forEach((m,j)=>{
     const q=clamp(u-j*.035),curve=v=>at(v,(j-1.5)*21*Math.sin(Math.PI*v),12*Math.sin(Math.PI*v)),head=curve(q),tail=curve(clamp(q-.13));
     m.head.position.copy(head);m.head.scale.set(3,2,3);m.glow.position.copy(head);m.glow.scale.setScalar(5);this.segment(m.tail,tail,head,1.5);
     const show=t<f.travel&&u>=j*.035;m.head.visible=m.glow.visible=show;m.tail.visible=m.tail.visible&&show;
    });
   }else if(e.kind==='carrier'){
    // Impact only: the squadron animation is updated separately.
   }else if(e.kind==='destroyer'){
    this.segment(f.beam,a,b,3.1*(1-p*.55));this.segment(f.core,a,b,1.2);
   }else{
    const m=f.parts[0],pos=at(u);m.head.position.copy(pos);m.head.scale.setScalar(2);m.head.visible=t<f.travel;this.segment(m.tail,at(u-.24),pos,1.7);m.tail.visible=m.tail.visible&&t<f.travel;
   }
   const fade=clamp((t-f.travel)/.32),show=t>=f.travel;
   f.impact.visible=show;f.impact.position.copy(b);f.impact.scale.setScalar(3+12*Math.sin(Math.PI*fade)*(1-fade*.45));
   if(f.shield){const scale=kinds.get(e.id)==='frigate'?2:1;f.shield.visible=f.ripple.visible=show;f.shield.position.copy(b);f.shield.scale.set((24+fade*5)*scale,(12+fade*4)*scale,(24+fade*5)*scale);f.ripple.position.copy(b);f.ripple.scale.setScalar((12+25*fade)*scale);}
  }
  this.updateSquadrons(time,items);
  const moving=new Set();
  for(const {e,pose,id} of items){
   const speed=pose.speed??Math.hypot(e.x-e.prevX,e.y-e.prevY)*20;
   if(e.kind==='station'||speed<2)continue;
   moving.add(id);let trail=this.trails.get(id);
   if(!trail){const g=new T.Group(),c=(colors[e.faction]??colors.friendly)[0];this.root.add(g);trail={g,rods:[this.rod(g,c,.25),this.rod(g,c,.78)]};this.trails.set(id,trail);}
   const dir=new T.Vector3(Math.cos(pose.heading),0,Math.sin(pose.heading)),start=new T.Vector3(pose.x,2.5,pose.y).addScaledVector(dir,e.kind==='frigate'?-46:-23);
   this.segment(trail.rods[0],start,start.clone().addScaledVector(dir,-24),3.1);this.segment(trail.rods[1],start,start.clone().addScaledVector(dir,-11),1.5);
  }
  for(const [id,t] of this.trails)if(!moving.has(id)){this.root.remove(t.g);this.trails.delete(id);}
 }

 // Cosmetic state lives only in the renderer; no independent fighter entities.
 makeSquadron(item,time){
  const {e,pose}=item,g=new T.Group(),[color,core]=colors[e.faction]??colors.friendly;
  this.root.add(g);const fighters=[];
  for(let j=0;j<FIGHTERS;j++){
   const craft=new T.Group();g.add(craft);
   this.mesh(craft,'fighter',e.faction==='friendly'?0xc1ccd6:0xb3a0ad,1,false);
   const canopy=this.mesh(craft,'debris',0x273844,1,false);canopy.position.set(1,1.6,0);canopy.scale.set(3.8,.8,2.1);
   for(const z of [-2,2]){const engine=this.mesh(craft,'ball',color,.8);engine.position.set(-6.1,.6,z);engine.scale.set(1.55,.8,.75);}
   const bolt=this.rod(g,core,.98),glow=this.rod(g,color,.4);bolt.visible=glow.visible=false;
   // Stable per-fighter parameters, no frame-by-frame random jumps.
   const seed=(item.id??e.id)*1.618+j*2.399963;
   fighters.push({craft,bolt,glow,seed,heading:null,bank:0,aimBlend:0});
  }
  return {g,fighters,center:new T.Vector3(pose.x,0,pose.y),velocity:new T.Vector3(),lastGoal:new T.Vector3(pose.x,0,pose.y),heading:pose.heading,lastTime:time,phase:(item.id??e.id)*.77,attackBlend:0,targetId:null,faction:e.faction};
 }
 updateSquadrons(time,items){
  const byId=new Map(items.map(i=>[i.id,i])),live=new Set();
  for(const item of items){
   const {id,e,pose}=item;if(e.kind!=='carrier'||e.hull<=0)continue;live.add(id);
   let squad=this.squadrons.get(id);
   if(squad&&squad.faction!==e.faction){this.root.remove(squad.g);this.squadrons.delete(id);squad=null;}
   if(!squad){squad=this.makeSquadron(item,time);this.squadrons.set(id,squad);}
   const candidate=byId.get(e.target),target=candidate&&candidate.e.faction!==e.faction&&candidate.e.hull>0?candidate:null;
   const dt=Math.max(0,time-squad.lastTime);squad.lastTime=Math.max(time,squad.lastTime);
   const targetId=target?.id??null,goal=new T.Vector3(target?.pose.x??pose.x,0,target?.pose.y??pose.y);
   // Feed forward the moving carrier/target's velocity, rather than lagging far behind.
   const goalVelocity=dt>0&&targetId===squad.targetId?goal.clone().sub(squad.lastGoal).divideScalar(dt).clampLength(0,270):new T.Vector3();
   if(dt>0){squad.lastGoal.copy(goal);squad.targetId=targetId;}
   // Acceleration-limited steering and braking envelope. Substeps keep even
   // a slow render frame smooth, and the final small snap avoids overshoot.
   let remaining=Math.min(dt,.5);
   while(remaining>1e-8){
    const h=Math.min(remaining,1/60);remaining-=h;
    const delta=goal.clone().sub(squad.center),d=delta.length();
    if(d<.08&&squad.velocity.length()<1&&goalVelocity.length()<1){squad.center.copy(goal);squad.velocity.set(0,0,0);break;}
    const desired=delta.multiplyScalar(6).add(goalVelocity).clampLength(0,TRANSIT_SPEED);
    const dv=desired.sub(squad.velocity),change=dv.length();if(change>TRANSIT_ACCEL*h)dv.multiplyScalar(TRANSIT_ACCEL*h/change);
    squad.velocity.add(dv);squad.center.addScaledVector(squad.velocity,h);
   }
   const onStation=!!target&&squad.center.distanceTo(goal)<45,wanted=onStation?1:0;
   squad.attackBlend+=(wanted-squad.attackBlend)*(1-Math.exp(-4*dt));
   const blend=squad.attackBlend;squad.phase+=dt*(ESCORT_RATE+(ATTACK_RATE-ESCORT_RATE)*blend);
   const heading=target?Math.atan2(target.pose.y-pose.y,target.pose.x-pose.x):pose.heading;
   squad.heading+=angleDelta(squad.heading,heading)*(1-Math.exp(-3.8*dt));
   const forward=new T.Vector3(Math.cos(squad.heading),0,Math.sin(squad.heading)),side=new T.Vector3(-forward.z,0,forward.x);
   const attackCenter=target?new T.Vector3(target.pose.x,7,target.pose.y):null;
   for(let j=0;j<squad.fighters.length;j++){
    const f=squad.fighters[j],k=f.seed;
    // Smooth, bounded, individually phased harmonics give changing spacing,
    // wider/narrower passes and gentle lateral/vertical weaving without jitter.
    const t=squad.lastTime,offset=.19*Math.sin(t*.73+k)+.085*Math.sin(t*1.41+k*2.1);
    const angle=squad.phase+j*Math.PI*2/FIGHTERS+offset;
    const rx=48+22*blend+(5+4*blend)*Math.sin(t*.91+k*1.7),rz=39+7*blend+5*Math.sin(t*.67+k*2.3);
    const ca=Math.cos(angle),sa=Math.sin(angle),weave=3.5*Math.sin(t*1.28+k);
    const pos=squad.center.clone().addScaledVector(forward,rx*ca+weave).addScaledVector(side,rz*sa);
    pos.y=9+3*Math.sin(angle*2+k)+1.8*Math.sin(t*.83+k*3);
    // Approximate the flight tangent including the changing radius and phase.
    const rate=ESCORT_RATE+(ATTACK_RATE-ESCORT_RATE)*blend+.19*.73*Math.cos(t*.73+k)+.085*1.41*Math.cos(t*1.41+k*2.1);
    const drx=(5+4*blend)*.91*Math.cos(t*.91+k*1.7),drz=5*.67*Math.cos(t*.67+k*2.3);
    const tangent=forward.clone().multiplyScalar(drx*ca-rx*sa*rate+3.5*1.28*Math.cos(t*1.28+k)).addScaledVector(side,drz*sa+rz*ca*rate).add(squad.velocity);
    const inRange=!!attackCenter&&onStation&&pos.distanceTo(attackCenter)<100;
    // Telegraph the two staggered shots with a gradual nose-in turn.
    const pass=((angle/(Math.PI*2))%1+1)%1,pulse=pass<.08?pass/.08:pass>=.13&&pass<.21?(pass-.13)/.08:-1;
    const firing=inRange&&pulse>=0;
    const preparing=inRange&&(pass>.88||pass<.25);
    f.aimBlend=smooth(f.aimBlend,preparing?1:0,dt*14);
    const aim=attackCenter?attackCenter.clone().sub(pos).normalize():tangent.clone().normalize();
    const travelHeading=Math.atan2(tangent.z,tangent.x),aimHeading=Math.atan2(aim.z,aim.x);
    const desiredHeading=travelHeading+angleDelta(travelHeading,aimHeading)*f.aimBlend;
    if(f.heading===null)f.heading=desiredHeading;
    const turn=angleDelta(f.heading,desiredHeading);
    f.heading+=turn*(1-Math.exp(-dt*12));
    f.bank=smooth(f.bank,Math.max(-.24,Math.min(.24,turn*.35)),dt*7);
    f.craft.position.copy(pos);f.craft.rotation.set(f.bank,-f.heading,.045*Math.sin(angle+k),'YXZ');
    f.bolt.visible=f.glow.visible=false;
    if(firing){
     const muzzle=pos.clone().addScaledVector(new T.Vector3(Math.cos(f.heading),0,Math.sin(f.heading)),8),impact=attackCenter.clone().addScaledVector(aim,-10);
     const front=muzzle.clone().lerp(impact,pulse),rear=muzzle.clone().lerp(impact,Math.max(0,pulse-.27));
     this.segment(f.bolt,rear,front,1.15);this.segment(f.glow,rear,front,2.15);
    }
   }
  }
  for(const [id,squad] of this.squadrons)if(!live.has(id)){this.root.remove(squad.g);this.squadrons.delete(id);}
 }
 reset(){this.squadrons.clear();this.root.clear();this.events.length=0;this.trails.clear();}
 dispose(){this.reset();this.root.removeFromParent();Object.values(this.geos).forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.materials.clear();}
}
