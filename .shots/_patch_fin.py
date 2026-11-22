R='/Users/danielpaul/Desktop/hitisop/'
def edit(p,pairs):
    s=open(R+p,encoding='utf8').read()
    for a,b in pairs:
        assert s.count(a)==1,(p,s.count(a),a[:90])
        s=s.replace(a,b)
    open(R+p,'w',encoding='utf8').write(s)

# ---- Konfiguration ----
s=open(R+'src/core/config.js',encoding='utf8').read()
add='''// Combo-Finisher (Super-Spezial): nach `hits` Treffern in Folge (Combo läuft noch) löst „Hyper“ (I) OHNE Meter eine aufgeladene Version des Standard-Specials aus.
// dmg/size/speed/life = Faktoren auf Schaden, Größe, Tempo und Lebensdauer der Energiewelle · hs = zusätzliche Trefferstarre · stun = so lange bleibt der Gegner mindestens getroffen
// slow = Zeitlupe (Anteil der Normalgeschwindigkeit) · tail = Schritte Nachlauf nach dem Treffer · max = Notbremse (Schritte). Der Hintergrund wird für die Dauer schwarz.
export const COMBO_FINISH={hits:10,dmg:3.4,size:1.9,speed:1.4,life:1.5,hs:16,stun:80,slow:.28,tail:10,max:120};
'''
s=s.rstrip('\n')+'\n'+add
open(R+'src/core/config.js','w',encoding='utf8').write(s)

# ---- Projektil: Mindest-Skalierung aus der Definition ----
edit('src/core/projectile.js',[("hstop:8,shake:3,lv:d.lv||'mid',launch:d.launch||null,hard:!!d.hard,multi:0,minScale:0}",
 "hstop:d.hstop||8,shake:d.shake||3,lv:d.lv||'mid',launch:d.launch||null,hard:!!d.hard,multi:0,minScale:d.minScale||0}")])

# ---- Fighter ----
edit('src/core/fighter.js',[
("import{AIR,BARRIER,BOUNCE,GROUND,MELEE,PHYS,SPAM,STAMINA,WALL_L,WALL_R}from'./config.js';","import{AIR,BARRIER,BOUNCE,COMBO_FINISH,GROUND,MELEE,PHYS,SPAM,STAMINA,WALL_L,WALL_R}from'./config.js';"),
("stamFlash:0,","stamFlash:0,finDone:false,"),
(" endCombo(){if(this.comboHits>0)this.comboShow=",
 " endCombo(){this.finDone=false;if(this.comboHits>0)this.comboShow="),
# Cancel (aus dem laufenden Move heraus)
(" tryCancel(game){const i=this.input,m=this.move,B=PHYS.cancelBuffer;\n",
 " tryCancel(game){const i=this.input,m=this.move,B=PHYS.cancelBuffer;\n  if(i.pressed('SUP',B)&&this.finisherReady(game)){i.consume('SUP');this.startFinisher(game);return true}   // Combo-Finisher direkt nach dem Treffer\n"),
# aus Idle/Walk/Dash
(" tryAttack(game){const i=this.input;\n",
 " // Combo-Finisher (Super-Spezial): läuft beim Gegner eine Combo mit mindestens COMBO_FINISH.hits Treffern, startet „Hyper“ (I) ohne Meter eine aufgeladene Version des Standard-Specials (je Combo einmal)\n finisherReady(game){const o=this.foeRef;return !!o&&!game.melee&&!o.finDone&&o.comboHits>=COMBO_FINISH.hits&&o.hp>0&&this.hp>0&&!!this.moves.fireball&&!!this.moves.fireball.proj}\n startFinisher(game){const o=this.foeRef,fm=finisherOf(this.moves.fireball);\n  o.finDone=true;if(o.state==='hit')o.stun=Math.max(o.stun||0,COMBO_FINISH.stun);   // der Gegner bleibt getroffen, bis die Welle ihn erwischt\n  if(this.moves.finisher!==fm)this.moves={...this.moves,finisher:fm};\n  this._btn='SUP';this.startMove('finisher',game);game.startFinisher(this)}\n tryAttack(game){const i=this.input;if(i.pressed('SUP')&&this.finisherReady(game)){i.consume('SUP');this.startFinisher(game);return true}\n"),
])
# finisherOf als Modul-Funktion vor der Klasse
s=open(R+'src/core/fighter.js',encoding='utf8').read()
i=s.index('export class Fighter')
helper='''// Aufgeladene Version des Standard-Specials (Energiewelle/Feuer-Atem/…): mehr Schaden, größer, schneller, länger, Knockdown, kaum Combo-Abwertung. Wird je Basis-Move einmal berechnet.
const FIN_MOVES=new WeakMap();
function finisherOf(base){let m=FIN_MOVES.get(base);if(m)return m;const F=COMBO_FINISH,up=d=>({...d,dmg:Math.round(d.dmg*F.dmg),w:Math.round(d.w*F.size),h:Math.round(d.h*F.size),vx:d.vx*F.speed,life:Math.round(d.life*F.life),hs:(d.hs||16)+F.hs,bs:(d.bs||10)+F.hs,hard:true,launch:d.launch||{vx:2.2,vy:-9},minScale:.85,hstop:12,shake:9,cfin:1});
 m={...base,label:'SUPER '+(base.label||'SPECIAL'),super:true,cfin:true,cost:0,rc:(base.rc||18)+12,glow:1,base,proj:[].concat(base.proj).map(up)};delete m.v;FIN_MOVES.set(base,m);return m}
'''
s=s[:i]+helper+s[i:]
open(R+'src/core/fighter.js','w',encoding='utf8').write(s)

