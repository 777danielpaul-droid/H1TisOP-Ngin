import{drawSpriteFighter,groundShadow}from'./sprites.js';
import{EFFECT}from'../core/config.js';
// Vektor-Skelett-Figuren (Tiger/Wolf). Pose = Winkel-Vektor, Animationen = Keyframes. Kein Asset-Laden nötig.
const PI=Math.PI;
export const PAL={
 tiger:{fur:'#2f6bff',dark:'#1a3fb8',light:'#7fb0ff',belly:'#eef4ff',stripe:'#0a1a5c',pants:'#2257ee',pantsD:'#173fb0',sash:'#3a6bff',out:'#050d33',eye:'#7ff6ff',glow:'#3fe0ff',stripes:1,wolf:0},
 wolf:{fur:'#6d6761',dark:'#3b3633',light:'#a39b92',belly:'#8e857b',stripe:'#25201d',pants:'#7a5430',pantsD:'#4f341a',sash:'#241c26',out:'#100b0b',eye:'#ff2a3a',glow:'#ff3a55',stripes:0,wolf:1}};
// Pose: [Torso-Neigung, Kopf, Hinterarm(ob,unt), Vorderarm(ob,unt), Hinterbein(Oberschenkel,Schienbein), Vorderbein, X-Versatz, Mund, Hüfthöhe(0=auto)]
// Winkel: 0 = nach unten, +π/2 = nach vorn.
const S=(tl,hd,ba1,ba2,fa1,fa2,bt,bs,ft,fs,hx=0,mo=0,hy=0)=>[tl,hd,ba1,ba2,fa1,fa2,bt,bs,ft,fs,hx,mo,hy];
const ST1=S(.12,0,.35,2.1,.75,2.35,-.55,-.15,.7,.1),ST2=S(.18,.05,.4,2.15,.8,2.4,-.62,-.2,.76,.16);
const CR=S(.28,.08,.5,2.2,.95,2.4,-1.15,.35,1.15,-.25),KOP=S(-1.45,-.3,-1.2,-1,-.9,-.8,1.2,1.55,1.35,1.55,0,1,-22),HITP=S(-.35,-.45,-.6,.5,.1,1,-.75,-.35,.35,.2,-14,1);
export const A={
 idle:{d:1.2,loop:1,k:[[0,ST1],[.6,ST2],[1.2,ST1]]},
 walk:{d:.64,loop:1,k:[[0,S(.12,0,.35,2.1,.75,2.35,-.65,-.2,.7,.15)],[.16,S(.14,0,.4,2.1,.7,2.3,.1,-.6,-.1,-.1)],[.32,S(.12,0,.35,2.1,.75,2.35,.65,.15,-.65,-.2)],[.48,S(.14,0,.4,2.1,.7,2.3,-.1,-.1,.1,-.6)],[.64,S(.12,0,.35,2.1,.75,2.35,-.65,-.2,.7,.15)]]},
 crouch:{d:1,k:[[0,CR]]},
 air:{d:1,k:[[0,S(.1,0,1,2.6,.9,2.5,.5,-.9,.9,-.4)]]},
 dash:{d:1,k:[[0,S(.5,.1,-.4,1.2,.5,2.4,-.9,-.5,.9,-.3)]]},
 airdash:{d:1,k:[[0,S(.9,.1,.4,1.6,1.1,1.8,.5,-.9,-.2,-1)]]},
 punch:{d:.4,k:[[0,ST1],[.08,S(0,0,.35,2.1,.3,2.7,-.55,-.15,.7,.1,-6)],[.14,S(.32,.05,.2,2,1.52,1.6,-.7,-.15,.75,.1,14,1)],[.26,S(.32,.05,.2,2,1.52,1.6,-.7,-.15,.75,.1,14,1)],[.4,ST1]]},
 kick:{d:.6,k:[[0,ST1],[.14,S(-.05,0,.4,2.1,.7,2.3,-.45,-.1,1.35,.2,-4)],[.24,S(-.2,-.02,.4,2.1,.7,2.3,-.45,-.1,1.5,1.45,8,1)],[.36,S(-.2,-.02,.4,2.1,.7,2.3,-.45,-.1,1.5,1.45,8,1)],[.48,S(-.05,0,.4,2.1,.7,2.3,-.45,-.1,1.35,.2,-4)],[.6,ST1]]},
 heavy:{d:.62,k:[[0,ST1],[.2,S(-.15,-.05,.3,2.2,-.7,.5,-.6,-.1,.5,.05,-12)],[.28,S(.4,.08,.3,2.1,1.5,1.55,-.85,-.1,.95,.3,24,1)],[.42,S(.4,.08,.3,2.1,1.5,1.55,-.85,-.1,.95,.3,24,1)],[.62,ST1]]},
 upper:{d:.6,k:[[0,ST1],[.14,S(.2,.05,.4,2.1,-.1,.6,-.9,.1,1,-.3,-4)],[.24,S(.05,-.1,.4,2.1,2.75,2.9,-.1,-.1,.15,.05,14,1)],[.38,S(.05,-.1,.4,2.1,2.75,2.9,-.1,-.1,.15,.05,14,1)],[.6,ST1]]},
 special:{d:.85,k:[[0,ST1],[.25,S(0,0,-.2,1.4,.2,1.5,-.7,-.1,.8,.1,-8)],[.38,S(.28,.05,1.5,1.55,1.5,1.55,-.75,-.15,.8,.1,12,1)],[.6,S(.28,.05,1.5,1.55,1.5,1.55,-.75,-.15,.8,.1,12,1)],[.85,ST1]]},
 cpunch:{d:.36,k:[[0,CR],[.08,S(.32,.08,.4,2.1,.4,2.5,-1.15,.35,1.15,-.25,-4)],[.14,S(.45,.1,.4,2.1,1.55,1.6,-1.15,.35,1.15,-.25,10,1)],[.26,S(.45,.1,.4,2.1,1.55,1.6,-1.15,.35,1.15,-.25,10,1)],[.36,CR]]},
 ckick:{d:.5,k:[[0,CR],[.1,S(.35,.08,.5,2.2,.95,2.4,-1,1.4,1.15,.2,-2,0,-60)],[.2,S(.55,.1,.5,2.2,.95,2.4,-1,1.4,1.35,1.5,10,1,-32)],[.34,S(.55,.1,.5,2.2,.95,2.4,-1,1.4,1.35,1.5,10,1,-32)],[.5,CR]]},
 jpunch:{d:.35,k:[[0,S(.1,0,1,2.6,.5,2.9,.5,-.9,.9,-.4)],[.1,S(.3,.05,.5,2.4,1.5,1.6,.3,-.7,.8,-.4,6,1)],[.35,S(.3,.05,.5,2.4,1.5,1.6,.3,-.7,.8,-.4,6,1)]]},
 jkick:{d:.4,k:[[0,S(.1,0,1,2.6,.9,2.5,.5,-.9,.9,-.4)],[.12,S(-.1,0,.5,2.2,.9,2.4,.3,-.9,1.45,1.4,6,1)],[.4,S(-.1,0,.5,2.2,.9,2.4,.3,-.9,1.45,1.4,6,1)]]},
 jheavy:{d:.5,k:[[0,S(0,0,2.5,2.8,2.6,2.8,.6,-.8,.9,-.5)],[.15,S(.6,.1,1.2,1,1.1,.9,.6,-.8,.9,-.3,8,1)],[.5,S(.6,.1,1.2,1,1.1,.9,.6,-.8,.9,-.3,8,1)]]},
 hit:{d:.4,k:[[0,HITP],[.4,S(-.2,-.25,-.4,.7,.2,1.2,-.7,-.3,.4,.15,-8,1)]]},
 airhit:{d:1,k:[[0,S(-.5,-.5,-.7,.6,.2,1.2,.3,-.6,.6,-.8,-6,1)]]},
 block:{d:1,k:[[0,S(.05,.1,.9,2.8,1.05,2.9,-.5,-.1,.6,.1)]]},
 cblock:{d:1,k:[[0,S(.3,.1,.9,2.8,1.05,2.9,-1.15,.35,1.15,-.25)]]},
 kd:{d:1,k:[[0,KOP]]},
 wakeup:{d:.25,k:[[0,KOP],[.25,ST1]]},
 win:{d:1,loop:1,k:[[0,S(-.05,-.1,2.7,2.8,2.6,2.7,-.5,-.1,.6,.1,0,1)],[.5,S(-.1,-.15,2.55,2.7,2.8,2.9,-.55,-.12,.65,.12,0,1)],[1,S(-.05,-.1,2.7,2.8,2.6,2.7,-.5,-.1,.6,.1,0,1)]]}};
