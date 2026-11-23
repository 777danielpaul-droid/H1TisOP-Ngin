// Ausdauer-System: node tests/stamina.test.js
import assert from'node:assert/strict';
import{Game}from'../src/core/game.js';
import{Fighter}from'../src/core/fighter.js';
import{InputBuffer}from'../src/core/input.js';
import{CHARACTERS}from'../src/core/characters.js';
import{STAMINA as S}from'../src/core/config.js';
function setup(gap=400,on=true){const i1=new InputBuffer(),i2=new InputBuffer();
 const p1=new Fighter({char:CHARACTERS.tiger,x:200,facing:1,input:i1}),p2=new Fighter({char:CHARACTERS.wolf,x:200+gap,facing:-1,input:i2});
 const g=new Game(p1,p2);g.stamPref=on;while(g.phase!=='fight'){i1.feed(0,0,[]);i2.feed(0,0,[]);g.step()}
 // t: Spieler 1 drückt pr (nur im 1. Frame) und hält Richtung dx/dy n Frames; Spieler 2 drückt pr2 (1. Frame)
 const t=(pr=[],n=1,dx=0,dy=0,pr2=[])=>{for(let k=0;k<n;k++){const fz=g.hitstop>0||g.superFlash>0;i1.feed(dx,dy,k===0?pr:[],fz);i2.feed(0,0,k===0?pr2:[],fz);g.step()}};
 const idle=()=>{let c=0;while(p1.state==='attack'&&c++<200)t()};
 return{g,p1,p2,t,idle}}
const ok=n=>console.log('  ✓',n);

// 1) Alle starten voll; Kosten je Angriffsstärke (L < M < H) werden abgezogen
{const{p1,t}=setup();assert.equal(p1.st,p1.stMax,'Runde startet mit voller Ausdauer (stMax = max x char.stam, z. B. H!T 1,15)');
 for(const b of['L','M','H']){const{p1:q,t:tt}=setup();tt([b]);assert.equal(q.state,'attack');assert.equal(+(q.stMax-q.st).toFixed(3),S.cost[b],b+' kostet '+S.cost[b])}
 assert.ok(S.cost.L<S.cost.M&&S.cost.M<S.cost.H&&S.cost.H<S.cost.special.def,'Kosten steigen mit der Stärke');ok('Kosten L/M/H abgezogen, Leiste startet voll');void t}

// 2) Regeneration: erst nach der Pause, dann stetig
{const{p1,t,idle}=setup();t(['H']);idle();const s0=p1.st;assert.ok(p1.stDelay>0,'Pause läuft nach dem Verbrauch');
 const d=p1.stDelay;t([],d-2);assert.equal(p1.st,s0,'während der Pause keine Regeneration');
 t([],40);assert.ok(p1.st>s0+S.regen*30,'danach regeneriert sie');ok('Pause nach Verbrauch, dann Regeneration')}

// 3) Aktives Blocken (Rück-Taste gehalten): KEINE Regeneration – neutral stehen: schon
{const a=setup();a.p1.st=50;a.t([],100,-1);assert.equal(a.p1.st,50,'beim Halten der Rück-Taste keine Regeneration');
 const b=setup();b.p1.st=50;b.t([],100,0);assert.ok(b.p1.st>55,'neutral regeneriert');
 const c=setup();c.p1.st=50;c.t([],100,1);assert.ok(c.p1.st>55,'vorwärts laufen regeneriert');ok('kein Regenerieren beim aktiven Blocken')}

// 4) Blocken kostet Ausdauer pro geblocktem Treffer (und löst die Pause aus)
{const{g,p1,p2,t}=setup(70);p1.st=60;let blocked=false;
 for(let k=0;k<60&&!blocked;k++){t([],1,-1,0,k===5?['H']:[]);if(p1.state==='block')blocked=true}
 assert.ok(blocked,'Treffer wurde geblockt');assert.ok(p1.st<60,'Block kostet Ausdauer');assert.ok(p1.stDelay>0,'danach Regenerationspause');void g;void p2;ok('Blocken verbraucht Ausdauer')}

// 5) Auspowern: Leiste auf 0 -> erschöpft + deutlich längere Pause als normal
{const{p1,t,idle}=setup();p1.st=2;t(['L']);idle();assert.equal(p1.st,0);assert.ok(p1.exh,'erschöpft');
 assert.ok(S.emptyDelay>=S.delay*2,'Leer-Pause deutlich länger als normale Pause');
 const d0=p1.stDelay;assert.ok(d0>S.delay,'Leer-Pause aktiv (länger als normal)');
 t([],d0-3);assert.equal(p1.st,0,'in der langen Pause keine Regeneration');
 t([],S.exhaust.until/(S.regen*S.exhaust.regen)+20);assert.ok(!p1.exh,'irgendwann wieder handlungsfähig');ok('Auspowern: lange Pause + erschöpft')}

