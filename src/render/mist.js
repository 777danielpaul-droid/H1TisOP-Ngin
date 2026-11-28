import{GFX,GROUND,H,W}from'../core/config.js';
// Nebel im Vordergrund (Gegenstück zu Rain/petals, Bildschirmraum, hinter dem HUD): weiche Nebelbänke treiben langsam über den unteren Bildrand, dazu hellere Schwaden weiter oben.
// Reaktiv: Kämpfer schieben den Nebel beim Laufen vor sich her und wirbeln ihn bei Landung/Dash auf; eine Spezialattacke fegt alle Bänke in Angriffsrichtung weg und lichtet den Nebel kurz,
// danach zieht er wieder zu. Zustand liegt in der Instanz; dt kommt aus game.frame (steht im Pausenmenü still). Ein Sprite (Radialverlauf) wird einmal vorgerendert -> billig.
const MIST_R=Math.random;
export class Mist{
 constructor(){this.p=[];this.pf=null;this.pm=[];this.fs=[];this.clear=0;this.ref=null;this.dy=0;this.t=0;this.spr=null;this.sprTried=false}
 sprite(){if(this.sprTried)return this.spr;this.sprTried=true;
  try{if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),gr=x.createRadialGradient(64,64,0,64,64,64);
   gr.addColorStop(0,'rgba(205,216,255,1)');gr.addColorStop(.45,'rgba(205,216,255,.55)');gr.addColorStop(1,'rgba(205,216,255,0)');x.fillStyle=gr;x.fillRect(0,0,128,128);this.spr=c}}catch(e){this.spr=null}
  return this.spr}
 mk(i){const low=i%4!==3,r=low?110+MIST_R()*110:90+MIST_R()*90;return{x:MIST_R()*(W+300)-150,by:low?H-40-MIST_R()*130:H-200-MIST_R()*180,oy:0,r,a:low?.13+MIST_R()*.1:.06+MIST_R()*.06,s:.6+MIST_R()*.8,ph:MIST_R()*6.28,vx:0,vy:0}}
 // Spezialattacke: Nebel wird in Blickrichtung weggefegt und gelichtet
 boom(dir){for(const q of this.p){q.vx+=dir*(420+MIST_R()*380);q.vy-=60+MIST_R()*140}this.clear=1}
 draw(g,game,oy=0,amt=1){const fr=game.frame,df=this.pf==null?1:Math.max(0,Math.min(4,fr-this.pf)),dt=df/60,cm=game.camera,cz=cm?(cm.z||1):1;this.pf=fr;
  const N=Math.round([10,16,24][Math.max(0,Math.min(2,GFX.level|0))]*amt),da=Math.min(1.5,.55+.45*amt);   // amt = Regler Nebeldichte: mehr/weniger Bänke und kräftigerer/blasserer Nebel
  while(this.p.length<N)this.p.push(this.mk(this.p.length));if(this.p.length>N)this.p.length=N;
  const fy=cm?(GROUND-cm.y)*cz+H/2:0;this.ref=this.ref==null||fy<this.ref?fy:Math.min(fy,this.ref+6*dt);const dy=this.dy=Math.max(0,fy-this.ref);   // Kamera hoch (Sprung) -> Bank rutscht mit nach unten
  let boom=0;const P=this.p;
  game.fighters.forEach((f,i)=>{const m=f.move&&f.moves&&f.moves[f.moveName],sp=m&&m.special?m:null;if(sp&&this.pm[i]!==sp)boom=f.facing<0?-1:1;this.pm[i]=sp;
   if(!cm||f.dead>0)return;const s=this.fs[i]||(this.fs[i]={air:false,vy:0}),gr=f.grounded,Q=cm.toScreen(f.x,f.floor),X=Q[0],Y=Q[1]+oy,land=gr&&s.air&&s.vy>5;
   if(dt>0||land)for(const q of P){const dx=q.x-X,ax=Math.abs(dx),Rw=q.r*.8+70,py=q.by+q.oy+dy*.6;if(ax>=Rw||Math.abs(py-Y)>q.r+90)continue;const k=1-ax/Rw;
    if(land){q.vx+=Math.sign(dx||1)*(60+s.vy*10)*k;q.vy-=(40+s.vy*6)*k}   // Landung: Nebel stiebt nach außen und hoch
    else if(gr||Math.abs(f.vx)>3){q.vx+=f.vx*cz*k*40*dt;q.vy-=Math.abs(f.vx)*k*6*dt*60*.25}}   // Lauf/Dash: Schleppe, Nebel wird mitgeschoben und leicht aufgewirbelt
   s.air=!gr;s.vy=f.vy});
  if(boom)this.boom(boom);
  if(dt>0){this.t+=dt;this.clear=Math.max(0,this.clear-dt/2.2);const dv=Math.exp(-1.5*dt),dw=Math.exp(-2*dt);
   for(const q of P){q.vx*=dv;q.vy*=dw;q.x+=(7*q.s+q.vx)*dt;q.oy+=q.vy*dt;q.vy-=q.oy*4*dt;if(q.x<-q.r-60)q.x=W+q.r+60;else if(q.x>W+q.r+60)q.x=-q.r-60}}   // Feder zieht aufgewirbelte Bänke zurück auf ihre Höhe
  const spr=this.sprite(),k=1-.75*this.clear;g.save();g.fillStyle='#cdd6ff';
  for(const q of P){const x=q.x,y=q.by+q.oy+dy*.6+Math.sin(this.t*.4+q.ph)*5,h=q.r*1.1;g.globalAlpha=Math.max(0,Math.min(1,q.a*k*da));
   if(spr)g.drawImage(spr,x-q.r,y-h/2,q.r*2,h);else{g.globalAlpha*=.5;g.beginPath();g.ellipse(x,y,q.r,h/2,0,0,7);g.fill()}}
  g.restore()}
}