function poseOf(f){const a=A[f.anim]||A.idle;const t=a.loop?(f.sf/60)%a.d:Math.min(f.animU,1)*a.d;const k=a.k;if(k.length===1)return k[0][1].slice();
 let i=0;while(i<k.length-2&&t>k[i+1][0])i++;const[t0,p0]=k[i],[t1,p1]=k[i+1];let u=Math.max(0,Math.min(1,(t-t0)/(t1-t0||1)));u=u*u*(3-2*u);return p0.map((v,j)=>v+(p1[j]-v)*u)}
const rot=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
function chain(g,x,y,segs,col,out){const p=[[x,y]];for(const[a,l]of segs){const q=p[p.length-1];p.push([q[0]+Math.sin(a)*l,q[1]+Math.cos(a)*l])}
 g.lineCap='round';g.lineJoin='round';for(const pass of[0,1]){g.strokeStyle=pass?col:out;segs.forEach((s,i)=>{g.lineWidth=s[2]+(pass?0:5);g.beginPath();g.moveTo(...p[i]);g.lineTo(...p[i+1]);g.stroke()})}return p}
function stripesOn(g,p0,p1,th,C){if(!C.stripes)return;g.strokeStyle=C.stripe;g.lineWidth=3;for(const u of[.3,.55,.8]){const x=p0[0]+(p1[0]-p0[0])*u,y=p0[1]+(p1[1]-p0[1])*u,dx=p1[0]-p0[0],dy=p1[1]-p0[1],l=Math.hypot(dx,dy)||1,px=-dy/l*th*.42,py=dx/l*th*.42;g.beginPath();g.moveTo(x-px,y-py);g.lineTo(x+px,y+py);g.stroke()}}
function arm(g,sx,sy,a1,a2,C,far){const col=far?C.dark:C.fur;const p=chain(g,sx,sy,[[a1,38,22],[a2,34,18]],col,C.out);stripesOn(g,p[0],p[1],22,C);stripesOn(g,p[1],p[2],18,C);
 const dx=Math.sin(a2),dy=Math.cos(a2);g.fillStyle='#e9eef8';g.strokeStyle=C.out;g.lineWidth=2;g.beginPath();g.arc(p[2][0]-dx*4,p[2][1]-dy*4,9.5,0,7);g.fill();g.stroke();
 const fx=p[2][0]+dx*9,fy=p[2][1]+dy*9;g.fillStyle=col;g.lineWidth=3;g.beginPath();g.arc(fx,fy,13,0,7);g.fill();g.stroke();
 g.strokeStyle=C.out;g.lineWidth=1.5;for(const o of[-5,0,5]){g.beginPath();g.moveTo(fx+dy*o*.9+dx*2,fy-dx*o*.9+dy*2);g.lineTo(fx+dy*o*.9+dx*10,fy-dx*o*.9+dy*10);g.stroke()}return[fx,fy]}
function leg(g,hx,hy,th,sh,C,far){const pc=far?C.pantsD:C.pants;const p=chain(g,hx,hy,[[th,46,36],[sh,44,29]],pc,C.out);
 g.fillStyle='#e9eef8';g.strokeStyle=C.out;g.lineWidth=2;g.beginPath();g.arc(p[2][0],p[2][1],11,0,7);g.fill();g.stroke();
 const fa=sh+PI/2,q=chain(g,p[2][0],p[2][1]+3,[[fa,26,16]],far?C.dark:C.fur,C.out);
 g.strokeStyle='#f3f3f3';g.lineWidth=2.2;for(const o of[-5,0,5]){g.beginPath();g.moveTo(q[1][0]+Math.sin(fa)*3-Math.cos(fa)*o*.5,q[1][1]+Math.cos(fa)*3+Math.sin(fa)*o*.5);g.lineTo(q[1][0]+Math.sin(fa)*9-Math.cos(fa)*o*.5,q[1][1]+Math.cos(fa)*9+Math.sin(fa)*o*.5);g.stroke()}}
function tail(g,C,t,sway){let x=-10,y=-8;const pts=[[x,y]];for(let i=0;i<8;i++){const a=PI+.1+i*.19+Math.sin(t*3-i*.7)*.12+sway;x+=Math.cos(a)*(C.wolf?14:15);y+=Math.sin(a)*(C.wolf?14:15);pts.push([x,y])}
 g.lineCap='round';for(const pass of[0,1])for(let i=0;i<8;i++){g.strokeStyle=pass?((C.stripes&&i%2)?C.stripe:C.fur):C.out;g.lineWidth=(C.wolf?16:12)-i*.7+(pass?0:4);g.beginPath();g.moveTo(...pts[i]);g.lineTo(...pts[i+1]);g.stroke()}}
function torso(g,C){const gr=g.createLinearGradient(-32,0,32,0);gr.addColorStop(0,C.dark);gr.addColorStop(.45,C.fur);gr.addColorStop(1,C.dark);g.fillStyle=gr;g.strokeStyle=C.out;g.lineWidth=4;
 g.beginPath();g.moveTo(-16,2);g.bezierCurveTo(-20,-16,-36,-26,-32,-50);g.quadraticCurveTo(0,-68,32,-50);g.bezierCurveTo(36,-26,20,-16,16,2);g.closePath();g.fill();g.stroke();
 g.fillStyle=C.belly;g.globalAlpha=C.wolf?.45:.95;g.beginPath();g.ellipse(4,-30,15,25,0,0,7);g.fill();g.globalAlpha=1;
 g.strokeStyle=C.out;g.lineWidth=2;g.globalAlpha=.55;for(const x of[-10,12]){g.beginPath();g.ellipse(x,-40,13,9,0,0,PI);g.stroke()}for(const y of[-27,-18,-9]){g.beginPath();g.moveTo(-8,y);g.lineTo(16,y);g.stroke()}g.beginPath();g.moveTo(4,-31);g.lineTo(4,-3);g.stroke();g.globalAlpha=1;
 if(C.stripes){g.strokeStyle=C.stripe;g.lineWidth=3.2;for(let i=0;i<4;i++){g.beginPath();g.moveTo(-31+i*2,-46+i*10);g.lineTo(-19+i*2,-41+i*10);g.stroke();g.beginPath();g.moveTo(33-i*2,-46+i*10);g.lineTo(22-i*2,-41+i*10);g.stroke()}}
 else{g.strokeStyle=C.stripe;g.lineWidth=2.5;g.beginPath();g.moveTo(-6,-52);g.lineTo(6,-36);g.stroke()}
 for(const[x,y,r]of[[-19,-48,14],[23,-48,15]]){g.fillStyle=C.fur;g.strokeStyle=C.out;g.lineWidth=3;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.stroke()}}
function head(g,C,mouth,dead){g.lineJoin='round';
 if(C.wolf){g.fillStyle=C.dark;g.strokeStyle=C.out;g.lineWidth=3;g.beginPath();g.moveTo(-16,-40);for(let i=0;i<6;i++){g.lineTo(-30+i*3,-34+i*7);g.lineTo(-20+i*3,-30+i*7)}g.lineTo(-4,-6);g.lineTo(10,-30);g.closePath();g.fill();g.stroke()}
 g.fillStyle=C.fur;g.strokeStyle=C.out;g.lineWidth=3;g.beginPath();if(C.wolf){g.moveTo(-14,-34);g.lineTo(-8,-66);g.lineTo(8,-38)}else{g.arc(-7,-41,10,0,7)}g.fill();g.stroke();
 g.fillStyle=C.wolf?'#3a2220':'#e8f0ff';g.beginPath();if(C.wolf){g.moveTo(-10,-38);g.lineTo(-7,-56);g.lineTo(3,-40)}else{g.arc(-7,-41,5,0,7)}g.fill();
 g.save();g.translate(14,-8);g.rotate(mouth*.45);g.fillStyle=C.wolf?C.dark:C.light;g.strokeStyle=C.out;g.beginPath();g.ellipse(C.wolf?12:8,3,C.wolf?17:13,5.5,0,0,7);g.fill();g.stroke();
 if(mouth>.3){g.fillStyle='#fff';for(const x of C.wolf?[6,14,22]:[4,12]){g.beginPath();g.moveTo(x,-1);g.lineTo(x+3,-7);g.lineTo(x+6,-1);g.fill()}g.fillStyle='#a01830';g.fillRect(2,-1,C.wolf?20:14,2)}g.restore();
 g.fillStyle=C.fur;g.strokeStyle=C.out;g.beginPath();g.ellipse(4,-22,22,20,0,0,7);g.fill();g.stroke();
 if(C.stripes){g.fillStyle=C.belly;g.beginPath();g.ellipse(10,-11,14,9,0,0,7);g.fill();g.strokeStyle=C.stripe;g.lineWidth=3;for(const[a,b,c,d]of[[-2,-40,2,-31],[6,-41,8,-32],[-10,-26,-3,-24],[-10,-17,-2,-17]]){g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.stroke()}g.strokeStyle=C.out}
 g.fillStyle=C.wolf?C.light:C.belly;g.lineWidth=3;g.beginPath();g.ellipse(C.wolf?27:24,-16,C.wolf?22:15,C.wolf?9:10,0,0,7);g.fill();g.stroke();
 g.fillStyle='#10101a';g.beginPath();g.ellipse(C.wolf?47:37,-20,4.5,3.5,0,0,7);g.fill();
 if(C.stripes){g.strokeStyle='#dfe8ff';g.lineWidth=1.2;for(const o of[-3,2,7]){g.beginPath();g.moveTo(30,-12+o);g.lineTo(50,-16+o*1.6);g.stroke()}}
 if(dead){g.strokeStyle=C.out;g.lineWidth=3;g.beginPath();g.moveTo(9,-31);g.lineTo(19,-23);g.moveTo(19,-31);g.lineTo(9,-23);g.stroke()}
 else{g.fillStyle=C.eye;g.beginPath();g.moveTo(7,-30);g.lineTo(21,-26);g.lineTo(9,-23);g.closePath();g.fill();g.strokeStyle=C.out;g.lineWidth=4;g.beginPath();g.moveTo(3,-36);g.lineTo(23,-27);g.stroke()}
 if(C.wolf){g.strokeStyle='#b52a3a';g.lineWidth=1.8;g.beginPath();g.moveTo(2,-40);g.lineTo(12,-18);g.stroke()}}