// 6) Erschöpft: eingeschränkt, aber nie handlungsunfähig
{const f=()=>{const s=setup();s.p1.st=0;s.p1.exh=true;s.p1.stDelay=9999;return s};
 {const{p1,t}=f();t(['H']);assert.notEqual(p1.state,'attack','schwer gesperrt');assert.ok(p1.stamFlash>0,'Hinweis-Blinken')}
 {const{p1,t}=f();t(['M']);assert.notEqual(p1.state,'attack','mittel gesperrt')}
 {const{p1,t}=f();t(['S']);assert.notEqual(p1.state,'attack','Special gesperrt')}
 {const{p1,t}=f();t(['DASH']);assert.notEqual(p1.state,'dash','Dash gesperrt')}
 {const{p1,t}=f();t(['L']);assert.equal(p1.state,'attack','leicht geht immer')}
 {const{p1,t}=f();t(['UP']);t([],6);assert.ok(!p1.grounded,'Springen geht immer')}
 {const e=f(),n=setup();e.t([],6,1);n.t([],6,1);assert.ok(e.p1.vx>0&&Math.abs(e.p1.vx/n.p1.vx-S.exhaust.speed)<.02,'Laufen geht, aber langsamer')}
 {const{p1,t}=f();t([],8,-1);assert.equal(p1.state,'walk','Zurückweichen geht');assert.ok(!p1.guarding,'unter 25 %: kein Blocken mehr')}
 {const s=setup();s.p1.st=S.cost.H-1;s.t(['H']);assert.notEqual(s.p1.state,'attack','schwer nur mit genug Ausdauer');s.p1.stDelay=0;s.p1.st=S.cost.H;s.t(['H']);assert.equal(s.p1.state,'attack')}
 {const s=setup();s.p1.st=S.cost.dash;s.p1.stDelay=9999;s.t(['DASH']);assert.equal(s.p1.state,'dash');assert.equal(s.p1.st,0);assert.ok(s.p1.exh,'Dash bis 0 = erschöpft')}
 ok('Erschöpft/knapp: eingeschränkt, nie handlungsunfähig')}

// 7) Sprünge kosten wenig, Specials mehr als Heavys
{const{p1,t}=setup();t(['UP']);assert.equal(+(p1.stMax-p1.st).toFixed(3),S.cost.jump,'Sprung kostet');
 const s=setup();s.t(['S']);assert.ok(s.p1.state==='attack'&&s.p1.stMax-s.p1.st>=S.cost.special.back,'Special kostet');ok('Sprung/Special-Kosten')}

// 8) Verschnaufen: regeneriert HP (keine Ausdauer), dauert lange, verwundbar, bei Treffer unterbrochen; Abklingzeit + Obergrenze; unabhängig vom Ausdauer-Schalter
{const R=S.rest,a=setup();a.p1.hp=a.p1.maxHp-400;a.p1.st=40;a.p1.stDelay=0;const hp0=a.p1.hp,mx=a.p1.maxHp;a.t(['REST']);assert.equal(a.p1.state,'rest','REST startet Verschnaufen');const st0=a.p1.st;
 a.t([],70);assert.equal(a.p1.state,'rest','dauert lange (deutlich mehr als eine kurze Bodenberührung)');assert.ok(a.p1.hp>hp0+10,'HP regenerieren');assert.ok(a.p1.hp-hp0<mx*.05,'...aber langsam');
 assert.equal(a.p1.st,st0,'Verschnaufen regeneriert KEINE Ausdauer (auch nicht passiv währenddessen)');
 a.t([],R.max+5);assert.equal(a.p1.state,'idle','Verschnaufen endet nach der Höchstdauer');
 const gain=a.p1.hp-hp0;assert.ok(Math.abs(gain-R.hpPct*mx*R.max)<mx*.004,'Heilung = hpPct × Höchstdauer ('+gain.toFixed(0)+' HP)');
 a.t(['REST']);assert.notEqual(a.p1.state,'rest','Abklingzeit');a.t([],R.cooldown+10);a.t(['REST']);assert.equal(a.p1.state,'rest','nach der Abklingzeit wieder möglich');
 const c=setup();c.p1.hp=c.p1.maxHp-400;c.p1.healed=R.cap*c.p1.maxHp;c.t(['REST']);assert.notEqual(c.p1.state,'rest','Obergrenze pro Runde erreicht');
 const d=setup();d.t(['REST']);assert.notEqual(d.p1.state,'rest','bei vollen HP kein Verschnaufen');
 const e=setup();e.p1.hp=e.p1.maxHp-400;e.t(['REST']);e.t([],R.min-6);assert.equal(e.p1.state,'rest','vor der Mindestdauer nicht abbrechbar');e.t([],12,1);assert.notEqual(e.p1.state,'rest','danach per Richtung abbrechbar');
 const f=setup(400,false);f.p1.hp=f.p1.maxHp-400;f.t(['REST']);assert.equal(f.p1.state,'rest','Verschnaufen geht auch ohne Ausdauer-System');
 const hitLoss=(rest)=>{const s=setup(60);s.p1.hp=s.p1.maxHp-300;s.p1.stDelay=9999;if(rest)s.t(['REST']);const h0=s.p1.hp;
  for(let k=0;k<50;k++)s.t([],1,0,0,k===3?['L']:[]);return{loss:h0-s.p1.hp,rest:s.p1.state==='rest'}};
 const Rr=hitLoss(true),Nn=hitLoss(false);assert.ok(Nn.loss>0&&Rr.loss>0,'beide wurden getroffen');
 assert.ok(!Rr.rest,'Treffer unterbricht das Verschnaufen');assert.ok(Math.abs(Rr.loss/Nn.loss-R.vuln)<.12,`Extra-Schaden ×${R.vuln} (gemessen ×${(Rr.loss/Nn.loss).toFixed(2)})`);ok('Verschnaufen: HP statt Ausdauer, lang, verwundbar, unterbrechbar, begrenzt')}

