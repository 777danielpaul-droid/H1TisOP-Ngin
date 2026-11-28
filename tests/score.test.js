// Punkte & Highscores (Arcade): Statistik im Kampf, Punkteformel, Durchlauf (Run), lokale Bestenliste. node tests/score.test.js
import assert from'node:assert/strict';
const mem=new Map();globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>{mem.set(k,String(v))},removeItem:k=>{mem.delete(k)}};
import{unlockAll}from'../src/core/loot.js';unlockAll();
import{Game}from'../src/core/game.js';import{Fighter}from'../src/core/fighter.js';import{InputBuffer}from'../src/core/input.js';import{AIController}from'../src/core/ai.js';
import{Arcade}from'../src/core/arcade.js';import{CHARACTERS}from'../src/core/characters.js';import{ROUND}from'../src/core/config.js';
import fs from'node:fs';
import{SCORE,LIMITS,verifyRun,freshStats,stageScore,newRun,addStage,runEntry,loadScores,saveScore,bestScore,cleanEntry}from'../src/core/score.js';
const ok=n=>console.log('  ✓',n);
// 1) Statistik im echten Kampf: jeder verteilte Treffer ist beim Gegner ein eingesteckter
{const i1=new InputBuffer(),ai=new AIController(2),p1=new Fighter({char:CHARACTERS.tiger,x:340,facing:1,input:i1}),p2=new Fighter({char:CHARACTERS.wolf,x:620,facing:-1,input:ai}),g=new Game(p1,p2);
 for(let k=0;k<3000;k++){i1.feed(0,0,[]);g.step();if(g.phase==='fight'){p1.hp=p1.maxHp;p2.hp=p2.maxHp}}
 assert.ok(p2.sc.hits>3,'KI trifft den passiven Spieler ('+p2.sc.hits+')');assert.equal(p1.sc.taken,p2.sc.hits);assert.equal(p2.sc.taken,0);assert.equal(p1.sc.hits,0);assert.ok(p2.sc.maxCombo>=1&&p2.sc.dmg>0);
 g.rematch();assert.equal(p2.sc.hits,0,'neue Stage = Statistik zurückgesetzt')}
ok('Statistik: verteilte Treffer = eingesteckte Treffer beim Gegner, Reset je Stage');
// 2) Formel: mehr Treffer / weniger kassiert = mehr Punkte
{const S=SCORE,base={...freshStats(),hits:10,maxCombo:3,taken:2,perfect:1,hp:1.2,time:60};
 const w=stageScore(base,{won:true,diff:0});assert.equal(w.parts.hits,1000);assert.equal(w.parts.combo,300);assert.equal(w.parts.pen,150);assert.equal(w.parts.perfect,500);assert.equal(w.parts.hp,360);assert.equal(w.parts.time,600);assert.equal(w.parts.flawless,0);
 assert.equal(w.total,1000+300+1000+500+360+600-150);
 const more=stageScore({...base,hits:20},{won:true}).total,less=stageScore({...base,taken:0},{won:true}).total,hurt=stageScore({...base,taken:9},{won:true}).total;
 assert.ok(more>w.total&&less>w.total&&hurt<w.total,'mehr Treffer, weniger Treffer kassiert = mehr Punkte');
 assert.equal(stageScore({...base,taken:0},{won:true}).parts.flawless,S.flawlessMatch,'ganze Stage ohne Treffer = FLAWLESS');
 const lost=stageScore(base,{won:false});assert.equal(lost.parts.clear+lost.parts.perfect+lost.parts.hp+lost.parts.time+lost.parts.flawless,0,'Niederlage: kein Clear-/Perfekt-/Restleben-/Zeit-Bonus');assert.equal(lost.total,1000+300-150);
 assert.equal(stageScore(base,{won:true,diff:2}).total,Math.round(w.total*1.5),'+25 % je Schwierigkeitsstufe');assert.equal(stageScore(base,{won:true,boss:true}).total,Math.round(w.total*1.5),'Endgegner ×1,5');
 assert.equal(stageScore({...freshStats(),taken:50},{won:false}).total,0,'nie negativ');assert.equal(stageScore(null,{won:true}).total,SCORE.clear+SCORE.flawlessMatch);assert.equal(stageScore({...freshStats(),hits:1e9},{won:true}).total,SCORE.cap,'Obergrenze')}
ok('Formel: Treffer +, Kassieren −, Combo/Perfekt/Flawless/Restleben/Restzeit, Schwierigkeit & Endgegner');
// 3) Lokale Bestenliste
{mem.clear();assert.equal(bestScore(),0);const e=(s,f='tiger')=>runEntry({total:s,stages:2,hits:5,taken:1,maxCombo:3},{char:f,diff:1,win:false});
 assert.equal(saveScore(e(500)),1);assert.equal(saveScore(e(900)),1);assert.equal(saveScore(e(700)),2);assert.equal(saveScore(e(0)),0,'0 Punkte werden nicht gespeichert');assert.deepEqual(loadScores().map(x=>x.score),[900,700,500]);
 for(let i=0;i<30;i++)saveScore(e(1000+i));assert.equal(loadScores().length,20,'höchstens 20 Einträge');assert.equal(bestScore(),1029);
 mem.set('hitisop.scores',JSON.stringify([{score:'9e99',fighter:'tiger'},{score:5,fighter:'<script>'},null,{score:-3,fighter:'x'}]));const l=loadScores();assert.equal(l.length,2);assert.equal(l[0].score,SCORE.cap);assert.equal(cleanEntry({score:1,fighter:'__proto__'}).fighter,'__proto__');mem.set('hitisop.scores','kaputt');assert.deepEqual(loadScores(),[])}
