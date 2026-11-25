// Story-Finale: Gebäude mit brechbarer Außenwand rechts hinter der Endgegner-Arena (wie die Häuser im Arcade).  node tests/storyfinale.test.js
import assert from'node:assert/strict';
import{Game}from'../src/core/game.js';import{Fighter}from'../src/core/fighter.js';import{AIController}from'../src/core/ai.js';import{Arcade}from'../src/core/arcade.js';
import{CHARACTERS}from'../src/core/characters.js';import{CHAPTERS,LV}from'../src/core/story.js';import{BARRIER,WALL_R,WORLD,HOUSE,GROUND}from'../src/core/config.js';
const ok=n=>console.log('  ✓',n);
const mk=(ch=1)=>{const d=new AIController(0),p1=new Fighter({char:CHARACTERS.tiger,x:340,facing:1,input:d}),p2=new Fighter({char:CHARACTERS.tiger,x:620,facing:-1,input:new AIController(0)});
 d.tick=()=>{};const game=new Game(p1,p2),arc=new Arcade(game,p1,p2,d);arc.setMode('story');arc.startStory('tiger',ch);while(game.phase!=='fight')game.step();return{game,arc,s:game.story,p1,d,A:game.arena}};
const mob=(game,s,x)=>{const m=new Fighter({char:CHARACTERS.mantis,x,facing:-1,input:new AIController(0)});m.maxHp=m.hp=99999;game.fighters.push(m);s.mobs.push(m);return m};
// ---- Daten: jedes Kapitel hat das Gebäude hinter der letzten Welle, innerhalb der Welt ----
for(const c of CHAPTERS){const{s}=mk(c.id),last=c.enc.at(-1),F=s.finale;assert.ok(F,'Kapitel '+c.id+': Finale-Gebäude');assert.equal(F.x,Math.min(LV.x1,last.x+LV.half),'Außenwand = rechter Rand der Endgegner-Arena');
 assert.ok(F.x+BARRIER.width<=WORLD.x1,'Gebäude (Außenwand '+F.x+' + '+BARRIER.width+') liegt in der Welt (bis '+WORLD.x1+')');assert.ok(F.x>last.x+300,'hinter dem Endgegner')}
ok('Alle '+CHAPTERS.length+' Kapitel: Gebäude hinter der Endgegner-Arena, komplett innerhalb der Welt');
// ---- nur die Endgegner-Arena hat die Wand ----
{const{s,A}=mk(1);s.engage(s.encs[0]);assert.equal(A.sw,false);assert.equal(A.sideAt(A.r),null,'normale Welle: keine Wand');
 s.engage(s.encs.at(-1));assert.equal(A.sw,true);assert.equal(A.r,s.finale.x);assert.equal(s.r,s.finale.x);assert.equal(A.sideAt(A.r),'R');assert.equal(A.sideAt(A.r-100),null);assert.equal(A.sideAt(A.l),null,'links keine Wand');
 assert.equal(A.R.hp,BARRIER.hp[0]);assert.equal(A.R.x,s.finale.x);assert.equal(A.R.final,false);assert.equal(A.inside(s.finale.x+200),null,'vor dem Durchbruch kein Innenraum');
 s.setBounds(LV.x0,LV.x1);assert.equal(A.sw,false,'nach der Welle wieder offen');ok('Wand nur in der Endgegner-Arena (rechts), sonst normale offene Grenzen')}
// ---- Durchbruch: Grenze/Kamera/Decke ----
{const{game,s,p1,A}=mk(1);s.engage(s.encs.at(-1));const m=mob(game,s,A.r);m.y=GROUND;const wx=s.finale.x,r0=A.r;
 assert.equal(A.hitWall(game,m,BARRIER.hp[0]*.4),false,'Treffer beschädigt nur');assert.ok(A.R.hp<BARRIER.hp[0]&&A.R.show>0&&A.R.flash>0);
 const items0=s.items.length;assert.equal(A.hitWall(game,m,BARRIER.hp[0]),true,'Wand bricht');
 assert.equal(A.R.final,true);assert.equal(A.r,wx+BARRIER.width,'Grenze = Rückwand des Gebäudes');assert.equal(s.r,A.r,'Story-Grenze zieht nach (Kamera, Mobs)');assert.ok(s.finale.broken);assert.ok(A.msg&&A.openT.R>=0);
 assert.equal(A.inside(wx+300),'R','Innenraum mit Decke');assert.equal(A.inside(wx-50),null);assert.equal(A.ceil,HOUSE.ceil);assert.ok(s.items.length>items0,'Belohnung an der Bresche');assert.match(s.msg.title,/DURCHBROCHEN/);
 assert.equal(m.state,'airhit');assert.ok(m.vx>5,'Gegner fliegt ins Gebäude');assert.equal(A.sideAt(wx),null,'Bresche ist keine Wand mehr');assert.equal(A.sideAt(A.r),'R','Rückwand begrenzt');
 assert.equal(A.hitWall(game,m,999),false,'Rückwand unzerstörbar');assert.equal(A.R.final,true);
 // Kamera darf bis ins Gebäude folgen
 game.camera.story=s;p1.x=wx+400;const c=game.camera.compute([p1,m]);assert.ok(c.x>r0-300&&c.x+W_HALF(c.zoom)<=A.r+1,'Kamera folgt in den Innenraum ('+Math.round(c.x)+')');
 ok('Durchbruch: Grenze → Rückwand ('+A.r+'), Story-Grenze + Kamera ziehen mit, Innenraum mit Decke, Belohnung, Rückwand unzerstörbar')}