// 8b) Blocken nach eigener Ausdauer: <25 % nichts, 25–50 % nur normale Angriffe, ab 50 % auch Spezialattacken (Specials, Projektile, Hypers)
{const N={dmg:30,lv:'mid'},Sp={dmg:60,lv:'mid',special:true},Pj={dmg:50,lv:'mid',projectile:true};
 const at=(pct,on=true)=>{const s=setup(400,on);s.p1.st=s.p1.stMax*pct;s.p1.stDelay=9999;s.t([],2,-1);return s.p1};
 for(const[pct,n,sp]of[[.10,false,false],[.2499,false,false],[.2501,true,false],[.40,true,false],[.4999,true,false],[.5001,true,true],[.90,true,true]]){const q=at(pct);
  assert.equal(q.isBlocking(N),n,`${(pct*100).toFixed(1)} %: normale Angriffe blocken = ${n}`);assert.equal(q.isBlocking(Sp),sp,`${(pct*100).toFixed(1)} %: Special blocken = ${sp}`);assert.equal(q.isBlocking(Pj),sp,`${(pct*100).toFixed(1)} %: Projektil blocken = ${sp}`)}
 const off=at(0,false);assert.ok(off.isBlocking(N)&&off.isBlocking(Sp),'Ausdauer aus: immer blockbar');
 const g1=setup();g1.p1.st=g1.p1.stMax*.1;g1.p1.stDelay=0;g1.t([],60,-1);assert.ok(g1.p1.st>g1.p1.stMax*.1+5,'unter 25 %: Rück-Taste ist kein Blocken mehr -> Regeneration läuft');
 ok('Block nach Ausdauer: <25 % nichts, <50 % nur normale, ab 50 % alles')}

// 9) Menü-Schalter: Aus = keine Kosten, keine Einschränkung; Melee/Story immer aus; Online-Vorgabe (stamForce) schlägt die lokale Einstellung
{const{g,p1,t}=setup(400,false);p1.st=0;p1.exh=true;t(['H']);assert.equal(p1.state,'attack','Aus: schwer trotz leerer Leiste');t([],5);assert.equal(p1.st,p1.stMax,'Aus: Leiste bleibt voll');assert.ok(!p1.exh);
 g.stamPref=true;g.melee={};assert.ok(!g.stamOn,'Melee: aus');g.melee=null;g.story={};assert.ok(!g.stamOn,'Story: aus');g.story=null;
 g.stamForce=false;assert.ok(!g.stamOn,'Online-Gastgeber: aus');g.stamForce=true;g.stamPref=false;assert.ok(g.stamOn,'Online-Gastgeber: an');ok('Schalter, Melee/Story aus, Online-Vorgabe')}

