import {CONFIG} from '../config.js';
import {TAU} from '../core/math.js';
import {headingFrame} from './projection.js';

// Artwork lives entirely in the rendering layer. These are display dimensions, not hitboxes.
const PALETTES={
  friendly:{base:'#647f98',light:'#b6d1e3',dark:'#263c51',edge:'#172838',panel:'#3d566b',accent:'#56edff',glow:'#15b9f6',shade:'#0d1927'},
  hostile:{base:'#765469',light:'#c49aa5',dark:'#3c263f',edge:'#281c35',panel:'#583b58',accent:'#ff8199',glow:'#f43d73',shade:'#1b1127'}
};
const OUTLINES={
  frigate:[[-43,-12],[-29,-22],[13,-22],[44,-10],[57,0],[44,10],[13,22],[-29,22],[-43,12]],
  carrier:[[-48,-29],[-19,-29],[-9,-37],[27,-37],[45,-21],[40,-10],[55,0],[40,10],[45,21],[27,37],[-9,37],[-19,29],[-48,29],[-38,12],[-45,0],[-38,-12]],
  missile:[[-42,-16],[-26,-22],[5,-22],[19,-15],[52,-8],[59,0],[52,8],[19,15],[5,22],[-26,22],[-42,16]],
  destroyer:[[-38,-29],[-14,-29],[9,-16],[40,-11],[60,0],[40,11],[9,16],[-14,29],[-38,29],[-30,10],[-45,0],[-30,-10]],
  miner:[[-32,-23],[3,-23],[3,-16],[26,-16],[26,-8],[42,-8],[42,8],[26,8],[26,16],[3,16],[3,23],[-32,23]],
  constructor:[[-34,-15],[-19,-24],[8,-24],[12,-12],[34,-18],[43,-11],[20,0],[43,11],[34,18],[12,12],[8,24],[-19,24],[-34,15]]
};
const HOSTILE={
  carrier:[[-43,0],[-38,-23],[-17,-36],[14,-41],[40,-34],[54,-15],[31,-20],[15,-13],[45,0],[15,13],[31,20],[54,15],[40,34],[14,41],[-17,36],[-38,23]],
  missile:[[-43,-12],[-30,-24],[-3,-26],[19,-18],[48,-10],[60,0],[48,10],[19,18],[-3,26],[-30,24],[-43,12],[-26,0]],
  destroyer:[[-39,-28],[-10,-35],[24,-26],[53,-7],[64,0],[53,7],[24,26],[-10,35],[-39,28],[-20,11],[-35,0],[-20,-11]]
};
const RADII={station:113,frigate:72,carrier:72,missile:70,destroyer:74,miner:53,constructor:53};
const poly=(n,r,phase=0)=>Array.from({length:n},(_,i)=>[Math.cos(phase+i*TAU/n)*r,Math.sin(phase+i*TAU/n)*r]);
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const scale=(p,k)=>p.map(([x,y])=>[x*k,y*k]);
function makeCanvas(size){const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(size,size):document.createElement('canvas');c.width=size;c.height=size;return c;}

