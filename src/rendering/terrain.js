import * as T from '../../vendor/three.module.js';
import {seededRandom} from '../core/math.js';
import {detected,interiorClear,polygonArea,dimensions} from '../core/terrain.js';
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
  // Use the same polygon vertices as the simulation and minimap.
  const region=(z,color,opacity,edge,level)=>{
   const shape=new T.Shape();z.points.forEach((p,i)=>i?shape.lineTo(p.x,-p.y):shape.moveTo(p.x,-p.y));shape.closePath();
   const fill=this.mesh(this.own(new T.ShapeGeometry(shape)),this.own(new T.MeshBasicMaterial({color,opacity,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false})),0,level,0);fill.rotation.x=-Math.PI/2;
   const geo=this.own(new T.BufferGeometry().setFromPoints([...z.points,z.points[0]].map(p=>new T.Vector3(p.x,.12,p.y))));
   const line=new T.Line(geo,this.own(new T.LineBasicMaterial({color:edge,transparent:true,opacity:.65,toneMapped:false})));line.userData={terrainBoundary:true};this.root.add(line);
  };
  // Instanced rock clusters keep the expanded terrain inexpensive to draw.
  const samples=[];
  for(const [regions,dense] of [[map.dense,true],[map.sparse,false]])for(const z of regions){
   const b=z.bounds,area=polygonArea(z),count=Math.min(dense?1700:115,Math.max(28,Math.round(area/(dense?4100:6500))));
   for(let i=0,tries=0;i<count&&tries<count*25;tries++){
    const x=b.minX+rng()*(b.maxX-b.minX),y=b.minY+rng()*(b.maxY-b.minY),s=(dense?15:5)+rng()*(dense?25:12);
    if(!interiorClear({x,y},z,s*1.25))continue;
    samples.push({x,y,s,dense});i++;
   }
  }
  if(samples.length){const inst=this.own(new T.InstancedMesh(rockGeo,rockMat,samples.length)),o=new T.Object3D();samples.forEach(({x,y,s,dense},i)=>{o.position.set(x,s*.18,y);o.scale.set(s,s*(.6+rng()*.6),s*(.65+rng()*.5));o.rotation.set(rng()*3,rng()*6,rng()*3);o.updateMatrix();inst.setMatrixAt(i,o.matrix);inst.setColorAt(i,new T.Color().setHSL(.09,.12+rng()*.12,(dense?.42:.35)+rng()*.28));});inst.instanceMatrix.needsUpdate=true;inst.computeBoundingSphere();this.root.add(inst);}
  for(const z of map.nebula)region(z,0x553887,.18,0x917abf,-7);
  for(const z of map.sparse)region(z,0x968262,.10,0xa99570,-3);
  for(const z of map.dense)region(z,0x544940,.40,0xd5a879,-2);
  for(const p of map.deposits){this.flatRing(p.x,p.y,31,31,0x49e8b4,.8,.035);for(let i=0;i<7;i++){const a=i*2.399963,r=i?12+rng()*8:0;const o=this.mesh(crystalGeo,crystalMat,p.x+r*Math.cos(a),8,p.y+r*Math.sin(a));o.scale.set(5+rng()*5,11+rng()*12,5+rng()*4);o.rotation.z=(rng()-.5)*.55;}}
  for(let i=0;i<map.portals.length;i++){const p=map.portals[i],active=i===map.activePortal,col=active?0xa987ff:0x66778b;this.disc(p.x,p.y,48,48,col,active?.19:.05,-1);const ring=this.flatRing(p.x,p.y,49,49,col,active?.95:.5,.045);this.flatRing(p.x,p.y,62,62,col,.46,.015);this.portals.push({ring,active});}
  this.flatRing(map.base.x,map.base.y,map.safeRadius,map.safeRadius,0x4b9da7,.26,.004);
  const {width,height}=dimensions(map),boundary=this.own(new T.BufferGeometry().setFromPoints([[0,0],[width,0],[width,height],[0,height],[0,0]].map(([x,y])=>new T.Vector3(x,0,y))));
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
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,{width,height}=dimensions(state.map),sx=w/width,sy=h/height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#07121c';ctx.fillRect(0,0,w,h);
 const ellipse=(p,rx,ry,fill,stroke)=>{ctx.beginPath();ctx.ellipse(p.x*sx,p.y*sy,rx*sx,ry*sy,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}};
 const polygon=(z,fill,stroke)=>{ctx.beginPath();z.points.forEach((p,i)=>i?ctx.lineTo(p.x*sx,p.y*sy):ctx.moveTo(p.x*sx,p.y*sy));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.stroke();};
 if(state.map){const m=state.map;for(const p of m.nebula)polygon(p,'#423060','#8e72bb');for(const p of m.sparse)polygon(p,'#3c352b','#8d7958');for(const p of m.dense)polygon(p,'#6b5745','#c19b70');ellipse(m.base,m.safeRadius,m.safeRadius,null,'#327786');for(const p of m.deposits)ellipse(p,Math.max(22,width/90),Math.max(22,height/90),'#45dcb2');m.portals.forEach((p,i)=>ellipse(p,Math.max(38,width/80),Math.max(38,height/80),null,i===m.activePortal?'#c5a1ff':'#64748b'));}
 for(const e of state.entities)if(detected(state,e)){ctx.fillStyle=e.faction==='friendly'?'#70d8f4':'#f26b91';const r=e.kind==='frigate'?3.5:2;ctx.fillRect(e.x*sx-r,e.y*sy-r,r*2,r*2);}
 const a=camera.screenToWorld(0,0),b=camera.screenToWorld(camera.width,camera.height);ctx.strokeStyle='#d0ebf6';ctx.lineWidth=1;ctx.strokeRect(a.x*sx,a.y*sy,(b.x-a.x)*sx,(b.y-a.y)*sy);
}
