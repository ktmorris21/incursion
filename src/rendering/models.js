import * as T from '../../vendor/three.module.js';
// Model templates own shared geometry and materials. Instances own transforms only.
export class ModelRegistry {
 constructor(){this.cache=new Map();this.geometry=new Set();this.materials=new Set();}
 get(kind,faction){const key=faction+':'+kind;if(!this.cache.has(key))this.cache.set(key,this.build(kind,faction));return this.cache.get(key).clone(true);}
 build(kind,faction){
 const hostile=faction==='hostile',g=new T.Group();
 const mat=(color,metalness=.66,roughness=.42,emissive=0,emissiveIntensity=0)=>{const m=new T.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity});this.materials.add(m);return m;};
 const hull=mat(hostile?0x55515a:0x737d87),plate=mat(hostile?0x89828c:0xa0a9b1),dark=mat(0x242a30,.55,.64),trim=mat(0x48515a),light=mat(hostile?0x9c203f:0x267a9e,.25,.3,hostile?0xff174d:0x38bfff,2.2),glass=mat(0x132b3a,.7,.24,0x10405b,.35);
 const mesh=(geo,m,x=0,y=0,z=0)=>{this.geometry.add(geo);const o=new T.Mesh(geo,m);o.position.set(x,y,z);g.add(o);return o;};
 const box=(x,y,z,a,b,c,m=hull)=>mesh(new T.BoxGeometry(a,b,c),m,x,y,z);
 const shape=(pts,y,depth,m=hull,bevel=.65)=>{const s=new T.Shape();pts.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1});geo.rotateX(-Math.PI/2);return mesh(geo,m,0,y,0);};
 const engine=(x,z,w=8)=>{box(x,2,z,13,7,w,dark);box(x+2,5,z,9,3,w+1,trim);box(x-7,2,z,1.2,3,w*.62,light);};
 const rib=(x,z,w=7)=>box(x,5.8,z,1.4,.45,w,dark);
 const outline=kind==='carrier'?[[-48,-27],[-32,-34],[24,-34],[47,-20],[55,0],[47,20],[24,34],[-32,34],[-48,27]]:kind==='destroyer'?[[-45,-26],[-19,-27],[13,-13],[57,-5],[65,0],[57,5],[13,13],[-19,27],[-45,26]]:kind==='missile'?[[-46,-17],[-24,-23],[23,-18],[54,-7],[61,0],[54,7],[23,18],[-24,23],[-46,17]]:[[-45,-18],[-28,-23],[21,-19],[52,-8],[58,0],[52,8],[21,19],[-28,23],[-45,18]];
 if(kind==='station'){
 mesh(new T.CylinderGeometry(43,49,12,8),hull,0,5,0);mesh(new T.CylinderGeometry(28,34,9,8),plate,0,15,0);mesh(new T.CylinderGeometry(13,18,13,6),dark,0,24,0);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;const p=box(59*Math.cos(a),4,59*Math.sin(a),44,9,12,trim);p.rotation.y=-a;const q=box(76*Math.cos(a),9,76*Math.sin(a),8,4,13,light);q.rotation.y=-a;}
 g.scale.setScalar(.72);
 }else{
 const pts=hostile?outline.map(([x,z])=>[x+(x>0?4:0),z*(x<0?1.12:.9)]):outline;
 shape(pts,-3,7,hull,1.35);
 shape([[-34,-7],[22,-9],[45,-3],[50,0],[45,3],[22,9],[-34,7]],4,7,plate,.85);
 for(const side of [-1,1]){
 const z=side*(kind==='carrier'?22:kind==='destroyer'?18:12);
 engine(-43,z,kind==='carrier'?12:8);
 shape([[-32,z-side*5],[-21,z-side*8],[17,z-side*6],[28,z],[13,z+side*5],[-24,z+side*5]],4,2.4,trim,.45);
 for(let i=0;i<5;i++)rib(-24+i*8,z,kind==='carrier'?8:5);
 if(kind==='carrier'){box(-3,7,z,34,1.1,12,dark);for(let i=0;i<4;i++){box(-15+i*10,7.7,z,1,.35,10,plate);}box(-2,8,z+side*5,28,.55,.6,light);}
 if(kind==='missile')for(let i=0;i<5;i++){box(-20+i*8,8,z,5,4,6,plate);box(-20+i*8,10.1,z,3,.3,3,dark);}
 if(kind==='destroyer'){box(22,10,side*4,46,5,3,trim);box(44,10,side*4,5,2,1.1,light);}
 if(kind==='miner'||kind==='constructor'){box(-10,9,z,22,6,10,trim);box(22,5,z,25,4,5,plate);}
 }
 box(-8,13,0,18,5,10,hull);box(0,15,0,7,2,8,glass);
 if(kind==='frigate'){box(-14,18,0,8,6,7,plate);box(-14,24,0,1.2,8,1.2,dark);box(-14,28,0,2.5,1,2.5,light);}
 if(hostile){for(let i=0;i<4;i++){const x=-22+i*13;box(x,8,0,5,3,17,trim);}box(28,10,0,15,.8,1,light);}
 g.scale.setScalar(.52);
 }
 return g;
 }
 clear(){this.cache.clear();for(const x of this.geometry)x.dispose();for(const x of this.materials)x.dispose();this.geometry.clear();this.materials.clear();}
}