function paint(kind,faction,heading){
  const palette=PALETTES[faction]??PALETTES.friendly,r=RADII[kind]??65,ppu=CONFIG.visuals.spritePixelsPerUnit,size=Math.ceil(r*2*ppu);
  const canvas=makeCanvas(size),ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas 2D sprite context unavailable');
  ctx.setTransform(ppu,0,0,ppu,size/2,size/2);
  const ca=Math.cos(heading),sa=Math.sin(heading),compression=CONFIG.camera.compression;
  const point=([x,y],z=0)=>[x*ca-y*sa,(x*sa+y*ca)*compression-z];
  function path(points,z){ctx.beginPath();for(let i=0;i<points.length;i++){const [x,y]=point(points[i],z);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();}
  function flat(points,z,fill,stroke=null,width=.65){path(points,z);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function line(points,z,color,width=1){ctx.beginPath();for(let i=0;i<points.length;i++){const [x,y]=point(points[i],z);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
  function glow(points,z,width=1.9){ctx.save();ctx.shadowColor=palette.glow;ctx.shadowBlur=7*ppu;line(points,z,palette.accent,width);ctx.restore();}
  function solid(points,z,thickness,top=palette.base){
    // Paint only visible skirt faces, then a top surface with consistent screen-space lighting.
    const sides=[];
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],p=point(a,z),q=point(b,z);if(q[0]<p[0])sides.push({p,q,A:point(a,z-thickness),B:point(b,z-thickness),depth:(p[1]+q[1])/2});}
    sides.sort((a,b)=>a.depth-b.depth);
    for(const s of sides){ctx.beginPath();ctx.moveTo(...s.p);ctx.lineTo(...s.q);ctx.lineTo(...s.B);ctx.lineTo(...s.A);ctx.closePath();ctx.fillStyle=palette.dark;ctx.fill();ctx.strokeStyle=palette.edge;ctx.lineWidth=.8;ctx.stroke();}
    flat(points,z,top,palette.edge,1.15);
    // Directional highlight is always lit from upper left of the screen.
    path(points,z);const g=ctx.createLinearGradient(-r*.7,-r*.65,r*.65,r*.55);g.addColorStop(0,'rgba(225,248,255,.32)');g.addColorStop(.48,'rgba(255,255,255,.025)');g.addColorStop(1,'rgba(0,0,0,.42)');ctx.fillStyle=g;ctx.fill();
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],p=point(a,z),q=point(b,z);if(q[0]>p[0])line([a,b],z,'rgba(220,240,255,.38)',.7);}
  }
  function engine(x,y,w=11,h=7,z=4){solid(rect(x,y-h/2,w,h),z,3,palette.dark);flat(rect(x+1,y-h/2+1,2,h-2),z+.1,palette.accent);glow([[x,y-h/2+1],[x,y+h/2-1]],z,2.2);}
  function vents(x,y,count,z){for(let i=0;i<count;i++)flat(rect(x+i*4,y,1.7,7),z,palette.shade);}
  function rivet(x,y,z){const p=point([x,y],z);ctx.fillStyle=palette.light;ctx.fillRect(p[0]-.65,p[1]-.65,1.3,1.3);}
  if(kind==='station'){
    // Hexagonal command citadel, docking spokes, segmented outer ring, raised command core.
    for(let i=0;i<4;i++){const a=i*Math.PI/2;const turn=([x,y])=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];solid([[-65,-13],[65,-13],[65,13],[-65,13]].map(turn),4,8,palette.panel);}
    solid(poly(12,67,Math.PI/12),7,12,palette.dark);flat(poly(12,58,Math.PI/12),7.2,palette.base,palette.edge,1);
    for(let i=0;i<12;i++){const a=i*TAU/12,local=([x,y])=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];solid([[46,-8],[63,-8],[65,0],[63,8],[46,8]].map(local),9,4,palette.panel);glow([[58,-4],[58,4]].map(local),10,2);}
    solid(poly(8,34,Math.PI/8),17,10,palette.light);solid(poly(6,23),27,10,palette.base);solid(poly(6,11),32,6,palette.dark);glow(poly(6,15).concat([poly(6,15)[0]]),28,2.1);
    for(const [x,y] of [[-67,0],[67,0],[0,-67],[0,67]]){solid(rect(x-10,y-8,20,16),12,7,palette.light);glow([[x-5,y],[x+5,y]],13,2);}
  }else{
    const hostile=faction==='hostile';const hull=hostile&&Object.hasOwn(HOSTILE,kind)?HOSTILE[kind]:Object.hasOwn(OUTLINES,kind)?OUTLINES[kind]:OUTLINES.frigate;
    solid(hull,5,8,palette.base);flat(scale(hull,.78),5.3,palette.panel,palette.dark,.7);
    if(hostile){
      // Organic/segmented silhouettes and repeated armor plates, not just recolored allies.
      for(let j=0;j<5;j++){const x=-29+j*13,w=kind==='carrier'?25-Math.abs(j-2)*4:kind==='destroyer'?24-j*3:18-j*2;solid([[x-5,-w],[x+6,-w*.8],[x+10,0],[x+6,w*.8],[x-5,w],[x,0]],8+j*.7,3,j%2?palette.panel:palette.base);}
      solid([[-21,-7],[17,-10],[47,0],[17,10],[-21,7]],14,6,palette.dark);glow([[-12,0],[35,0],[47,0]],14,2.6);
      for(const s of [-1,1]){glow([[-29,s*13],[-7,s*17],[12,s*13]],9,1.9);engine(-37,s*12,11,6,6);}
      if(kind==='carrier')for(const s of [-1,1]){solid([[-3,s*24],[13,s*29],[36,s*24],[43,s*17],[12,s*18]],10,4,palette.shade);glow([[7,s*24],[32,s*22]],10.5,2.5);}
      if(kind==='missile')for(const s of [-1,1])for(let i=0;i<4;i++){const x=-11+i*7;solid(rect(x,s*13-2.5,5,5),13,3,palette.light);flat(rect(x+1,s*13-1.3,2,2.6),13.5,palette.accent);}
      if(kind==='destroyer'){solid([[26,-7],[53,-5],[59,0],[53,5],[26,7]],17,6,palette.light);glow([[50,-4],[56,0],[50,4]],18,3);}
    }else{
      for(const s of [-1,1]){engine(-42,s*(kind==='carrier'?22:kind==='destroyer'?17:11),15,8,6);glow([[-28,s*8],[-15,s*8]],6,1.8);}
      if(kind==='carrier'){
        for(const s of [-1,1]){solid([[-33,s*13],[-19,s*31],[23,s*31],[37,s*22],[30,s*13]],9,5,palette.base);flat([[-26,s*17],[-13,s*27],[22,s*27],[30,s*20],[22,s*17]],9.4,palette.shade,palette.edge,1);for(let j=0;j<4;j++)line([[-15+j*10,s*19],[-15+j*10,s*25]],10,palette.light,.8);glow([[-22,s*16],[24,s*16]],10,1.8);glow([[-22,s*28],[21,s*28]],10,1.8);}
        solid([[-24,-9],[16,-9],[31,0],[16,9],[-24,9]],16,7,palette.light);solid(rect(-11,-6,18,12),20,4,palette.dark);glow([[4,-5],[9,0],[4,5]],20,2.1);
      }else if(kind==='missile'){
        solid([[-28,-8],[14,-9],[40,-4],[48,0],[40,4],[14,9],[-28,8]],12,6,palette.light);
        for(const s of [-1,1]){solid(rect(-24,s*14-5,38,10),10,5,palette.dark);for(let i=0;i<5;i++){const x=-22+i*7;solid(rect(x,s*14-3,5,6),11,2,palette.light);flat(rect(x+.6,s*14-2,2.6,4),11.2,palette.shade);glow([[x+3,s*14],[x+4,s*14]],11.5,1.1);}}
        solid(rect(-15,-5,20,10),18,6,palette.dark);glow([[3,-4],[8,0],[3,4]],18,2.1);
      }else if(kind==='destroyer'){
        for(const s of [-1,1]){solid([[-35,s*10],[-18,s*24],[0,s*22],[18,s*8],[5,s*5]],11,6,palette.light);vents(-26,s*13-3,4,11.5);glow([[-29,s*18],[-16,s*18]],12,2);}
        solid([[-25,-7],[21,-10],[48,-6],[58,0],[48,6],[21,10],[-25,7]],15,8,palette.base);solid(rect(12,-4,40,8),19,6,palette.light);glow([[48,-4],[55,0],[48,4]],20,3.2);solid(rect(-15,-7,17,14),21,6,palette.dark);glow([[-2,-5],[4,0],[-2,5]],21,2.3);
      }else if(kind==='frigate'){
        for(const s of [-1,1]){solid([[-27,s*9],[-21,s*18],[7,s*18],[25,s*9],[7,s*5]],11,6,palette.light);vents(-20,s*12-3,4,11.6);glow([[-23,s*17],[8,s*17]],12,1.6);}
        solid([[-28,-7],[17,-10],[43,-4],[51,0],[43,4],[17,10],[-28,7]],15,7,palette.base);solid([[-12,-7],[8,-7],[19,0],[8,7],[-12,7]],22,7,palette.light);flat([[4,-5],[12,0],[4,5],[-3,4],[-3,-4]],22.5,palette.dark);glow([[4,-4],[11,0],[4,4]],23,2);solid(rect(-23,-3,7,6),24,9,palette.dark);glow([[-22,0],[-16,0]],25,2);
      }else if(kind==='miner'){
        solid(rect(-25,-14,26,28),13,8,palette.light);for(let i=0;i<3;i++){solid(rect(-22+i*8,-11,6,22),15,3,'#c4a16b');line([[-22+i*8,-8],[-16+i*8,-8]],15.5,palette.dark,.7);}for(const s of [-1,1]){solid(rect(0,s*13-4,23,8),10,5,palette.dark);solid([[21,s*13-4],[38,s*10],[43,s*4],[28,s*3]],10,6,'#e1b36b');}solid(rect(1,-8,16,16),19,8,palette.base);glow([[11,-6],[15,0],[11,6]],20,2);
      }else if(kind==='constructor'){
        solid(rect(-22,-12,29,24),13,8,palette.light);solid(rect(-6,-6,15,12),20,7,palette.dark);glow([[4,-5],[9,0],[4,5]],20,2);for(const s of [-1,1]){solid([[-1,s*12],[17,s*16],[35,s*12],[42,s*5],[35,s*2],[14,s*8]],10,6,'#c4a16b');solid(rect(28,s*8-3,11,6),12,5,palette.dark);glow([[35,s*8],[40,s*7]],13,2);}
      }
      for(const p of [[-27,-6],[-27,6],[14,-5],[14,5]])rivet(...p,6.2);
    }
  }
  return {image:canvas,source:null,width:size/ppu,height:size/ppu,anchorX:.5,anchorY:.5,hitRadius:kind==='station'?72:r*.7,attachmentPoints:{engine:[-35,0],weapon:[45,0]}};
}

