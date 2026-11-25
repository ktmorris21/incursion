// Cosmetic events only. Simulation damage never depends on visual effects.
const TAU=Math.PI*2, mix=(a,b,t)=>a+(b-a)*t;
export function drawCombatEffects(renderer,state){
 const {ctx:g,camera:c,quality}=renderer,z=c.zoom;
 const glow=quality==='low'?0:quality==='medium'?7:14;
 renderer.effects=renderer.effects.filter(e=>state.time-e.start<e.duration);
 g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
 const line=(a,b,color,width=1,blur=glow)=>{g.strokeStyle=color;g.lineWidth=width;g.shadowColor=color;g.shadowBlur=blur;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();};
 const dot=(x,y,r,color,blur=glow)=>{g.fillStyle=color;g.shadowColor=color;g.shadowBlur=blur;g.beginPath();g.arc(x,y,Math.max(.25,r),0,TAU);g.fill();};
 for(const i of renderer.visibleItems){
  const {e,pose}=i;if(Math.hypot(e.x-e.prevX,e.y-e.prevY)<.1)continue;
  const a=c.worldToScreen(pose.x-Math.cos(pose.heading)*21,pose.y-Math.sin(pose.heading)*21),b=c.worldToScreen(pose.x-Math.cos(pose.heading)*58,pose.y-Math.sin(pose.heading)*58);
  g.globalAlpha=.46;line(a,b,e.faction==='friendly'?'#238dff':'#e62a83',Math.max(1,2*z));dot(a.x,a.y,2*z,'#c5e8ff');
 }
 for(const e of renderer.effects){
  const t=Math.max(0,(state.time-e.start)/e.duration),p=c.worldToScreen(e.x,e.y),a=c.worldToScreen(e.sx??e.x,e.sy??e.y);
  const color=e.faction==='friendly'?'#46c8ff':'#d85aff';g.globalAlpha=1-t*.75;
  if(e.type==='destroyed'){
   const radius=(10+63*t)*z;g.shadowBlur=0;
   const grad=g.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(.1,radius));
   grad.addColorStop(0,'rgba(255,255,230,.98)');grad.addColorStop(.22,'rgba(255,182,56,.85)');grad.addColorStop(.55,'rgba(255,60,10,.35)');grad.addColorStop(1,'rgba(255,30,0,0)');
   g.fillStyle=grad;g.fillRect(p.x-radius,p.y-radius,2*radius,2*radius);
   for(let j=0;j<(quality==='low'?7:22);j++){const theta=j*2.399+e.id*.7,len=(22+j%7*6)*z*t,q={x:p.x+Math.cos(theta)*len,y:p.y+Math.sin(theta)*len};line(q,{x:q.x-Math.cos(theta)*9*z,y:q.y-Math.sin(theta)*9*z},j%3?'#ff8d34':'#fff7cc',Math.max(.8,z));}
   continue;
  }
  const dx=p.x-a.x,dy=p.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),nx=-dy/d,ny=dx/d;
  if(e.kind==='destroyer'){
   line(a,p,color,Math.max(2,5*z),glow+6);line(a,p,'#fffbe3',Math.max(1,1.5*z),0);dot(a.x,a.y,3*z,color);dot(p.x,p.y,4*z,'#fff4b9');
  }else if(e.kind==='missile'){
   for(let j=0;j<5;j++){
    const u=Math.min(1,Math.max(0,t*1.8-j*.1));if(!u)continue;
    const path=v=>({x:mix(a.x,p.x,v)+nx*Math.sin(v*Math.PI)*(j-2)*13*z,y:mix(a.y,p.y,v)+ny*Math.sin(v*Math.PI)*(j-2)*13*z});
    const q=path(u);
    for(let k=0;k<7;k++){const v=Math.max(0,u-k*.034);g.globalAlpha=(1-k/8)*.8;line(path(v),path(Math.max(0,v-.034)),k<3?'#ffb65a':'#925b36',Math.max(.7,z*1.5),k<3?glow:0);}
    g.globalAlpha=1-t*.6;dot(q.x,q.y,Math.max(1,2*z),'#fff0ac');
   }
  }else if(e.kind==='carrier'){
   for(let j=0;j<(quality==='low'?3:7);j++){
    const u=Math.sin(Math.PI*Math.min(1,t*1.2+j*.035)),x=mix(a.x,p.x,u*.9)+nx*Math.sin(u*Math.PI)*(j-3)*12*z,y=mix(a.y,p.y,u*.9)+ny*Math.sin(u*Math.PI)*(j-3)*12*z;
    line({x:x-dx/d*8*z,y:y-dy/d*8*z},{x,y},color,Math.max(.8,z));
    g.fillStyle='#e1e8ee';g.shadowBlur=0;g.beginPath();g.moveTo(x+dx/d*3*z,y+dy/d*3*z);g.lineTo(x-dx/d*3*z+nx*2*z,y-dy/d*3*z+ny*2*z);g.lineTo(x-dx/d*3*z-nx*2*z,y-dy/d*3*z-ny*2*z);g.fill();
    const v=(t*3+j*.13)%1,b={x:mix(x,p.x,v),y:mix(y,p.y,v)};line(b,{x:b.x-dx/d*9*z,y:b.y-dy/d*9*z},color,Math.max(1,z*2));
   }
  }else{const q={x:mix(a.x,p.x,t),y:mix(a.y,p.y,t)};line(q,{x:q.x-dx/d*12*z,y:q.y-dy/d*12*z},color,2);}
  g.globalAlpha=(1-t)*.8;
  if(e.shield>0){g.strokeStyle='#65c9ff';g.shadowColor='#44aaff';g.shadowBlur=glow;g.lineWidth=Math.max(1,2*z);g.beginPath();g.ellipse(p.x,p.y,(19+12*t)*z,(17+10*t)*z,0,0,TAU);g.stroke();}
  if(e.hull>0||e.kind==='missile'){dot(p.x,p.y,(5+8*t)*z,'#ff9b43',glow+5);dot(p.x,p.y,2*z,'#fff7d2');}
 }
 g.restore();
}
