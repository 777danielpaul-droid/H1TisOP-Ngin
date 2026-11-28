// Wetter-Auswahl (Optionen-Menü) + Regen-Effekt: Logik und Zeichnen ohne Browser (Attrappe für den Canvas-Kontext).
import{WEATHER_MODES,weatherAmt,weatherMode,weatherPick}from'../src/core/weather.js';
import{Rain}from'../src/render/rain.js';
import{Mist}from'../src/render/mist.js';
import{GROUND}from'../src/core/config.js';
let fails=0;const check=(n,ok,i='')=>{console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':'  '+i));if(!ok)fails++};

check('Modi: Blätter, Regen, Nebel, Kombinationen, Zufällig',WEATHER_MODES.join()==='leaves,rain,fog,both,rainfog,all,random');
check('Ungültiger/leerer Wert (erster Start) -> Alles',weatherMode('x')==='all'&&weatherMode(null)==='all');
const on=m=>{const p=weatherPick(m);return[p.leaves,p.rain,p.fog].map(Number).join('')};
check('Modi liefern die richtigen Effekte',on('leaves')==='100'&&on('rain')==='010'&&on('fog')==='001'&&on('both')==='110'&&on('rainfog')==='011'&&on('all')==='111');
const seen=new Set();for(const r of[.05,.2,.4,.6,.75,.95,.9999]){const p=weatherPick('random',()=>r);seen.add(p.leaves+'/'+p.rain+'/'+p.fog)}
check('random würfelt alle sechs Varianten',seen.size===6,[...seen].join());

// Attrappe: jeder Aufruf erlaubt, zählt Striche/Ellipsen
const mkG=()=>{const c={n:{stroke:0,fill:0}};return new Proxy(c,{get:(t,k)=>k==='n'?t.n:k==='stroke'||k==='fill'?()=>{t.n[k]++}:()=>{},set:()=>true})};
const mkGame=()=>{const mk=(x)=>({x,y:GROUND,vx:0,vy:0,facing:1,floor:GROUND,grounded:true,dead:0,move:null,moves:{},moveName:''});
 return{frame:0,fighters:[mk(300),mk(600)],camera:{x:480,y:270,z:1,toScreen:(x,y)=>[x-480+480,y-270+270]}}};
const r=new Rain(),game=mkGame(),g=mkG();
for(let i=0;i<120;i++){game.frame++;r.draw(g,game,0)}
check('Regen zeichnet (Tropfen + Pfützen)',g.n.stroke>0&&g.n.fill>0);
check('Tropfen werden begrenzt, Ringwellen entstehen',r.d.length>0&&r.d.length<=150&&r.rp.length<=70);

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
// Linsentropfen: entstehen, rollen mit Spur nach unten, verschwinden wieder, bleiben begrenzt
const T=new Rain(),tg=mkGame(),g3=mkG();let maxL=0,maxTr=0,seenL=false,gone=false;
for(let i=0;i<60*40;i++){tg.frame++;T.draw(g3,tg,0);maxL=Math.max(maxL,T.lens.length);maxTr=Math.max(maxTr,...T.lens.map(l=>l.tr.length),0);if(T.lens.length)seenL=true;else if(seenL)gone=true}
check('Linsentropfen entstehen (begrenzt)',seenL&&maxL<=T.lc+4,String(maxL));
check('Linsentropfen rollen nach unten und ziehen eine Spur',maxTr>5,String(maxTr));
check('Linsentropfen lösen sich wieder auf',gone||T.lens.every(l=>l.a<l.life));
const l0=T.lens.length;T.boom(1);check('Spezialattacke schlägt neue Linsentropfen an',T.lens.length>l0||l0>=T.lc+4);
const yy=T.lens.map(l=>l.y);T.draw(g3,tg,0);check('Pause: Linsentropfen stehen still',T.lens.every((l,i)=>l.y===yy[i]));
// Landung am Boden spritzt
const L=new Rain(),gm=mkGame(),F=gm.fighters[0];gm.frame=1;L.draw(g,gm,0);F.grounded=false;F.vy=12;gm.frame=2;L.draw(g,gm,0);F.grounded=true;F.vy=0;gm.frame=3;const s0=L.sp.length;L.draw(g,gm,0);
check('Landung: Wasser spritzt am Fuß',L.sp.length>s0);

check('Regler: 0..2, ungültig = 1',weatherAmt(1.5)===1.5&&weatherAmt(-1)===0&&weatherAmt(9)===2&&weatherAmt('x')===1&&weatherAmt('0')===0);
{const lo=new Rain(),hi=new Rain(),mg=mkGame(),gg=mkG();for(let i=0;i<30;i++){mg.frame++;lo.draw(gg,mg,0,.3);hi.draw(gg,mg,0,2)}
 check('Regenmenge: mehr Tropfen und größere Pfützen bei hohem Regler',hi.d.length>lo.d.length*3&&Math.max(...hi.pud.map(p=>p.w))>Math.max(...lo.pud.map(p=>p.w)),lo.d.length+' / '+hi.d.length);
 const ml=new Mist(),mh=new Mist();for(let i=0;i<5;i++){mg.frame++;ml.draw(gg,mg,0,.3);mh.draw(gg,mg,0,2)}check('Nebeldichte: mehr Bänke bei hohem Regler',mh.p.length>ml.p.length*3,ml.p.length+' / '+mh.p.length)}
// Nebel
const M=new Mist(),mg=mkGame(),g2=mkG();
for(let i=0;i<120;i++){mg.frame++;M.draw(g2,mg,0)}
check('Nebel zeichnet Bänke (begrenzt)',g2.n.fill>0&&M.p.length>0&&M.p.length<=24);
const vmax=()=>M.p.reduce((a,q)=>Math.max(a,Math.abs(q.vx)),0);
mg.fighters[0].move={};mg.fighters[0].moves={fb:{special:true}};mg.fighters[0].moveName='fb';mg.frame++;M.draw(g2,mg,0);
check('Spezialattacke: Nebel wird in Blickrichtung weggefegt',M.p.filter(q=>q.vx>200).length>=M.p.length*.8,String(vmax().toFixed(0)));
check('Spezialattacke: Nebel lichtet sich',M.clear>.9);
for(let i=0;i<300;i++){mg.frame++;M.draw(g2,mg,0)}
check('Nebel zieht wieder zu und beruhigt sich',M.clear===0&&vmax()<60);
const N=new Mist(),ng=mkGame();for(let i=0;i<5;i++){ng.frame++;N.draw(g2,ng,0)}
ng.fighters[0].vx=5;for(let i=0;i<30;i++){ng.frame++;N.draw(g2,ng,0)}
check('Läufer schiebt Nebel mit',N.p.some(q=>q.vx>8),N.p.map(q=>q.vx.toFixed(1)).join(' '));
const px=N.p[0].x;N.draw(g2,ng,0);check('Pause: Nebel steht still',N.p[0].x===px);
const Z=new Mist(),zg=mkGame(),zf=zg.fighters[0];zg.frame=1;Z.draw(g2,zg,0);zf.grounded=false;zf.vy=12;zg.frame=2;Z.draw(g2,zg,0);zf.grounded=true;zf.vy=0;zg.frame=3;Z.draw(g2,zg,0);
check('Landung wirbelt Nebel nach oben',Z.p.some(q=>q.vy<-10||q.oy<-0.5));
console.log(fails?fails+' Test(s) fehlgeschlagen':'Wetter-Tests bestanden');process.exit(fails?1:0);
