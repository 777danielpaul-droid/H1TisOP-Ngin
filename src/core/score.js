// Punkte & Highscores (Arcade). Rein logisch, kein DOM -> headless testbar. Werte unten ändern, um das Spiel zu balancen – und dann dieselben Zahlen in supabase/migrations/*_highscores.sql (Funktion submit_highscore) anpassen (tests/score.test.js prüft, dass beide übereinstimmen).
// Jeder Kämpfer zählt seine Treffer in f.sc (core/combat.js hit(), core/game.js endRound). Pro Stage (= ein Match gegen einen Gegner) entsteht daraus eine Punktzahl; die Punkte aller Stages eines Durchlaufs (Run) ergeben den Highscore.
//   + Treffer verteilt · + Combo-Bonus (längste Combo) · − jeder eingesteckte Treffer · + Stage geschafft · + Runde ohne Treffer (PERFEKT) · + ganze Stage ohne Treffer (FLAWLESS) · + Restleben je gewonnene Runde · + Restzeit
//   Bei Niederlage zählen nur Treffer/Combo abzüglich eingesteckter Treffer (kein Clear-/Perfekt-Bonus), damit ein weiter Weg auch ohne Sieg Punkte bringt. Danach × Schwierigkeit (+25 % je Stufe) × Endgegner (1,5).
// Cloud-Highscore: der Client schickt NICHT die Punktzahl, sondern das Stage-Protokoll (run.log); der Server rechnet die Punkte selbst aus und lehnt Unmögliches ab (verifyRun = JS-Zwilling der SQL-Funktion).
export const SCORE={hit:100,comboStep:150,comboMax:10,taken:75,clear:1000,perfectRound:500,flawlessMatch:2000,hpPerRound:300,timeSec:10,diff:.25,boss:1.5,cap:500000};
// Obergrenzen für das, was in einem Kampf überhaupt möglich ist (gemessen: KI gegen KI, stärkste Stufe: höchstens 33 Treffer und Combo 12 pro Runde -> hier großzügig darüber)
export const LIMITS={hitsPerRound:60,takenPerRound:60,combo:25,minRounds:2,maxRounds:9,winRounds:2,secPerRound:99,maxStages:20,minSubmitGapSec:20};
export const freshStats=()=>({hits:0,taken:0,dmg:0,maxCombo:0,blocks:0,roundTaken:0,perfect:0,hp:0,time:0});
const iv=(v,hi)=>Math.max(0,Math.min(hi,Math.trunc(+v)||0));
// Protokollzeile je Stage (nur ganze Zahlen): [gewonnen, Treffer, eingesteckt, längste Combo, perfekte Runden, Restleben (1/100 je Runde), Restzeit (s), gespielte Runden, Endgegner]
export function stageScore(st,o={}){st=st||freshStats();const S=SCORE,won=!!o.won,hpC=Math.round(st.hp*100),tm=Math.round(st.time);
 const parts={hits:st.hits*S.hit,combo:st.maxCombo>=2?(Math.min(st.maxCombo,S.comboMax)-1)*S.comboStep:0,clear:won?S.clear:0,perfect:won?st.perfect*S.perfectRound:0,flawless:won&&st.taken===0?S.flawlessMatch:0,
  hp:won?hpC*S.hpPerRound/100:0,time:won?tm*S.timeSec:0,pen:st.taken*S.taken};
 const sub=Math.max(0,parts.hits+parts.combo+parts.clear+parts.perfect+parts.flawless+parts.hp+parts.time-parts.pen),mult=(1+S.diff*(o.diff|0))*(o.boss?S.boss:1);
 return{hits:st.hits,taken:st.taken,maxCombo:st.maxCombo,parts,mult,total:Math.min(S.cap,Math.round(sub*mult)),won,
  row:[won?1:0,iv(st.hits,9999),iv(st.taken,9999),iv(st.maxCombo,99),iv(st.perfect,9),iv(hpC,999),iv(tm,999),iv(o.rounds,99),o.boss?1:0]}}