ok('Lokale Bestenliste: sortiert, begrenzt, kaputte Daten werden gesäubert');
// 4) Arcade: Run über mehrere Stages, Highscore erst am Ende
{mem.clear();const i1=new InputBuffer(),ai=new AIController(0),p1=new Fighter({char:CHARACTERS.st3g0,x:340,facing:1,input:i1}),p2=new Fighter({char:CHARACTERS.tiger,x:620,facing:-1,input:ai}),g=new Game(p1,p2),a=new Arcade(g,p1,p2,ai);
 const sent=[];a.onRun=e=>sent.push(e);a.difficulty=1;a.start('tiger');a.opponents=['st3g0','wolf','st3g0'];a.stage=0;a.beginStage();
 const win=(hits,taken)=>{Object.assign(p1.sc,{hits,taken,maxCombo:2,perfect:2,hp:1.5,time:40});p1.wins=ROUND.wins;g.phase='match';g.pf=70;a.update()};
 win(8,0);assert.equal(a.state,'clear');const s1=a.lastScore.total;assert.ok(s1>0&&a.run.total===s1&&!a.lastScore.final&&sent.length===0&&loadScores().length===0,'Zwischenstand, noch kein Highscore');
 a.confirm();assert.equal(p1.sc.hits,0,'Statistik je Stage neu');win(6,3);const s2=a.lastScore.total;assert.equal(a.run.total,s1+s2);
 a.confirm();Object.assign(p1.sc,{hits:4,taken:6,maxCombo:2});g.phase='match';g.pf=70;a.update();assert.equal(a.state,'gameover');assert.ok(a.lastScore.final&&!a.lastScore.entry.win);
 assert.equal(sent.length,1);assert.equal(sent[0].log.length,3,'Protokoll: eine Zeile je Stage');assert.equal(sent[0].score,s1+s2+a.lastScore.total);assert.equal(sent[0].stages,2,'zwei Stages geschafft');assert.equal(sent[0].diff,1);assert.equal(loadScores()[0].score,sent[0].score);assert.equal(a.lastScore.rank,1);assert.equal(a.lastScore.best,0);
 a.confirm();assert.equal(a.run.total,0,'Nochmal = neuer Durchlauf');
 a.start('tiger');a.opponents=['st3g0'];a.stage=0;a.beginStage();win(10,0);assert.equal(a.state,'victory');assert.ok(a.lastScore.final&&a.lastScore.entry.win);assert.equal(sent.length,2);assert.equal(a.lastScore.best,sent[0].score,'best = bisheriger Rekord vor diesem Durchlauf')}
ok('Arcade: Run summiert Stages, Highscore erst bei Game Over/Sieg, Nochmal = neuer Run');
// 5) Nicht gewertet: 2 Spieler, KI gegen KI
{const i1=new InputBuffer(),ai=new AIController(0),p1=new Fighter({char:CHARACTERS.tiger,x:340,facing:1,input:i1}),p2=new Fighter({char:CHARACTERS.wolf,x:620,facing:-1,input:ai}),g=new Game(p1,p2),a=new Arcade(g,p1,p2,ai),n=loadScores().length;
 a.mode='versus';a.startVersus('tiger','wolf');p1.sc.hits=50;p1.wins=ROUND.wins;g.phase='match';g.pf=70;a.update();assert.equal(a.state,'vsover');assert.equal(a.lastScore,null);assert.equal(loadScores().length,n)}
