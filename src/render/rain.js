import{GFX,GROUND,H,W}from'../core/config.js';
// Regen im Vordergrund (Gegenstück zu Renderer.petals/heaps, Bildschirmraum, hinter dem HUD): schräg fallende Tropfen, die unten in 7 Pfützen landen (Ringwellen, Pfützen wachsen).
// Spezialattacke eines Kämpfers (gleiche Erkennung wie bei den Blättern): alle Pfützen spritzen in Angriffsrichtung weg, schrumpfen und füllen sich danach wieder; ein kurzer Windstoß fegt den Regen mit.
// Außerdem kleine Spritzer an den Füßen bei Landung, Lauf und Dash. Zustand liegt in der Instanz; dt kommt aus game.frame (steht im Pausenmenü still).
const RAIN_PUD=[60,190,330,470,610,760,890],RAIN_WMAX=54,RAIN_WMIN=5,RAIN_CAP_SP=380,RAIN_CAP_RP=70,RAINR=Math.random;
export class Rain{
 constructor(){this.d=[];this.rp=[];this.sp=[];this.pud=RAIN_PUD.map((x,i)=>({x:x+(i*37%23)-11,w:RAIN_WMAX*(.55+.1*(i%3)),y:H-9-(i*13%7)}));   // beim Start schon nass, damit die erste Spezialattacke sofort spritzt
  this.pf=null;this.pm=[];this.fs=[];this.gust=0;this.ref=null;this.dy=0}
 drop(init){return{x:RAINR()*(W+240)-120,y:init?RAINR()*H:-RAINR()*50-10,d:.35+RAINR()*.65,ly:H-46+(.35+RAINR()*.65)*38+RAINR()*6}}
 ripple(x,y,r){if(this.rp.length<RAIN_CAP_RP)this.rp.push({x,y,a:0,life:.45+RAINR()*.35,r})}   // y relativ zur Bodenlage (dy wird beim Zeichnen addiert)
 splash(x,y,vx,vy,die,gy,nr){if(this.sp.length<RAIN_CAP_SP)this.sp.push({x,y,vx,vy,a:0,die,gy,nr})}
 burst(x,y,n,dir){for(let k=0;k<n;k++)this.splash(x+(RAINR()-.5)*18,y-1,dir*(40+RAINR()*140)+(RAINR()-.5)*120,-(60+RAINR()*160),.35+RAINR()*.3,y+2,1)}
 // Spezialattacke: Pfützen spritzen in Blickrichtung des Angreifers weg
 boom(dir){const dy=this.dy;for(const p of this.pud){const n=Math.min(24,Math.round(p.w*.55));
   for(let k=0;k<n;k++)this.splash(p.x+(RAINR()-.5)*p.w*1.6,p.y+dy,dir*(150+RAINR()*520)+(RAINR()-.5)*150,-(120+RAINR()*520),.9+RAINR()*.9,p.y+dy+RAINR()*6,0);
   p.w=Math.max(RAIN_WMIN,p.w*.25)}this.gust=dir}
 draw(g,game,oy=0){const fr=game.frame,df=this.pf==null?1:Math.max(0,Math.min(4,fr-this.pf)),dt=df/60,cm=game.camera;this.pf=fr;
  const N=[45,80,120][Math.max(0,Math.min(2,GFX.level|0))];while(this.d.length<N)this.d.push(this.drop(true));if(this.d.length>N)this.d.length=N;
  const fy=cm?(GROUND-cm.y)*(cm.z||1)+H/2:0;this.ref=this.ref==null||fy<this.ref?fy:Math.min(fy,this.ref+6*dt);const dy=this.dy=Math.max(0,fy-this.ref);   // Kamera hoch (Sprung) -> Boden rutscht nach unten, Pfützen mit
  let boom=0;game.fighters.forEach((f,i)=>{const m=f.move&&f.moves&&f.moves[f.moveName],sp=m&&m.special?m:null;if(sp&&this.pm[i]!==sp)boom=f.facing<0?-1:1;this.pm[i]=sp;
   if(!cm||f.dead>0)return;const s=this.fs[i]||(this.fs[i]={air:false,vy:0,n:0}),gr=f.grounded,P=cm.toScreen(f.x,f.floor),X=P[0],Y=P[1]+oy;   // Füße in Bildschirmkoordinaten
   if(gr&&s.air&&s.vy>5)this.burst(X,Y,Math.min(14,Math.round(4+s.vy*.6)),0);else if(gr&&Math.abs(f.vx)>3&&++s.n%4===0)this.burst(X,Y,2,-Math.sign(f.vx));
   s.air=!gr;s.vy=f.vy});
  if(boom)this.boom(boom);
  if(dt>0){this.gust*=Math.exp(-2.2*dt);
   for(const q of this.d){q.y+=(480+q.d*620)*dt;q.x+=(-60*q.d+this.gust*900*q.d)*dt;if(q.x<-130)q.x+=W+260;else if(q.x>W+130)q.x-=W+260;
    if(q.y>=q.ly){let b=null,bd=1e9;for(const p of this.pud){const e=Math.abs(p.x-q.x);if(e<bd){bd=e;b=p}}if(b&&bd<100)b.w=Math.min(RAIN_WMAX,b.w+.14);
     this.ripple(q.x,q.ly,3+q.d*7);if(RAINR()<.35)this.splash(q.x,q.ly+dy,(RAINR()-.5)*60,-(60+RAINR()*90),.5,q.ly+dy+2,1);
     q.y=-RAINR()*40-10;q.x=RAINR()*(W+240)-120}}
   for(const p of this.pud)p.w=Math.min(RAIN_WMAX,p.w+.35*dt);   // Pfützen füllen sich auch ohne Treffer langsam wieder
   for(const r of this.rp)r.a+=dt;this.rp=this.rp.filter(r=>r.a<r.life);
   const out=[];for(const s of this.sp){s.a+=dt;s.vy+=980*dt;s.vx*=1-.8*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
    if(s.vy>0&&s.y>=s.gy){if(!s.nr)this.ripple(s.x,s.gy-dy,3+RAINR()*4);continue}if(s.a>s.die||s.x<-40||s.x>W+40||s.y>H+40)continue;out.push(s)}this.sp=out}
  g.save();g.lineCap='round';
  // fallende Tropfen in 3 Tiefenstufen (je ein Pfad): weit = dünn + blass, nah = dicker + deckender
  for(let b=0;b<3;b++){g.beginPath();for(const q of this.d){if((q.d<.55?0:q.d<.8?1:2)!==b)continue;const vy=480+q.d*620,vx=-60*q.d+this.gust*900*q.d,k=.012+q.d*.012;g.moveTo(q.x,q.y);g.lineTo(q.x-vx*k,q.y-vy*k)}
   g.strokeStyle=b?'#cfeaff':'#9cc4f0';g.lineWidth=.7+b*.45;g.globalAlpha=.16+b*.14;g.stroke()}
  // Pfützen
  for(const p of this.pud){const rx=p.w,ry=rx*.17+.6,y=p.y+dy;g.globalAlpha=.3;g.fillStyle='#3f86e0';g.beginPath();g.ellipse(p.x,y,rx,ry,0,0,7);g.fill();
   g.globalAlpha=.14;g.fillStyle='#aee4ff';g.beginPath();g.ellipse(p.x-rx*.15,y-ry*.2,rx*.6,ry*.5,0,0,7);g.fill();
   g.globalAlpha=.3;g.strokeStyle='#cdeaff';g.lineWidth=1;g.beginPath();g.ellipse(p.x,y,rx,ry,0,0,7);g.stroke()}
  // Ringwellen
  g.strokeStyle='#d6efff';g.lineWidth=.9;for(const r of this.rp){const k=r.a/r.life,rx=r.r*(.3+k);g.globalAlpha=(1-k)*.5;g.beginPath();g.ellipse(r.x,r.y+dy,rx,rx*.28,0,0,7);g.stroke()}
  // Spritzer (aufgewirbelte Tropfen): kurze Striche entlang der Flugrichtung
  g.strokeStyle='#c4e6ff';g.lineWidth=1.3;for(const s of this.sp){g.globalAlpha=s.a>s.die-.25?Math.max(0,(s.die-s.a)/.25)*.85:.85;g.beginPath();g.moveTo(s.x,s.y);g.lineTo(s.x-s.vx*.02,s.y-s.vy*.02);g.stroke()}
  g.restore()}
}
