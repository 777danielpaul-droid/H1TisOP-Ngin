
// Touch-Steuerung (Handy/Tablet): Steuerstick links, Angriffs-Knöpfe rechts, kleine Menü-Knöpfe oben. Erscheint nur auf Touch-Geräten.
//  - Greift NICHT in die Engine ein: das Overlay löst dieselben Tastatur-Events aus wie die echte Tastatur (core/input.js, Menüs, Pausenmenü bleiben unverändert).
//  - Richtungen = Pfeiltasten, L/M/H = J/K/L, Special = U, Hyper = I, Dash = O, Verschnaufen = P. Menü = M, OK = Enter, Zurück = Escape.
//  - Specials ohne Motion: Special-Knopf + Stick (neutral / vor / unten / zurück), siehe „Specials“ im Pausenmenü. Viertelkreise gehen auch per Stick.
//  - Liegt unter allen Panels (z-index 30 < 62): Musik-, Hintergrund-, Studio- und Online-Fenster bleiben bedienbar.
export const TP_BUTTONS=[['L','J','KeyJ'],['M','K','KeyK'],['H','L','KeyL'],['S','U','KeyU'],['SUP','I','KeyI'],['DASH','O','KeyO'],['REST','P','KeyP']];
export const TP_DIRS={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'};
export const TP_MENU=[['☰','KeyM','Menü'],['⏎','Enter','OK'],['✕','Escape','Zurück']];
export const isTouchDevice=()=>{try{return typeof window!=='undefined'&&(('ontouchstart' in window)||(navigator.maxTouchPoints>0))&&(!window.matchMedia||window.matchMedia('(pointer:coarse)').matches)}catch(e){return false}};
// Stick-Auslenkung (-1..1, relativ zum Radius) -> Richtung. Totzone, damit leichtes Zittern nichts auslöst.
export const stickDir=(vx,vy,dead=.32)=>({dx:vx>dead?1:vx<-dead?-1:0,dy:vy>dead?1:vy<-dead?-1:0});
export class TouchPad{
 constructor(target=(typeof window!=='undefined'?window:null)){this.t=target;this.down=new Set();this.root=null;this.hidden=false}
 key(code,on){on=!!on;if(on===this.down.has(code))return;if(on)this.down.add(code);else this.down.delete(code);
  if(this.t&&typeof KeyboardEvent!=='undefined')this.t.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,key:code,bubbles:true,cancelable:true}))}
 tap(code){this.key(code,true);setTimeout(()=>this.key(code,false),70)}
 dir(dx,dy){this.key(TP_DIRS.left,dx<0);this.key(TP_DIRS.right,dx>0);this.key(TP_DIRS.up,dy<0);this.key(TP_DIRS.down,dy>0)}
 releaseAll(){for(const c of[...this.down])this.key(c,false)}
 mount(){if(this.root||typeof document==='undefined'||!document.body||!isTouchDevice())return;const d=document;
  const st=d.createElement('style');st.textContent=`
#touchpad{position:fixed;inset:0;z-index:30;pointer-events:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;font:800 15px system-ui,sans-serif}
#touchpad.off .tp-stick,#touchpad.off .tp-btns{display:none}
#touchpad *{touch-action:none;-webkit-tap-highlight-color:transparent}
.tp-stick{position:absolute;left:calc(22px + env(safe-area-inset-left,0px));bottom:calc(22px + env(safe-area-inset-bottom,0px));width:min(34vw,170px);height:min(34vw,170px);border-radius:50%;background:rgba(18,20,58,.38);border:2px solid rgba(127,232,255,.55);pointer-events:auto}
.tp-knob{position:absolute;left:50%;top:50%;width:44%;height:44%;margin:-22% 0 0 -22%;border-radius:50%;background:rgba(127,232,255,.45);border:2px solid #7fe8ff;transition:transform 40ms linear}
.tp-btns{position:absolute;right:calc(18px + env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));width:min(46vw,260px);height:min(34vw,190px)}
.tp-b{position:absolute;display:flex;align-items:center;justify-content:center;width:clamp(48px,11vw,68px);height:clamp(48px,11vw,68px);border-radius:50%;color:#fff;background:rgba(18,20,58,.5);border:2px solid rgba(127,232,255,.7);pointer-events:auto;line-height:1}
.tp-b.on{background:rgba(127,232,255,.5)}.tp-b small{display:block;font-size:10px;opacity:.7;margin-top:2px}
.tp-b[data-b=L]{right:0;bottom:44%}.tp-b[data-b=M]{right:27%;bottom:56%}.tp-b[data-b=H]{right:54%;bottom:56%}
.tp-b[data-b=S]{right:0;bottom:0}.tp-b[data-b=SUP]{right:27%;bottom:6%}.tp-b[data-b=DASH]{right:54%;bottom:6%}
.tp-b[data-b=REST]{right:81%;bottom:30%;width:clamp(38px,8vw,50px);height:clamp(38px,8vw,50px);font-size:12px}
.tp-top{position:absolute;right:calc(10px + env(safe-area-inset-right,0px));top:calc(8px + env(safe-area-inset-top,0px));display:flex;gap:8px;pointer-events:none}
.tp-m{pointer-events:auto;min-width:44px;height:36px;padding:0 10px;border-radius:8px;color:#fff;background:rgba(18,20,58,.55);border:1px solid rgba(127,232,255,.7);font:700 14px system-ui}
.tp-turn{display:none;position:fixed;inset:0;z-index:70;align-items:center;justify-content:center;text-align:center;padding:24px;background:rgba(2,3,14,.92);color:#fff;font:700 20px system-ui}
@media (orientation:portrait){.tp-turn{display:flex}}`;d.head.appendChild(st);
  const r=this.root=d.createElement('div');r.id='touchpad';
  r.innerHTML=`<div class="tp-stick"><div class="tp-knob"></div></div><div class="tp-btns">${TP_BUTTONS.map(([b,l])=>`<div class="tp-b" data-b="${b}">${l}</div>`).join('')}</div><div class="tp-top">${TP_MENU.map(([l,c,t])=>`<button type="button" class="tp-m" data-c="${c}" title="${t}">${l}</button>`).join('')}<button type="button" class="tp-m tp-hide" title="Steuerung ein/aus">🎮</button></div>`;
  d.body.appendChild(r);const tt=d.createElement('div');tt.className='tp-turn';tt.textContent='Bitte das Gerät quer halten (Querformat).';d.body.appendChild(tt);
  // Stick
  const stick=r.querySelector('.tp-stick'),knob=r.querySelector('.tp-knob');let sid=null;
  const move=e=>{const b=stick.getBoundingClientRect(),R=b.width/2,vx=(e.clientX-b.left-R)/R,vy=(e.clientY-b.top-R)/R,m=Math.hypot(vx,vy)||1,k=Math.min(1,m);
   knob.style.transform=`translate(${vx/m*k*R*.5}px,${vy/m*k*R*.5}px)`;const o=stickDir(vx/Math.max(1,m),vy/Math.max(1,m));this.dir(o.dx,o.dy)};
  const end=e=>{if(e.pointerId!==sid)return;sid=null;knob.style.transform='';this.dir(0,0)};
  stick.addEventListener('pointerdown',e=>{if(sid!==null)return;sid=e.pointerId;try{stick.setPointerCapture(sid)}catch(x){}e.preventDefault();move(e)});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===sid)move(e)});stick.addEventListener('pointerup',end);stick.addEventListener('pointercancel',end);
  // Angriffs-Knöpfe: gehalten = Taste gedrückt (mehrere Finger gleichzeitig möglich)
  for(const el of r.querySelectorAll('.tp-b')){const code=TP_BUTTONS.find(x=>x[0]===el.dataset.b)[2];let pid=null;
   const up=e=>{if(e.pointerId!==pid)return;pid=null;el.classList.remove('on');this.key(code,false)};
   el.addEventListener('pointerdown',e=>{if(pid!==null)return;pid=e.pointerId;try{el.setPointerCapture(pid)}catch(x){}e.preventDefault();el.classList.add('on');this.key(code,true)});
   el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
  // Menü-Knöpfe + Ein/Aus
  for(const el of r.querySelectorAll('.tp-m[data-c]'))el.addEventListener('pointerdown',e=>{e.preventDefault();this.tap(el.dataset.c)});
  r.querySelector('.tp-hide').addEventListener('pointerdown',e=>{e.preventDefault();this.hidden=!this.hidden;r.classList.toggle('off',this.hidden);this.releaseAll()});
  // Sicherheitsnetz: nichts bleibt hängen, wenn die Seite unterbrochen wird; kein Zoom/Scrollen durch Gesten
  for(const ev of['blur','pagehide'])addEventListener(ev,()=>this.releaseAll());
  d.addEventListener('visibilitychange',()=>{if(d.hidden)this.releaseAll()});
  d.addEventListener('gesturestart',e=>e.preventDefault());d.addEventListener('contextmenu',e=>{if(e.target&&r.contains(e.target))e.preventDefault()})}
}
