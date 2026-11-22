// Parkour mit Schatz (Kapitel-Config parkour, core/parkour.js): Plattformen nur von oben begehbar, bewegliche + bröckelnde Plattformen, jede Stufe mit der echten Physik machbar
// (Einfachsprung bzw. Doppelsprung-Lücken), Schwierigkeit steigt pro Kapitel, Schatz oben.  node tests/parkour.test.js
import assert from'node:assert/strict';
import{Terrain}from'../src/core/terrain.js';import{GROUND}from'../src/core/config.js';
import{Game}from'../src/core/game.js';import{Fighter}from'../src/core/fighter.js';import{AIController}from'../src/core/ai.js';
import{Arcade}from'../src/core/arcade.js';import{CHARACTERS}from'../src/core/characters.js';import{CHAPTERS}from'../src/core/story.js';import{LOOT}from'../src/core/loot.js';
import{PK_ZONE,PK_SEG,buildParkour}from'../src/core/parkour.js';
const ok=n=>console.log('  ✓',n);
// ---- Plattform-Geometrie ----
{const T=new Terrain([],[{x0:100,x1:300,h:150}]),top=GROUND-150;
 assert.equal(T.land(200,top-5,top+10),top,'von oben: landet auf der Oberkante');assert.equal(T.land(200,top+30,top+10),null,'von unten (Füße waren unter der Oberkante): durchlässig');
 assert.equal(T.land(50,top-5,top+10),null,'neben der Plattform: nichts');assert.equal(T.floorFor(200,top),top,'steht darauf');assert.equal(T.floorFor(200,top-40),GROUND,'schwebt darüber: kein Boden');assert.equal(T.floorFor(350,top),GROUND);
 assert.equal(new Terrain([],[{x0:300,x1:100,h:10}]).platforms[0].x0,100);ok('Plattform: nur von oben landbar, von unten durchlässig, stehen = Boden')}
// ---- bewegliche Plattform: pendelt und trägt mit; bröckelnde: fällt weg und kommt wieder ----
{const T=new Terrain([],[{x0:100,x1:300,h:150,kind:'move',amp:80,per:200}]),p=T.platforms[0];let lo=0,hi=0;for(let f=0;f<400;f++){T.tick(f,[]);lo=Math.min(lo,p.ox);hi=Math.max(hi,p.ox)}
 assert.ok(hi>75&&lo<-75&&hi<=80.01&&lo>=-80.01,'pendelt um ±80 ('+lo.toFixed(0)+'..'+hi.toFixed(0)+')');T.tick(10,[]);const o1=p.ox;T.tick(11,[]);assert.ok(Math.abs(p.dx-(p.ox-o1))<1e-9&&Math.abs(p.dx)>.1,'dx = Bewegung des Frames');
 const top=GROUND-150;T.tick(50,[]);assert.ok(p.ox>79);assert.equal(T.floorFor(200,top),top,'in der verschobenen Spannweite steht man');assert.equal(T.floorFor(150,top),GROUND,'außerhalb der verschobenen Spannweite kein Boden');
 const C=new Terrain([],[{x0:0,x1:100,h:100,kind:'crumble',hold:30,off:100}]),c=C.platforms[0],me={x:50,y:GROUND-100,hp:100};
 for(let f=0;f<29;f++)C.tick(f,[me]);assert.ok(c.on,'noch heil');C.tick(30,[me]);assert.ok(!c.on&&C.floorFor(50,GROUND-100)===GROUND,'nach hold Frames weg');
 for(let f=0;f<99;f++)C.tick(f,[]);assert.ok(!c.on);C.tick(1,[]);assert.ok(c.on,'kommt nach off Frames zurück');
 const C2=new Terrain([],[{x0:0,x1:100,h:100,kind:'crumble',hold:30,off:100}]);for(let f=0;f<200;f++)C2.tick(f,[]);assert.ok(C2.platforms[0].on,'ohne Betreten bröckelt nichts');ok('Plattformen: beweglich (pendelt, dx), bröckelnd (weg nach Betreten, kommt zurück)')}
