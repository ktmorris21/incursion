import * as T from '../../vendor/three.module.js';
import {seededRandom} from '../core/math.js';
import {detected} from '../core/terrain.js';
// Terrain geometry is derived from the authoritative map, not a separate collision model.
export class TerrainView{
 constructor(scene){this.root=new T.Group();scene.add(this.root);this.map=null;this.resources=new Set();this.portals=[];this.path=null;this.pathKey='';}
 own(x){this.resources.add(x);return x;}
 mesh(geo,mat,x,y,z){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);this.root.add(o);return o;}
 flatRing(x,y,rx,ry,color,opacity=.7,width=.015){
  const mat=this.own(new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
  const o=this.mesh(this.own(new T.RingGeometry(1-width,1,96)),mat,x,.15,y);o.rotation.x=-Math.PI/2;o.scale.set(rx,ry,1);return o;
 }
 disc(x,y,rx,ry,color,opacity,level=-4){
  const mat=this.own(new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  const o=this.mesh(this.own(new T.CircleGeometry(1,80)),mat,x,level,y);o.rotation.x=-Math.PI/2;o.scale.set(rx,ry,1);return o;
 }
 setMap(map){
  if(map===this.map)return;this.clear();this.map=map;if(!map)return;
  const rng=seededRandom(map.seed+'-terrain-'+map.attempt);
  const rockGeo=this.own(new T.IcosahedronGeometry(1,1)),rockMat=this.own(new T.MeshStandardMaterial({color:0x847b70,roughness:.96,metalness:.17}));
  const crystalGeo=this.own(new T.OctahedronGeometry(1)),crystalMat=this.own(new T.MeshStandardMaterial({color:0x44caae,emissive:0x08785f,emissiveIntensity:1.3,metalness:.35,roughness:.42}));
  const rocks=(z,dense)=>{
   const rx=dense?z.r:z.rx,ry=dense?z.r:z.ry;
   const count=dense?Math.max(18,Math.round(z.r*z.r/320)):22;
   for(let i=0;i<count;i++){const a=rng()*Math.PI*2,s=(dense?10:5)+rng()*(dense?18:9),rad=Math.sqrt(rng())*Math.max(.1,1-s*1.2/Math.min(rx,ry)),x=z.x+rx*rad*Math.cos(a),y=z.y+ry*rad*Math.sin(a);
    const o=this.mesh(rockGeo,rockMat,x,s*.18,y);o.scale.set(s,s*(.6+rng()*.6),s*(.65+rng()*.5));o.rotation.set(rng()*3,rng()*6,rng()*3);}
  };
  for(const z of map.nebula){
   this.disc(z.x,z.y,z.rx,z.ry,0x553887,.15,-7);
   for(let i=0;i<13;i++){const a=rng()*6.283,rad=rng()*.52,k=.25+rng()*.2;this.disc(z.x+Math.cos(a)*z.rx*rad,z.y+Math.sin(a)*z.ry*rad,z.rx*k,z.ry*k,0x7352ac,.05,-6+i*.02);}
   this.flatRing(z.x,z.y,z.rx,z.ry,0xa68bd8,.58,.012);
  }
  for(const z of map.sparse){this.disc(z.x,z.y,z.rx,z.ry,0x968262,.075,-3);rocks(z,false);this.flatRing(z.x,z.y,z.rx,z.ry,0xa99570,.5,.012);}
  for(const z of map.dense){this.disc(z.x,z.y,z.r,z.r,0x544940,.32,-2);rocks(z,true);this.flatRing(z.x,z.y,z.r,z.r,0xd5a879,.78,.018);}
  for(const p of map.deposits){this.flatRing(p.x,p.y,31,31,0x49e8b4,.8,.035);for(let i=0;i<7;i++){const a=i*2.399963,r=i?12+rng()*8:0;const o=this.mesh(crystalGeo,crystalMat,p.x+r*Math.cos(a),8,p.y+r*Math.sin(a));o.scale.set(5+rng()*5,11+rng()*12,5+rng()*4);o.rotation.z=(rng()-.5)*.55;}}
  for(let i=0;i<map.portals.length;i++){const p=map.portals[i],active=i===map.activePortal,col=active?0xa987ff:0x66778b;this.disc(p.x,p.y,48,48,col,active?.19:.05,-1);const ring=this.flatRing(p.x,p.y,49,49,col,active?.95:.5,.045);this.flatRing(p.x,p.y,62,62,col,.46,.015);this.portals.push({ring,active});}
  this.flatRing(map.base.x,map.base.y,map.safeRadius,map.safeRadius,0x4b9da7,.26,.004);
  const boundary=this.own(new T.BufferGeometry().setFromPoints([[0,0],[1800,0],[1800,1800],[0,1800],[0,0]].map(([x,y])=>new T.Vector3(x,0,y))));
  this.root.add(new T.Line(boundary,this.own(new T.LineBasicMaterial({color:0x4a6474,transparent:true,opacity:.55}))));
 }
 update(map,time,route,position,showPath){
  this.setMap(map);if(!map)return;
  for(const p of this.portals)if(p.active)p.ring.material.opacity=.8+.15*Math.sin(time*2);
  const key=showPath&&position&&route?.length?[position,...route].map(p=>Math.round(p.x)+','+Math.round(p.y)).join(';'):'';
  if(key===this.pathKey)return;this.pathKey=key;
  if(this.path){this.root.remove(this.path);this.path.geometry.dispose();this.path.material.dispose();this.path=null;}
  if(key){const geo=new T.BufferGeometry().setFromPoints([position,...route].map(p=>new T.Vector3(p.x,2,p.y)));this.path=new T.Line(geo,new T.LineBasicMaterial({color:0x70e9ff}));this.root.add(this.path);}
 }
 clear(){if(this.path){this.path.geometry.dispose();this.path.material.dispose();this.path=null;}this.root.clear();for(const a of this.resources)a.dispose();this.resources.clear();this.portals=[];this.map=null;this.pathKey='';}
 dispose(){this.clear();this.root.removeFromParent();}
}
export function drawMinimap(canvas,state,camera){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,sx=w/1800,sy=h/1800;ctx.clearRect(0,0,w,h);ctx.fillStyle='#07121c';ctx.fillRect(0,0,w,h);
 const ellipse=(p,rx,ry,fill,stroke)=>{ctx.beginPath();ctx.ellipse(p.x*sx,p.y*sy,rx*sx,ry*sy,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}};
 if(state.map){const m=state.map;for(const p of m.nebula)ellipse(p,p.rx,p.ry,'#423060','#8e72bb');for(const p of m.sparse)ellipse(p,p.rx,p.ry,'#3c352b','#8d7958');for(const p of m.dense)ellipse(p,p.r,p.r,'#6b5745','#c19b70');ellipse(m.base,m.safeRadius,m.safeRadius,null,'#327786');for(const p of m.deposits)ellipse(p,22,22,'#45dcb2');m.portals.forEach((p,i)=>ellipse(p,38,38,null,i===m.activePortal?'#c5a1ff':'#64748b'));}
 for(const e of state.entities)if(detected(state,e)){ctx.fillStyle=e.faction==='friendly'?'#70d8f4':'#f26b91';const r=e.kind==='frigate'?3.5:2;ctx.fillRect(e.x*sx-r,e.y*sy-r,r*2,r*2);}
 const a=camera.screenToWorld(0,0),b=camera.screenToWorld(camera.width,camera.height);ctx.strokeStyle='#d0ebf6';ctx.lineWidth=1;ctx.strokeRect(a.x*sx,a.y*sy,(b.x-a.x)*sx,(b.y-a.y)*sy);
}
