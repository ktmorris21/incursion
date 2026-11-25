import {CONFIG,COMBAT} from '../config.js';
import {clamp,seededRandom} from './math.js';
export const ARCHETYPES=['Bastion','Frontier','Crossroads','Labyrinth'];
export const CELL=50;
export const dimensions=map=>({width:map?.width??CONFIG.world.width,height:map?.height??CONFIG.world.height});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const sq=(x)=>x*x;
function pointSeg2(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return sq(p.x-a.x-t*dx)+sq(p.y-a.y-t*dy);}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function intersects(a,b,c,d){return Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))+1e-8&&Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))+1e-8&&cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;}
export function inside(p,z){
 if(!z.points)return z.r!==undefined?dist(p,z)<=z.r:sq((p.x-z.x)/z.rx)+sq((p.y-z.y)/z.ry)<=1;
 let hit=false;const v=z.points;
 for(let i=0,j=v.length-1;i<v.length;j=i++){const a=v[i],b=v[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}
 return hit;
}
const bounds=z=>z.points?z.bounds??{minX:Math.min(...z.points.map(p=>p.x)),maxX:Math.max(...z.points.map(p=>p.x)),minY:Math.min(...z.points.map(p=>p.y)),maxY:Math.max(...z.points.map(p=>p.y))}:{minX:z.x-(z.r??z.rx),maxX:z.x+(z.r??z.rx),minY:z.y-(z.r??z.ry),maxY:z.y+(z.r??z.ry)};
function pointBlocked(p,z,r){
 const b=bounds(z);if(p.x<b.minX-r||p.x>b.maxX+r||p.y<b.minY-r||p.y>b.maxY+r)return false;
 if(!z.points)return dist(p,z)<(z.r??Math.max(z.rx,z.ry))+r;
 if(inside(p,z))return true;
 return z.points.some((a,i)=>pointSeg2(p,a,z.points[(i+1)%z.points.length])<r*r);
}
export const speedFactor=(map,p)=>map?.sparse.some(z=>inside(p,z))?.65:1;
export const sensorFactor=(map,p)=>map?.nebula.some(z=>inside(p,z))?.65:1;
export const clearance=e=>CONFIG.separation.radii[e.kind]??35;
export function walkable(map,p,r=0){
 const {width,height}=dimensions(map);return p.x>=r&&p.x<=width-r&&p.y>=r&&p.y<=height-r&&(!map||!map.dense.some(z=>pointBlocked(p,z,r)));
}
export function segmentClear(map,a,b,r=0){
 if(!walkable(map,a,r)||!walkable(map,b,r))return false;if(!map)return true;
 for(const z of map.dense){const box=bounds(z);if(Math.max(a.x,b.x)<box.minX-r||Math.min(a.x,b.x)>box.maxX+r||Math.max(a.y,b.y)<box.minY-r||Math.min(a.y,b.y)>box.maxY+r)continue;
  if(!z.points){if(pointSeg2(z,a,b)<sq(z.r+r))return false;continue;}
  for(let i=0;i<z.points.length;i++){const c=z.points[i],d=z.points[(i+1)%z.points.length];if(intersects(a,b,c,d)||Math.min(pointSeg2(a,c,d),pointSeg2(b,c,d),pointSeg2(c,a,b),pointSeg2(d,a,b))<r*r)return false;}
 }return true;
}
const grids=new WeakMap();
function grid(map,r){
 let cache=grids.get(map);if(!cache){cache=new Map();grids.set(map,cache);}if(cache.has(r))return cache.get(r);
 const {width,height}=dimensions(map),n=Math.ceil(width/CELL),m=Math.ceil(height/CELL),g=new Uint8Array(n*m),margin=r+CELL*.71;
 const center=i=>({x:(i%n+.5)*CELL,y:(Math.floor(i/n)+.5)*CELL});
 const cell=p=>clamp(Math.floor(p.y/CELL),0,m-1)*n+clamp(Math.floor(p.x/CELL),0,n-1);
 for(let y=0;y<m;y++)for(let x=0;x<n;x++){const px=(x+.5)*CELL,py=(y+.5)*CELL;g[y*n+x]=Number(px>=margin&&px<=width-margin&&py>=margin&&py<=height-margin);}
 for(const z of map.dense){const b=bounds(z);for(let y=Math.max(0,Math.floor((b.minY-margin)/CELL));y<=Math.min(m-1,Math.floor((b.maxY+margin)/CELL));y++)for(let x=Math.max(0,Math.floor((b.minX-margin)/CELL));x<=Math.min(n-1,Math.floor((b.maxX+margin)/CELL));x++){const i=y*n+x;if(g[i]&&pointBlocked(center(i),z,margin))g[i]=0;}}
 const out={g,n,m,center,cell};cache.set(r,out);return out;
}
function neighbors(i,{g,n,m}){
 const x=i%n,y=Math.floor(i/n),out=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  if(!dx&&!dy||x+dx<0||x+dx>=n||y+dy<0||y+dy>=m)continue;
  const j=i+dy*n+dx;if(!g[j]||dx&&dy&&(!g[i+dx]||!g[i+dy*n]))continue;out.push([j,dx&&dy?Math.SQRT2:1]);
 }return out;
}
function anchor(map,p,r,G){
 const {g,center,cell}=G,i=cell(p);if(g[i]&&segmentClear(map,p,center(i),r))return i;
 let best=-1,d=Infinity;for(let j=0;j<g.length;j++)if(g[j]){const q=center(j),v=dist(p,q);if(v<d&&segmentClear(map,p,q,r)){best=j;d=v;}}return best;
}
export function nearestOpen(map,p,r=0){
 const {width,height}=dimensions(map),q={x:clamp(p.x,r,width-r),y:clamp(p.y,r,height-r)};if(walkable(map,q,r))return q;
 const {g,center}=grid(map,r);let best=null,d=Infinity;for(let i=0;i<g.length;i++)if(g[i]){const v=center(i),dd=dist(q,v);if(dd<d){best=v;d=dd;}}return best;
}
class Heap{
 constructor(){this.a=[];}
 push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p][0]<=v[0])break;a[i]=a[p];i=p;}a[i]=v;}
 pop(){const a=this.a,top=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1][0]<a[j][0])j++;if(a[j][0]>=v[0])break;a[i]=a[j];i=j;}a[i]=v;}return top;}
}
export function findPath(map,start,goal,r=35){
 if(!map)return [goal];if(!walkable(map,start,r)||!walkable(map,goal,r))return null;
 if(segmentClear(map,start,goal,r))return [goal];
 const G=grid(map,r),{g,center}=G,s=anchor(map,start,r,G),t=anchor(map,goal,r,G);if(s<0||t<0)return null;
 const scores=new Float64Array(g.length).fill(Infinity),prev=new Int32Array(g.length).fill(-1),heap=new Heap();scores[s]=0;heap.push([dist(center(s),center(t))/CELL,s,0]);
 while(heap.a.length){const [,i,cost]=heap.pop();if(cost!==scores[i])continue;if(i===t)break;
  for(const [j,w] of neighbors(i,G)){const v=cost+w/speedFactor(map,center(j));if(v>=scores[j])continue;scores[j]=v;prev[j]=i;heap.push([v+dist(center(j),center(t))/CELL,j,v]);}
 }
 if(!Number.isFinite(scores[t]))return null;
 const raw=[goal];for(let i=t;i>=0;i=prev[i]){raw.push(center(i));if(i===s)break;}raw.reverse();
 const out=[];let p=start,i=0;while(i<raw.length){let j=raw.length-1;while(j>i&&!segmentClear(map,p,raw[j],r))j--;if(!segmentClear(map,p,raw[j],r))return null;p=raw[j];out.push(p);i=j+1;}return out;
}
export function navigableStep(map,e,goal,travel){
 const r=clearance(e),d=dist(e,goal);if(!d||travel<=0)return {x:e.x,y:e.y};
 const q={x:e.x+(goal.x-e.x)*Math.min(1,travel/d),y:e.y+(goal.y-e.y)*Math.min(1,travel/d)};
 if(segmentClear(map,e,q,r))return q;
 // Slide locally along obstacle boundaries rather than tunnel through.
 for(const a of [Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2]){const h=Math.atan2(goal.y-e.y,goal.x-e.x)+a,v={x:e.x+Math.cos(h)*Math.min(travel,d),y:e.y+Math.sin(h)*Math.min(travel,d)};if(segmentClear(map,e,v,r))return v;}
 return {x:e.x,y:e.y};
}
export function routeWaypoint(map,e,goal,tick){
 if(!map)return goal;const r=clearance(e),g=nearestOpen(map,goal,r);if(!g)return null;
 if(segmentClear(map,e,g,r)){e.route=null;return g;}
 if(!e.route||tick-e.route.tick>=20||dist(e.route.goal,g)>70||!e.route.points.length){
  const points=findPath(map,e,g,r);e.route={goal:g,points:points??[],tick};if(!points)return null;
 }
 while(e.route.points.length&&dist(e,e.route.points[0])<4)e.route.points.shift();
 return e.route.points[0]??null;
}
// Distinct gate count across a vertical strategic cut between base and portals.
// Widths count only full command-ship clearance; each gate must connect to base.
function connectivity(map){
 const r=70,G=grid(map,r),{g}=G,start=anchor(map,map.base,r,G);if(start<0)return null;
 const seen=new Uint8Array(g.length),q=[start];seen[start]=1;
 for(let k=0;k<q.length;k++)for(const [j] of neighbors(q[k],G))if(!seen[j]){seen[j]=1;q.push(j);}
 return {seen,G};
}
export function validateMap(map){
 const errors=[],c=connectivity(map);if(!c)return {ok:false,errors:['base blocked'],corridors:0};
 const reachable=p=>{const i=anchor(map,p,70,c.G);return i>=0&&!!c.seen[i];};
 for(const p of [...map.starts,...map.deposits,...map.portals,...(map.emergence??[]),...map.portals.map(p=>({x:p.x-100,y:p.y}))])if(!reachable(p))errors.push('unreachable site');
 for(const p of [...map.starts,...map.deposits,...map.portals,...(map.emergence??[])])if(!walkable(map,p,70))errors.push('blocked site');
 const total=map.deposits.reduce((s,p)=>s+p.yield,0),outside=map.deposits.filter(p=>dist(p,map.base)>map.safeRadius).reduce((s,p)=>s+p.yield,0)/total;
 if(outside<.45||outside>.55)errors.push('yield split');
 const col=Math.floor(map.cut/CELL),runs=[];let len=0;
 for(let y=0;y<c.G.m;y++){if(c.seen[y*c.G.n+col])len++;else if(len){runs.push(len);len=0;}}if(len)runs.push(len);
 const corridors=runs.filter(n=>n>=2).length;
 if(map.archetype==='Crossroads'&&corridors<4)errors.push('corridor diversity');
 if(map.archetype==='Bastion'&&corridors>3)errors.push('bastion too open');
 return {ok:!errors.length,errors,corridors,outside};
}
// Seeded irregular ribbon. A monotonic longitudinal spine with tapered,
// jittered widths gives a polygon without self intersections.
function ribbon(rng,x,y,length,width,angle,bend=.18){
 const pts=[],other=[],co=Math.cos(angle),si=Math.sin(angle);
 for(let i=0;i<=7;i++){const u=i/7,t=(u-.5)*length,curve=Math.sin(u*Math.PI*2)*(width*bend),w=width*(i===0||i===7?.16:.68+rng()*.32)/2;
  const q=(v)=>({x:x+t*co-v*si,y:y+t*si+v*co});pts.push(q(curve+w));other.push(q(curve-w*(.8+rng()*.35)));}
 const points=pts.concat(other.reverse()),region={x,y,points};region.bounds=bounds(region);return region;
}
function candidate(seed,archetype,attempt){
 const rng=seededRandom(seed+'|'+archetype+'|'+attempt),j=(v,n)=>v+(rng()-.5)*2*n;
 const width=5700,height=5700,cut=j(2900,140),base={x:780,y:j(2850,180)},safeRadius=1100;
 const cx=base.x+180,cy=base.y;
 const starts=[base,{x:cx,y:cy},...['carrier','missile','destroyer'].map((kind,i)=>({x:cx+CONFIG.patrol.radii[kind]*Math.cos(i*2*Math.PI/3),y:cy+CONFIG.patrol.radii[kind]*Math.sin(i*2*Math.PI/3)})),{x:base.x-80,y:base.y-260},{x:base.x-80,y:base.y+260}];
 const deposits=[{x:430,y:base.y-520,yield:18},{x:430,y:base.y+520,yield:22},{x:4550,y:j(950,160),yield:19},{x:4550,y:j(4750,160),yield:21}];
 const portals=[950,2850,4750].map(y=>({x:5250,y:j(y,110)})),emergence=portals.flatMap(p=>[-100,0,100].map(dy=>({x:p.x,y:p.y+dy}))),dense=[];
 const sites=[...starts,...deposits,...portals,...emergence,...portals.map(p=>({x:p.x-100,y:p.y}))];
 const add=(x,y,len,w,angle)=>{const z=ribbon(rng,x,y,len,w,angle);if(sites.every(p=>!pointBlocked(p,z,140)))dense.push(z);};
 if(archetype==='Crossroads'){for(const y of [1425,2850,4275])add(cut,j(y,65),j(1450,100),j(230,30),j(0,.09));}
 else if(archetype==='Bastion'){for(const y of [900,4800])add(cut,j(y,55),j(2350,100),j(410,40),Math.PI/2+j(0,.025));}
 else if(archetype==='Frontier'){for(const y of [1500,3900])add(cut,j(y,180),j(1600,170),j(300,40),j(.55,.25));}
 else {for(const [x,y,len,w,ang] of [[2200,1250,1700,330,.8],[2200,3850,1700,320,-.65],[3350,2300,1900,390,1.1],[3650,4900,1400,300,-.5],[4200,1050,1150,240,.65]])add(j(x,100),j(y,100),j(len,90),j(w,35),j(ang,.12));}
 for(const [x,y,ang] of [[1550,700,.35],[4100,2850,-.4],[1600,5050,.15]])add(j(x,100),j(y,100),j(750,100),j(160,25),ang);
 const sparse=Array.from({length:4},(_,i)=>ribbon(rng,j([1800,3100,4300,3200][i],200),j([2200,4400,1300,650][i],180),j(1450,200),j(440,70),j([.5,-.5,.85,.1][i],.25),.5));
 const nebula=Array.from({length:3},(_,i)=>ribbon(rng,j([2000,3850,4250][i],220),j([3500,1900,3950][i],200),j(2150,250),j(820,150),j([-.65,.4,.85][i],.25),.7));
 return {seed,archetype,attempt,width,height,base,safeRadius,cut,starts,deposits,portals,emergence,dense,sparse,nebula,activePortal:Math.floor(rng()*portals.length)};
}
export function fallbackMap(seed,archetype){
 const map=candidate('validated-fallback',archetype,0),validation=validateMap(map);
 if(!validation.ok)throw Error('Invalid fallback: '+validation.errors.join(', '));
 return {...map,seed:String(seed),validation,fallback:true};
}
export function generateMap(seed='incursion-01',archetype='Auto'){
 seed=String(seed);if(!ARCHETYPES.includes(archetype))archetype=ARCHETYPES[Math.floor(seededRandom(seed)()*ARCHETYPES.length)];
 for(let i=0;i<8;i++){const map=candidate(seed,archetype,i),validation=validateMap(map);if(validation.ok)return {...map,validation,fallback:false};}
 return fallbackMap(seed,archetype);
}
export function detected(state,e){
 if(!state.map||e.faction==='friendly'||state.preview)return true;
 return state.entities.some(a=>a.faction==='friendly'&&a.hull>0&&dist(a,e)<=COMBAT.classes[a.kind].sensor*sensorFactor(state.map,a));
}