export const newRun=()=>({total:0,stages:0,hits:0,taken:0,maxCombo:0,log:[]});
export const addStage=(run,b)=>({total:Math.min(SCORE.cap,run.total+b.total),stages:run.stages+(b.won?1:0),hits:run.hits+b.hits,taken:run.taken+b.taken,maxCombo:Math.max(run.maxCombo,b.maxCombo),log:[...run.log,b.row]});
export const runEntry=(run,o={})=>({score:run.total,fighter:String(o.char||''),stages:run.stages,diff:o.diff|0,win:!!o.win,hits:run.hits,taken:run.taken,maxCombo:run.maxCombo,at:Date.now(),log:run.log});
// Prüfung wie auf dem Server: Rückgabe {ok:true,score,stages,win,hits,taken,maxCombo} oder {ok:false,reason}
export function verifyRun(log,diff){const S=SCORE,L=LIMITS,bad=reason=>({ok:false,reason});
 if(!Array.isArray(log)||log.length<1||log.length>L.maxStages)return bad('länge');
 const d=iv(diff,9);let total=0,stages=0,hits=0,taken=0,combo=0,last=0;
 for(let i=0;i<log.length;i++){const r=log[i];if(!Array.isArray(r)||r.length!==9||!r.every(x=>Number.isInteger(x)&&x>=0&&x<=1e6))return bad('zeile '+i);
  const[w,h,t,c,p,hpC,tm,rd,bs]=r,wr=w?L.winRounds:L.winRounds-1;
  if(w>1||bs>1)return bad('flag');if(!w&&i<log.length-1)return bad('niederlage nur am Ende');if(bs&&i<log.length-1)return bad('endgegner nur am Ende');
  if(rd<L.minRounds||rd>L.maxRounds)return bad('runden');if(w&&rd<L.winRounds)return bad('runden');
  if(h>L.hitsPerRound*rd||t>L.takenPerRound*rd)return bad('treffer');if(c>Math.min(h,L.combo)||(h>0&&c<1))return bad("combo");
  if(p>wr||(w&&p<Math.max(0,L.winRounds-t)))return bad('perfekt');if(hpC>100*wr||tm>L.secPerRound*wr)return bad('restleben/zeit');
  const sub=Math.max(0,h*S.hit+(c>=2?(Math.min(c,S.comboMax)-1)*S.comboStep:0)+(w?S.clear+p*S.perfectRound+(t===0?S.flawlessMatch:0)+hpC*S.hpPerRound/100+tm*S.timeSec:0)-t*S.taken);
  total=Math.min(S.cap,total+Math.min(S.cap,Math.round(sub*(1+S.diff*d)*(bs?S.boss:1))));if(w)stages++;hits+=h;taken+=t;combo=Math.max(combo,c);last=w}
 return{ok:true,score:total,stages,win:!!last,hits,taken,maxCombo:combo}}
// ---- lokale Bestenliste (immer, auch ohne Konto) ----
const SC_KEY='hitisop.scores',SC_MAX=20;
const cleanLog=l=>Array.isArray(l)?l.slice(0,LIMITS.maxStages).map(r=>Array.isArray(r)?r.slice(0,9).map(x=>iv(x,1e6)):[]):[];
export const cleanEntry=e=>e&&typeof e==='object'&&/^[a-z0-9_]{1,24}$/i.test(String(e.fighter))?{score:iv(e.score,SCORE.cap),fighter:String(e.fighter),stages:iv(e.stages,40),diff:iv(e.diff,9),win:!!e.win,hits:iv(e.hits,99999),taken:iv(e.taken,99999),maxCombo:iv(e.maxCombo,999),at:iv(e.at,9e15),log:cleanLog(e.log)}:null;
export function loadScores(){try{const a=JSON.parse(localStorage.getItem(SC_KEY)||'[]');return(Array.isArray(a)?a:[]).map(cleanEntry).filter(Boolean).sort((x,y)=>y.score-x.score).slice(0,SC_MAX)}catch(e){return[]}}
export const bestScore=()=>{const l=loadScores();return l.length?l[0].score:0};
// Rückgabe: Platz (1 = neuer Rekord) oder 0 (nicht in der Liste / 0 Punkte)
export function saveScore(e){e=cleanEntry(e);if(!e||e.score<1)return 0;const l=[...loadScores(),e].sort((x,y)=>y.score-x.score||y.at-x.at).slice(0,SC_MAX);try{localStorage.setItem(SC_KEY,JSON.stringify(l))}catch(x){return 0}const i=l.indexOf(e);return i<0?0:i+1}