// Leuchten an der Faust + Hyper-Beam (gemeinsam für Vektor- und Sprite-Figuren; im lokalen, nach vorn gespiegelten Raum)
export function attackFx(g,f,fist,glow){const m=f.move;
 if(f.state==='attack'&&m&&SP_FX[m.fx])SP_FX[m.fx](g,f,m,glow);   // Spezial-Effekte LEON/URSUS/A1LIEN (Block „Spezial-Effekte“ weiter unten)
 if(f.state==='attack'&&m&&m.glow){
  const act=f.mf>=m.su-3&&f.mf<=m.su+m.ac+4,charge=m.proj&&f.mf>4&&f.mf<m.su+8;
  g.save();g.globalCompositeOperation='lighter';
  if(act||charge){const gr=g.createRadialGradient(fist[0],fist[1],2,fist[0],fist[1],40);gr.addColorStop(0,'#fff');gr.addColorStop(.35,glow);gr.addColorStop(1,'#0000');g.fillStyle=gr;g.beginPath();g.arc(fist[0],fist[1],40,0,7);g.fill()}
  if(m.beam&&f.mf>=m.su&&f.mf<m.su+m.ac){const pulse=.75+Math.sin(f.mf*1.3)*.25,h=44*pulse,x0=fist[0],BL=m.box?m.box[2]:560;
   const bg=g.createLinearGradient(0,fist[1]-h,0,fist[1]+h);bg.addColorStop(0,'#0000');bg.addColorStop(.35,glow);bg.addColorStop(.5,'#fff');bg.addColorStop(.65,glow);bg.addColorStop(1,'#0000');
   g.fillStyle=bg;g.fillRect(x0,fist[1]-h,BL,h*2);
   const eg=g.createLinearGradient(x0+BL-180,0,x0+BL,0);eg.addColorStop(0,'#fff0');eg.addColorStop(1,'#000f');g.globalCompositeOperation='destination-out';g.fillStyle=eg;g.fillRect(x0+BL-180,fist[1]-h-2,180,h*2+4)}
  g.restore()}
 if(f.state==='attack'&&m&&m.fx==='tails')tailsFx(g,f,m,glow);else if(f.state==='attack'&&m&&m.fx==='breath')breathFx(g,f,m);else if(f.state==='attack'&&m&&m.fx==='bolt')boltFx(g,f,m);else if(f.state==='attack'&&m&&m.fx==='swarm')swarmFx(g,f,m);else if(f.state==='attack'&&m&&m.super&&!m.fx)superFx(g,f,m,glow)}
// Gemeinsamer Hyper-Fallback für Figuren ohne eigenen FX-Zweig (z. B. Leon/Ursus):
// Die vorhandene Sprite-Pose bleibt sichtbar, bekommt aber dieselbe visuelle Wucht wie die übrigen Hypers.
function superFx(g,f,m,glow){const t=f.mf,su=m.su,end=su+m.ac;if(t<su-14||t>end+14)return;
 const grow=Math.min(1,Math.max(0,(t-su+14)/14)),fade=t>end?Math.max(0,1-(t-end)/14):1,pulse=.82+.18*Math.sin(t*.72),reach=Math.max(180,(m.box&&m.box[2]||300)*.58);
 g.save();g.globalCompositeOperation='lighter';
 if(t<su+8){const a=fade*(t<su?Math.min(1,grow):1)*.42,rx=54+24*pulse,ry=86+30*pulse;
  const ag=g.createRadialGradient(0,-86,8,0,-86,ry*1.35);ag.addColorStop(0,'#fff');ag.addColorStop(.28,glow);ag.addColorStop(1,'#0000');g.globalAlpha=a;g.fillStyle=ag;g.beginPath();g.ellipse(0,-86,rx,ry,0,0,7);g.fill()}
 if(t>=su-2){const a=fade*Math.min(1,(t-su+2)/8),cx=34,cy=-88;
  for(const[o,w,al]of[[0,5,.32],[10,2.4,.7],[20,1,.95]]){g.globalAlpha=a*al;g.strokeStyle=glow;g.lineWidth=w;g.beginPath();g.arc(cx,cy,34+o+pulse*4,-.72,.72);g.stroke()}
  const beam=g.createLinearGradient(cx,0,cx+reach,0);beam.addColorStop(0,'#ffffff');beam.addColorStop(.12,glow);beam.addColorStop(1,'#0000');g.globalAlpha=a*.38;g.fillStyle=beam;g.beginPath();g.moveTo(cx,cy-18);g.lineTo(cx+reach,cy-6);g.lineTo(cx+reach,cy+6);g.lineTo(cx,cy+18);g.closePath();g.fill();
  g.globalAlpha=a*.6;g.strokeStyle='#fff';g.lineWidth=1.2;g.beginPath();g.arc(0,0,26+((t-su)*3%28),0,Math.PI);g.stroke()}
 g.restore()}
// ======================================================================================================================
// Spezial-Effekte für LEON (Solar), URSUS (Erdbeben) und A1LIEN (Blut): gut sichtbare Klauenbögen, Schockwellen und Hyper-Kulissen.
// Gezeichnet über attackFx() im lokalen Raum der Figur (Ursprung = Fußmitte, nach vorn = +x, nach oben = -y); die Moves setzen dafür
// m.fx = 'cSlash' | 'cRise' | 'cSpin' | 'cDive' | 'cThrust' | 'cOver' | 'cMuzzle' | 'cSolar' | 'cQuake' | 'cBlood' (movesets.js).
// Projektil-Looks 'solar' | 'quake' | 'bloodclaw' kommen über PROJ_LOOKS in Renderer.look(). Alles additiv und deterministisch (kein Math.random).
// ======================================================================================================================
const SPX_PAL={leon:{a:'#ffb43a',b:'#fff3c2',c:'#ff6a00'},bear:{a:'#e8944e',b:'#ffe6c4',c:'#8a3f12'},cyberdemon:{a:'#ff3b4e',b:'#ffd0d4',c:'#8a0018'}};
const spxPal=(f,glow)=>SPX_PAL[String(f&&f.char&&f.char.id||'').replace('Boss','')]||{a:glow||'#fff',b:'#fff',c:glow||'#fff'};
const spxH=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const spxEase=u=>1-Math.pow(1-Math.min(1,Math.max(0,u)),3);
// Klauenbogen (Halbmond): Außenbogen r, Innenbogen verjüngt (w = größte Dicke), Spitzen an den Enden, weißer Glanzkern
function spxCres(g,cx,cy,r,a0,a1,w,P,al){if(al<=.01||Math.abs(a1-a0)<.03)return;const am=(a0+a1)/2,ri=Math.max(2,r-w),ccw=a1<a0;
 g.save();g.globalCompositeOperation='source-over';g.globalAlpha=Math.min(1,al*.95);g.beginPath();g.arc(cx,cy,r,a0,a1,ccw);g.quadraticCurveTo(cx+Math.cos(am)*ri,cy+Math.sin(am)*ri,cx+Math.cos(a0)*r,cy+Math.sin(a0)*r);g.closePath();
 const gr=g.createRadialGradient(cx,cy,ri*.8,cx,cy,r);gr.addColorStop(0,P.c);gr.addColorStop(.55,P.a);gr.addColorStop(1,P.b);g.fillStyle=gr;g.shadowColor=P.a;g.shadowBlur=22;g.fill();
 g.shadowBlur=0;g.strokeStyle=P.b;g.lineWidth=2;g.beginPath();g.arc(cx,cy,r-w*.1,a0+(a1-a0)*.1,a1-(a1-a0)*.1,ccw);g.stroke();g.restore()}
