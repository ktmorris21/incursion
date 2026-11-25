import * as T from '../../vendor/three.module.js';
// Cosmetic only: damage is calculated by the simulation, never by these meshes.
const Y=new T.Vector3(0,1,0),clamp=t=>Math.max(0,Math.min(1,t)),MAX=160;
const colors={friendly:[0x58d6ff,0xc5f6ff],hostile:[0xff507d,0xffc4aa]};
export class CombatEffects {
 constructor(scene){
  this.root=new T.Group();scene.add(this.root);this.events=[];this.trails=new Map();this.materials=new Map();
  this.geos={rod:new T.CylinderGeometry(1,1,1,6),ball:new T.SphereGeometry(1,12,8),fighter:new T.ConeGeometry(1,3,4),ring:new T.TorusGeometry(1,.045,6,36),debris:new T.BoxGeometry(1,1,1)};
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
     f.travel=Math.max(.32,Math.min(.68,d/700));f.duration=f.travel+.42;
     for(let j=0;j<5;j++)f.parts.push({craft:this.mesh(g,'fighter',0xb0bac8,1,false),engine:this.mesh(g,'ball',c,.9),bolt:this.rod(g,core,.95)});
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
  const poses=new Map(items.map(i=>[i.id,i.pose]));
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
    f.parts.forEach((m,j)=>{
     const delay=j*.028,progress=clamp((t-delay)/f.travel),back=clamp((t-f.travel)/.42),q=t<f.travel?progress*.84:.84*(1-back);
     const pos=at(q,(j-2)*11*Math.sin(Math.PI*q)+((j%2)?1:-1)*9*Math.sin(Math.PI*back),9+5*Math.sin(Math.PI*q)),dir=b.clone().sub(a).normalize().multiplyScalar(t<f.travel?1:-1);
     m.craft.position.copy(pos);m.craft.quaternion.setFromUnitVectors(Y,dir);m.craft.scale.set(1.6,2.3,1.1);
     m.engine.position.copy(pos).addScaledVector(dir,-3);m.engine.scale.setScalar(1.8);
     const show=t>=delay&&(quality!=='low'||j<3);m.craft.visible=m.engine.visible=show;
     const shot=clamp((t-f.travel*.58-delay)/.22);
     this.segment(m.bolt,pos.clone().lerp(b,Math.max(0,shot-.17)),pos.clone().lerp(b,shot),1.25);m.bolt.visible=m.bolt.visible&&show&&shot>0&&shot<1;
    });
   }else if(e.kind==='destroyer'){
    this.segment(f.beam,a,b,3.1*(1-p*.55));this.segment(f.core,a,b,1.2);
   }else{
    const m=f.parts[0],pos=at(u);m.head.position.copy(pos);m.head.scale.setScalar(2);m.head.visible=t<f.travel;this.segment(m.tail,at(u-.24),pos,1.7);m.tail.visible=m.tail.visible&&t<f.travel;
   }
   const fade=clamp((t-f.travel)/.32),show=t>=f.travel;
   f.impact.visible=show;f.impact.position.copy(b);f.impact.scale.setScalar(3+12*Math.sin(Math.PI*fade)*(1-fade*.45));
   if(f.shield){f.shield.visible=f.ripple.visible=show;f.shield.position.copy(b);f.shield.scale.set(24+fade*5,12+fade*4,24+fade*5);f.ripple.position.copy(b);f.ripple.scale.setScalar(12+25*fade);}
  }
  const moving=new Set();
  for(const {e,pose,id} of items){
   if(e.kind==='station'||Math.hypot(e.x-e.prevX,e.y-e.prevY)<.02)continue;
   moving.add(id);let trail=this.trails.get(id);
   if(!trail){const g=new T.Group(),c=(colors[e.faction]??colors.friendly)[0];this.root.add(g);trail={g,rods:[this.rod(g,c,.25),this.rod(g,c,.78)]};this.trails.set(id,trail);}
   const dir=new T.Vector3(Math.cos(pose.heading),0,Math.sin(pose.heading)),start=new T.Vector3(pose.x,2.5,pose.y).addScaledVector(dir,-23);
   this.segment(trail.rods[0],start,start.clone().addScaledVector(dir,-24),3.1);this.segment(trail.rods[1],start,start.clone().addScaledVector(dir,-11),1.5);
  }
  for(const [id,t] of this.trails)if(!moving.has(id)){this.root.remove(t.g);this.trails.delete(id);}
 }
 reset(){this.root.clear();this.events.length=0;this.trails.clear();}
 dispose(){this.reset();this.root.removeFromParent();Object.values(this.geos).forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.materials.clear();}
}
