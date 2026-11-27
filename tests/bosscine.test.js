// Boss-Sequenz (Video + Dialog vor und nach dem Bosskampf): node tests/bosscine.test.js
import assert from'node:assert/strict';
import fs from'node:fs';
import{Game}from'../src/core/game.js';import{Fighter}from'../src/core/fighter.js';import{AIController}from'../src/core/ai.js';
import{Arcade}from'../src/core/arcade.js';import{CHARACTERS}from'../src/core/characters.js';import{CHAPTERS}from'../src/core/story.js';
import{BOSS_CINE,BossCine,CINE,cinePages}from'../src/core/bosscine.js';
let n=0;const ok=m=>{n++;console.log('  ✓ '+m)};
// 1) Daten: jeder Story-Boss hat Video, Sprecher, Vor- und Nach-dem-Kampf-Text
{const bosses=CHAPTERS.map(c=>c.enc[c.enc.length-1].boss).filter(b=>typeof b==='string');assert.equal(bosses.length,5,'fünf Bosse');
 for(const b of bosses){const d=BOSS_CINE[b];assert.ok(d,'Eintrag '+b);assert.ok(CHARACTERS[b]&&CHARACTERS[b].storyBoss,b+' ist storyBoss');assert.ok(d.pre.length>80&&d.post.length>80&&d.name,b+': Texte');assert.ok(fs.existsSync(new URL('../assets/video/'+d.video+'.webm',import.meta.url)),b+': Video '+d.video+'.webm')}
 assert.ok(/Also du bist Hit\?/.test(BOSS_CINE.leonBoss.pre)&&/auf derselben Seite kämpfen\.$/.test(BOSS_CINE.leonBoss.post));assert.ok(/Hahaha!/.test(BOSS_CINE.st3g0Boss.pre)&&/Ich bin dabei, Hit!$/.test(BOSS_CINE.st3g0Boss.post));assert.ok(/Komm! Beweise mir, was du kannst!$/.test(BOSS_CINE.bearBoss.pre));assert.ok(/Zeige mir, was in dir steckt!$/.test(BOSS_CINE.anubisBoss.pre)&&/würdiger Verbündeter\.$/.test(BOSS_CINE.anubisBoss.post));assert.ok(/Kampfprotokoll aktiviert\.$/.test(BOSS_CINE.cyberdemonBoss.pre)&&/an deiner Seite\.$/.test(BOSS_CINE.cyberdemonBoss.post));
 ok('alle 5 Bosse: Video, Name, Vor- und Nach-dem-Kampf-Text')}
// 2) Seiten & Ablauf der Sequenz
{for(const[k,d]of Object.entries(BOSS_CINE))for(const ph of['pre','post']){const p=cinePages(d[ph]);assert.ok(p.every(x=>x.length<=CINE.pageMax+60),k+' '+ph);assert.equal(p.join(' ').replace(/\s+/g,' '),d[ph].replace(/\s+/g,' '),'Text bleibt unverändert')}
 let done=0;const c=new BossCine(null,'cyberdemonBoss','post',()=>done++);assert.ok(c.pages.length>=2&&c.active);
 for(let i=0;i<CINE.lock-1;i++)c.update();assert.equal(c.advance(),false,'kurz nach dem Start ignoriert');assert.equal(c.skip(),false);for(let i=0;i<5;i++)c.update();
 assert.ok(c.typing);c.advance();assert.ok(!c.typing&&c.page===0,'erstes Weiter schreibt die Seite fertig');c.advance();assert.equal(c.page,1);assert.equal(done,0);for(let i=0;i<400&&c.typing;i++)c.update();assert.ok(!c.typing,'Schreibmaschine wird fertig');c.advance();assert.equal(done,1);assert.ok(!c.active);c.advance();assert.equal(done,1,'nur einmal fertig');
 const c2=new BossCine(null,'leonBoss','pre',()=>done++);for(let i=0;i<CINE.lock;i++)c2.update();c2.skip();assert.equal(done,2,'Überspringen beendet sofort');ok('Seiten, Schreibmaschine, Weiter, Überspringen, Eingabesperre am Anfang')}
// 3) im Spiel: Kapitel 1 (LEON)
{const bot=new AIController(2),dummy=new AIController(0);const p1=new Fighter({char:CHARACTERS.tiger,x:340,facing:1,input:bot}),p2=new Fighter({char:CHARACTERS.tiger,x:620,facing:-1,input:dummy});
 const game=new Game(p1,p2),arc=new Arcade(game,p1,p2,dummy);arc.setMode('story');arc.startStory('tiger',1);const s=game.story;while(game.phase!=='fight'){bot.feed(0,0,[]);game.step()}
 const e=s.encs.find(x=>x.boss==='leonBoss');assert.ok(e,'Boss-Begegnung');const idle=()=>{bot.feed(0,0,[],false);game.step()};
 s.engage(e);assert.ok(s.cine&&s.cine.active&&s.cine.phase==='pre'&&s.cine.id==='leonBoss','Sequenz startet mit der Begegnung');
 idle();const ft=s.ft,q=s.queue.length,x=p1.x;for(let i=0;i<60;i++)idle();assert.equal(s.ft,ft,'Story steht still');assert.equal(s.queue.length,q,'Boss wird noch nicht gesetzt');assert.equal(s.mobs.filter(m=>m.char.id==='leonBoss').length,0);assert.ok(Math.abs(p1.x-x)<1,'Spieler steht still');
 s.cine.skip();assert.equal(s.cine,null,'Überspringen beendet die Sequenz');for(let i=0;i<120&&!s.mobs.some(m=>m.char.id==='leonBoss');i++)idle();assert.ok(s.mobs.some(m=>m.char.id==='leonBoss'),'danach erscheint der Boss');
 // Neustart am Checkpoint: Vor-dem-Kampf-Sequenz nicht noch einmal
 s.begin();s.engage(e);assert.equal(s.cine,null,'beim zweiten Versuch geht es direkt los');
 ok('Sequenz vor dem Boss: Spiel steht still, Boss erscheint erst danach, beim Neustart nicht noch einmal')
 // Sieg: Nach-dem-Kampf-Sequenz, Begegnung endet erst danach
 s.begin();s.enc=s.encs.indexOf(e);s.state='fight';s.queue=[];const boss=new Fighter({char:CHARACTERS.leonBoss,x:p1.x+200,facing:-1,input:dummy});boss.mob=true;s.mobs=[boss];s.mobDown(boss,p1);assert.equal(s.bossDown,'leonBoss');
 let guard=0;while(!s.cine&&guard++<400)idle();assert.ok(s.cine&&s.cine.phase==='post','nach dem Zusammenbruch kommt die Nach-dem-Kampf-Sequenz');assert.ok(guard>=40,'erst nach dem Zusammenbruch ('+guard+' Schritte)');
 const st=s.state;for(let i=0;i<40;i++)idle();assert.equal(s.state,st,'Kapitel endet nicht während der Sequenz');assert.ok(s.cine.active);
 for(let i=0;i<CINE.lock;i++)idle();s.cine.skip();for(let i=0;i<10;i++)idle();assert.notEqual(s.state,'fight','danach läuft das Kapitelende wie bisher');
 ok('Sieg: Nach-dem-Kampf-Sequenz erst nach dem Zusammenbruch, Kapitelende wartet darauf')}
console.log('Boss-Sequenz-Tests bestanden ('+n+')');
