// Wetter-Auswahl (Optionen-Menü) + Regen-Effekt: Logik und Zeichnen ohne Browser (Attrappe für den Canvas-Kontext).
import{WEATHER_MODES,weatherMode,weatherPick}from'../src/core/weather.js';
import{Rain}from'../src/render/rain.js';
import{GROUND}from'../src/core/config.js';
let fails=0;const check=(n,ok,i='')=>{console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':'  '+i));if(!ok)fails++};

check('Modi: Blätter, Regen, Beides, Zufällig',WEATHER_MODES.join()==='leaves,rain,both,random');
check('Ungültiger Wert -> Blätter (bisheriges Verhalten)',weatherMode('x')==='leaves'&&weatherMode(null)==='leaves');
check('leaves = nur Blätter, rain = nur Regen, both = beides',(p=>p.leaves&&!p.rain)(weatherPick('leaves'))&&(p=>!p.leaves&&p.rain)(weatherPick('rain'))&&(p=>p.leaves&&p.rain)(weatherPick('both')));
const seen=new Set();for(const r of[.1,.5,.9]){const p=weatherPick('random',()=>r);seen.add(p.leaves+'/'+p.rain)}
check('random würfelt alle drei Varianten',seen.size===3,[...seen].join());

// Attrappe: jeder Aufruf erlaubt, zählt Striche/Ellipsen
const mkG=()=>{const c={n:{stroke:0,fill:0}};return new Proxy(c,{get:(t,k)=>k==='n'?t.n:k==='stroke'||k==='fill'?()=>{t.n[k]++}:()=>{},set:()=>true})};
const mkGame=()=>{const mk=(x)=>({x,y:GROUND,vx:0,vy:0,facing:1,floor:GROUND,grounded:true,dead:0,move:null,moves:{},moveName:''});
 return{frame:0,fighters:[mk(300),mk(600)],camera:{x:480,y:270,z:1,toScreen:(x,y)=>[x-480+480,y-270+270]}}};
const r=new Rain(),game=mkGame(),g=mkG();
for(let i=0;i<120;i++){game.frame++;r.draw(g,game,0)}
check('Regen zeichnet (Tropfen + Pfützen)',g.n.stroke>0&&g.n.fill>0);
check('Tropfen werden begrenzt, Ringwellen entstehen',r.d.length>0&&r.d.length<=120&&r.rp.length<=70);

// Spezialattacke -> Pfützen spritzen weg und schrumpfen
const w0=r.pud.reduce((a,p)=>a+p.w,0);
game.fighters[0].move={};game.fighters[0].moves={fb:{special:true}};game.fighters[0].moveName='fb';game.frame++;r.draw(g,game,0);
const w1=r.pud.reduce((a,p)=>a+p.w,0);
check('Spezialattacke: Pfützen schrumpfen',w1<w0*.5,w0.toFixed(0)+' -> '+w1.toFixed(0));
check('Spezialattacke: Tropfen fliegen in Blickrichtung',r.sp.length>20&&r.sp.filter(s=>s.vx>0).length>r.sp.length*.8,String(r.sp.length));
check('Windstoß in Angriffsrichtung',r.gust>0);
const n1=r.sp.length;for(let i=0;i<200;i++){game.frame++;r.draw(g,game,0)}
check('Spritzer verschwinden wieder, Pfützen füllen sich',r.sp.length<n1&&r.pud.reduce((a,p)=>a+p.w,0)>w1);
// Pause (Frame steht still): nichts bewegt sich
const y0=r.d[0].y;r.draw(g,game,0);r.draw(g,game,0);check('Pause: Regen steht still',r.d[0].y===y0);
// Landung am Boden spritzt
const L=new Rain(),gm=mkGame(),F=gm.fighters[0];gm.frame=1;L.draw(g,gm,0);F.grounded=false;F.vy=12;gm.frame=2;L.draw(g,gm,0);F.grounded=true;F.vy=0;gm.frame=3;const s0=L.sp.length;L.draw(g,gm,0);
check('Landung: Wasser spritzt am Fuß',L.sp.length>s0);
console.log(fails?fails+' Test(s) fehlgeschlagen':'Wetter-Tests bestanden');process.exit(fails?1:0);