// ---- Physik: durchspringen, oben landen, abgehen, wieder runterfallen; bewegliche Plattform trägt ----
const mk=(ch=1)=>{const d=new AIController(0),p1=new Fighter({char:CHARACTERS.tiger,x:340,facing:1,input:d}),p2=new Fighter({char:CHARACTERS.tiger,x:620,facing:-1,input:new AIController(0)});
 d.tick=()=>{};const game=new Game(p1,p2),arc=new Arcade(game,p1,p2,d);arc.setMode('story');arc.startStory('tiger',ch);while(game.phase!=='fight')game.step();
 const s=game.story;s.state='done';return{game,arc,s,p1,d}};
{const{game,s,p1,d}=mk();s.terrain=new Terrain([],[{x0:100,x1:300,h:150}]);const top=GROUND-150;
 const run=(n,dx,jumpAt=-1)=>{for(let i=0;i<n;i++){d.feed(dx,jumpAt===i&&p1.grounded?-1:0,[]);game.step();s.state='done'}};
 p1.x=200;p1.y=GROUND;p1.vx=0;run(2,0);run(1,0,0);let minY=GROUND;for(let i=0;i<60;i++){run(1,0);minY=Math.min(minY,p1.y)}
 assert.ok(minY<top,'Sprung von unten geht durch die Plattform hindurch');assert.equal(p1.y,top,'und landet danach oben');assert.ok(p1.grounded&&p1.floor===top);
 run(40,0);assert.equal(p1.y,top,'bleibt oben stehen');run(200,1);assert.equal(p1.y,GROUND,'geht über die Kante und fällt hinunter');assert.ok(p1.x>300);
 ok('Physik: durchspringen von unten, oben landen/stehen, Kante verlassen -> fallen')}
{const{game,s,p1,d}=mk();s.terrain=new Terrain([],[{x0:100,x1:300,h:150,kind:'move',amp:90,per:180}]);const T=s.terrain,pf=T.platforms[0],top=GROUND-150;
 const run=(n,dx)=>{for(let i=0;i<n;i++){d.feed(dx,0,[]);game.step();s.state='done'}};
 p1.x=200+pf.ox;p1.y=top;p1.vx=0;run(1,0);let rel0=p1.x-pf.ox;let moved=0,maxDrift=0;for(let i=0;i<180;i++){run(1,0);moved=Math.max(moved,Math.abs(pf.ox));maxDrift=Math.max(maxDrift,Math.abs(p1.x-pf.ox-rel0))}
 assert.ok(moved>60,'Plattform bewegt sich');assert.ok(maxDrift<3,'Figur bleibt auf der beweglichen Plattform mitgetragen (Drift '+maxDrift.toFixed(2)+')');assert.equal(p1.y,top);ok('bewegliche Plattform trägt die Figur mit')}
{const{game,s,p1,d}=mk();s.terrain=new Terrain([],[{x0:100,x1:300,h:150,kind:'crumble',hold:25,off:120}]);const T=s.terrain,pf=T.platforms[0],top=GROUND-150;
 const run=(n)=>{for(let i=0;i<n;i++){d.feed(0,0,[]);game.step();s.state='done'}};p1.x=200;p1.y=top;p1.vx=0;run(10);assert.equal(p1.y,top,'trägt zuerst');run(30);assert.ok(!pf.on&&p1.y>top,'bröckelt weg, die Figur fällt');run(160);assert.equal(p1.y,GROUND);run(5);assert.ok(pf.on,'Plattform kommt zurück');ok('bröckelnde Plattform: trägt kurz, fällt weg, kommt zurück')}
// ---- Kamera folgt der Figur nach oben und wieder zurück zum Boden ----
{const{game,s,p1,d}=mk();const T=new Terrain([],[{x0:-80,x1:320,h:1500}]);s.terrain=T;const run=n=>{for(let i=0;i<n;i++){d.feed(0,0,[]);game.step();s.state='done'}};
 const base=game.camera.y;p1.x=100;p1.y=GROUND-1500;p1.vx=0;run(240);assert.ok(Math.abs(p1.y-(GROUND-1500))<1,'steht oben');
 assert.ok(game.camera.y<-900,'Kamera ist mit nach oben gefahren (y='+Math.round(game.camera.y)+', Figur y='+Math.round(p1.y)+')');
 p1.y=GROUND;p1.x=500;run(300);assert.ok(game.camera.y>150&&game.camera.y<320,'Kamera ist wieder unten bei der Bodenlinie (y='+Math.round(game.camera.y)+')');ok('Kamera: folgt der Figur beim Klettern nach oben und kehrt am Boden zurück')}
// ---- Generator ----
{const b=buildParkour({segs:'SLHDNMCB',width:200,name:'X'});assert.equal(b.platforms.length,9);assert.deepEqual(b.platforms.map(p=>p.seg).join(''),'0SLHDNMCB');
 assert.equal(b.platforms.at(-1).h,130+110+80+190+40+110+110+110+50,'Höhen addieren sich');assert.equal(b.relic.h,b.height);assert.equal(b.platforms.find(p=>p.seg==='D').need,'double');assert.equal(b.platforms.find(p=>p.seg==='N').x1-b.platforms.find(p=>p.seg==='N').x0,90);
 assert.deepEqual(buildParkour({segs:'SSSLHD',width:210}),buildParkour({segs:'SSSLHD',width:210}),'deterministisch');ok('Generator: Höhen, Kürzel, schmal, Doppelsprung-Markierung, deterministisch')}