function spxRing(g,x,y,rx,ry,col,al,lw){if(al<=.01)return;g.save();g.globalAlpha=Math.min(1,al);g.strokeStyle=col;g.lineWidth=lw||3;g.shadowColor=col;g.shadowBlur=14;g.beginPath();g.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,7);g.stroke();g.restore()}
function spxGlow(g,x,y,r,col,al){if(al<=.01||r<2)return;const gr=g.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,'#fff');gr.addColorStop(.3,col);gr.addColorStop(1,'#0000');g.save();g.globalAlpha=Math.min(1,al);g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.restore()}
// verjüngter Streifen (Tempo-/Klauenspur) von (x0,y0) nach (x1,y1), Breite w in der Mitte, optional gebogen
function spxStreak(g,x0,y0,x1,y1,w,P,al,curve){if(al<=.01)return;const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,mx=(x0+x1)/2+nx*(curve||0),my=(y0+y1)/2+ny*(curve||0);
 g.save();g.globalAlpha=Math.min(1,al);const gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,P.c+'00');gr.addColorStop(.55,P.a);gr.addColorStop(1,P.b);g.fillStyle=gr;g.shadowColor=P.a;g.shadowBlur=16;
 g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo(mx+nx*w,my+ny*w,x1,y1);g.quadraticCurveTo(mx-nx*w,my-ny*w,x0,y0);g.fill();
 g.shadowBlur=0;g.strokeStyle='#fff';g.globalAlpha=Math.min(1,al)*.9;g.lineWidth=1.6;g.beginPath();g.moveTo(x0+dx*.3,y0+dy*.3);g.quadraticCurveTo(mx,my,x1,y1);g.stroke();g.restore()}
const spxWin=(f,m,pre,post)=>{const su=m.su,end=su+(m.ac||1),t=f.mf;return t<su-pre||t>end+post?null:{t,su,end,u:(t-su)/Math.max(4,m.ac||1)}};
// Klauenhiebe (Rush / Pranken-Hagel / Klauen-Sturm / Kern-Ansturm): pro Treffer ein breiter, gut sichtbarer Schlagbogen vor der Figur
function spxSlashFx(g,f,m,glow){const P=spxPal(f,glow),w=spxWin(f,m,3,14);if(!w)return;const n=Math.max(1,m.multi||1),span=Math.max(6,m.ac||6),per=n>1?span/n:span;
 g.save();g.globalCompositeOperation='lighter';
 for(let i=0;i<n;i++){const u=(w.t-(w.su+i*per-1))/11;if(u<0||u>1.15)continue;const dir=i%2?-1:1,sw=spxEase(u*1.5)*2.6,a0=-1.35*dir+(i%3-1)*.5,head=a0+dir*sw,tail=a0+dir*Math.max(0,sw-1.6),cx=54+i*8,cy=-98+(i%2?16:-8);
  spxCres(g,cx,cy,122,tail,head,36,P,(1.15-u)*1.5);if(u<.6)spxGlow(g,cx+Math.cos(head)*122,cy+Math.sin(head)*122,36,P.b,(1-u/.6)*.8)}
 g.restore()}
// Aufwärtshaken (Löwen-Kick / Bärenhieb / Höllenfahrt): Bogen von unten vorn über den Kopf + Energiesäule + aufsteigende Funken
function spxRiseFx(g,f,m,glow){const P=spxPal(f,glow),w=spxWin(f,m,3,16);if(!w)return;const al=w.t>w.end?Math.max(0,1-(w.t-w.end)/16):1,u=(w.t-w.su)/Math.max(7,(m.ac||8)+3),sw=spxEase(u*1.25),a0=1.3,head=a0-3.7*sw,tail=a0-3.7*Math.max(0,sw-.62);
 g.save();g.globalCompositeOperation='lighter';
 const cg=g.createLinearGradient(0,0,0,-250);cg.addColorStop(0,P.a);cg.addColorStop(1,P.c+'00');g.globalAlpha=.34*al;g.fillStyle=cg;g.fillRect(14,-250,76,250);
 spxCres(g,30,-100,128,tail,head,46,P,al*1.3);spxGlow(g,30+Math.cos(head)*128,-100+Math.sin(head)*128,44,P.b,.8*al);
 for(let i=0;i<9;i++){const k=((w.t*.07+spxH(i)*3)%1),x=26+(spxH(i*3.3)-.5)*90,y=-k*250;spxGlow(g,x,y,10+spxH(i*5)*8,P.b,(1-k)*.9*al)}
 spxRing(g,38,-3,40+u*60,10+u*10,P.a,.7*al,3);g.restore()}
// Rundum-Hieb (Mähnen-Feger / Wirbel-Klaue / Stachelschlag): drei kreisende Bögen um die Figur + Bodenring; A1LIEN bekommt Stacheln
function spxSpinFx(g,f,m,glow){const P=spxPal(f,glow),w=spxWin(f,m,4,14);if(!w)return;const id=String(f.char&&f.char.id||''),al=(w.t<w.su?(w.t-w.su+4)/4:w.t>w.end?Math.max(0,1-(w.t-w.end)/14):1);
 g.save();g.globalCompositeOperation='lighter';
 if(/cyberdemon/.test(id)){for(let i=0;i<10;i++){const a=w.t*.5+i*.628,r0=58,r1=128+(i%2)*26,c=Math.cos(a),s=Math.sin(a),px=-s*9,py=c*9*.8;g.globalAlpha=al*.9;g.fillStyle=i%2?P.a:P.b;g.shadowColor=P.a;g.shadowBlur=12;
   g.beginPath();g.moveTo(c*r0+px,-96+s*r0*.8+py);g.lineTo(c*r1,-96+s*r1*.8);g.lineTo(c*r0-px,-96+s*r0*.8-py);g.closePath();g.fill()}}
 for(let k=0;k<3;k++){const a=w.t*.62+k*2.094;spxCres(g,0,-96,112,a,a+1.55,28,P,al)}
 spxRing(g,0,-96,126,92,P.b,.55*al,3);spxRing(g,0,-4,132,20,P.a,.6*al,4);
 if(/bear/.test(id))for(let i=0;i<6;i++){const a=i*1.047+w.t*.2;spxGlow(g,Math.cos(a)*118,-6+Math.sin(a)*12,26,P.c,.5*al)}
 g.restore()}
// Sturzangriff (Meteor-Tritt / Body-Slam / Sturzklaue): Kometenschweif gegen die Flugrichtung + Glut am Aufprallpunkt
function spxDiveFx(g,f,m,glow){if(f.grounded)return;const P=spxPal(f,glow),t=f.mf;if(t<m.su-2)return;const v=m.dive||{vx:3,vy:16},L=Math.hypot(v.vx,v.vy)||1,dx=v.vx/L,dy=v.vy/L,al=Math.min(1,(t-m.su+3)/6),cy=-88;
 g.save();g.globalCompositeOperation='lighter';
 spxStreak(g,-dx*250,cy-dy*250,dx*14,cy+dy*14,40,P,al*.95,0);
 for(let i=-2;i<=2;i++){if(!i)continue;const o=i*20;spxStreak(g,-dx*170-dy*o,cy-dy*170+dx*o,-dx*30-dy*o*.7,cy-dy*30+dx*o*.7,9,P,al*.7,0)}
 spxGlow(g,dx*46,cy+dy*46,84,P.b,.8*al);spxRing(g,dx*34,cy+dy*34,62,40,P.a,.55*al,3);g.restore()}
