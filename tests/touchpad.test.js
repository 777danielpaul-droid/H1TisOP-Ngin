// Touch-Steuerung (render/touchpad.js): Tastenlogik ohne DOM.  node tests/touchpad.test.js
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{TouchPad,stickDir,TP_BUTTONS,TP_DIRS,isTouchDevice,canFullscreen,fsActive,isStandalone,enterFullscreen,exitFullscreen,toggleFullscreen}from'../src/render/touchpad.js';
import{BUTTON_KEYS,DIR_KEYS}from'../src/core/input.js';
const ok=n=>console.log('  ✓',n);
{for(const[b,,code]of TP_BUTTONS)assert.equal(BUTTON_KEYS[code],b,'Knopf '+b+' = Taste '+code);for(const[d,code]of Object.entries(TP_DIRS))assert.ok(DIR_KEYS[d].includes(code));ok('Knöpfe und Richtungen entsprechen genau der Tastatur-Belegung des Spiels')}
{assert.deepEqual(stickDir(0,0),{dx:0,dy:0});assert.deepEqual(stickDir(.2,-.2),{dx:0,dy:0},'Totzone');assert.deepEqual(stickDir(.9,0),{dx:1,dy:0});assert.deepEqual(stickDir(-.7,.7),{dx:-1,dy:1});assert.deepEqual(stickDir(0,-1),{dx:0,dy:-1});ok('Stick: Totzone, Richtungen, Diagonalen')}
{globalThis.KeyboardEvent=class{constructor(t,o){this.type=t;this.code=o.code}};const ev=[],t={dispatchEvent:e=>ev.push(e.type+':'+e.code)},p=new TouchPad(t);
 p.key('KeyJ',true);p.key('KeyJ',true);p.key('KeyJ',false);p.key('KeyJ',false);assert.deepEqual(ev,['keydown:KeyJ','keyup:KeyJ'],'keine doppelten Events');
 ev.length=0;p.dir(1,-1);assert.deepEqual(ev,['keydown:ArrowRight','keydown:ArrowUp']);ev.length=0;p.dir(-1,0);assert.ok(ev.includes('keyup:ArrowRight')&&ev.includes('keydown:ArrowLeft')&&ev.includes('keyup:ArrowUp'));
 ev.length=0;p.key('KeyK',true);p.releaseAll();assert.equal(p.down.size,0);assert.ok(ev.includes('keyup:KeyK')&&ev.includes('keyup:ArrowLeft'),'releaseAll lässt nichts hängen');ok('Tasten-Events ohne Dopplung; releaseAll löst alles');delete globalThis.KeyboardEvent}
{assert.equal(isTouchDevice(),false,'Ohne Browser kein Touch-Overlay');const p=new TouchPad(null);p.key('KeyJ',true);p.mount();assert.equal(p.root,null);ok('Auf Nicht-Touch-Geräten/ohne DOM wird nichts eingehängt')}
{assert.equal(canFullscreen(),false);assert.equal(fsActive(),false);assert.equal(isStandalone(),false);assert.equal(enterFullscreen(),false);assert.doesNotThrow(()=>{exitFullscreen();toggleFullscreen()});ok('Vollbild-Helfer sind ohne Browser harmlos (kein Absturz)')}
{const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 for(const m of['viewport-fit=cover','name="apple-mobile-web-app-capable"','name="mobile-web-app-capable"','name="theme-color"'])assert.ok(html.includes(m),'index.html: '+m);
 assert.ok(!/[0-9.]vh\b/.test(css.replace('--app-h:100vh','')),'styles/main.css: kein rohes vh (auf dem Handy = Höhe OHNE Browserleiste) – var(--app-h) verwenden');
 assert.ok(/canvas\{[^}]*width:min\(var\(--app-w\),calc\(var\(--app-h\)\*1\.7778\)\)/.test(css),'Canvas-Breite folgt der sichtbaren Fläche');ok('Handy-Viewport: Meta-Tags da, CSS nutzt die sichtbare Fläche statt vh')}
console.log('Touchpad-Tests bestanden');
