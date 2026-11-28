// Punkte & Highscores (Arcade). Rein logisch, kein DOM -> headless testbar. Werte unten ändern, um das Spiel zu balancen.
// Jeder Kämpfer zählt seine Treffer in f.sc (core/combat.js hit(), core/game.js endRound). Pro Stage (= ein Match gegen einen Gegner) entsteht daraus eine Punktzahl; die Punkte aller Stages eines Durchlaufs (Run) ergeben den Highscore.
//   + Treffer verteilt · + Combo-Bonus (längste Combo) · − jeder eingesteckte Treffer · + Stage geschafft · + Runde ohne Treffer (PERFEKT) · + ganze Stage ohne Treffer (FLAWLESS) · + Restleben je gewonnene Runde · + Restzeit
//   Bei Niederlage zählen nur Treffer/Combo abzüglich eingesteckter Treffer (kein Clear-/Perfekt-Bonus), damit ein weiter Weg auch ohne Sieg Punkte bringt. Danach × Schwierigkeit (+25 % je Stufe) × Endgegner (1,5).
export const SCORE={hit:100,comboStep:150,comboMax:10,taken:75,clear:1000,perfectRound:500,flawlessMatch:2000,hpPerRound:300,timeSec:10,diff:.25,boss:1.5,cap:500000};
export const freshStats=()=>({hits:0,taken:0,dmg:0,maxCombo:0,blocks:0,roundTaken:0,perfect:0,hp:0,time:0});
export function stageScore(st,o={}){st=st||freshStats();const S=SCORE,won=!!o.won;
 const parts={hits:st.hits*S.hit,combo:st.maxCombo>=2?(Math.min(st.maxCombo,S.comboMax)-1)*S.comboStep:0,clear:won?S.clear:0,perfect:won?st.perfect*S.perfectRound:0,flawless:won&&st.taken===0?S.flawlessMatch:0,
  hp:won?Math.round(st.hp*S.hpPerRound):0,time:won?Math.round(st.time)*S.timeSec:0,pen:st.taken*S.taken};
 const sub=Math.max(0,parts.hits+parts.combo+parts.clear+parts.perfect+parts.flawless+parts.hp+parts.time-parts.pen),mult=(1+S.diff*(o.diff|0))*(o.boss?S.boss:1);
 return{hits:st.hits,taken:st.taken,maxCombo:st.maxCombo,parts,mult,total:Math.min(S.cap,Math.round(sub*mult)),won}}
export const newRun=()=>({total:0,stages:0,hits:0,taken:0,maxCombo:0});
export const addStage=(run,b)=>({total:Math.min(SCORE.cap,run.total+b.total),stages:run.stages+(b.won?1:0),hits:run.hits+b.hits,taken:run.taken+b.taken,maxCombo:Math.max(run.maxCombo,b.maxCombo)});
export const runEntry=(run,o={})=>({score:run.total,fighter:String(o.char||''),stages:run.stages,diff:o.diff|0,win:!!o.win,hits:run.hits,taken:run.taken,maxCombo:run.maxCombo,at:Date.now()});
// ---- lokale Bestenliste (immer, auch ohne Konto) ----
const SC_KEY='hitisop.scores',SC_MAX=20,scInt=(v,hi)=>Math.max(0,Math.min(hi,Math.trunc(+v)||0));
export const cleanEntry=e=>e&&typeof e==='object'&&/^[a-z0-9_]{1,24}$/i.test(String(e.fighter))?{score:scInt(e.score,SCORE.cap),fighter:String(e.fighter),stages:scInt(e.stages,40),diff:scInt(e.diff,9),win:!!e.win,hits:scInt(e.hits,99999),taken:scInt(e.taken,99999),maxCombo:scInt(e.maxCombo,999),at:scInt(e.at,9e15)}:null;
export function loadScores(){try{const a=JSON.parse(localStorage.getItem(SC_KEY)||'[]');return(Array.isArray(a)?a:[]).map(cleanEntry).filter(Boolean).sort((x,y)=>y.score-x.score).slice(0,SC_MAX)}catch(e){return[]}}
export const bestScore=()=>{const l=loadScores();return l.length?l[0].score:0};
// Rückgabe: Platz (1 = neuer Rekord) oder 0 (nicht in der Liste / 0 Punkte)
export function saveScore(e){e=cleanEntry(e);if(!e||e.score<1)return 0;const l=[...loadScores(),e].sort((x,y)=>y.score-x.score||y.at-x.at).slice(0,SC_MAX);try{localStorage.setItem(SC_KEY,JSON.stringify(l))}catch(x){return 0}const i=l.indexOf(e);return i<0?0:i+1}
