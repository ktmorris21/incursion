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

 // Dedicated role silhouettes, all authored nose-first along local +X.
 // Keep the same origin, yaw convention, scale and shared resource ownership.
 const cylinder=(x,y,z,r1,r2,h,m=hull,n=12)=>mesh(new T.CylinderGeometry(r1,r2,h,n),m,x,y,z);
 const roleModel=['missile','frigate','miner','constructor'].includes(kind);
 if(roleModel){
 if(kind==='missile'){
 // Twin long magazine/launcher banks around a narrow armored keel.
 // Open channels between the keel and the banks make the silhouette legible.
 shape([[-49,-10],[-33,-12],[26,-8],[54,-5],[60,0],[54,5],[26,8],[-33,12],[-49,10]],-3,8,hull,1.1);
 shape([[-39,-7],[13,-7],[29,-4],[43,0],[29,4],[13,7],[-39,7]],5,4,plate,.7);
 for(const side of [-1,1]){
 const z=side*24;
 box(-32,0,side*15,13,6,19,trim);
 box(30,0,side*15,10,5,18,trim);
 const pod=hostile?[[-46,-4],[-35,-8],[25,-8],[43,-4],[46,0],[43,4],[25,8],[-35,8],[-46,4]]:[[-45,-5],[-39,-8],[39,-8],[46,-4],[46,4],[39,8],[-39,8],[-45,5]];
 shape(pod.map(([x,d])=>[x,z+d]),-2,9,hull,1.05);
 box(-3,8,z,68,2,12,trim);
 for(let i=0;i<6;i++){
 const x=-29+i*11;
 box(x,10,z,8,2,10,plate);
 box(x,11.1,z,5.8,.4,7,dark);
 for(const dz of [-2,2])box(x,11.45,z+dz,2.2,.6,2.1,trim);
 }
 engine(-43,z,10);
 box(42,4,z,3,3,9,dark);
 box(45,4,z,1,1.5,5,light);
 }
 engine(-44,0,9);
 box(-12,11,0,18,6,10,hull);
 box(-4,15,0,8,2,8,glass);
 if(hostile){
 for(let i=0;i<4;i++)box(-28+i*11,8,0,4,2,13,trim);
 box(29,8,0,15,.8,1,light);
 }
 }else if(kind==='frigate'){
 // Long, slender command spine; swept communications outriggers aft.
 // A raised bridge and twin antenna towers distinguish it from combat wedges.
 shape([[-52,-10],[-40,-13],[0,-9],[26,-6],[61,-2],[66,0],[61,2],[26,6],[0,9],[-40,13],[-52,10]],-3,7,hull,1);
 shape([[-39,-7],[17,-5],[52,0],[17,5],[-39,7]],4,5,plate,.7);
 for(const side of [-1,1]){
 shape([[-43,side*7],[-37,side*28],[-25,side*26],[-5,side*9]],0,5,trim,.8);
 shape([[-43,side*24],[-36,side*30],[-19,side*29],[-14,side*25],[-19,side*22],[-38,side*22]],3,4,hull,.6);
 box(-27,10,side*26,16,3,5,plate);
 box(-27,12,side*26,12,1,3,dark);
 box(-39,8,side*27,4,1.2,3,light);
 engine(-43,side*8,8);
 }
 shape([[-31,-9],[-24,-12],[-2,-11],[8,-5],[8,5],[-2,11],[-24,12],[-31,9]],9,9,hull,.8);
 box(-3,19,0,13,2,10,glass);
 box(-22,20,0,9,4,10,plate);
 for(const side of [-1,1]){
 box(-23,26,side*3.4,1.6,10,1.6,trim);
 box(-23,32,side*3.4,2.7,1.5,2.7,light);
 }
 box(24,10,0,14,2,3,trim);
 box(30,11.5,0,3,1,2,light);
 }else if(kind==='miner'){
 // Compact, broad industrial hull, massive paired extraction/processing drums,
 // solid blunt nose and rear storage tanks rather than a military prow.
 shape([[-37,-27],[-28,-35],[19,-35],[35,-27],[40,-15],[40,15],[35,27],[19,35],[-28,35],[-37,27]],-4,10,hull,1.5);
 shape([[-31,-22],[-22,-28],[10,-28],[17,-18],[17,18],[10,28],[-22,28],[-31,22]],6,5,trim,.85);
 for(const side of [-1,1]){
 const z=side*21;
 cylinder(23,8,z,15,16,10,dark,12);
 cylinder(23,15,z,12,14,5,plate,12);
 cylinder(23,18,z,8,8,2,trim,12);
 cylinder(23,19.2,z,4,4,1.8,light,10);
 for(let i=0;i<6;i++){
 const a=i*Math.PI/3;
 const tooth=box(23+12*Math.cos(a),18,z+12*Math.sin(a),5,3,3,trim);
 tooth.rotation.y=-a;
 }
 const tank=cylinder(-17,10,z,8,8,23,hull,12);tank.rotation.z=Math.PI/2;
 for(const x of [-24,-9])box(x,12,z,2,10,17,trim);
 engine(-33,z,12);
 }
 box(1,12,0,18,8,13,hull);
 box(8,17,0,8,2,11,glass);
 box(35,5,0,9,5,14,trim);
 box(40,5,0,1.5,3,8,light);
 }else{
 // Construction tender: open-front U-frame with articulated asymmetric
 // fabrication arms, a rear machinery deck and an offset operator cab.
 shape([[-46,-20],[-37,-28],[-13,-28],[2,-19],[2,19],[-13,28],[-37,28],[-46,20]],-3,9,hull,1.1);
 box(-25,7,0,31,5,40,trim);
 for(const side of [-1,1]){
 const z=side*20;
 const end=side===1?47:39;
 shape([[-24,z-side*6],[15,z-side*5],[end-7,z-side*4],[end,z],[end-7,z+side*5],[-24,z+side*6]],0,7,hull,.85);
 box(-1,8,z,36,3,8,plate);
 for(const x of [5,24]){
 cylinder(x,10,z,5.8,5.8,4,trim,10);
 cylinder(x,12.5,z,2.4,2.4,1.5,dark,10);
 }
 box(end-3,5,z,13,5,9,trim);
 const claw=box(end+1,5,z-side*5,9,4,4,plate);claw.rotation.y=side*.55;
 box(end-1,7,z-side*4,3,1,3,light);
 engine(-42,z,9);
 }
 box(-24,13,-12,17,9,14,hull);
 box(-16,18,-12,8,2,12,glass);
 box(-23,11,11,20,5,16,plate);
 for(let i=0;i<4;i++)box(-30+i*5,14,11,1.5,1,12,dark);
 }
 g.scale.setScalar(.52);
 return g;
 }
 const outline=kind==='carrier'?[[-48,-27],[-32,-34],[24,-34],[47,-20],[55,0],[47,20],[24,34],[-32,34],[-48,27]]:kind==='destroyer'?[[-45,-26],[-19,-27],[13,-13],[57,-5],[65,0],[57,5],[13,13],[-19,27],[-45,26]]:[[-45,-18],[-28,-23],[21,-19],[52,-8],[58,0],[52,8],[21,19],[-28,23],[-45,18]];
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
 if(kind==='destroyer'){box(22,10,side*4,46,5,3,trim);box(44,10,side*4,5,2,1.1,light);}
 }
 box(-8,13,0,18,5,10,hull);box(0,15,0,7,2,8,glass);
 if(hostile){for(let i=0;i<4;i++){const x=-22+i*13;box(x,8,0,5,3,17,trim);}box(28,10,0,15,.8,1,light);}
 g.scale.setScalar(.52);
 }
 return g;
 }
 clear(){this.cache.clear();for(const x of this.geometry)x.dispose();for(const x of this.materials)x.dispose();this.geometry.clear();this.materials.clear();}
}