// Vorstoß (6M): schneller, spitzer Stoßstreifen nach vorn mit Druckring an der Spitze
function spxThrustFx(g,f,m,glow){const P=spxPal(f,glow),w=spxWin(f,m,2,10);if(!w)return;const e=spxEase((w.t-w.su+2)/6),al=w.t>w.end?Math.max(0,1-(w.t-w.end)/10):1,L=(m.box?m.box[0]+m.box[2]:120)*1.15,y=m.box?m.box[1]+m.box[3]/2:-90;
 g.save();g.globalCompositeOperation='lighter';spxStreak(g,10,y,10+L*e,y,24,P,al,0);spxStreak(g,20,y-16,20+L*e*.8,y-26,8,P,al*.6,6);spxStreak(g,20,y+16,20+L*e*.8,y+24,8,P,al*.6,-6);
 spxGlow(g,10+L*e,y,46,P.b,.85*al);spxRing(g,10+L*e,y,12+e*26,26+e*20,P.a,.7*al,3);g.restore()}
// Überkopf-Hieb (6H): großer Bogen von oben nach vorn unten + Aufschlag-Blitz
function spxOverFx(g,f,m,glow){const P=spxPal(f,glow),w=spxWin(f,m,3,16);if(!w)return;const al=w.t>w.end?Math.max(0,1-(w.t-w.end)/16):1,sw=spxEase((w.t-w.su+3)/9),a0=-2.05,head=a0+2.7*sw,tail=a0+2.7*Math.max(0,sw-.6);
 g.save();g.globalCompositeOperation='lighter';spxCres(g,30,-120,138,tail,head,48,P,al*1.3);
 if(sw>.7){const k=(sw-.7)/.3;spxGlow(g,30+Math.cos(head)*138,-120+Math.sin(head)*138,70*k,P.b,.9*al);spxRing(g,30+Math.cos(head)*138,-40,30+k*70,14+k*18,P.a,.8*al,4)}g.restore()}
// Mündungsblitz + Aufladen bei Projektil-Specials (fireball)
function spxMuzzleFx(g,f,m,glow){const d=m.proj?[].concat(m.proj)[0]:null;if(!d)return;const P=spxPal(f,glow),t=f.mf,fr=d.frame,y=d.y||-96;if(t<fr-9||t>fr+9)return;
 g.save();g.globalCompositeOperation='lighter';
 if(t<fr){const k=(t-fr+9)/9;spxGlow(g,64,y,24+k*40,P.a,.5+k*.4);spxRing(g,64,y,60-k*40,60-k*40,P.b,k*.8,3)}
 else{const k=(t-fr)/9;spxGlow(g,74,y,70*(1-k*.4),P.b,(1-k)*.95);spxRing(g,74,y,20+k*80,20+k*80,P.a,(1-k)*.9,4);
  for(let i=0;i<8;i++){const a=i*.785+spxH(i)*.4,r=24+k*90;spxGlow(g,74+Math.cos(a)*r,y+Math.sin(a)*r,9,P.b,(1-k)*.9)}}g.restore()}
// ---- HYPER-Kulissen ----
// LEON · Solar-Inferno: Sonne mit Strahlenkranz, goldener Klauenhagel über die ganze Trefferbox, Schockwellenringe nach vorn
function spxSolarFx(g,f,m,glow){const P=spxPal(f,glow),w=spxWin(f,m,16,22);if(!w)return;const grow=Math.min(1,(w.t-w.su+16)/16),fade=w.t>w.end?Math.max(0,1-(w.t-w.end)/22):1,al=grow*fade,L=m.box?m.box[2]:520,R=104+14*Math.sin(w.t*.35);
 g.save();g.globalCompositeOperation='lighter';
 spxGlow(g,-6,-120,R*2,P.c,.26*al);spxGlow(g,-6,-120,R,P.b,.28*al);
 g.save();g.translate(-6,-120);g.rotate(w.t*.045);g.globalAlpha=.26*al;g.fillStyle=P.a;for(let i=0;i<14;i++){g.rotate(Math.PI*2/14);g.beginPath();g.moveTo(R*.9,-8);g.lineTo(R*2.1+(i%2)*46,0);g.lineTo(R*.9,8);g.fill()}g.restore();
 spxRing(g,-6,-120,R*1.05,R*1.05,P.b,.5*al,3);
 if(w.t>=w.su-2&&w.t<=w.end+6)for(let k=0;k<5;k++){const idx=Math.floor((w.t-w.su)/3)-k;if(idx<0)continue;const u=(w.t-(w.su+idx*3))/12;if(u<0||u>1)continue;
  const dir=idx%2?-1:1,x=70+spxH(idx*3.7)*L*.62,y=-60-spxH(idx*5.1)*150,r=70+spxH(idx*2.3)*54,a0=-1.2+spxH(idx*9.1)*1.2;spxCres(g,x,y,r,a0,a0+dir*spxEase(u*1.6)*2.3,28,P,(1-u)*al*1.2)}
 if(w.t>=w.su)for(let k=0;k<3;k++){const u=((w.t-w.su)*.045+k/3)%1;spxRing(g,30+u*L*.9,-92,18+u*40,70+u*120,P.b,(1-u)*.85*al,4)}
 g.restore()}
// URSUS · Bärenzorn: Anlauf mit Staubring, dann Bodenrisse nach vorn, fliegende Felsbrocken, Schockringe am Boden, wuchtige Klauenbögen
function spxQuakeFx(g,f,m,glow){const P=spxPal(f,glow),w=spxWin(f,m,16,22);if(!w)return;const grow=Math.min(1,(w.t-w.su+16)/16),fade=w.t>w.end?Math.max(0,1-(w.t-w.end)/22):1,al=grow*fade,L=m.box?m.box[2]:520,act=w.t>=w.su,k=Math.max(0,Math.min(1,(w.t-w.su)/Math.max(10,m.ac*.55)));
 g.save();g.globalCompositeOperation='lighter';
 spxGlow(g,0,-4,90+14*Math.sin(w.t*.5),P.c,.4*al);spxRing(g,0,-4,70+((w.t*3)%50),14+((w.t*3)%50)*.18,P.a,.7*al*(1-((w.t*3)%50)/70),4);
 if(act){for(let c=0;c<3;c++){const yo=(c-1)*7,len=L*k*(1-c*.12);g.globalAlpha=al*(.9-c*.18);g.strokeStyle=c?P.a:P.b;g.shadowColor=P.a;g.shadowBlur=18;g.lineWidth=c?5:8;g.beginPath();g.moveTo(34,yo-1);
   for(let x=34;x<=34+len;x+=18){g.lineTo(x,yo-1+(spxH(x*.13+c*7)-.5)*14)}g.stroke()}g.shadowBlur=0;spxGlow(g,34+L*k,-6,64,P.a,.7*al);for(let i=0;i<7;i++){spxGlow(g,40+spxH(i*2.7)*L*k,-8-spxH(i*4.1)*26,30+spxH(i)*22,P.c,.5*al)}
  for(let i=0;i<11;i++){const p=((w.t-w.su)*.05+spxH(i)*.7)%1,x0=60+spxH(i*3.1)*L*.8,hh=150+spxH(i*1.7)*150,x=x0+p*40,y=-p*hh+p*p*hh*1.1;if(y>0)continue;const s=7+spxH(i*5.9)*8;
   g.globalAlpha=al*(1-p*.6);g.fillStyle=P.c;g.strokeStyle=P.b;g.lineWidth=1.5;g.beginPath();g.moveTo(x-s,y);g.lineTo(x-s*.3,y-s*1.1);g.lineTo(x+s,y-s*.4);g.lineTo(x+s*.6,y+s*.7);g.closePath();g.fill();g.stroke()}
  for(let r=0;r<3;r++){const u=((w.t-w.su)*.04+r/3)%1;spxRing(g,40+u*L*.95,-3,16+u*30,6+u*14,P.b,(1-u)*.9*al,4)}
  for(let i=0;i<4;i++){const idx=Math.floor((w.t-w.su)/4)-i;if(idx<0)continue;const u=(w.t-(w.su+idx*4))/12;if(u<0||u>1)continue;const dir=idx%2?-1:1,a0=-1.1+spxH(idx*4.1)*1.2;
   spxCres(g,60+spxH(idx*2.7)*L*.3,-92+spxH(idx*6.1)*30,92+spxH(idx*1.3)*30,a0,a0+dir*spxEase(u*1.6)*2.3,32,P,(1-u)*al*1.2)}}
 g.restore()}