// ---- Machbarkeit mit der echten Physik für JEDE Stufe jedes Kapitels ----
const reachPair=(ch,from,to,needDbl=true)=>{const{game,s,p1,d}=mk(ch),P=CHAPTERS[ch-1].parkour.platforms,T=s.terrain,tgt=P[to],src=from>=0?P[from]:null;
 const tp=T.platforms[to],sp=src?T.platforms[from]:null;
 const per=(tp.kind==='move'?tp.per:(sp&&sp.kind==='move'?sp.per:1));const phases=(tp.kind==='move'||(sp&&sp.kind==='move'))?[0,.2,.4,.6,.8].map(k=>Math.round(k*per)):[0];
 const cx=q=>(q.x0+q.x1)/2,dirTo=()=>Math.sign((cx(tp)+tp.ox)-(sp?cx(sp)+sp.ox:cx(tp)-1));
 // Landung: auf welcher Plattform (Index) landet die Figur? (-1 = Boden/keine)
 const land=()=>P.findIndex((q,k)=>Math.abs(GROUND-q.h-p1.y)<1&&p1.x>=q.x0+T.platforms[k].ox&&p1.x<=q.x1+T.platforms[k].ox);
 const attempt=(ph,sx,sy,dir,k2)=>{T.shift=ph;for(const q of T.platforms){q.on=true;q.tm=0;q.gone=false}
  p1.reset();p1.x=sx;p1.y=sy;p1.vx=0;p1.vy=0;p1.airJumps=p1.maxAJ;
  for(let f=0;f<200;f++){d.feed(dir,f===0||f===k2?-1:0,[]);game.step();s.state='done';if(f>3&&p1.grounded){const idx=land();return{exact:idx===to,atLeast:idx>=to}}}return{exact:false,atLeast:false}};
 let singleExact=false,singleAL=false,dblAL=false;const stop=()=>singleAL&&(!needDbl||dblAL||(tgt.need!=='double'));
 for(const ph of phases){T.shift=ph;T.tick(game.frame,[]);
  const sx0=sp?sp.x0+sp.ox:0,sx1=sp?sp.x1+sp.ox:0,dir=dirTo(),xs=[];
  if(!sp){for(let x=tgt.x0-230;x<=tgt.x1+60;x+=25)xs.push(x)}else if(dir>0){for(let x=sx1;x>=Math.max(sx0,sx1-110);x-=14)xs.push(x)}else{for(let x=sx0;x<=Math.min(sx1,sx0+110);x+=14)xs.push(x)}
  const sy=src?GROUND-src.h:GROUND;
  for(const x of xs){const r=attempt(ph,x,sy,dir||1,-1);if(r.exact)singleExact=true;if(r.atLeast)singleAL=true;
   if(needDbl&&!dblAL&&(tgt.need==='double'||!singleAL))for(let k=4;k<=46&&!dblAL;k+=3)if(attempt(ph,x,sy,dir||1,k).atLeast)dblAL=true;
   if(stop()&&(!singleExact||tgt.need!=='double'))break}
  if(stop()&&(!singleExact||tgt.need!=='double'))break}
 return{single:singleExact,singleAL,dbl:dblAL}};
for(const c of CHAPTERS){const P=c.parkour.platforms,bad=[];
 for(let i=0;i<P.length;i++){const r=reachPair(c.id,i-1,i);
  if(P[i].need==='double'){if(r.single)bad.push(`${i}(${P[i].seg}): auch mit Einfachsprung machbar`);if(i===P.length-1&&r.singleAL)bad.push(`${i}(${P[i].seg}): oberste Plattform per Einfachsprung erreichbar`);if(!r.dbl)bad.push(`${i}(${P[i].seg}): auch mit Doppelsprung NICHT machbar`)}
  else if(!r.singleAL&&!(P[i].kind==='move'&&r.dbl))bad.push(`${i}(${P[i].seg}): mit Einfachsprung NICHT machbar`)}
 assert.deepEqual(bad,[],`Kapitel ${c.id}: ${bad.join('; ')}`)}
