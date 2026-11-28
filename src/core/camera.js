import{BARRIER,CAMERA,GROUND,H,MELEE,W,WALL_L,WALL_R,WORLD}from'./config.js';
const FINALE_VIEW=460;   // Story-Finale: so viele px des Gebäudes hinter der brechbaren Außenwand sind sichtbar (Kamera darf bis Wand + FINALE_VIEW)

export const MWORLD={...WORLD,y1:MELEE.y1+90};   // Melee: Kamera darf unter die Plattform schauen (Fallende, Blast-Zone unten)
const groundLock=(zoom)=>GROUND-(GROUND-H/2)/zoom;   // Bei jedem Zoom bleibt die Bodenlinie im Bild an derselben Stelle.
// Virtuelle Kamera. (x,y) = Weltkoordinate in der Bildschirmmitte, zoom = Skalierung (1 = normal, <1 = herausgezoomt).
// Rein rechnerisch (kein DOM) -> Teil der Spiellogik und headless testbar.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Camera{
 constructor(){this.x=W/2;this.y=H/2;this.zoom=1;this.punch=0;this.cine=null;this.melee=false;this.fixedZoom=false;this.follow=false;this.limitX=0;this.locked=null;this.target={x:W/2,y:H/2,zoom:1}}
 // Zielwerte aus der Bounding-Box beider Kämpfer: Breite (Abstand) UND Höhe (Sprünge) bestimmen den Zoom.
 get wd(){return this.melee?MWORLD:WORLD}
 // Melee: Plattform bleibt immer im Bild; Kämpfer (auch weit draußen, begrenzt auf die Blast-Zonen) werden mit eingerahmt, Tote ignoriert
 computeMelee(fighters){const C=CAMERA,M=MELEE,cl=(v,a,b)=>Math.max(a,Math.min(b,v));let minX=M.pl-30,maxX=M.pr+30,minTop=GROUND-200,maxBot=GROUND+10;
  for(const f of fighters){if(f.dead>0)continue;const sz=(f.char&&f.char.size)||1;
   minX=Math.min(minX,cl(f.x,M.x0,M.x1)-70);maxX=Math.max(maxX,cl(f.x,M.x0,M.x1)+70);minTop=Math.min(minTop,cl(f.y-165*sz,M.y0,M.y1));maxBot=Math.max(maxBot,cl(f.y+30,M.y0,M.y1+30))}
  const needW=(maxX-minX)+120,needH=(maxBot-minTop)+C.headroom+70,zoom=cl(Math.min(W/needW,H/needH),C.minZoom,C.maxZoom),hw=W/2/zoom,hh=H/2/zoom,wd=MWORLD;
  const floorY=groundLock(zoom),airY=minTop-C.headroom+hh;
  this.span={min:wd.x0+hw,max:wd.x1-hw,home:W/2};
  return{x:cl((minX+maxX)/2,wd.x0+hw,wd.x1-hw),y:cl(Math.min(floorY,airY),wd.y0+hh,wd.y1-hh),zoom}}
 compute(fighters){if(this.melee)return this.computeMelee(fighters);
  if(this.story){const s=this.story,p=fighters[0],zoom=.88,hw=W/2/zoom,hh=H/2/zoom,lo=Math.max(s.l,WORLD.x0)+hw,hi=Math.min(s.r+(s.finale&&!s.finale.broken&&s.r===s.finale.x?FINALE_VIEW:0),WORLD.x1)-hw;   // Story: Seitenscroller, folgt dem Spieler innerhalb der Level-/Kampfgrenzen; solange die Außenwand heil ist (Endgegner-Arena) darf die Kamera über sie hinaus aufs Finale-Gebäude schauen; nach dem Durchbruch begrenzt die Rückwand
   // Parkour: klettert die Figur hoch, folgt die Kamera nach oben (Füße bei ~62 % der Bildhöhe, so sieht man die nächsten Plattformen); am Boden bleibt der Boden unten im Bild
   this.span=lo>hi?null:{min:lo,max:hi};
   return{x:lo>hi?(lo+hi)/2:clamp(p.x+p.facing*70,lo,hi),y:Math.min(H-hh,p.y-.24*hh),zoom}}const C=CAMERA;let minX=1e9,maxX=-1e9,minTop=1e9;
  // Titel-Demo (render/renderer.js drawDemo): Kamera folgt der Mitte aller Kämpfer und darf höchstens limitX nach links/rechts, genau bis zum Rand des Hintergrundbildes
  if(this.fixedZoom&&this.follow&&this.limitX>0){const al=fighters.filter(f=>f.dead<=0);if(!al.length)return{x:this.x,y:groundLock(1),zoom:1};const mx=(Math.min(...al.map(f=>f.x))+Math.max(...al.map(f=>f.x)))/2;return{x:clamp(mx,W/2-this.limitX,W/2+this.limitX),y:groundLock(1),zoom:1}}
  if(this.fixedZoom){const focus=fighters.filter(f=>f.dead<=0&&!['airhit','tumble','ko','knockdown','wakeup'].includes(f.state));
   if(focus.length){let minF=Math.min(...focus.map(f=>f.x-70)),maxF=Math.max(...focus.map(f=>f.x+70)),x=this.x,left=120,right=W-120,minS=minF-x+W/2,maxS=maxF-x+W/2;
    if(minS<left&&maxS<=right)x=minF+W/2-left;else if(maxS>right&&minS>=left)x=maxF+W/2-right;
    x=clamp(x,WORLD.x0+W/2,WORLD.x1-W/2);this.span=this.versusSpan();return{x,y:groundLock(1),zoom:1}}
   this.span=this.versusSpan();return{x:this.x,y:groundLock(1),zoom:1}}
  for(const f of fighters){minX=Math.min(minX,f.x-70);maxX=Math.max(maxX,f.x+70);
   const lying=f.state==='knockdown'||(f.state==='ko'&&f.grounded);minTop=Math.min(minTop,f.y-(lying?40:165*((f.char&&f.char.size)||1)))}
  const needW=(maxX-minX)+C.marginX*2;           // benötigte Weltbreite
  const needH=H-(minTop-C.headroom);              // von Kopf-Oberkante (+Luft fürs HUD) bis zum Boden-Bildrand
  const zoom=this.fixedZoom?1:clamp(Math.min(W/needW,H/needH),C.minZoom,C.maxZoom);
  const hw=W/2/zoom,hh=H/2/zoom;
  let x=(minX+maxX)/2;                            // horizontal: Mitte beider Kämpfer
  const floorY=groundLock(zoom),airY=minTop-C.headroom+hh;
  let y=Math.min(floorY,airY);                    // Boden bleibt verankert; bei Sprüngen folgt die Kamera nur nach oben
  x=clamp(x,WORLD.x0+hw,WORLD.x1-hw);y=clamp(y,WORLD.y0+hh,WORLD.y1-hh);this.span=this.versusSpan();
  return{x,y,zoom}}
 // Schwenkbereich der Kamera-Mitte im normalen Kampf: von der linken bis zur rechten (vollständig geöffneten) Wand-Barriere; Heimposition = Bildmitte
 versusSpan(){return{min:Math.max(WORLD.x0+W/2,WALL_L-BARRIER.width+W/2-110),max:Math.min(WORLD.x1-W/2,WALL_R+BARRIER.width-W/2+110),home:W/2}}
 // Wo steht die Kamera in ihrem Schwenkbereich? -1 = ganz links, 0 = Heimposition/Mitte, 1 = ganz rechts. Der Hintergrund bildet das auf seine volle Breite ab:
 // am Ende des Schwenkbereichs ist der Bildrand erreicht, man sieht also das ganze Bild.
 bgPan(){const s=this.span;if(!s)return 0;const home=s.home!=null?s.home:(s.min+s.max)/2,d=this.x-home,half=d>=0?s.max-home:home-s.min;return half>1?clamp(d/half,-1,1):0}
 // Parameter für den mitzoomenden Kampf-Hintergrund (render/backdrop.js): Boden-Zeile als Drehpunkt, Schwenk, kleinster vorkommender Zoom
 bgLock(){return{gy:GROUND,pan:this.bgPan(),zmin:this.melee?CAMERA.minZoom:this.story?.88:1}}
 kick(a){this.punch=Math.max(this.punch,a)}   // kurzer Zoom-Punch bei Treffern (klingt von selbst ab)
 get z(){return this.zoom*(this.fixedZoom&&!this.cine?1:1+this.punch)}
 // Kamerafahrt (Hyper): Fokus auf einen Weltpunkt. w (0..1) blendet zwischen Kampfkamera und Fokus; focus(null) beendet sie.
 focus(x,y,zoom,w=1){this.cine=x==null?null:{x,y,zoom,w}}
 update(fighters){this.punch=this.punch>.0004?this.punch*.84:0;const C=CAMERA,K=this.cine;
  if(this.fixedZoom&&!this.melee&&!this.story&&!K){this.locked=null;const t=this.compute(fighters);this.target=t;this.x+=(t.x-this.x)*C.lerpPos;this.y=t.y;this.zoom=1;return}
  const cinematic=fighters.some(f=>f.state==='attack'&&f.move&&f.move.super),knocked=!this.melee&&!this.story&&!cinematic?fighters.filter(f=>f.dead<=0&&['airhit','tumble','ko'].includes(f.state)):[];
  if(knocked.length&&!K&&!this.locked){const hitter=fighters.find(f=>f.dead<=0&&!['airhit','tumble','ko'].includes(f.state));this.locked={x:hitter?hitter.x:this.x,y:this.y,zoom:this.zoom,anchorX:knocked[0].x};this.x=this.locked.x}
  if(!knocked.length&&!K)this.locked=null;
  if(this.locked&&!K){const d=Math.max(0,...knocked.map(f=>Math.abs(f.x-this.locked.anchorX)-120)),z=clamp(this.locked.zoom*W/(W+d*1.45),C.minZoom,this.locked.zoom);this.target={x:this.locked.x,y:this.locked.y,zoom:z};this.x=this.locked.x;this.y=this.locked.y;this.zoom=z;return}
  let t=this.compute(fighters);let lp=C.lerpPos,lz=C.lerpZoom;
  if(K&&K.w>0){const z=t.zoom+(Math.max(K.zoom,t.zoom)-t.zoom)*K.w,hw=W/2/z,hh=H/2/z;
   t={x:clamp(t.x+(K.x-t.x)*K.w,this.wd.x0+hw,this.wd.x1-hw),y:clamp(t.y+(K.y-t.y)*K.w,this.story?-1e9:this.wd.y0+hh,this.wd.y1-hh),zoom:z};
   lp=C.lerpPos+(C.cine.lerpPos-C.lerpPos)*K.w;lz=C.lerpZoom+(C.cine.lerpZoom-C.lerpZoom)*K.w}
  this.target=t;this.x+=(t.x-this.x)*lp;this.y+=(t.y-this.y)*lp;this.zoom+=(t.zoom-this.zoom)*lz}
 snap(fighters){this.locked=null;const t=this.target=this.compute(fighters);this.x=t.x;this.y=t.y;this.zoom=t.zoom}
 // Welt-Transformation: erst auf Bildschirmmitte, dann skalieren, dann um den Kamerapunkt verschieben.
 apply(g){g.translate(W/2,H/2);g.scale(this.z,this.z);g.translate(-this.x,-this.y)}
 toScreen(x,y){return[(x-this.x)*this.z+W/2,(y-this.y)*this.z+H/2]}
 toWorld(sx,sy){return[(sx-W/2)/this.z+this.x,(sy-H/2)/this.z+this.y]}
}
