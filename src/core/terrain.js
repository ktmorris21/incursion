import {CONFIG,COMBAT} from '../config.js';
import {clamp,seededRandom} from './math.js';
export const ARCHETYPES=['Bastion','Frontier','Crossroads','Labyrinth'];
export const CELL=CONFIG.sector.cell;
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
// Exact polygon separation: crossings, containment and minimum edge distance.
export const TERRAIN_GAP=45;
export function regionsConflict(a,b,gap=TERRAIN_GAP){
 const u=bounds(a),v=bounds(b);
 if(u.maxX+gap<v.minX||v.maxX+gap<u.minX||u.maxY+gap<v.minY||v.maxY+gap<u.minY)return false;
 if(inside(a.points[0],b)||inside(b.points[0],a))return true;
 for(let i=0;i<a.points.length;i++){const p=a.points[i],q=a.points[(i+1)%a.points.length];
  for(let j=0;j<b.points.length;j++){const r=b.points[j],t=b.points[(j+1)%b.points.length];
   if(intersects(p,q,r,t)||Math.min(pointSeg2(p,r,t),pointSeg2(q,r,t),pointSeg2(r,p,q),pointSeg2(t,p,q))<gap*gap)return true;
  }
 }return false;
}
export function portalApproach(map,p){
 const dx=map.base.x-p.x,dy=map.base.y-p.y,d=Math.hypot(dx,dy);return {x:p.x+dx/d*100,y:p.y+dy/d*100};
}
export function portalFormation(map,p){
 const dx=map.base.x-p.x,dy=map.base.y-p.y,d=Math.hypot(dx,dy);return [-100,0,100].map(offset=>({x:p.x-dy/d*offset,y:p.y+dx/d*offset}));
}
function connectivity(map){
 const r=70,G=grid(map,r),{g}=G,start=anchor(map,map.base,r,G);if(start<0)return null;
 const seen=new Uint8Array(g.length),q=[start];seen[start]=1;
 for(let k=0;k<q.length;k++)for(const [j] of neighbors(q[k],G))if(!seen[j]){seen[j]=1;q.push(j);}
 return {seen,G};
}
function gateCount(map,c){
 const samples=360,open=[];
 for(let i=0;i<samples;i++){const a=i*2*Math.PI/samples,p={x:map.base.x+map.gateRadius*Math.cos(a),y:map.base.y+map.gateRadius*Math.sin(a)};open.push(!!c.seen[c.G.cell(p)]&&walkable(map,p,70));}
 if(open.every(Boolean))return 1;
 let runs=0,len=0,start=open.indexOf(false);
 for(let k=1;k<=samples;k++){if(open[(start+k)%samples])len++;else{if(len>=3)runs++;len=0;}}return runs;
}
export function validateMap(map){
 const errors=[],c=connectivity(map);if(!c)return {ok:false,errors:['base blocked'],corridors:0};
 const reachable=p=>{const i=anchor(map,p,70,c.G);return i>=0&&!!c.seen[i];};
 const sites=[...map.starts,...map.deposits,...map.portals,...map.emergence,...map.portals.map(p=>portalApproach(map,p))];
 for(const p of sites)if(!walkable(map,p,70)||!reachable(p))errors.push('unreachable site');
 const regions=[...map.dense,...map.sparse,...map.nebula];
 for(let i=0;i<regions.length;i++){const z=regions[i],b=bounds(z);
  if(b.minX<0||b.minY<0||b.maxX>map.width||b.maxY>map.height)errors.push('terrain outside world');
  if(sites.some(p=>pointBlocked(p,z,100)))errors.push('terrain obstructs critical site');
  for(let j=0;j<i;j++)if(regionsConflict(z,regions[j]))errors.push('terrain overlap or insufficient gap');
 }
 if(map.base.x!==map.width/2||map.base.y!==map.height/2)errors.push('base not centered');
 if(map.dense.some(z=>pointBlocked(map.base,z,map.safeRadius)))errors.push('starting chamber obstructed');
 if(map.portals.some(p=>Math.min(p.x,p.y,map.width-p.x,map.height-p.y)>500)||new Set(map.portals.map(p=>p.edge)).size!==map.portals.length)errors.push('portal not on distinct perimeter edge');
 if(map.sparse.length!==4||map.nebula.length!==3)errors.push('missing environmental regions');
 const total=map.deposits.reduce((s,p)=>s+p.yield,0),outside=map.deposits.filter(p=>dist(p,map.base)>map.safeRadius).reduce((s,p)=>s+p.yield,0)/total;
 if(outside<.45||outside>.55)errors.push('yield split');
 const corridors=gateCount(map,c);if(corridors!==map.expectedGates)errors.push('corridor diversity');
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
// Carve winding passages and open chambers between solid asteroid masses.
function candidate(seed,archetype,attempt){
 const rng=seededRandom(seed+'|'+archetype+'|'+attempt),j=(v,n)=>v+(rng()-.5)*2*n;
 const {width,height}=CONFIG.sector,base={x:width/2,y:height/2},safeRadius=850,gateRadius=1290;
 const cx=base.x+180,cy=base.y;
 const starts=[base,{x:cx,y:cy},...['carrier','missile','destroyer'].map((kind,i)=>({x:cx+CONFIG.patrol.radii[kind]*Math.cos(i*2*Math.PI/3),y:cy+CONFIG.patrol.radii[kind]*Math.sin(i*2*Math.PI/3)})),{x:base.x-80,y:base.y-260},{x:base.x-80,y:base.y+260}];
 const expectedGates=archetype==='Bastion'?2:archetype==='Crossroads'?4:archetype==='Frontier'?3:3+Math.floor(rng()*2);
 const turn=rng()*2*Math.PI,step=2*Math.PI/expectedGates,angles=Array.from({length:expectedGates},(_,i)=>turn+i*step+j(0,.12));angles.push(angles[0]+2*Math.PI);
 const phase=rng()<.5?-1:1,bend=archetype==='Labyrinth'?.32:archetype==='Bastion'?.20:.15;
 const radii=[1020,1290,1570,1850,2180],twists=[0,phase*bend*.45,phase*bend,phase*bend*.6,-phase*bend*.35];
 const neck=archetype==='Bastion'?175:archetype==='Frontier'?230:190,half=[245,neck,420,neck+20,355];
 const polar=(r,a)=>({x:base.x+r*Math.cos(a),y:base.y+r*Math.sin(a)});
 const side=(angle,sign,k)=>angle+twists[k]+sign*Math.asin(half[k]/radii[k]);
 const dense=[];
 for(let i=0;i<expectedGates;i++){
  const a=angles[i],b=angles[i+1],points=[];
  for(let k=0;k<radii.length;k++)points.push(polar(radii[k],side(a,1,k)));
  let lo=side(a,1,4),hi=side(b,-1,4),n=Math.ceil((hi-lo)/.16);
  for(let k=1;k<n;k++)points.push(polar(j(2180,80),lo+(hi-lo)*k/n));
  for(let k=radii.length-1;k>=0;k--)points.push(polar(radii[k],side(b,-1,k)));
  lo=side(a,1,0);hi=side(b,-1,0);n=Math.ceil((hi-lo)/.16);
  for(let k=n-1;k>0;k--)points.push(polar(j(1020,70),lo+(hi-lo)*k/n));
  const center=polar(1600,(a+b)/2+twists[2]),z={...center,points};z.bounds=bounds(z);dense.push(z);
 }
 const edges=[0,1,2,3];for(let i=edges.length-1;i>0;i--){const k=Math.floor(rng()*(i+1));[edges[i],edges[k]]=[edges[k],edges[i]];}
 const portals=edges.slice(0,3).map(edge=>{const u=j(width/2,950),inset=j(275,50);return {...(edge===0?{x:u,y:inset}:edge===1?{x:width-inset,y:u}:edge===2?{x:u,y:height-inset}:{x:inset,y:u}),edge};});
 const nearAngle=rng()*2*Math.PI,near=[polar(610,nearAngle),polar(610,nearAngle+Math.PI)];
 const corners=[{x:650,y:650},{x:width-650,y:650},{x:width-650,y:height-650},{x:650,y:height-650}],corner=Math.floor(rng()*4);
 const deposits=[{...near[0],yield:18},{...near[1],yield:22},{...corners[corner],yield:19},{...corners[(corner+2)%4],yield:21}];
 const emergence=portals.flatMap(p=>portalFormation({base},p)),sites=[...starts,...deposits,...portals,...emergence,...portals.map(p=>portalApproach({base},p))];
 const sparse=[],nebula=[],all=[...dense];
 for(const [out,count,length,widthRange] of [[nebula,3,930,420],[sparse,4,690,245]]){
  for(let k=0;k<count;k++)for(let tries=0;tries<140;tries++){
   const x=j(width/2,width/2-380),y=j(height/2,height/2-380),r=dist({x,y},base);if(r<2350)continue;
   const z=ribbon(rng,x,y,j(length,120),j(widthRange,55),j(Math.atan2(y-base.y,x-base.x)+Math.PI/2,.6),.35),b=z.bounds;
   if(b.minX<90||b.minY<90||b.maxX>width-90||b.maxY>height-90||sites.some(p=>pointBlocked(p,z,145))||all.some(v=>regionsConflict(z,v)))continue;
   out.push(z);all.push(z);break;
  }
 }
 return {seed,archetype,attempt,width,height,base,safeRadius,gateRadius,expectedGates,starts,deposits,portals,emergence,dense,sparse,nebula,activePortal:Math.floor(rng()*portals.length)};
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