ok('Alle '+CHAPTERS.length+' Kapitel: jede Stufe mit der echten Physik machbar (Einfachsprung; D-Lücken nur mit Doppelsprung)');
// ---- keine Abkürzung: nur mit Einfachsprüngen kommt man NICHT ganz nach oben (jeder Weg braucht mindestens einen Doppelsprung) ----
for(const c of CHAPTERS){const P=c.parkour.platforms,n=P.length,span=p=>[p.x0-(p.amp||0),p.x1+(p.amp||0)],gapx=(a,b)=>{const A=span(a),B=span(b);return Math.max(0,A[0]-B[1],B[0]-A[1])};
 const memo=new Map(),edge=(i,j)=>{const k=i+'>'+j;if(memo.has(k))return memo.get(k);const a=i>=0?P[i]:{x0:-2000,x1:2000,h:0,amp:0},b=P[j];let ok=false;
  if(j===i)ok=false;else if(b.h<=a.h){ok=i>=0&&gapx(a,b)<=260}   // runter/seitlich: Abspringen oder Herunterfallen
  else if(b.h-a.h<=330&&(i<0?gapx(a,b)<=1e9:gapx(a,b)<=300))ok=reachPair(c.id,i,j,false).single;
  memo.set(k,ok);return ok};
 const seen=new Set([-1]),par={},q=[-1];while(q.length){const i=q.shift();for(let j=0;j<n;j++){if(seen.has(j))continue;if(i<0&&P[j].h>330)continue;if(edge(i,j)){seen.add(j);par[j]=i;q.push(j)}}}
 const path=[];for(let x=n-1;x in par;x=par[x])path.unshift(x+'<'+par[x]);
 assert.ok(!seen.has(n-1),`Kapitel ${c.c||c.id}: Abkürzung! Die oberste Plattform ist ohne Doppelsprung erreichbar (Weg: ${path.join(' ')})`)}
ok('Keine Abkürzung: ohne Doppelsprung ist die oberste Plattform in keinem Kapitel erreichbar');
// ---- Kapitel-Daten: realistische Maße, Schwierigkeit steigt ----
{const info=CHAPTERS.map(c=>{const P=c.parkour.platforms;return{id:c.id,h:c.parkour.height,n:P.length,d:P.filter(p=>p.need==='double').length,m:P.filter(p=>p.kind==='move').length,c:P.filter(p=>p.kind==='crumble').length,w:Math.max(...P.filter(p=>p.seg==='S').map(p=>p.x1-p.x0)),narrow:P.filter(p=>p.seg==='N').length}});
 for(const c of CHAPTERS){const pk=c.parkour;assert.ok(pk.platforms.length>=12&&pk.relic&&pk.deco,'Kapitel '+c.id+': Parkour');assert.ok(['neon','crane','reactor','obelisk','pagoda'].includes(pk.deco));
  const last=pk.platforms.at(-1);assert.ok(pk.relic.x>last.x0&&pk.relic.x<last.x1&&pk.relic.h===last.h,'Schatz liegt auf der obersten Plattform');
  for(const p of pk.platforms){assert.ok(p.x0-p.amp>=PK_ZONE.x0&&p.x1+p.amp<=PK_ZONE.x1,'innerhalb der Zone (links der Händler, rechts vor Welle 3)');assert.ok(p.x1-p.x0>=90&&p.x1-p.x0<=300,'Breite '+(p.x1-p.x0));for(const l of c.ledges)assert.ok(p.x1<l.x0-40||p.x0>l.x1+40,'Plattform nicht über einer Kante')}
  for(let i=1;i<pk.platforms.length;i++){const dh=pk.platforms[i].h-pk.platforms[i-1].h;assert.ok(dh>=0&&dh<=190,'Stufenhöhe '+dh)}}
 assert.equal(new Set(CHAPTERS.map(x=>x.parkour.deco)).size,CHAPTERS.length,'jedes Kapitel hat eine eigene Kulisse');assert.equal(new Set(CHAPTERS.map(x=>x.parkour.relic.name)).size,CHAPTERS.length);
 assert.ok(info[0].h>=1200,'Kapitel 1 ist mindestens ~12 m hoch ('+info[0].h+' px)');
 for(let i=1;i<info.length;i++){const a=info[i-1],b=info[i];assert.ok(b.h>a.h,`Höhe steigt (${a.h} -> ${b.h})`);assert.ok(b.n>a.n,'mehr Plattformen');assert.ok(b.d>=a.d&&b.m>=a.m&&b.c>=a.c&&b.narrow>=a.narrow,'mehr Doppelsprung-Lücken/bewegliche/bröckelnde/schmale Plattformen');assert.ok(b.w<a.w,`Plattformen werden schmaler (${a.w} -> ${b.w})`)}
 assert.equal(info[0].m+info[0].c,0,'Kapitel 1: nur feste Plattformen');assert.ok(info[2].m>0&&info[3].c>0,'beweglich ab Kapitel 3, bröckelnd ab Kapitel 4');
 ok('Daten: Höhen '+info.map(i=>(i.h/100).toFixed(1)+' m').join(' / ')+', Plattformen '+info.map(i=>i.n).join('/')+', Schwierigkeit steigt in jedem Kapitel')}
