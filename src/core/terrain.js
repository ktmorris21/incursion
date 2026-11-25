import {CONFIG,COMBAT} from '../config.js';
import {clamp,seededRandom} from './math.js';
export const ARCHETYPES=['Bastion','Frontier','Crossroads','Labyrinth'];
export const CELL=20,W=CONFIG.world.width,H=CONFIG.world.height,N=W/CELL,M=H/CELL;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),inside=(p,z)=>((p.x-z.x)/z.rx)**2+((p.y-z.y)/z.ry)**2<=1;
export const speedFactor=(map,p)=>map?.sparse.some(z=>inside(p,z))?.65:1;
export const sensorFactor=(map,p)=>map?.nebula.some(z=>inside(p,z))?.65:1;
export const clearance=e=>CONFIG.separation.radii[e.kind]??35;
export function walkable(map,p,r=0){
 if(!map)return p.x>=0&&p.x<=W&&p.y>=0&&p.y<=H;
 return p.x>=r&&p.x<=W-r&&p.y>=r&&p.y<=H-r&&!map.dense.some(z=>dist(p,z)<z.r+r);
}
export function segmentClear(map,a,b,r=0){
 if(!walkable(map,a,r)||!walkable(map,b,r))return false;
 if(!map)return true;
 const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
 return !map.dense.some(z=>{const t=l?clamp(((z.x-a.x)*dx+(z.y-a.y)*dy)/l,0,1):0;return Math.hypot(a.x+t*dx-z.x,a.y+t*dy-z.y)<z.r+r;});
}
const grids=new WeakMap();
function grid(map,r){
 let cache=grids.get(map);if(!cache){cache=new Map();grids.set(map,cache);}if(cache.has(r))return cache.get(r);
 const g=new Uint8Array(N*M);for(let i=0;i<g.length;i++)g[i]=Number(walkable(map,center(i),r+CELL*.71));
 cache.set(r,g);return g;
}
const center=i=>({x:(i%N+.5)*CELL,y:(Math.floor(i/N)+.5)*CELL});
const cell=p=>clamp(Math.floor(p.y/CELL),0,M-1)*N+clamp(Math.floor(p.x/CELL),0,N-1);
function neighbors(i,g){
 const x=i%N,y=Math.floor(i/N),out=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  if(!dx&&!dy||x+dx<0||x+dx>=N||y+dy<0||y+dy>=M)continue;
  const j=i+dy*N+dx;if(!g[j]||dx&&dy&&(!g[i+dx]||!g[i+dy*N]))continue;out.push([j,dx&&dy?Math.SQRT2:1]);
 }return out;
}
function anchor(map,p,r,g){
 const i=cell(p);if(g[i]&&segmentClear(map,p,center(i),r))return i;
 let best=-1,d=Infinity;for(let j=0;j<g.length;j++)if(g[j]){const q=center(j),v=dist(p,q);if(v<d&&segmentClear(map,p,q,r)){best=j;d=v;}}return best;
}
export function nearestOpen(map,p,r=0){
 const q={x:clamp(p.x,r,W-r),y:clamp(p.y,r,H-r)};if(walkable(map,q,r))return q;
 const g=grid(map,r);let best=null,d=Infinity;for(let i=0;i<g.length;i++)if(g[i]){const v=center(i),dd=dist(q,v);if(dd<d){best=v;d=dd;}}return best;
}
class Heap{
 constructor(){this.a=[];}
 push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p][0]<=v[0])break;a[i]=a[p];i=p;}a[i]=v;}
 pop(){const a=this.a,top=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1][0]<a[j][0])j++;if(a[j][0]>=v[0])break;a[i]=a[j];i=j;}a[i]=v;}return top;}
}
export function findPath(map,start,goal,r=35){
 if(!map)return [goal];if(!walkable(map,start,r)||!walkable(map,goal,r))return null;
 if(segmentClear(map,start,goal,r))return [goal];
 const g=grid(map,r),s=anchor(map,start,r,g),t=anchor(map,goal,r,g);if(s<0||t<0)return null;
 const scores=new Float64Array(g.length).fill(Infinity),prev=new Int32Array(g.length).fill(-1),heap=new Heap();scores[s]=0;heap.push([dist(center(s),center(t))/CELL,s,0]);
 while(heap.a.length){const [,i,cost]=heap.pop();if(cost!==scores[i])continue;if(i===t)break;
  for(const [j,w] of neighbors(i,g)){const v=cost+w/speedFactor(map,center(j));if(v>=scores[j])continue;scores[j]=v;prev[j]=i;heap.push([v+dist(center(j),center(t))/CELL,j,v]);}
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
 const r=70,g=grid(map,r),start=anchor(map,map.base,r,g);if(start<0)return null;
 const seen=new Uint8Array(g.length),q=[start];seen[start]=1;
 for(let k=0;k<q.length;k++)for(const [j] of neighbors(q[k],g))if(!seen[j]){seen[j]=1;q.push(j);}
 return {seen,g};
}
export function validateMap(map){
 const errors=[],c=connectivity(map);if(!c)return {ok:false,errors:['base blocked'],corridors:0};
 const reachable=p=>{const i=anchor(map,p,70,c.g);return i>=0&&!!c.seen[i];};
 for(const p of [...map.starts,...map.deposits,...map.portals,...(map.emergence??[]),...map.portals.map(p=>({x:p.x-100,y:p.y}))])if(!reachable(p))errors.push('unreachable site');
 for(const p of [...map.starts,...map.deposits,...map.portals,...(map.emergence??[])])if(!walkable(map,p,70))errors.push('blocked site');
 const total=map.deposits.reduce((s,p)=>s+p.yield,0),outside=map.deposits.filter(p=>dist(p,map.base)>map.safeRadius).reduce((s,p)=>s+p.yield,0)/total;
 if(outside<.45||outside>.55)errors.push('yield split');
 const col=Math.floor(map.cut/CELL),runs=[];let len=0;
 for(let y=0;y<M;y++){if(c.seen[y*N+col])len++;else if(len){runs.push(len);len=0;}}if(len)runs.push(len);
 const corridors=runs.filter(n=>n>=2).length;
 if(map.archetype==='Crossroads'&&corridors<4)errors.push('corridor diversity');
 if(map.archetype==='Bastion'&&corridors>3)errors.push('bastion too open');
 return {ok:!errors.length,errors,corridors,outside};
}
function candidate(seed,archetype,attempt){
 const rng=seededRandom(seed+'|'+archetype+'|'+attempt),j=(v,n)=>v+(rng()-.5)*2*n,cut=j(930,50);
 const base={x:300,y:j(900,65)},safeRadius=420;
 const cx=base.x+180,cy=base.y;
 const starts=[base,{x:cx,y:cy},...['carrier','missile','destroyer'].map((kind,i)=>({x:cx+CONFIG.patrol.radii[kind]*Math.cos(i*2*Math.PI/3),y:cy+CONFIG.patrol.radii[kind]*Math.sin(i*2*Math.PI/3)})),{x:base.x-80,y:base.y-260},{x:base.x-80,y:base.y+260}];
 const deposits=[{x:130,y:base.y-165,yield:18},{x:130,y:base.y+165,yield:22},{x:1430,y:j(300,40),yield:19},{x:1430,y:j(1500,40),yield:21}];
 const portals=[{x:1630,y:300},{x:1630,y:900},{x:1630,y:1500}].map(p=>({...p,y:j(p.y,35)}));
 const emergence=portals.flatMap(p=>[-100,0,100].map(dy=>({x:p.x,y:p.y+dy}))),dense=[];
 const add=(x,y,r)=>{const z={x,y,r};if([...starts,...deposits,...portals,...emergence,...portals.map(p=>({x:p.x-100,y:p.y}))].every(p=>dist(p,z)>r+100))dense.push(z);};
 if(archetype==='Crossroads'){for(const y of [450,900,1350])add(cut,j(y,12),j(75,5));}
 else if(archetype==='Bastion'){for(const y of [125,290,460,1340,1510,1675])add(cut,j(y,15),j(116,8));}
 else if(archetype==='Frontier'){for(const y of [460,1120])add(cut,j(y,100),j(135,22));}
 else {for(const [x,y,r] of [[720,390,112],[720,1180,125],[1060,710,135],[1060,1510,120],[1280,400,90]])add(j(x,30),j(y,40),j(r,10));}
 for(let i=0;i<3;i++){const x=j(i%2?1220:660,70),y=j([160,900,1640][i],55);if(Math.abs(x-cut)>200)add(x,y,j(55,12));}
 const sparse=Array.from({length:3},(_,i)=>({x:j(610+i*300,80),y:j([700,1350,380][i],100),rx:j(150,35),ry:j(110,25)}));
 const nebula=Array.from({length:2},(_,i)=>({x:j(820+i*410,120),y:j([1150,620][i],140),rx:j(230,40),ry:j(180,35)}));
 return {seed,archetype,attempt,base,safeRadius,cut,starts,deposits,portals,emergence,dense,sparse,nebula,activePortal:Math.floor(rng()*portals.length)};
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