// 10) KI: gleiche Regeln – verschnauft bei knapper Leiste und hängt nicht handlungsunfähig fest
{const{AIController}=await import('../src/core/ai.js');const i1=new AIController(2),i2=new AIController(2);
 const p1=new Fighter({char:CHARACTERS.tiger,x:340,facing:1,input:i1}),p2=new Fighter({char:CHARACTERS.wolf,x:620,facing:-1,input:i2});const g=new Game(p1,p2);g.stamPref=true;
 let rested=0,exhFrames=0,maxExh=0,cur=0;for(let k=0;k<5400&&g.phase!=='result'&&g.phase!=='match';k++){g.step();for(const f of[p1,p2]){if(f.state==='rest')rested++}
  if(p1.exh){exhFrames++;cur++;maxExh=Math.max(maxExh,cur)}else cur=0}
 assert.ok(p1.st>=0&&p1.st<=p1.stMax&&p2.st>=0&&p2.st<=p2.stMax,'Ausdauer bleibt im Rahmen');assert.ok(maxExh<700,'KI bleibt nie ewig erschöpft ('+maxExh+' Frames am Stück)');ok(`KI spielt mit Ausdauer (Verschnaufen-Frames ${rested}, erschöpft ${exhFrames})`)}

// 11) Determinismus (Online-Lockstep): gleiche Eingaben -> exakt gleiche Ausdauer-Werte auf beiden Seiten
{const run=()=>{const s=setup(120);let x=12345;const rnd=()=>(x=(x*1103515245+12345)&0x7fffffff)/0x7fffffff;
  for(let k=0;k<1500;k++){const b=['L','M','H','S','DASH','UP','REST'];const pr=rnd()<.25?[b[(rnd()*7)|0]]:[];s.t(pr,1,(rnd()*3|0)-1,0,rnd()<.2?[b[(rnd()*4)|0]]:[])}
  return[s.p1.st,s.p2.st,s.p1.stDelay,s.p2.stDelay,s.p1.hp,s.p2.hp,+s.p1.exh,+s.p2.exh].join()};
 assert.equal(run(),run(),'zwei identische Läufe ergeben identische Ausdauer');ok('deterministisch (Lockstep-tauglich)')}
// 12) Regler im Menü: Faktoren auf Regeneration, Pausen (Delay) und Verschnaufen-Tempo; online gelten die Werte des Gastgebers
{const{tuneClamp}=await import('../src/core/config.js');
 const mk=(o)=>{const x=setup();x.g.tunePref={regen:1,delay:1,empty:1,rest:1,...o};return x};
 const reg=(k)=>{const x=mk({regen:k});x.p1.st=20;x.p1.stDelay=0;x.t([],50);return x.p1.st-20};
 const r1=reg(1),r2=reg(2),r05=reg(.5);assert.ok(Math.abs(r2/r1-2)<.05&&Math.abs(r05/r1-.5)<.05,'Regeneration ×2 / ×0,5 ('+r1.toFixed(1)+' → '+r2.toFixed(1)+' / '+r05.toFixed(1)+')');
 const dl=(k)=>{const x=mk({delay:k});x.p1.st=60;x.t(['H']);return x.p1.stDelay};assert.equal(dl(0),0,'Delay ×0 = keine Pause');assert.ok(Math.abs(dl(2)/dl(1)-2)<.01,'Delay ×2 = doppelte Pause');
 const em=(k)=>{const x=mk({empty:k});x.p1.st=2;x.t(['L']);return x.p1.stDelay};assert.ok(Math.abs(em(2)/em(1)-2)<.01&&em(0)===0,'Erschöpfungs-Pause ×2 / ×0');assert.ok(em(1)>S.delay*2,'Standard bleibt deutlich länger');
 const hl=(k)=>{const x=mk({rest:k});x.p1.hp-=400;const h0=x.p1.hp;x.t(['REST']);x.t([],60);return x.p1.hp-h0};const h1=hl(1),h2=hl(2);assert.ok(Math.abs(h2/h1-2)<.06,'Verschnaufen-Tempo ×2 ('+h1.toFixed(1)+' → '+h2.toFixed(1)+' HP)');
 const x=mk({regen:.25});assert.equal(x.g.stamTune.regen,.25,'lokale Regler gelten offline');x.g.tuneForce={regen:3,delay:1,empty:1,rest:1};assert.equal(x.g.stamTune.regen,3,'online: Werte des Gastgebers überschreiben die lokalen');
 assert.equal(tuneClamp('regen',100),3);assert.equal(tuneClamp('regen',0),.25);assert.equal(tuneClamp('delay',-5),0);assert.equal(tuneClamp('rest','x'),1,'ungültig -> Standard');
 ok('Regler: Regeneration, Delay, Erschöpfungs-Delay, Verschnaufen-Tempo, Online-Vorgabe')}
console.log('Ausdauer-Tests bestanden');