// ---- Händler KORVUS: nur oben am Ende des Parcours, sonst nirgends ----
{const{Dealer}=await import('../src/core/blackmarket.js');
 for(const c of CHAPTERS){const{game,s,p1}=mk(c.id),pk=c.parkour,top=pk.platforms.at(-1),d=s.dealer;
  assert.equal(top.seg,'B','Kapitel '+c.id+': oben liegt die breite Rast');assert.equal(top.x1-top.x0,300);assert.ok(d instanceof Dealer&&d.fixed,'Händler vorhanden');
  assert.equal(d.y,GROUND-pk.height,'steht auf der obersten Plattform');assert.ok(d.x>top.x0+120&&d.x<top.x1-30,'steht auf der Plattform');assert.ok(Math.abs(d.x-s.relic.x)>=100,'Schatz und Händler überlappen nicht');assert.ok(s.relic.x>top.x0&&s.relic.x<top.x1);
  assert.ok(c.npc===undefined,'kein Händler-Standort am Boden mehr in der Config');const x0=d.x,y0=d.y;
  s.engage(s.encs[0]);for(let i=0;i<40;i++)game.step();s.state='walk';for(let i=0;i<40;i++)game.step();assert.equal(d.x,x0,'bleibt an seiner Stelle');assert.equal(d.y,y0);assert.equal(d.alpha,1,'bleibt sichtbar');
  p1.x=d.x-70;p1.y=GROUND;s.state='walk';d.update();assert.ok(!d.near,'unten nicht ansprechbar');p1.x=d.x-70;p1.y=d.y;s.state='walk';d.update();assert.ok(d.near,'oben ansprechbar')}
 ok('Händler steht in jedem Kapitel nur ganz oben auf der letzten Plattform (neben dem Schatz), bleibt dort und ist nur oben ansprechbar')}
// ---- Schatz einsammeln ----
{const{game,s,p1}=mk(2);const r=s.relic,pk=CHAPTERS[1].parkour,top=GROUND-pk.relic.h;assert.ok(r&&!r.got&&r.y===top-34);
 p1.hp=100;p1.meter=0;const packs=LOOT.packs;p1.x=r.x+300;p1.y=top;game.step();assert.ok(!r.got,'weit weg: nichts');
 p1.x=r.x;p1.y=GROUND;game.step();assert.ok(!r.got,'unten am Boden: nichts');
 p1.x=r.x+10;p1.y=top;game.step();assert.ok(r.got,'oben: eingesammelt');assert.equal(p1.hp,p1.maxHp);assert.equal(p1.meter,100);assert.equal(LOOT.packs,packs+2);assert.ok(/FRACHT-SCHATZ GEFUNDEN/.test(s.msg.title));
 p1.hp=100;game.step();assert.equal(p1.hp,100,'nur einmal');assert.equal(LOOT.packs,packs+2);ok('Schatz: nur oben einsammelbar, Leben voll, +100 Meter, +2 Booster, nur einmal')}
// ---- Zeichnen: Kulissen, Plattformen, Schild, Schatz (mit und ohne Schatz) laufen ohne Fehler ----
{const{storyWorld}=await import('../src/render/storyhud.js');const calls=[];const g=new Proxy({},{get:(t,k)=>k in t?t[k]:(...a)=>{calls.push(k);return/^create/.test(k)?{addColorStop(){}}:undefined},set(t,k,v){t[k]=v;return true}});
 for(const c of CHAPTERS){const{game,s}=mk(c.id);calls.length=0;storyWorld(g,game,3.3);const withRelic=calls.length;s.relic.got=true;calls.length=0;storyWorld(g,game,3.3);assert.ok(withRelic>calls.length,'Kapitel '+c.id+': der Schatz wird nur gezeichnet, solange er nicht eingesammelt ist');assert.ok(calls.length>200)}
 ok('Zeichnen: alle 5 Kulissen + Schatz ohne Fehler, Schatz verschwindet nach dem Einsammeln')}
console.log('Parkour-Tests bestanden');