// A1LIEN · Blutrausch: Blutmond hinter der Figur, gekreuzte Doppelklauen-Schnitte über die Trefferbox, rote Tempolinien
function spxBloodFx(g,f,m,glow){const P=spxPal(f,glow),w=spxWin(f,m,16,22);if(!w)return;const grow=Math.min(1,(w.t-w.su+16)/16),fade=w.t>w.end?Math.max(0,1-(w.t-w.end)/22):1,al=grow*fade*(.82+.18*Math.sin(w.t*1.7)),L=m.box?m.box[2]:330,R=104+10*Math.sin(w.t*.3);
 g.save();g.globalCompositeOperation='lighter';
 spxGlow(g,10,-124,R*2.1,P.c,.34*al);spxGlow(g,10,-124,R,P.a,.24*al);spxRing(g,10,-124,R,R,P.b,.55*al,4);spxRing(g,10,-124,R*1.35,R*1.35,P.a,.35*al,2);
 if(w.t>=w.su-2&&w.t<=w.end+6){for(let k=0;k<6;k++){const idx=Math.floor((w.t-w.su)/2.5)-k;if(idx<0)continue;const u=(w.t-(w.su+idx*2.5))/10;if(u<0||u>1)continue;
   const x=50+spxH(idx*3.9)*L*.72,y=-70-spxH(idx*5.3)*130,r=62+spxH(idx*2.1)*46,a0=-1.5+spxH(idx*9.7)*.8,e=spxEase(u*1.7);   // gekreuzt: zwei Bögen mit entgegengesetzter Richtung
   spxCres(g,x,y,r,a0,a0+2.1*e,26,P,(1-u)*al*1.3);spxCres(g,x+14,y,r,a0+.5+2.1,a0+.5+2.1-2.1*e,26,P,(1-u)*al*1.3)}
  for(let i=0;i<7;i++){const p=((w.t*.09+spxH(i)*4)%1),y=-30-spxH(i*7.1)*190,x=30+p*(L+80);spxStreak(g,x-120,y,x,y,4,P,(1-p)*.8*al,0)}}
 g.restore()}
const SP_FX={cSlash:spxSlashFx,cRise:spxRiseFx,cSpin:spxSpinFx,cDive:spxDiveFx,cThrust:spxThrustFx,cOver:spxOverFx,cMuzzle:spxMuzzleFx,cSolar:spxSolarFx,cQuake:spxQuakeFx,cBlood:spxBloodFx};
// ---- Projektil-Looks (Renderer.look ruft PROJ_LOOKS[def.look] auf; Ursprung = Mitte des Projektils, g steht schon im Weltraum, additiv) ----
export const PROJ_LOOKS={
 solar(g,p,col,t){const d=Math.sign(p.vx)||1,P=SPX_PAL.leon,R=Math.max(34,p.h*.64),a=Math.min(1,t/3);g.scale(d,1);   // Leon: goldene Sonnenwelle mit Funkenschweif
  spxStreak(g,-R*3.4,0,-R*.2,0,R*.55,P,a*.9,0);spxGlow(g,R*.15,0,R*1.3,P.c,.5*a);spxGlow(g,R*.3,0,R*.7,P.b,.7*a);
  spxCres(g,-R*.45,0,R*1.25,-1.2,1.2,R*.62,P,a);spxCres(g,-R*.75,0,R*1.0,-1.0,1.0,R*.4,P,a*.8);
  for(let i=0;i<7;i++){const k=((t*.06+spxH(i)*3)%1);spxGlow(g,-R*.4-k*R*2.6,(spxH(i*4.1)-.5)*R*1.5,5+spxH(i*2)*5,P.b,(1-k)*.9*a)}},
 quake(g,p,col,t){const d=Math.sign(p.vx)||1,P=SPX_PAL.bear,h=Math.max(70,p.h*1.45),fl=70,a=Math.min(1,t/3);g.scale(d,1);   // URSUS: rollende Bodenwelle mit Staub und Brocken (Boden = 70 px unter der Projektilmitte)
  const gr=g.createLinearGradient(0,fl-h,0,fl);gr.addColorStop(0,P.a);gr.addColorStop(.5,P.c);gr.addColorStop(1,'#3a1806');g.globalCompositeOperation='source-over';g.globalAlpha=a*.96;g.fillStyle=gr;g.shadowColor=P.a;g.shadowBlur=18;
  g.beginPath();g.moveTo(-p.w*1.7,fl);for(let i=0;i<=8;i++){const x=-p.w*1.7+i*(p.w*1.7+p.w*.35)/8,k=i/8,hh=h*(.15+.85*Math.pow(k,1.7))*(.85+.3*spxH(i*3.3+Math.floor(t/3)));g.lineTo(x,fl-hh)}
  g.lineTo(p.w*.35,fl-h*.35);g.lineTo(p.w*.35,fl);g.closePath();g.fill();g.shadowBlur=0;g.globalCompositeOperation='lighter';spxStreak(g,-p.w*2.2,fl-3,p.w*.4,fl-3,9,P,a*.9,0);
  g.globalAlpha=a;g.strokeStyle=P.b;g.lineWidth=3;g.beginPath();g.moveTo(-p.w*.2,fl-h*.75);g.quadraticCurveTo(p.w*.2,fl-h*1.0,p.w*.38,fl-h*.3);g.stroke();
  for(let i=0;i<6;i++){const k=((t*.07+spxH(i)*3)%1);spxGlow(g,-p.w*(.2+k*1.5),fl-4-spxH(i*5)*20,16+spxH(i*2)*16,P.c,(1-k)*.55*a)}
  for(let i=0;i<5;i++){const k=((t*.06+spxH(i*2)*2)%1),x=-p.w*(.1+k*1.1),y=fl-h*.7*Math.sin(k*3.14)-8,s=5+spxH(i*7)*5;g.globalAlpha=a*(1-k*.5);g.fillStyle=P.c;g.strokeStyle=P.b;g.lineWidth=1.3;g.beginPath();g.moveTo(x-s,y);g.lineTo(x,y-s);g.lineTo(x+s,y);g.lineTo(x,y+s*.8);g.closePath();g.fill();g.stroke()}},
 bloodclaw(g,p,col,t){const d=Math.sign(p.vx)||1,P=SPX_PAL.cyberdemon,R=Math.max(34,p.h*.7),a=Math.min(1,t/3),fl=.5+.5*Math.sin(t*1.3);g.scale(d,1);   // A1LIEN: drei blutrote Krallenspuren mit zuckendem Schweif
  spxGlow(g,R*.1,0,R*1.5,P.c,.55*a);spxStreak(g,-R*3.2,0,-R*.1,0,R*.5,P,a*.7,0);
  for(const o of[-.62,0,.62]){const y=o*R*.9;spxCres(g,-R*.5,y,R*1.3,-.95+o*.35,.95+o*.35,R*.34,P,a);}
  g.globalAlpha=a*.9;g.strokeStyle=P.b;g.lineWidth=1.6;g.shadowColor=P.a;g.shadowBlur=10;g.beginPath();g.moveTo(-R*.8,0);for(let i=1;i<=8;i++){g.lineTo(-R*.8-i*R*.36,(spxH(i*3.1+Math.floor(t/2))-.5)*R*.7*(i/8)*(.6+fl*.6))}g.stroke();
  for(let i=0;i<5;i++){const k=((t*.07+spxH(i)*3)%1);spxGlow(g,-R*.6-k*R*2,(spxH(i*4.1)-.5)*R*1.2,5+spxH(i*2)*4,P.b,(1-k)*.9*a)}}};