ok('2-Spieler / KI-Kampf zählen keine Punkte');
// 6) Server-Prüfung (verifyRun = JS-Zwilling der SQL-Funktion submit_highscore)
{const good=[[1,20,2,6,2,180,60,2,0],[1,15,0,5,2,150,50,3,0],[0,8,9,3,0,0,0,2,1]];const v=verifyRun(good,1);assert.ok(v.ok);assert.equal(v.stages,2);assert.equal(v.win,false);assert.equal(v.hits,43);assert.equal(v.taken,11);assert.equal(v.maxCombo,6);
 const sum=[stageScore({hits:20,taken:2,maxCombo:6,perfect:2,hp:1.8,time:60},{won:true,diff:1,rounds:2}),stageScore({hits:15,taken:0,maxCombo:5,perfect:2,hp:1.5,time:50},{won:true,diff:1,rounds:3}),stageScore({hits:8,taken:9,maxCombo:3,perfect:0,hp:0,time:0},{won:false,diff:1,boss:true,rounds:2})];
 assert.deepEqual(sum.map(x=>x.row),good,'Protokollzeilen = Ausgabe von stageScore');assert.equal(v.score,sum.reduce((a,b)=>a+b.total,0),'Server und Spiel rechnen gleich');
 const L=(i,x)=>good.map((r,k)=>k===i?x:r);
 const bad={'zu viele Treffer':L(0,[1,500,2,6,2,180,60,2,0]),'Combo > Treffer':L(0,[1,5,2,6,2,180,60,2,0]),'Restzeit unmöglich':L(0,[1,20,2,6,2,180,999,2,0]),'Restleben unmöglich':L(0,[1,20,2,6,2,500,60,2,0]),'perfekt trotz Treffern':L(0,[1,20,0,6,1,180,60,2,0]),'zu wenige Runden':L(0,[1,20,2,6,2,180,60,1,0]),'zu viele Runden':L(0,[1,20,2,6,2,180,60,12,0]),
  'Niederlage mittendrin':L(0,[0,20,2,6,0,0,0,2,0]),'Endgegner mittendrin':L(0,[1,20,2,6,2,180,60,2,1]),'falsche Länge':L(0,[1,20,2]),'negativ':L(0,[1,-20,2,6,2,180,60,2,0]),'Dezimalzahl':L(0,[1,20.5,2,6,2,180,60,2,0]),'Text':L(0,['1',20,2,6,2,180,60,2,0])};
 for(const[n,l]of Object.entries(bad))assert.equal(verifyRun(l,1).ok,false,n);assert.equal(verifyRun([],1).ok,false);assert.equal(verifyRun(Array(21).fill(good[0]),1).ok,false,'zu viele Stages');assert.equal(verifyRun('x',1).ok,false);
 assert.ok(verifyRun([[1,60*9,60*9,25,2,200,198,9,1]],9).score<=SCORE.cap,'theoretisches Maximum bleibt unter der Obergrenze')}
ok('Server-Prüfung: gültige Protokolle werden gleich berechnet, Unmögliches abgelehnt');
// 7) Echte Durchläufe (KI spielt Arcade gegen die Leiter) müssen die Prüfung bestehen, sonst würden echte Spieler abgelehnt
{for(const diff of[0,1,2,3]){const ai1=new AIController(Math.min(3,diff+1)),aiE=new AIController(diff),p1=new Fighter({char:CHARACTERS.tiger,x:340,facing:1,input:ai1}),p2=new Fighter({char:CHARACTERS.wolf,x:620,facing:-1,input:aiE}),g=new Game(p1,p2),a=new Arcade(g,p1,p2,aiE);
  let got=null;a.onRun=e=>{got=e};a.difficulty=diff;a.start('tiger');a.opponents=['wolf','st3g0','wolf'];a.stage=0;a.beginStage();
  for(let k=0;k<400000&&!got;k++){g.step();a.update();if(a.state==='clear')a.confirm()}
  assert.ok(got,'Durchlauf endet (diff '+diff+')');const v=verifyRun(got.log,got.diff);assert.ok(v.ok,'echter Durchlauf besteht die Prüfung: '+v.reason+' '+JSON.stringify(got.log));assert.equal(v.score,got.score,'Server-Punkte = Spiel-Punkte');assert.equal(v.stages,got.stages)}}
ok('Echte KI-Durchläufe (4 Schwierigkeitsstufen) bestehen die Server-Prüfung mit identischen Punkten');
// 8) SQL und JS verwenden dieselben Zahlen
{const sql=fs.readFileSync(new URL('../supabase/migrations/20261128010000_highscores.sql',import.meta.url),'utf8'),num=n=>{const m=new RegExp('\\b'+n+' constant integer := (\\d+)').exec(sql);assert.ok(m,n+' fehlt in der SQL-Datei');return+m[1]};
 const map={c_hit:SCORE.hit,c_combo_step:SCORE.comboStep,c_combo_max:SCORE.comboMax,c_taken:SCORE.taken,c_clear:SCORE.clear,c_perfect:SCORE.perfectRound,c_flawless:SCORE.flawlessMatch,c_hp:SCORE.hpPerRound,c_time:SCORE.timeSec,c_cap:SCORE.cap,
  l_hits:LIMITS.hitsPerRound,l_taken:LIMITS.takenPerRound,l_combo:LIMITS.combo,l_min_rounds:LIMITS.minRounds,l_max_rounds:LIMITS.maxRounds,l_win_rounds:LIMITS.winRounds,l_sec:LIMITS.secPerRound,l_stages:LIMITS.maxStages,l_gap:LIMITS.minSubmitGapSec};
 for(const[k,v]of Object.entries(map))assert.equal(num(k),v,k+' (SQL) = Wert in score.js');assert.ok(sql.includes('(1 + 0.25 * d)')&&SCORE.diff===.25&&sql.includes('then 1.5 else 1')&&SCORE.boss===1.5,'Schwierigkeits-/Endgegner-Faktor')}
ok('SQL-Funktion und score.js nutzen dieselben Zahlen');
console.log('Punkte-Tests bestanden');
