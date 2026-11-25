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
// Shared exact interior clearance for decorative rocks; prevents their meshes
// extending beyond a terrain polygon into a neighbouring terrain type.
export function interiorClear(p,z,r){
 return inside(p,z)&&z.points.every((a,i)=>pointSeg2(p,a,z.points[(i+1)%z.points.length])>=r*r);
}
export function polygonArea(z){let sum=0;for(let i=0;i<z.points.length;i++){const a=z.points[i],b=z.points[(i+1)%z.points.length];sum+=a.x*b.y-a.y*b.x;}return Math.abs(sum)/2;}
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
 const samples=360,open=[],G=c.G,outer=new Uint8Array(G.g.length),startOuter=anchor(map,map.portals[0],70,G),queue=startOuter>=0?[startOuter]:[];
 if(startOuter>=0)outer[startOuter]=1;
 for(let k=0;k<queue.length;k++)for(const [j] of neighbors(queue[k],G))if(!outer[j]&&dist(G.center(j),map.base)>=map.gateRadius-CELL*.9){outer[j]=1;queue.push(j);}
 for(let i=0;i<samples;i++){const a=i*2*Math.PI/samples,p={x:map.base.x+map.gateRadius*Math.cos(a),y:map.base.y+map.gateRadius*Math.sin(a)};open.push(!!c.seen[G.cell(p)]&&!!outer[G.cell(p)]&&walkable(map,p,70));}
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
 if(map.dense.length<2||map.deposits.length!==4||map.sparse.length!==4||map.nebula.length!==3)errors.push('missing environmental regions');
 const total=map.deposits.reduce((s,p)=>s+p.yield,0),outside=map.deposits.filter(p=>dist(p,map.base)>map.safeRadius).reduce((s,p)=>s+p.yield,0)/total;
 if(outside<.45||outside>.55)errors.push('yield split');
 for(const e of map.links){if(e.width<MIN_PASSAGE||e.width>MAX_PASSAGE||e.points.some((p,i)=>i>0&&!segmentClear(map,e.points[i-1],p,175)))errors.push('passage clearance');}
 if(map.rooms.length<14||map.links.length<map.rooms.length-1)errors.push('insufficient chamber network');
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
// Generate the room/route graph first, then carve it out of asteroid terrain.
// Raster used only for generation; polygon geometry is authoritative at runtime.
const TILE=150;
export const MIN_PASSAGE=420,MAX_PASSAGE=950;
function carveBanks(width,height,rooms,links,exits){
 const n=Math.round(width/TILE),m=Math.round(height/TILE),open=new Uint8Array(n*m);
 const mark=(a,b,r)=>{
  const pad=r+TILE*Math.SQRT2/2+25;
  for(let y=Math.max(0,Math.floor((Math.min(a.y,b.y)-pad)/TILE));y<=Math.min(m-1,Math.floor((Math.max(a.y,b.y)+pad)/TILE));y++)
   for(let x=Math.max(0,Math.floor((Math.min(a.x,b.x)-pad)/TILE));x<=Math.min(n-1,Math.floor((Math.max(a.x,b.x)+pad)/TILE));x++)
    if(pointSeg2({x:(x+.5)*TILE,y:(y+.5)*TILE},a,b)<=pad*pad)open[y*n+x]=1;
 };
 for(const p of rooms)mark(p,p,p.radius);
 for(const e of [...links,...exits])for(let i=1;i<e.points.length;i++)mark(e.points[i-1],e.points[i],e.width/2);
 // Eliminate diagonal checkerboard contacts so each polygon boundary is a
 // simple closed loop, and no two dense components touch at a vertex.
 for(let changed=true;changed;){changed=false;for(let y=0;y<m-1;y++)for(let x=0;x<n-1;x++){
  const a=y*n+x,b=a+1,c=a+n,d=c+1;
  if(open[a]===open[d]&&open[b]===open[c]&&open[a]!==open[b]){if(!open[a])open[a]=1;else open[b]=1;changed=true;}
 }}
 // Trace oriented exposed cell edges. Open space is connected to the map
 // boundary, so dense components have no interior holes.
 const edges=new Map(),key=(x,y)=>y*(n+1)+x;
 const put=(x,y,u,v)=>edges.set(key(x,y),key(u,v));
 for(let y=0;y<m;y++)for(let x=0;x<n;x++)if(!open[y*n+x]){
  if(y===0||open[(y-1)*n+x])put(x,y,x+1,y);
  if(x===n-1||open[y*n+x+1])put(x+1,y,x+1,y+1);
  if(y===m-1||open[(y+1)*n+x])put(x+1,y+1,x,y+1);
  if(x===0||open[y*n+x-1])put(x,y+1,x,y);
 }
 const dense=[];
 while(edges.size){
  const first=edges.keys().next().value,raw=[];let k=first;
  do{raw.push({x:k%(n+1)*TILE,y:Math.floor(k/(n+1))*TILE});const next=edges.get(k);edges.delete(k);if(next===undefined)return null;k=next;}while(k!==first);
  const clean=raw.filter((p,i)=>Math.abs(cross(raw[(i+raw.length-1)%raw.length],p,raw[(i+1)%raw.length]))>1);
  if(clean.length<4)continue;
  // Chamfer corners to soften the raster; the carve has extra clearance.
  const points=clean.flatMap((p,i)=>{const a=clean[(i+clean.length-1)%clean.length],b=clean[(i+1)%clean.length],da=dist(p,a),db=dist(p,b),r=Math.min(55,da*.3,db*.3);return [{x:p.x+(a.x-p.x)*r/da,y:p.y+(a.y-p.y)*r/da},{x:p.x+(b.x-p.x)*r/db,y:p.y+(b.y-p.y)*r/db}];});
  const z={points};z.bounds=bounds(z);z.x=(z.bounds.minX+z.bounds.maxX)/2;z.y=(z.bounds.minY+z.bounds.maxY)/2;
  // Choose a genuine interior point for debug / blocked-spawn fixtures.
  const p=raw.find((p,i)=>{const q=raw[(i+1)%raw.length],dx=q.x-p.x,dy=q.y-p.y;const test={x:(p.x+q.x)/2-dy*.25,y:(p.y+q.y)/2+dx*.25};if(inside(test,z)){z.x=test.x;z.y=test.y;return true;}return false;});
  if(p&&polygonArea(z)>30000)dense.push(z);
 }
 return dense;
}
function candidate(seed,archetype,attempt){
 const rng=seededRandom(seed+'|'+archetype+'|'+attempt),j=(v,n)=>v+(rng()-.5)*2*n,shuffle=a=>{for(let i=a.length-1;i>0;i--){const k=Math.floor(rng()*(i+1));[a[i],a[k]]=[a[k],a[i]];}return a;};
 const {width,height}=CONFIG.sector,base={x:width/2,y:height/2},safeRadius=850,gateRadius=1250;
 const cx=base.x+180,cy=base.y;
 const starts=[base,{x:cx,y:cy},...['carrier','missile','destroyer'].map((kind,i)=>({x:cx+CONFIG.patrol.radii[kind]*Math.cos(i*2*Math.PI/3),y:cy+CONFIG.patrol.radii[kind]*Math.sin(i*2*Math.PI/3)})),{x:base.x-80,y:base.y-260},{x:base.x-80,y:base.y+260}];
 const expectedGates=archetype==='Bastion'?2:archetype==='Crossroads'?4:archetype==='Frontier'?3:3+Math.floor(rng()*2);
 const size=5,mid=12,nodes=Array.from({length:25},(_,id)=>({id,x:j((id%5+.5)*width/5,340),y:j((Math.floor(id/5)+.5)*height/5,340),radius:j(600,150)}));
 nodes[mid]={id:mid,...base,radius:920};
 const adjacent=[7,11,13,17];for(const id of adjacent){const p=nodes[id],a=Math.atan2(p.y-base.y,p.x-base.x);p.x=base.x+1850*Math.cos(a);p.y=base.y+1850*Math.sin(a);p.radius=j(490,60);}
 const edges=shuffle([0,1,2,3]).slice(0,3),portalNodes=edges.map(edge=>{const t=1+Math.floor(rng()*3);return edge===0?t:edge===1?4+t*5:edge===2?20+t:t*5;});
 const portals=edges.map((edge,i)=>{const p=nodes[portalNodes[i]],inset=j(275,50);return {...(edge===0?{x:p.x,y:inset}:edge===1?{x:width-inset,y:p.y}:edge===2?{x:p.x,y:height-inset}:{x:inset,y:p.y}),edge};});
 const gates=shuffle(adjacent.slice()).slice(0,expectedGates),required=new Set([...gates,...portalNodes]);
 const options=[];for(let id=0;id<25;id++){if(id===mid)continue;for(const next of [id%5<4?id+1:-1,id<20?id+5:-1])if(next>=0&&next!==mid)options.push([id,next]);}
 // Random spanning tree of outer rooms, followed by leaf pruning and loops.
 const parent=Array.from({length:25},(_,i)=>i),root=i=>{while(parent[i]!==i)i=parent[i];return i;},chosen=[];
 for(const [a,b] of shuffle(options.slice()))if(root(a)!==root(b)){parent[root(a)]=root(b);chosen.push([a,b]);}
 const retained=new Set(nodes.filter(p=>p.id!==mid).map(p=>p.id)),target=15+Math.floor(rng()*6);
 while(retained.size>target){const leaves=[...retained].filter(id=>!required.has(id)&&chosen.filter(e=>e.includes(id)).length===1);if(!leaves.length)break;const id=leaves[Math.floor(rng()*leaves.length)];retained.delete(id);chosen.splice(chosen.findIndex(e=>e.includes(id)),1);}
 const extras=shuffle(options.filter(([a,b])=>retained.has(a)&&retained.has(b)&&!chosen.some(e=>e[0]===a&&e[1]===b)));
 chosen.push(...extras.slice(0,(archetype==='Bastion'?2:archetype==='Labyrinth'?3:5)+Math.floor(rng()*3)));
 chosen.push(...gates.map(id=>[mid,id]));
 const rooms=[nodes[mid],...nodes.filter(p=>retained.has(p.id))];
 const links=chosen.map(([a,b],i)=>{
  const p=nodes[a],q=nodes[b],dx=q.x-p.x,dy=q.y-p.y,d=dist(p,q),bend=a===mid?j(0,90):j(0,archetype==='Labyrinth'?370:260);
  const width=a===mid?j(580,100):i%5===0?j(850,100):j(620,190);
  return {a,b,width:clamp(width,MIN_PASSAGE,MAX_PASSAGE),points:[{x:p.x,y:p.y},{x:(p.x+q.x)/2-dy/d*bend,y:(p.y+q.y)/2+dx/d*bend},{x:q.x,y:q.y}]};
 });
 const exits=portals.map((p,i)=>{const q=nodes[portalNodes[i]],edge=p.edge,out=edge===0?{x:p.x,y:0}:edge===1?{x:width,y:p.y}:edge===2?{x:p.x,y:height}:{x:0,y:p.y};return {width:740,points:[q,p,out]};});
 const dense=carveBanks(width,height,rooms,links,exits)??[];
 const nearAngle=rng()*2*Math.PI,near=[{x:base.x+610*Math.cos(nearAngle),y:base.y+610*Math.sin(nearAngle)},{x:base.x-610*Math.cos(nearAngle),y:base.y-610*Math.sin(nearAngle)}];
 const far=shuffle(rooms.filter(p=>dist(p,base)>2500&&!portalNodes.includes(p.id))).slice(0,2);
 const deposits=[{...near[0],yield:18},{...near[1],yield:22},...far.map((p,i)=>({x:p.x,y:p.y,yield:i?21:19}))];
 const emergence=portals.flatMap(p=>portalFormation({base},p)),sites=[...starts,...deposits,...portals,...emergence,...portals.map(p=>portalApproach({base},p))];
 const sparse=[],nebula=[],all=[...dense];
 for(const [out,count,length,w] of [[nebula,3,700,280],[sparse,4,460,160]]){
  for(let k=0;k<count;k++)for(let tries=0;tries<160;tries++){
   const p=rooms[1+Math.floor(rng()*(rooms.length-1))],x=j(p.x,p.radius*.45),y=j(p.y,p.radius*.45);
   if(dist({x,y},base)<1600)continue;
   const z=ribbon(rng,x,y,j(length,110),j(w,40),rng()*Math.PI,.3),b=z.bounds;
   if(b.minX<90||b.minY<90||b.maxX>width-90||b.maxY>height-90||sites.some(p=>pointBlocked(p,z,145))||all.some(v=>regionsConflict(z,v)))continue;
   out.push(z);all.push(z);break;
  }
 }
 return {seed,archetype,attempt,width,height,base,safeRadius,gateRadius,expectedGates,starts,deposits,portals,emergence,dense,sparse,nebula,rooms,links,exits,activePortal:Math.floor(rng()*portals.length)};
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
