import {CONFIG} from '../config.js';
import {clamp} from '../core/math.js';

// Coordinates used by this module are CSS pixels, independent of canvas backing DPR.
export class Camera {
  constructor(width=1,height=1,config=CONFIG.camera){this.config=config;this.width=Math.max(1,width);this.height=Math.max(1,height);this.x=CONFIG.world.width/2;this.y=CONFIG.world.height/2;this.zoom=1;}
  resize(width,height){this.width=Math.max(1,width);this.height=Math.max(1,height);}
  worldToScreen(x,y){return {x:this.width/2+(x-this.x)*this.zoom,y:this.height/2+(y-this.y)*this.zoom*this.config.compression};}
  screenToWorld(x,y){return {x:this.x+(x-this.width/2)/this.zoom,y:this.y+(y-this.height/2)/(this.zoom*this.config.compression)};}
  focus(x,y){this.x=clamp(x,0,CONFIG.world.width);this.y=clamp(y,0,CONFIG.world.height);}
  panPixels(dx,dy){this.focus(this.x-dx/this.zoom,this.y-dy/(this.zoom*this.config.compression));}
  zoomAt(factor,sx=this.width/2,sy=this.height/2){if(!(factor>0&&Number.isFinite(factor)))return;const before=this.screenToWorld(sx,sy);this.zoom=clamp(this.zoom*factor,this.config.minZoom,this.config.maxZoom);const after=this.screenToWorld(sx,sy);this.focus(this.x+before.x-after.x,this.y+before.y-after.y);}
  fit(bounds={minX:0,minY:0,maxX:CONFIG.world.width,maxY:CONFIG.world.height},padding=this.config.fitPadding){const w=Math.max(1,bounds.maxX-bounds.minX),h=Math.max(1,bounds.maxY-bounds.minY);const pad=Math.min(padding,Math.min(this.width,this.height)*0.18);this.zoom=clamp(Math.min((this.width-pad*2)/w,(this.height-pad*2)/(h*this.config.compression)),this.config.minZoom,this.config.maxZoom);this.focus((bounds.minX+bounds.maxX)/2,(bounds.minY+bounds.maxY)/2);}
  visible(x,y,margin=0){const p=this.worldToScreen(x,y);return p.x>=-margin&&p.x<=this.width+margin&&p.y>=-margin&&p.y<=this.height+margin;}
}
export function depthSort(items){return items.slice().sort((a,b)=>a.screen.y-b.screen.y||a.id-b.id);}
export function headingFrame(heading,count){const turn=((heading/(2*Math.PI))%1+1)%1;return Math.round(turn*count)%count;}
export function canvasSize(width,height,dpr,limit=CONFIG.visuals.maxDpr){const ratio=clamp(Number.isFinite(dpr)?dpr:1,1,limit);return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio)),ratio};}
export function resizeCanvas(canvas,width,height,dpr,limit){const s=canvasSize(width,height,dpr,limit);if(canvas.width!==s.width)canvas.width=s.width;if(canvas.height!==s.height)canvas.height=s.height;return s;}
