import{GROUND}from'./config.js';
// Parkour-Generator: aus einer Kürzel-Folge (segs) wird die Plattform-Strecke eines Kapitels. Rein rechnerisch, ohne Zufall -> jedes Kapitel sieht immer gleich aus und ist testbar
// (tests/parkour.test.js prüft jede Stufe mit der echten Physik: Einfachsprung bzw. Doppelsprung).
// Maßstab: Figuren sind ~180 px groß (≈ 1,8 m, also ~100 px pro Meter). Ein Einfachsprung trägt ≈ 300 px hoch und ≈ 270 px weit, mit Doppelsprung ≈ 480 px weit.
export const PK_ZONE={x0:-300,x1:800};   // Kletterzone (x): rechts vor den Kanten (ab x≈860). Wellen starten nicht, solange man hoch oben klettert (Story.update)
export const PK_SEG={
 S:{dh:110,gap:60},                                  // Stufe: 110 px höher, 60 px Lücke
 L:{dh:80,gap:110},                                  // flache Stufe mit größerer Lücke
 H:{dh:190,gap:30},                                  // hohe Stufe fast senkrecht (knapp unter der Sprunghöhe)
 N:{dh:110,gap:70,w:90},                             // schmale Plattform (nur 90 px breit)
 D:{dh:40,gap:340,need:'double'},                    // weite Lücke: NUR mit Doppelsprung
 F:{dh:0,gap:200},                                   // gerade Lücke, gleiche Höhe
 B:{dh:50,gap:340,w:300,need:'double'},             // oberste Plattform: breite Rast mit Händler + Schatz, Pflicht-Doppelsprung-Lücke
 M:{dh:110,gap:60,kind:'move',amp:80,per:230},       // bewegliche Plattform (pendelt ±80 px)
 C:{dh:110,gap:70,kind:'crumble'},                   // bröckelnde Plattform (fällt nach dem Betreten weg)
 T:{turn:true}};                                     // Richtungswechsel ohne Plattform
// spec: {segs:'SLSH…B', width:210, first:130, name:'SCHATZ'} -> {platforms:[{x0,x1,h,kind,amp,per,ph,need,seg}], relic:{x,h,name}, dealer:{x,h}|null, height}
// Endet die Folge mit B (breite Rast, 300 px), steht dort oben links der Schatz und rechts der Händler KORVUS (der sonst nirgends im Kapitel auftaucht).
// Die Strecke läuft von links nach rechts und prallt an der Zonengrenze zurück (Zickzack). need='double' = der Übergang in diese Plattform braucht den Doppelsprung.
export function buildParkour(spec){
 let issues=0;const w0=spec.width||200,P=[{x0:-250,x1:-250+w0,h:spec.first||130,kind:'solid',amp:0,need:'single',seg:'0'}];let dir=1,mv=0;
 for(const c of spec.segs){const d=PK_SEG[c];if(!d)continue;if(d.turn){dir=-dir;continue}
  const prev=P[P.length-1],w=d.w||w0,amp=d.amp||0,lo=PK_ZONE.x0+amp,hi=PK_ZONE.x1-amp,gap=d.gap,h=prev.h+d.dh;
  const place=(dr,ww)=>dr>0?{x0:prev.x1+gap,x1:prev.x1+gap+ww}:{x0:prev.x0-gap-ww,x1:prev.x0-gap};
  const inZone=q=>q.x0>=lo&&q.x1<=hi;
  // Die oberste Plattform (B) ist die Pflicht-Doppelsprung-Lücke: von keiner früheren Plattform außer der direkt davor per Einfachsprung erreichbar (Höhe ≤ 295 px und Lücke ≤ 262-0,3·Höhe; gemessen mit der echten Physik: Einfachsprung trägt 250 px weit bei gleicher Höhe, 180 px bei +240 px, vertikal höchstens ~290 px; Doppelsprung ≈ 450 px weit),
  // damit man den Händler + Schatz nie ohne Doppelsprung erreicht. (Weitere D-Lücken in der Mitte dürfen umgangen werden.)
  const gx=(o,q)=>Math.max(0,Math.max(o.x0-(o.amp||0)-(q.x1+amp),q.x0-amp-(o.x1+(o.amp||0))));
  const free=q=>c!=='B'||P.slice(0,-1).every(o=>{const dh=h-o.h;return!(dh>0&&dh<=295&&gx(o,q)<=262-.3*dh)});
  const widths=c==='D'?[w,w-20,w-40,w-60,w-80].filter(x=>x>=110):[w];   // eine D-Lücke darf die Zielplattform etwas schmaler machen, wenn die Zone sonst nicht reicht
  let pl=null;
  for(const ww of widths){for(const dr of[dir,-dir]){const q=place(dr,ww);if(inZone(q)&&free(q)){pl=q;dir=dr;break}}if(pl)break}
  if(!pl){issues++;pl=place(dir,w);if(!inZone(pl)){dir=-dir;pl=place(dir,w)}
   if(pl.x1>hi){pl.x1=hi;pl.x0=hi-w}else if(pl.x0<lo){pl.x0=lo;pl.x1=lo+w}}   // Notfall: in die Zone schieben (der Test meldet dann eine zu kurze Lücke)
  P.push({x0:pl.x0,x1:pl.x1,h,kind:d.kind||'solid',amp,per:d.per||240,ph:d.kind==='move'?(mv++)*1.9:0,need:d.need||'single',seg:c})}
 const top=P[P.length-1],rest=top.seg==='B';
 return{platforms:P,relic:{x:rest?top.x0+55:Math.round((top.x0+top.x1)/2),h:top.h,name:spec.name||'SCHATZ'},dealer:rest?{x:top.x1-90,h:top.h}:null,height:top.h,issues}}   // issues > 0: eine Plattform musste notgedrungen an eine unpassende Stelle (die Tests schlagen dann an)
export const pkTopY=p=>GROUND-p.h;
