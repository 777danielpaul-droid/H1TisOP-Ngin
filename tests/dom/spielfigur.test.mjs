// UI-Test des Editors für die Spielfiguren (simulierter Browser): Standard-Sprites anzeigen, Werte ändern, Ersatz-Sprites hochladen/speichern, nach „Neustart“ laden, zurücksetzen.
// Einmalig: cd tests/dom && npm i ; dann: node spielfigur.test.mjs
import {JSDOM} from 'jsdom';
import {createCanvas, loadImage} from '@napi-rs/canvas';
import 'fake-indexeddb/auto';
const dom=new JSDOM('<!doctype html><body><canvas id="game"></canvas></body>',{pretendToBeVisual:true,url:'http://localhost/'});
const w=dom.window;
Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
Object.assign(globalThis,{window:w,document:w.document,requestAnimationFrame:w.requestAnimationFrame.bind(w),cancelAnimationFrame:w.cancelAnimationFrame.bind(w),
 Image:w.Image,addEventListener:w.addEventListener.bind(w),alert:m=>console.log('ALERT:',m),confirm:()=>true,File:w.File,Blob:w.Blob,Event:w.Event});
Object.defineProperty(globalThis,'localStorage',{value:w.localStorage,configurable:true});   // Anpassungen der Werte (core/overrides.js)
w.HTMLImageElement.prototype.decode=()=>Promise.resolve();
w.URL.createObjectURL=()=>'blob:test';w.URL.revokeObjectURL=()=>{};globalThis.URL.createObjectURL=()=>'blob:test';globalThis.URL.revokeObjectURL=()=>{};
globalThis.createImageBitmap=async f=>{const buf=Buffer.from(await f.arrayBuffer());const img=await loadImage(buf);img.close=()=>{};return img};
function mkSheet(cols,rows,cw,ch){const c=createCanvas(cols*cw,rows*ch),g=c.getContext('2d');g.fillStyle='#00ff00';g.fillRect(0,0,c.width,c.height);
 for(let i=0;i<cols*rows;i++){const cx=(i%cols)*cw+cw/2+(i*7%30-15),b=Math.floor(i/cols)*ch+ch-60;g.fillStyle='#2a5bd7';g.fillRect(cx-60,b-330,120,330);g.fillStyle='#e8e8ff';g.beginPath();g.arc(cx,b-370,45,0,7);g.fill();
  if(i===2||i===3){g.fillStyle='#2a5bd7';g.fillRect(cx+60,b-290,170+i*20,40)}}
 return c.toBuffer('image/png')}