# ---- Game ----
edit('src/core/game.js',[
("import{CAMERA,EFFECT,GROUND,MELEE,METER,ROUND,W}from'./config.js';","import{CAMERA,COMBO_FINISH,EFFECT,GROUND,MELEE,METER,ROUND,W}from'./config.js';"),
("this.slow=0;this.timeScale=1;this.celeb=null;this.particles.onBoom=","this.slow=0;this.timeScale=1;this.fin=null;this.finA=0;this.celeb=null;this.particles.onBoom="),
("this.celeb=null;this.slow=0;this.timeScale=1;this.sfx('ui_round_start'","this.celeb=null;this.slow=0;this.timeScale=1;this.fin=null;this.finA=0;this.sfx('ui_round_start'"),
(" startSuper(f){"," // Combo-Finisher: gleicher Freeze/Titel wie beim Hyper, danach kurze Zeitlupe; der Hintergrund bleibt schwarz, bis die Attacke vorbei ist (fin = Zustand, finA = weiches Ein-/Ausblenden)\n startFinisher(f){this.fin={owner:f,t:0,tail:0};this.startSuper(f)}\n startSuper(f){"),
("else this.timeScale=1;  // Zeitlupe beim K.O.","else if(this.fin&&this.superFlash<=0)this.timeScale=COMBO_FINISH.slow;else this.timeScale=1;  // Zeitlupe beim K.O. bzw. beim Combo-Finisher"),
("  this.cineCamera();\n","  this.finA+=((this.fin?1:0)-this.finA)*.35;if(this.finA<.01)this.finA=0;\n  this.cineCamera();\n"),
("  if(this.hitstop>0){this.hitstop--;return}\n  switch(this.phase){",
 "  if(this.hitstop>0){this.hitstop--;return}\n  if(this.fin){const F=this.fin,o=F.owner;F.t++;if((o.moveName==='finisher'&&o.state==='attack')||this.projectiles.some(p=>p.owner===o&&p.def.cfin))F.tail=0;else F.tail++;if(F.tail>COMBO_FINISH.tail||F.t>COMBO_FINISH.max||(this.phase!=='fight'&&this.phase!=='intro'))this.fin=null}\n  switch(this.phase){"),
])

# ---- Renderer: Hintergrund schwarz ----
edit('src/render/renderer.js',[
("  for(const f of game.fighters)if(!ML||(f.onStage&&!f.under&&!(f.dead>0))){this.post.floorGlow(",
 "  if(game.finA>.01){g.save();g.setTransform(s,0,0,s,0,0);g.globalAlpha=Math.min(1,game.finA);g.fillStyle='#000';g.fillRect(0,0,W,H);g.restore()}   // Combo-Finisher: Hintergrund komplett schwarz (Figuren, Projektile, Effekte und HUD bleiben)\n  for(const f of game.fighters)if(!ML||(f.onStage&&!f.under&&!(f.dead>0))){this.post.floorGlow("),
])
print('ok')