// Rabenschwarm (Korvus-Hyper): ein Schwarm dunkler Raben mit violettem Schweif stürmt über die Trefferbox nach vorn. Weltmaß wie tailsFx (Ursprung = Körpermitte, nach vorn = +x).
function swarmFx(g,f,m){const t=f.mf,t0=m.su-6,t1=m.su+m.ac;if(t<t0||t>t1+14)return;
 const grow=Math.min(1,(t-t0)/10),fade=t>t1?Math.max(0,1-(t-t1)/14):1,L=(m.box?m.box[2]+m.box[0]:460)*.95,N=11,oy=-92,VIO='#b57cff',HOT='#ecd9ff';
 const H=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
 g.save();g.globalCompositeOperation='lighter';g.lineCap='round';g.lineJoin='round';
 for(let i=0;i<N;i++){
  const sp=.65+H(i*3.1)*.6,ph=((t-t0)*sp/46+H(i*7.7))%1,u=Math.min(1,grow*ph*1.15),
   x=40+u*L,spread=(.12+H(i*1.9)*.88)*(.25+.75*u),y=oy+(H(i*5.3)-.5)*2*210*spread*.55+Math.sin(t*.25+i)*9,
   s=(26+H(i*2.2)*20)*(.75+.5*u),fl=.5+.5*Math.sin(t*.75+i*2.1),wing=-.15+fl*1.05,
   blink=Math.sin(t*1.7+i*4.3)>-.35?1:.25+.2*Math.sin(t*3+i),   // Neon-Flackern: kurz fast aus, dann wieder an
   a=Math.min(1,u*5)*(1-Math.max(0,u-.85)/.15)*fade*blink,up=.3+wing*1.5;
  g.save();g.translate(x,y);
  const P=new Path2D();   // Raben-Silhouette nur als Linien: oberer Flügel, unterer Flügel, Körper+Kopf+Schnabel, Schwanz
  P.moveTo(s*.1,-s*.05);P.quadraticCurveTo(-s*.2,-s*up*.9,-s*1.0,-s*up);P.quadraticCurveTo(-s*.75,-s*up*.45,-s*.95,-s*up*.2);P.quadraticCurveTo(-s*.5,-s*.08,-s*.35,s*.02);
  P.moveTo(s*.05,s*.03);P.quadraticCurveTo(-s*.2,s*(.15+up*.35),-s*.75,s*(.3+up*.5));P.quadraticCurveTo(-s*.45,s*.12,-s*.35,0);
  P.moveTo(-s*.3,0);P.quadraticCurveTo(s*.1,-s*.2,s*.32,-s*.12);P.arc(s*.38,-s*.06,s*.16,-2.6,.2);P.lineTo(s*.84,-s*.03);P.lineTo(s*.52,s*.02);P.quadraticCurveTo(s*.2,s*.2,-s*.3,0);
  P.moveTo(-s*.3,-s*.03);P.lineTo(-s*.9,-s*.2);P.moveTo(-s*.3,0);P.lineTo(-s*.98,-s*.02);P.moveTo(-s*.3,s*.03);P.lineTo(-s*.9,s*.18);
  g.globalAlpha=a*.28;g.strokeStyle=VIO;g.lineWidth=9;g.stroke(P);       // weiter Glow
  g.globalAlpha=a*.7;g.strokeStyle=VIO;g.lineWidth=3.6;g.stroke(P);      // Neon-Körper
  g.globalAlpha=a;g.strokeStyle=HOT;g.lineWidth=1.4;g.stroke(P);         // heißer Laserkern
  g.globalAlpha=a*.8;g.strokeStyle=VIO;g.lineWidth=1.6;g.beginPath();g.moveTo(-s*1.0,0);g.lineTo(-s*4.2,0);g.stroke();   // Laser-Schweif (eine Linie)
  g.fillStyle='#fff';g.beginPath();g.arc(s*.42,-s*.08,s*.05,0,7);g.fill();   // Auge
  g.restore()}
 g.restore()}
// Neunschwanz-Inferno (Kitsune-Hyper): neun Geisterfeuer-Schwänze fächern sich nach vorn auf, wippen, enden in Flammenkugeln. Weltmaß (passt zur Trefferbox m.box), Ursprung = Körpermitte.
function tailsFx(g,f,m,glow){const t=f.mf,t0=m.su-8,t1=m.su+m.ac;if(t<t0||t>t1+10)return;
 const grow=Math.min(1,(t-t0)/12),fade=t>t1?Math.max(0,1-(t-t1)/10):1,L=(m.box?m.box[2]+m.box[0]:460)*.92*grow,N=9;
 g.save();g.globalCompositeOperation='lighter';g.globalAlpha=fade;
 const ox=-6,oy=-72,pulse=.8+.2*Math.sin(t*.9);
 const gr=g.createRadialGradient(ox,oy,4,ox,oy,70*grow);gr.addColorStop(0,'#fff');gr.addColorStop(.4,glow);gr.addColorStop(1,'#0000');g.fillStyle=gr;g.beginPath();g.arc(ox,oy,70*grow,0,7);g.fill();   // Kern-Leuchten
 for(let i=0;i<N;i++){
  const u=i/(N-1),ang=-.95+u*1.55+Math.sin(t*.22+i*1.7)*.09,len=L*(.7+.3*Math.sin(i*2.3+1)*.5+.3*(1-Math.abs(u-.45)*1.2)),
   cx=ox+Math.cos(ang)*len,cy=oy+Math.sin(ang)*len*.8+30*Math.sin(u*3)-6,
   bend=(Math.sin(t*.4+i*1.1))*42,mx=ox+Math.cos(ang)*len*.5-Math.sin(ang)*bend,my=oy+Math.sin(ang)*len*.4+Math.cos(ang)*bend,w=15*pulse;
  const nx=-Math.sin(ang),ny=Math.cos(ang);
  g.beginPath();g.moveTo(ox-nx*w,oy-ny*w);g.quadraticCurveTo(mx-nx*w*1.3,my-ny*w*1.3,cx,cy);g.quadraticCurveTo(mx+nx*w*1.3,my+ny*w*1.3,ox+nx*w,oy+ny*w);g.closePath();
  const lg=g.createLinearGradient(ox,oy,cx,cy);lg.addColorStop(0,'#fff');lg.addColorStop(.3,glow);lg.addColorStop(1,'#0000');g.fillStyle=lg;g.fill();   // Schweif
  g.strokeStyle='#ffffffcc';g.lineWidth=2;g.beginPath();g.moveTo(ox,oy);g.quadraticCurveTo(mx,my,cx,cy);g.stroke();                                        // heller Kern
  const R=16+6*Math.sin(t*.7+i);const fg=g.createRadialGradient(cx,cy,1,cx,cy,R*1.8);fg.addColorStop(0,'#fff');fg.addColorStop(.4,glow);fg.addColorStop(1,'#0000');g.fillStyle=fg;g.beginPath();g.arc(cx,cy,R*1.8,0,7);g.fill()}   // Flammenkugel an der Spitze
 g.restore()}
// Drachen-Feuersturm (ST3-G0-Hyper): Feuerstrom aus dem Maul, kegelförmig nach vorn leicht abwärts. Glutballen wandern nach außen, werden größer und verlöschen; Weltmaß (Länge = m.box[2]).
function breathFx(g,f,m){const t=f.mf,t0=m.su-6,t1=m.su+m.ac;if(t<t0||t>t1+12)return;
 const grow=Math.min(1,(t-t0)/10),fade=t>t1?Math.max(0,1-(t-t1)/12):1,L=(m.box?m.box[2]:520)*grow,MX=59,MY=-158,N=30,slope=.14;
 g.save();g.globalCompositeOperation='lighter';
 for(let j=N-1;j>=0;j--){const p=(j/N+t*.042)%1,x=MX+p*L,y=MY+p*L*slope+Math.sin(t*.45+j*2.1)*p*16,r=9+p*(70+14*Math.sin(t*.6+j)),a=fade*Math.pow(1-p,.55)*(p<.04?p/.04:1);
  if(a<=.02)continue;g.globalAlpha=Math.min(1,a);
  const gr=g.createRadialGradient(x,y,r*.1,x,y,r);gr.addColorStop(0,'#fffbd0');gr.addColorStop(.35,'#ffc531');gr.addColorStop(.7,'#ff5a14cc');gr.addColorStop(1,'#c0180000');
  g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill()}
 g.globalAlpha=fade;const mg=g.createRadialGradient(MX,MY,2,MX,MY,38);mg.addColorStop(0,'#fff');mg.addColorStop(.4,'#ffc531');mg.addColorStop(1,'#ff5a1400');g.fillStyle=mg;g.beginPath();g.arc(MX,MY,38,0,7);g.fill();   // Leuchten am Maul
 for(let i=0;i<10;i++){const p=((i*.137+t*.03)%1),x=MX+p*L*(.5+.5*((i*7)%3)/2),y=MY+p*L*slope*1.1-(10+(i*13)%40)*p-Math.sin(t*.3+i)*8;g.globalAlpha=fade*(1-p);g.fillStyle='#ffd27a';g.beginPath();g.arc(x,y,2.2,0,7);g.fill()}   // Funken
 g.restore()}
// Blitz-Kamehameha (H!T-Hyper): 1) Blitz schlägt von oben in den Kopf ein, 2) Körper knistert / lädt sich auf, 3) Blitzkugel zwischen den Händen, 4) breiter Blitzstrahl nach vorn.
// Weltmaß; Zeitpunkte relativ zu m.su (Startup) und m.ac (aktiv). Zackenlinien sind pro Frame neu gewürfelt (deterministisch) = Flackern.
const rn=(a,b)=>{const x=Math.sin(a*127.1+b*311.7)*43758.5453;return x-Math.floor(x)};
function zig(g,x0,y0,x1,y1,n,amp,seed){g.beginPath();g.moveTo(x0,y0);const dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;for(let i=1;i<n;i++){const u=i/n,o=(rn(i,seed)-.5)*2*amp;g.lineTo(x0+dx*u+nx*o,y0+dy*u+ny*o)}g.lineTo(x1,y1)}
function bolt(g,x0,y0,x1,y1,n,amp,seed,w,a){   // dreifach gezeichneter Blitz: weiter Schein, Mantel, weißer Kern
 for(const[lw,col,al]of[[w*3.2,'#3fa0ff',.28],[w*1.6,'#8fd8ff',.6],[w*.55,'#ffffff',1]]){g.globalAlpha=a*al;g.strokeStyle=col;g.lineWidth=lw;zig(g,x0,y0,x1,y1,n,amp,seed);g.stroke()}}