function W_HALF(zoom){return 960/2/zoom}
// ---- echter Kampf: Gegner an die Wand prügeln, bis sie bricht ----
{const{game,s,p1,d,A}=mk(1);s.engage(s.encs.at(-1));s.queue=[];const m=mob(game,s,A.r-40);const dist=()=>p1.x-m.x;let broke=false;
 for(let f=0;f<2500&&!broke;f++){if(['idle','hit'].includes(m.state)&&m.grounded){m.x=Math.min(m.x,A.r-2);m.hp=m.maxHp}   // Gegner bleibt an der Wand stehen
  const near=Math.abs(dist())<90;const pr=near&&['idle','walk'].includes(p1.state)&&f%3===0?['M']:[];d.feed(near?0:Math.sign(-dist()),0,pr);if(['idle','walk'].includes(p1.state)){p1.facing=1;if(!near)p1.x=m.x-70}
  game.step();s.state='fight';if(A.R.final)broke=true}
 assert.ok(broke,'Wand durch Kampf gebrochen');assert.equal(A.r,s.finale.x+BARRIER.width);ok('Echter Kampf: Gegner an der Wand verprügelt -> Wand bricht, Grenze rückt ins Gebäude')}
// ---- Neustart des Kapitels: Wand wieder heil ----
{const{game,s,A}=mk(1);s.engage(s.encs.at(-1));const m=mob(game,s,A.r);A.hitWall(game,m,9999);assert.ok(s.finale.broken);s.begin&&s.begin();assert.equal(s.finale.broken,false);assert.equal(A.sw,false);ok('Neustart: Gebäude wieder heil')}
// ---- Zeichnen: Gebäude im Story-Level (heil / offen), ohne Fehler ----
{const calls=[];const mkG=()=>new Proxy({},{get:(t,k)=>k in t?t[k]:(...a)=>{calls.push([k,a]);return/^create/.test(k)?{addColorStop(){}}:undefined},set(t,k,v){t[k]=v;return true}});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>mkG()})};const{Renderer}=await import('../src/render/renderer.js');
 for(const c of CHAPTERS){const{game,s,A}=mk(c.id);const R=Renderer.prototype,self={houseLayers:Renderer.prototype.houseLayers,houseSide:Renderer.prototype.houseSide,stage:{theme:{name:'t'+c.id,sky:['#001','#012'],style:'city'}},_hl:null};
  // houseLayers baut Bilder aus der Theme-Beschreibung: hier nur prüfen, dass storyHouse die Ebenen mit Verschiebung dx zeichnet
  const drawn=[],fakeSide=(g,gm,side)=>{drawn.push({side,wall:gm.arena.R,oT:gm.arena.openT.R,tx:calls.filter(x=>x[0]==='translate').at(-1)[1][0]})};
  const g=mkG();R.storyHouse.call({houseSide:fakeSide},g,game);assert.equal(drawn.length,1);assert.equal(drawn[0].tx,s.finale.x-WALL_R,'um dx verschoben');assert.equal(drawn[0].wall.step,0);assert.equal(drawn[0].wall.final,false);assert.equal(drawn[0].oT,-1);
  s.engage(s.encs.at(-1));A.hitWall(game,mob(game,s,A.r),9999);drawn.length=0;R.storyHouse.call({houseSide:fakeSide},g,game);assert.equal(drawn[0].wall.final,true);assert.ok(drawn[0].oT>=0,'offen');
  s.setBounds(LV.x0,LV.x1);drawn.length=0;R.storyHouse.call({houseSide:fakeSide},g,game);assert.equal(drawn[0].wall.final,true,'bleibt offen, auch wenn die Arena danach wieder offen ist');
  const g2=mkG();const noF=Object.assign({},game,{story:{finale:null}});R.storyHouse.call({houseSide:fakeSide},g2,noF);}
 ok('Zeichnen: Gebäude um dx verschoben, Wandzustand heil / durchbrochen / bleibt offen')}
// ---- Kamera: in der Endgegner-Arena sieht man das Gebäude hinter der Außenwand (nicht nur bis zur Wand) ----
{const{W:VW}=await import('../src/core/config.js');
 for(const ch of[1,2,3,4,5]){const{game,s,p1}=mk(ch),hw=VW/2/.88;s.engage(s.encs.at(-1));p1.x=s.finale.x-100;p1.facing=1;p1.y=GROUND;
  const c=game.camera.compute(game.fighters);assert.ok(c.x+hw>=s.finale.x+440,'Kapitel '+ch+': Kamera zeigt das Gebäude hinter der Außenwand (rechter Bildrand '+Math.round(c.x+hw)+' > Wand '+s.finale.x+')');
  assert.ok(c.x+hw<=WORLD.x1+1,'... aber nie über die Welt hinaus')}
 ok('Kamera: Finale-Gebäude hinter der Wand ist in allen 5 Kapiteln sichtbar')}
console.log('Story-Finale-Tests bestanden');
