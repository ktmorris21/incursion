import {CONFIG} from '../config.js';
import {seededRandom,TAU} from '../core/math.js';
import {poseAt} from '../core/state.js';
import {depthSort,resizeCanvas} from './projection.js';
import {SpriteRegistry} from './sprites.js';
const COLORS={friendly:'#70dbf2',hostile:'#f67f9b'};

export class BattlefieldRenderer {
  constructor(canvas,camera,registry=new SpriteRegistry()){
    this.canvas=canvas;this.camera=camera;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('Canvas 2D is unavailable in this browser.');
    this.registry=registry;this.ratio=1;this.quality='high';this.labels=CONFIG.demo.showLabels;this.debug=false;this.visibleItems=[];this.background=null;this.bgSize='';
    const rng=seededRandom(CONFIG.visuals.backgroundSeed);
    this.stars=CONFIG.visuals.starCounts.map((n,i)=>Array.from({length:n},()=>({x:rng(),y:rng(),r:(.38+rng()*.66)*(1+i*.46),a:.15+rng()*.57,color:rng()>.82?'#a9c9ff':rng()>.9?'#ffc9aa':'#ebf6ff'})));
  }
  resize(w,h,dpr=1,quality=this.quality){this.quality=quality;this.camera.resize(w,h);const s=resizeCanvas(this.canvas,w,h,dpr,CONFIG.visuals.qualityDpr[quality]??2);this.ratio=s.ratio;this.bgSize='';return s;}
  screenItems(state,alpha){return depthSort(state.entities.map(e=>{const pose=poseAt(e,alpha),screen=this.camera.worldToScreen(pose.x,pose.y);return {id:e.id,e,pose,screen};}));}
  pick(x,y){
    // Reverse draw order resolves overlaps in favor of the frontmost visible sprite.
    for(let i=this.visibleItems.length-1;i>=0;i--){const item=this.visibleItems[i],s=item.sprite,z=this.camera.zoom;const dx=(x-item.screen.x)/z,dy=(y-item.screen.y)/z;
      // Stable artwork-independent elliptical picking zone around the visible hull.
      const r=s.hitRadius;const cy=-Math.min(11,r*.2);if((dx/r)**2+((dy-cy)/(r*CONFIG.camera.compression+12))**2<=1)return item.id;
    }return null;
  }
  draw(state,alpha,selectedId=null){
    const {ctx,camera:c}=this;const W=c.width,H=c.height;ctx.setTransform(this.canvas.width/W,0,0,this.canvas.height/H,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    this.drawBackground(W,H);this.drawPlane();
    const items=this.screenItems(state,alpha);this.visibleItems=[];
    // Shadows are grounded at the exact same projected anchors as the sprites.
    for(const item of items){const {pose,screen,e}=item;if(!c.visible(pose.x,pose.y,250*c.zoom))continue;const sprite=this.registry.get(e.kind,e.faction,pose.heading);item.sprite=sprite;
      const z=c.zoom,w=sprite.width*z,h=sprite.height*z,x=screen.x-w*sprite.anchorX,y=screen.y-h*sprite.anchorY;if(x+w<0||y+h<0||x>W||y>H)continue;this.visibleItems.push(item);
      const r=sprite.hitRadius*z;ctx.save();ctx.translate(screen.x+3*z,screen.y+5*z);ctx.scale(1,.54);const sh=ctx.createRadialGradient(0,0,1,0,0,r);sh.addColorStop(0,'rgba(0,0,0,.65)');sh.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sh;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.restore();
    }
    for(const item of this.visibleItems){const {sprite:s,screen}=item,z=c.zoom,w=s.width*z,h=s.height*z,x=screen.x-w*s.anchorX,y=screen.y-h*s.anchorY;
      if(s.source)ctx.drawImage(s.image,...s.source,x,y,w,h);else ctx.drawImage(s.image,x,y,w,h);
    }
    for(const item of this.visibleItems)this.drawOverlay(item,item.id===selectedId);
    if(this.debug)this.drawDebug();
  }
  drawBackground(w,h){
    const {ctx,camera:c}=this;const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#060d1d');g.addColorStop(.48,'#080e1e');g.addColorStop(1,'#140c20');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    // Decorative atmosphere only; does not imply the later gameplay nebula mechanic.
    const clouds=[{x:.18,y:.72,r:.72,color:'rgba(23,61,94,.17)'},{x:.82,y:.25,r:.68,color:'rgba(81,33,82,.18)'},{x:.42,y:.25,r:.48,color:'rgba(39,55,106,.11)'}];
    for(const q of clouds){const x=w*q.x-(c.x-900)*.018,y=h*q.y-(c.y-900)*.012,r=Math.max(w,h)*q.r;const grad=ctx.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,q.color);grad.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);}
    const wrap=(v,n)=>((v%n)+n)%n;
    this.stars.forEach((layer,i)=>{const parallax=(i+1)*.035;for(const s of layer){const x=wrap(s.x*w-c.x*parallax,w),y=wrap(s.y*h-c.y*parallax*.65,h);ctx.globalAlpha=s.a;ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(x,y,s.r,0,TAU);ctx.fill();if(i===2&&s.a>.6){ctx.globalAlpha=s.a*.24;ctx.fillRect(x-3,y-.4,6,.8);ctx.fillRect(x-.4,y-3,.8,6);}}});ctx.globalAlpha=1;
  }
  drawPlane(){
    const {ctx,camera:c}=this,lo=c.worldToScreen(0,0),hi=c.worldToScreen(CONFIG.world.width,CONFIG.world.height);ctx.save();ctx.strokeStyle='rgba(128,175,208,.15)';ctx.lineWidth=1;ctx.setLineDash([7,8]);ctx.strokeRect(lo.x,lo.y,hi.x-lo.x,hi.y-lo.y);ctx.restore();
  }
  drawOverlay(item,selected){
    const {ctx,camera:c}=this,{e,screen,sprite}=item,z=c.zoom,color=COLORS[e.faction];
    if(selected){const r=sprite.hitRadius*z+8;ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.globalAlpha=.9;ctx.setLineDash([9,5]);ctx.beginPath();ctx.ellipse(screen.x,screen.y,r,r*CONFIG.camera.compression,0,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=color;ctx.beginPath();ctx.arc(screen.x,screen.y,2.8,0,TAU);ctx.fill();ctx.restore();}
    if((this.labels&&z>=.44)||selected){const y=screen.y+sprite.hitRadius*z*.64+13;ctx.font='500 11px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';const width=ctx.measureText(e.label).width+14;ctx.fillStyle='rgba(6,11,23,.85)';ctx.fillRect(screen.x-width/2,y-8,width,16);ctx.fillStyle=selected?'#f3fbff':color;ctx.fillText(e.label,screen.x,y);}
  }
  drawDebug(){const {ctx,camera:c}=this;ctx.save();ctx.strokeStyle='rgba(92,205,234,.12)';ctx.lineWidth=.75;for(let p=0;p<=1800;p+=100){const a=c.worldToScreen(p,0),b=c.worldToScreen(p,1800);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();const d=c.worldToScreen(0,p),e=c.worldToScreen(1800,p);ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(e.x,e.y);ctx.stroke();}for(const i of this.visibleItems){ctx.strokeStyle='#b6eb7a';ctx.beginPath();ctx.moveTo(i.screen.x-6,i.screen.y);ctx.lineTo(i.screen.x+6,i.screen.y);ctx.moveTo(i.screen.x,i.screen.y-6);ctx.lineTo(i.screen.x,i.screen.y+6);ctx.stroke();}ctx.restore();}
  dispose(){this.registry.clear();this.visibleItems=[];this.background=null;}
}
