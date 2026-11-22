// Prüft die Kernfrage des Ausdauer-Systems: Lohnt sich Button-Spamming? Ein "Spammer" (läuft vor, drückt ununterbrochen zufällige Angriffe)
// kämpft gegen die KI – einmal ohne, einmal mit Ausdauer.   node tools/spam-check.mjs [--n=150] [--level=2] [--char=tiger]
import{Game}from'../src/core/game.js';
import{Fighter}from'../src/core/fighter.js';
import{InputBuffer}from'../src/core/input.js';
import{AIController}from'../src/core/ai.js';
import{CHARACTERS}from'../src/core/characters.js';
import{STAMINA}from'../src/core/config.js';
const arg=(k,d)=>{const a=process.argv.find(s=>s.startsWith('--'+k+'='));return a?a.slice(k.length+3):d};
const N=+arg('n',150),LEVEL=+arg('level',2),CH=arg('char','tiger');
for(const t of arg('tune','').split(',').filter(Boolean)){const[k,v]=t.split('='),p=k.split('.');let o=STAMINA;for(let i=1;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=+v}   // --tune=S.cost.L=4,S.exhaust.dmg=.7
const mulberry=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
function round(seed,stam,masherLeft){
 Math.random=mulberry(seed);const mi=new InputBuffer(),ai=new AIController(LEVEL);
 const L=new Fighter({char:CHARACTERS[CH],x:340,facing:1,input:masherLeft?mi:ai}),R=new Fighter({char:CHARACTERS[CH],x:620,facing:-1,input:masherLeft?ai:mi});
 const me=masherLeft?L:R,foe=masherLeft?R:L,g=new Game(L,R);g.stamPref=stam;let f=0,exh=0,fr=0;
 while(g.phase!=='result'&&g.phase!=='match'&&f++<9000){
  if(g.phase==='fight'){const d=Math.abs(foe.x-me.x),fwd=foe.x>=me.x?1:-1;const pr=[];if(f%3===0){const b=['L','M','H','L','M','S'];pr.push(b[(Math.random()*b.length)|0])}
   mi.feed(d>95?fwd:0,0,pr,g.hitstop>0||g.superFlash>0);fr++;if(me.exh)exh++}
  else mi.feed(0,0,[]);
  g.step()}
 return{win:g.winner===me,draw:!g.winner,hpMe:me.hp/me.maxHp,hpFoe:foe.hp/foe.maxHp,frames:f,exh:fr?exh/fr:0}}
for(const stam of(arg('off','1')==='1'?[false,true]:[true])){let w=0,d=0,hm=0,hf=0,ex=0,fr=0;
 for(let k=0;k<N;k++){const r=round(1000+k,stam,k%2===0);if(r.win)w++;if(r.draw)d++;hm+=r.hpMe;hf+=r.hpFoe;ex+=r.exh;fr+=r.frames}
 console.log(`Ausdauer ${stam?'AN ':'AUS'}: Spammer gewinnt ${(100*w/N).toFixed(0)} % | Ø HP-Rest Spammer ${(100*hm/N).toFixed(0)} % vs KI ${(100*hf/N).toFixed(0)} % | Spammer ${(100*ex/N).toFixed(1)} % der Zeit erschöpft | Ø ${(fr/N/60).toFixed(0)} s`)}
process.exit(0)
