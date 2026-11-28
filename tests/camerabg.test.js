// Kampf-Hintergrund + Kamera: Zoom darf den Abstand Spieler <-> Hintergrund nie ändern; Schwenk nutzt die volle Bildbreite.  node tests/camerabg.test.js
import assert from'node:assert/strict';
import{Backdrop}from'../src/render/backdrop.js';
import{Camera}from'../src/core/camera.js';
import{GROUND,H,W}from'../src/core/config.js';
const ok=n=>console.log('  ✓',n);
const mk=()=>{const bd=Object.create(Backdrop.prototype);bd.opts={fit:'cover',parallax:true,dim:0};bd.pick=()=>({w:()=>1672,h:()=>941,src:()=>'IMG'});return bd};
const drawAt=(bd,cam)=>{let a=null;const g={drawImage:(...x)=>{a=x},save(){},restore(){},fillRect(){},set fillStyle(v){}};bd.draw(g,W,H,'fight',{cam,key:'x',lock:cam.bgLock()});return{left:a[1],top:a[2],w:a[3],h:a[4]}};
// Welt-Punkt (wx, wy) -> Position im Bild (0..1), so wie der Spieler sie auf dem Schirm sieht
const imgPos=(cam,r,wx,wy)=>{const z=cam.z,sx=(wx-cam.x)*z+W/2,sy=(wy-cam.y)*z+H/2;return[(sx-r.left)/r.w,(sy-r.top)/r.h]};
{const bd=mk(),base=Object.assign(new Camera(),{x:W/2,y:H/2,zoom:1,punch:0,fixedZoom:true});const r0=drawAt(bd,base),p0=imgPos(base,r0,640,GROUND);
 for(const z of[.9,1.2,1.5]){const c=Object.assign(new Camera(),{x:W/2,zoom:z,punch:0,fixedZoom:true});c.cine={x:0,y:0,zoom:z,w:1};c.y=GROUND-(GROUND-H/2)/z;   // Boden bleibt bei jedem Zoom auf derselben Bildschirmzeile
  const r=drawAt(bd,c),p=imgPos(c,r,640,GROUND);assert.ok(Math.abs(p[0]-p0[0])<1e-9&&Math.abs(p[1]-p0[1])<1e-9,'Zoom '+z+' verschiebt Spieler im Bild: '+p+' vs '+p0)}
 {const m0=Object.assign(new Camera(),{x:W/2,y:H/2,zoom:1,melee:true}),m=mk(),a0=drawAt(m,m0),q0=imgPos(m0,a0,640,GROUND);   // Melee zoomt bis .65 heraus: eigener, größerer Bildbereich, damit der Schirm gefüllt bleibt
  for(const z of[.65,.8]){const c=Object.assign(new Camera(),{x:W/2,zoom:z,melee:true});c.y=GROUND-(GROUND-H/2)/z;const r=drawAt(m,c),p=imgPos(c,r,640,GROUND);assert.ok(Math.abs(p[0]-q0[0])<1e-9&&Math.abs(p[1]-q0[1])<1e-9,'Melee Zoom '+z);assert.ok(r.left<=1e-9&&r.left+r.w>=W-1e-9&&r.top<=1e-9&&r.top+r.h>=H-1e-9,'Melee: Bild füllt den Schirm bei Zoom '+z)}}
 ok('Zoom (auch Hyper-Zoom) verschiebt die Weltposition eines Spielers relativ zum Hintergrund nie')}
{const bd=mk(),c=Object.assign(new Camera(),{x:W/2,y:H/2,zoom:1,fixedZoom:true}),a=drawAt(bd,c);c.x=W/2+30;c.span={min:W/2-30,max:W/2+30,home:W/2};const b=drawAt(bd,c);
 const e=(a.w-W)/2;assert.ok(Math.abs(a.left+e)<1e-6,'Heim: Bild mittig');assert.ok(Math.abs(b.left-(0-(a.w-W)))<1e-6||Math.abs(b.left+2*e)<1e-6,'Ende des Schwenkbereichs = rechter Bildrand erreicht');assert.ok(b.left+b.w>=W-1e-6,'kein Spalt am Rand');ok('Kamera am Ende ihres Bereichs zeigt genau den Bildrand (ganze Bildbreite nutzbar)')}
{const c=new Camera();c.span=null;assert.equal(c.bgPan(),0);c.span={min:100,max:900,home:500};c.x=500;assert.equal(c.bgPan(),0);c.x=900;assert.equal(c.bgPan(),1);c.x=100;assert.equal(c.bgPan(),-1);c.x=2000;assert.equal(c.bgPan(),1,'begrenzt');ok('bgPan: -1..1, begrenzt, Heim = 0')}
{const c=new Camera();c.story={l:0,r:3000};const f=[{x:1500,y:GROUND,facing:1,dead:0,state:'idle'}];c.snap(f);assert.ok(c.span&&c.span.max>c.span.min);c.melee=true;c.story=null;c.snap([{x:480,y:GROUND,dead:0,state:'idle',char:{size:1}}]);assert.ok(c.span);c.melee=false;c.fixedZoom=true;c.snap([{x:300,y:GROUND,dead:0,state:'idle',char:{size:1}},{x:600,y:GROUND,dead:0,state:'idle',char:{size:1}}]);assert.ok(c.span&&c.span.home===W/2);ok('Story, Melee und Versus liefern ihren Schwenkbereich')}
console.log('Kamera-Hintergrund-Tests bestanden');
// ---- Titel-Demo: Kamera folgt den Kämpfern bis zum Bildrand, Hintergrund liegt 1:1 in der Welt ----
{const bd=mk();bd.pick=()=>({w:()=>1916,h:()=>821,src:()=>'IMG'});const ext=bd.panExtent('title','start',W,H);assert.ok(Math.abs(ext-150)<1,'21:9: Schwenk ca. ±'+Math.round(ext)+' px');
 bd.pick=()=>({w:()=>1672,h:()=>941,src:()=>'IMG'});assert.ok(Math.abs(bd.panExtent('title','start',W,H)-120)<1,'16:9: 25 % Überstand');bd.pick=()=>null;assert.equal(bd.panExtent('title','start',W,H),0);
 const c=Object.assign(new Camera(),{x:W/2,y:H/2,zoom:1,fixedZoom:true,follow:true,limitX:300}),mkf=x=>({x,y:GROUND,dead:0,state:'idle',char:{size:1}});
 c.snap([mkf(700),mkf(800)]);assert.equal(c.x,750);c.snap([mkf(-200),mkf(0)]);assert.equal(c.x,W/2-300,'links am Bildrand begrenzt');c.snap([mkf(1500),mkf(1700)]);assert.equal(c.x,W/2+300,'rechts am Bildrand begrenzt');
 c.snap([mkf(110),mkf(300)]);assert.equal(c.x,205);c.follow=false;c.x=W/2;c.snap([mkf(110),mkf(300)]);assert.equal(c.x,400,'ohne follow: altes Randscrollen (Kämpfer ab 120 px vom Rand)');
 // Bild fest in der Welt: Weltpunkt bleibt beim Schwenken exakt auf demselben Bildpunkt
 bd.pick=()=>({w:()=>1916,h:()=>821,src:()=>'IMG'});const draw=cam=>{let a;const g={drawImage:(...x)=>{a=x},fillRect(){},set fillStyle(v){}};bd.draw(g,W,H,'title',{cam,key:'start',anchor:{wy:GROUND,dy:40,px:1}});return a};
 const u=Object.assign(new Camera(),{x:W/2,y:H/2,zoom:1,fixedZoom:true}),v=Object.assign(new Camera(),{x:W/2+200,y:H/2,zoom:1,fixedZoom:true}),A=draw(u),B=draw(v);
 const px=(cam,a,wx)=>(((wx-cam.x)*cam.z+W/2)-a[1])/a[3];assert.ok(Math.abs(px(u,A,640)-px(v,B,640))<1e-9,'Weltpunkt bleibt beim Schwenken auf demselben Bildpunkt');
 const e=draw(Object.assign(new Camera(),{x:W/2+ext,y:H/2,zoom:1,fixedZoom:true}));assert.ok(Math.abs(e[1]+e[3]-W)<1e-6,'ganz rechts: rechter Bildrand erreicht');ok('Titel-Demo: Schwenk bis zum Bildrand, Bild fest in der Welt, 21:9 und 16:9')}
console.log('Titel-Demo-Schwenk-Tests bestanden');