const F=(n,buf)=>new w.File([buf],n,{type:'image/png'});
// „Eingebauter“ Sprite-Satz wie im Bündel (dist/game.js): window.__SPRITES__[id]={meta,atlas}
const ORIG_S={meta:{frames:{idle_00:{x:0,y:0,w:10,h:10,ox:-5,oy:-10}}},atlas:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='};
window.__SPRITES__={tiger:ORIG_S};
const S=await import(new URL('../../src/render/customstudio.js',import.meta.url));
const SP=await import(new URL('../../src/render/sprites.js',import.meta.url));
const C=await import(new URL('../../src/core/characters.js',import.meta.url));
const O=await import(new URL('../../src/core/overrides.js',import.meta.url));
const ok=(c,msg)=>{if(!c){console.error('FAIL:',msg);process.exitCode=1}else console.log('ok  ',msg)};
const wait=async(fn,ms=60000)=>{const t=Date.now();while(Date.now()-t<ms){if(fn())return true;await new Promise(r=>setTimeout(r,100))}return false};
const ORIG_DEF=SP.SPRITE_CHARS.tiger,ORIG_KEYS=Object.keys(ORIG_DEF.anims),ORIG_HP=C.CHARACTERS.tiger.hp;

let done=null;S.studioOpen(r=>{done=r});
const m=document.getElementById('studio'),st=()=>m.querySelector('#st-status').textContent;
const sel=m.querySelector('#st-fig');
ok([...sel.querySelectorAll('optgroup')].some(g=>g.label==='Spielfiguren'&&g.querySelector('option[value="base:tiger"]')),'Liste hat die Gruppe „Spielfiguren“ mit H!T');
ok([...sel.querySelectorAll('optgroup')].some(g=>g.label==='Eigene Figuren'),'… und „Eigene Figuren“');

// 1) Spielfigur öffnen: Standard-Sprites werden angezeigt
sel.value='base:tiger';sel.dispatchEvent(new w.Event('change'));
await wait(()=>/Spielfigur/.test(st()));
ok(m.querySelector('h1').textContent.startsWith('SPIEL'),'Titel wechselt auf SPIELFIGUR');
ok(/Standard-Sprites/.test(st()),'Status: Vorschau zeigt Standard-Sprites');
const opts=[...m.querySelectorAll('#st-anim option')].map(o=>o.value);
ok(ORIG_KEYS.length>5&&ORIG_KEYS.every(k=>opts.includes(k)),'alle '+ORIG_KEYS.length+' Standard-Animationen der Figur stehen in der Auswahl');
ok(m.querySelector('#st-tpl').parentElement.style.display==='none','Move-Vorlage ist ausgeblendet');
ok(m.querySelector('#st-fight').style.display==='none','„Speichern & kämpfen“ ist ausgeblendet');
ok(m.querySelector('#st-del').hidden,'„Zurücksetzen“ erst sichtbar, wenn es etwas zurückzusetzen gibt');
ok(m.querySelector('.st-l').style.display!=='none'&&m.querySelectorAll('.st-row').length===20,'Sheet-Slots bleiben sichtbar (zum Austauschen)');
ok(+m.querySelector('#st-hp').value===ORIG_HP,'HP-Regler zeigt den Originalwert ('+ORIG_HP+')');

// 2) Werte ändern + eigene Sheets hochladen + speichern
const hp=m.querySelector('#st-hp');hp.value='1234';hp.dispatchEvent(new w.Event('input',{bubbles:true}));
const drop=m.querySelector('#st-drop'),ev=new w.Event('drop',{bubbles:true,cancelable:true});
ev.dataTransfer={files:[F('Tiger_idle_1.png',mkSheet(3,2,800,800)),F('punch.png',mkSheet(3,2,800,800))]};drop.dispatchEvent(ev);
const stOf=k=>[...m.querySelectorAll('.st-row')].find(r=>r.querySelector('b').textContent===k).querySelector('.st-s').textContent;
await wait(()=>/^(✓|⚠)/.test(stOf('Idle – Teil 1'))&&/^(✓|⚠)/.test(stOf('Leichter Schlag')));
ok(/^(✓|⚠)/.test(stOf('Idle – Teil 1')),'Idle-Sheet für die Spielfigur verarbeitet');
done=null;m.querySelector('#st-save').click();
await wait(()=>done);
ok(done&&done.closed,'Editor schließt nach dem Speichern');
ok(C.CHARACTERS.tiger.hp===1234&&O.ovrHas('tiger'),'Wert gilt sofort im Spiel (HP 1234)');
const rep=window.__SPRITES__.tiger;
ok(rep!==ORIG_S&&rep.replaced===true&&rep.meta.anims&&rep.meta.anims.idle,'Ersatz-Atlas ist im Spiel aktiv');
ok(SP.SPRITE_CHARS.tiger!==ORIG_DEF&&ORIG_KEYS.every(k=>SP.SPRITE_CHARS.tiger.anims[k]),'jede Original-Animation hat einen Eintrag (Behelf Idle) – im Kampf fehlt nichts');
ok(SP.SPRITE_CHARS.tiger.anims.idle===rep.meta.anims.idle,'Idle kommt aus den eigenen Sheets');
ok(ORIG_DEF.anims&&Object.keys(ORIG_DEF.anims).length===ORIG_KEYS.length,'Original-Definition bleibt unverändert');
ok(SP.skinImg(rep,'tiger',1)===rep.img,'Farbvarianten werden für Ersatz-Atlanten nicht umgefärbt');
await wait(()=>m.querySelector('h1').textContent.startsWith('EIGENE'));
ok(m.querySelector('h1').textContent.startsWith('EIGENE'),'nach dem Schließen wieder im Modus „Eigene Figur“');

// 3) „Neustart“: Spiel frisch laden -> gespeicherte Ersatz-Sprites werden angewendet
window.__SPRITES__.tiger=ORIG_S;SP.registerSpriteChar('tiger',ORIG_DEF);
await S.studioLoadSaved();
ok(window.__SPRITES__.tiger&&window.__SPRITES__.tiger.replaced===true,'nach Neustart: Ersatz-Sprites wieder aktiv (aus IndexedDB)');

// 4) Editor erneut öffnen: Ersatz wird angezeigt, Zurücksetzen stellt alles her
S.studioOpen(r=>{done=r});
sel.value='base:tiger';sel.dispatchEvent(new w.Event('change'));
await wait(()=>/deine Ersatz-Sprites/.test(st()));
ok(/deine Ersatz-Sprites/.test(st()),'Editor zeigt die gespeicherten Ersatz-Sprites');
ok(!m.querySelector('#st-del').hidden&&m.querySelector('#st-del').textContent==='Zurücksetzen','Knopf „Zurücksetzen“ ist da');
ok(+m.querySelector('#st-hp').value===1234,'gespeicherter Wert wird angezeigt');
m.querySelector('#st-del').click();
await wait(()=>/Zurückgesetzt/.test(st()));
ok(/Zurückgesetzt/.test(st()),'Zurücksetzen läuft durch');
ok(window.__SPRITES__.tiger===ORIG_S&&SP.SPRITE_CHARS.tiger===ORIG_DEF,'Original-Sprites sind wieder im Spiel');
ok(C.CHARACTERS.tiger.hp===ORIG_HP&&!O.ovrHas('tiger'),'Original-Werte sind wieder da (HP '+ORIG_HP+')');
// Gegenprobe: nach erneutem „Neustart“ kommt nichts mehr zurück
await S.studioLoadSaved();
ok(window.__SPRITES__.tiger===ORIG_S,'nach Zurücksetzen kein Ersatz mehr im Speicher');
process.exit(process.exitCode||0);