// External assets are optional and entirely cosmetic. An atlas is a horizontal or grid sequence.
// `anchor` is normalized [0,1]; `scale` is displayed CSS pixels per source pixel at zoom 1.
export class SpriteRegistry {
  constructor({imageFactory=()=>new Image(),procedural=paint}={}){this.imageFactory=imageFactory;this.procedural=procedural;this.cache=new Map();this.external=new Map();}
  register(kind,faction,descriptor){
    const key=`${faction}:${kind}`,d={frames:1,columns:descriptor.frames??1,scale:1,anchor:[.5,.5],headingOffset:0,attachmentPoints:{},...descriptor};
    if(!d.url||!Number.isInteger(d.frames)||d.frames<1||!Number.isInteger(d.columns)||d.columns<1||!(d.scale>0)||!Array.isArray(d.anchor)||d.anchor.length!==2||d.anchor.some(a=>!Number.isFinite(a)||a<0||a>1))throw Error('Invalid sprite descriptor');
    const image=this.imageFactory(),record={d,image,status:'loading'};this.external.set(key,record);
    image.onload=()=>{record.status=(image.naturalWidth||image.width)>0&&(image.naturalHeight||image.height)>0?'ready':'failed';};image.onerror=()=>{record.status='failed';};image.src=d.url;return record;
  }
  get(kind,faction,heading=0){
    const key=`${faction}:${kind}`,record=this.external.get(key);
    if(record?.status==='ready'){
      const {image,d}=record,rows=Math.ceil(d.frames/d.columns),w=(image.naturalWidth||image.width)/d.columns,h=(image.naturalHeight||image.height)/rows,i=headingFrame(heading+d.headingOffset,d.frames);
      return {image,source:[(i%d.columns)*w,Math.floor(i/d.columns)*h,w,h],width:w*d.scale,height:h*d.scale,anchorX:d.anchor[0],anchorY:d.anchor[1],hitRadius:kind==='station'?72:(RADII[kind]??65)*.7,attachmentPoints:d.attachmentPoints};
    }
    const frame=headingFrame(heading,CONFIG.visuals.headingFrames),cacheKey=key+':'+frame;
    if(!this.cache.has(cacheKey))this.cache.set(cacheKey,this.procedural(kind,faction,frame/CONFIG.visuals.headingFrames*TAU));
    return this.cache.get(cacheKey);
  }
  clear(){this.cache.clear();}
}