function boltFx(g,f,m){const t=f.mf,su=m.su,end=su+m.ac,seed=Math.floor(t/2)*3.7;if(t<3||t>end+10)return;
 const HX=-26,HY=-170,OX=74,OY=-105,L=(m.box?m.box[2]:620)*.96;
 g.save();g.globalCompositeOperation='lighter';g.lineCap='round';g.lineJoin='round';
 if(t>=3&&t<=26){const a=t<8?(t-3)/5:Math.max(0,1-(t-8)/18);   // 1) Einschlag von oben
  bolt(g,HX+rn(1,seed)*30-15,-1100,HX,HY,22,34,seed,5,a);
  for(let b=0;b<2;b++){const y=-900+b*260+rn(b,seed)*120;bolt(g,HX+(rn(b,2)-.5)*20,y,HX+(b?1:-1)*(80+rn(b,seed)*60),y+130,5,14,seed+b,2.2,a*.8)}   // Verästelungen
  g.globalAlpha=a*.8;const hg=g.createRadialGradient(HX,HY,2,HX,HY,90);hg.addColorStop(0,'#fff');hg.addColorStop(.35,'#8fd8ff');hg.addColorStop(1,'#3fa0ff00');g.fillStyle=hg;g.beginPath();g.arc(HX,HY,90,0,7);g.fill()}
 if(t>=7&&t<=end+8){const fade=t>end?Math.max(0,1-(t-end)/8):Math.min(1,(t-7)/8);   // 2) Aufladen: Aura + Körperblitze
  g.globalAlpha=fade*(.28+.08*Math.sin(t*.9));const ag=g.createRadialGradient(0,-95,10,0,-95,150);ag.addColorStop(0,'#bfe6ff');ag.addColorStop(.5,'#3fa0ff');ag.addColorStop(1,'#1060ff00');g.fillStyle=ag;g.beginPath();g.ellipse(0,-95,120,150,0,0,7);g.fill();
  for(let i=0;i<7;i++){const sd=seed+i*5.3,x=(rn(i,sd)-.5)*130,y=-20-rn(i+9,sd)*160,an=rn(i+3,sd)*6.28,l=22+rn(i+5,sd)*36;bolt(g,x,y,x+Math.cos(an)*l,y+Math.sin(an)*l,4,7,sd,1.6,fade*.9)}}
 if(t>=su*.4&&t<su){const u=(t-su*.4)/(su*.6),R=6+u*20+Math.sin(t*1.3)*2.5;   // 3) Blitzkugel zwischen den Händen
  g.globalAlpha=1;const sg=g.createRadialGradient(18,-96,1,18,-96,R*2);sg.addColorStop(0,'#fff');sg.addColorStop(.35,'#9fe0ff');sg.addColorStop(1,'#3fa0ff00');g.fillStyle=sg;g.beginPath();g.arc(18,-96,R*2,0,7);g.fill();
  for(let i=0;i<6;i++){const an=rn(i,seed)*6.28;bolt(g,18,-96,18+Math.cos(an)*R*2.2,-96+Math.sin(an)*R*2.2,4,6,seed+i,1.5,.9)}}
 if(t>=su&&t<=end+10){const grow=Math.min(1,(t-su+1)/6),fade=t>end?Math.max(0,1-(t-end)/10):1,len=L*grow,wob=1+.1*Math.sin(t*1.7);   // 4) Blitzstrahl
  const jag=(w,a)=>{g.globalAlpha=fade*a;g.lineWidth=w;zig(g,OX,OY,OX+len,OY+Math.sin(t*.5)*5,16,10,seed);g.stroke()};
  g.strokeStyle='#2f7fff';jag(104*wob,.2);g.strokeStyle='#6fd0ff';jag(66*wob,.38);g.strokeStyle='#cfeeff';jag(34*wob,.8);g.strokeStyle='#fff';jag(14*wob,1);
  for(let i=0;i<7;i++){const u=(i+rn(i,seed))/7,bx=OX+len*u,by=OY,an=(rn(i+4,seed)<.5?-1:1)*(.35+rn(i+8,seed)*.5);bolt(g,bx,by,bx+Math.cos(an)*70,by+Math.sin(an)*70*(rn(i,3)<.5?1:-1)+(rn(i,5)-.5)*40,4,9,seed+i,2,fade*.9)}   // Seitenblitze
  g.globalAlpha=fade;for(const[cx,R]of[[OX+8,64],[OX+len,84]]){const bg=g.createRadialGradient(cx,OY,2,cx,OY,R);bg.addColorStop(0,'#fff');bg.addColorStop(.4,'#8fd8ff');bg.addColorStop(1,'#3fa0ff00');g.fillStyle=bg;g.beginPath();g.arc(cx,OY,R,0,7);g.fill()}   // Leuchten an Hand und Spitze
  g.globalAlpha=fade*.35;g.fillStyle='#8fd8ff';g.beginPath();g.ellipse(OX+len*.5,8,len*.5,9,0,0,7);g.fill()}   // Bodenschein
 g.restore()}
// Zeichnet einen Kämpfer. Füße stehen bei (f.x, f.y); f nach rechts blickend, gespiegelt via f.facing.
export function drawFighter(g,f,clock,alpha=1,floorY=470){
 if(f.char.sprites)return drawSpriteFighter(g,f,clock,alpha,floorY);   // Sprite-Figur (Atlas) statt Vektor-Skelett
 const C=PAL[f.char.pal],po=poseOf(f),[tl,hd,ba1,ba2,fa1,fa2,bt,bs,ft,fs,hx,mouth,hy]=po;
 g.save();g.globalAlpha=alpha;
 if(f.comboFlash>0){const fa=f.comboFlash/EFFECT.comboFlash;g.save();g.globalCompositeOperation='lighter';g.fillStyle='#ffffff';g.globalAlpha=.55*fa;g.fillRect(-70,-165,140,170);g.restore()}
 if(alpha>=.4)groundShadow(g,f.x,floorY,Math.max(0,floorY-f.y),56);   // weicher Kontaktschatten (wie bei den Sprite-Figuren)
 g.translate(f.x,f.y);g.scale(f.facing,1);
 const drop=Math.max(Math.cos(bt)*46+Math.cos(bs)*44,Math.cos(ft)*46+Math.cos(fs)*44)+10;g.translate(hx,hy?hy:-drop);
 if(f.state==='tumble')g.rotate(-f.sf*.3);
 const sh=(x,y)=>rot(x,y,tl),bsx=sh(-18,-48),fsx=sh(22,-48),neck=sh(6,-58);
 tail(g,C,clock,f.state==='walk'?-.1:0);
 arm(g,bsx[0],bsx[1],ba1,ba2,C,1);leg(g,-10,0,bt,bs,C,1);
 g.save();g.rotate(tl);torso(g,C);g.restore();
 g.save();g.rotate(tl*.5);g.fillStyle=C.sash;g.strokeStyle=C.out;g.lineWidth=3;g.fillRect(-21,-14,42,15);g.strokeRect(-21,-14,42,15);g.beginPath();g.arc(10,-6,7,0,7);g.fill();g.stroke();
 const sw=Math.sin(clock*4)*3-hx*.15;for(const[o,l]of[[0,38],[10,30]]){g.beginPath();g.moveTo(8+o,-2);g.lineTo(2+o+sw,l);g.lineTo(12+o+sw,l-6);g.lineTo(16+o,-2);g.closePath();g.fill();g.stroke()}g.restore();
 leg(g,12,0,ft,fs,C,0);
 g.save();g.translate(neck[0],neck[1]);g.rotate(hd+tl*.4);head(g,C,mouth,f.anim==='hit'||f.state==='ko'||f.state==='knockdown');g.restore();
 const fist=arm(g,fsx[0],fsx[1],fa1,fa2,C,0);
 attackFx(g,f,fist,C.glow);
 g.restore()}
export function drawTrail(g,f,clock){for(const t of f.trail){g.save();g.filter='none';drawFighter(g,t,clock,Math.max(0,.28-t.age*.02),470);g.restore()}}
