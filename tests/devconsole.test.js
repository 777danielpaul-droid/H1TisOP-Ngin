// Entwicklerkonsole (render/devconsole.js): Befehle, Fehlerausgabe, Tastenlogik. Ohne DOM.  node tests/devconsole.test.js
import assert from'node:assert/strict';
import{DevConsole,DEV_TOGGLE}from'../src/render/devconsole.js';
const ok=n=>console.log('  ✓',n),txt=c=>c.log.map(l=>l.t).join('\n'),ev=(code,o={})=>({code,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,...o}),combo=ev('KeyD',{ctrlKey:true,altKey:true});
// help
{const c=new DevConsole();c.exec('help');const t=txt(c);assert.match(t,/> help/);assert.match(t,/Verfügbare Befehle/);assert.match(t,/help\s+Zeigt alle Befehle/);assert.ok(!c.log.some(l=>l.cls==='dc-err'));ok('help listet die verfügbaren Befehle')}
{const c=new DevConsole();c.add('ping','Antwortet pong',()=>'pong');c.exec('  HELP  ');assert.match(txt(c),/ping\s+Antwortet pong/);c.exec('PING x y');assert.equal(c.log.at(-1).t,'pong');ok('neue Befehle erscheinen in help; Groß-/Kleinschreibung + Leerzeichen egal')}
// Fehler
{const c=new DevConsole();c.exec('gibtsnicht 1');const l=c.log.at(-1);assert.equal(l.cls,'dc-err');assert.match(l.t,/Unbekannter Befehl: „gibtsnicht“/);c.exec('   ');c.exec('');assert.equal(c.log.length,2,'leere Eingabe tut nichts');ok('unbekannter Befehl -> Fehlermeldung, leere Zeile wird ignoriert')}
{const c=new DevConsole();c.add('boom','wirft',()=>{throw new Error('kaputt')});c.exec('boom');assert.deepEqual(c.log.at(-1),{t:'Fehler: kaputt',cls:'dc-err'});c.exec('help');ok('Ausnahme im Befehl -> Fehlerzeile, Konsole läuft weiter')}
{const c=new DevConsole();c.add('args','',a=>a.join('|'));c.exec('args a  b c');assert.equal(c.log.at(-1).t,'a|b|c');for(let i=0;i<150;i++)c.exec('help');assert.ok(c.log.length<=100);ok('Argumente werden übergeben, Ausgabe ist auf 100 Zeilen begrenzt')}
// Tasten
{assert.ok(DEV_TOGGLE(combo));for(const o of[{ctrlKey:true},{altKey:true},{ctrlKey:true,altKey:true,shiftKey:true},{ctrlKey:true,altKey:true,metaKey:true}])assert.ok(!DEV_TOGGLE(ev('KeyD',o)));assert.ok(!DEV_TOGGLE(ev('KeyF',{ctrlKey:true,altKey:true})));ok('Tastenkombination ist genau Strg+Alt+D')}
{let o=0,cl=0,block=false;const c=new DevConsole({onOpen:()=>o++,onClose:()=>cl++,blocked:()=>block});
 assert.equal(c.key(ev('KeyW')),0,'geschlossen: Spieltaste gehört dem Spiel');
 block=true;assert.equal(c.key(combo),0);assert.ok(!c.isOpen,'blockiert (z. B. Intro/Panel): öffnet nicht');block=false;
 assert.equal(c.key(combo),2);assert.ok(c.isOpen&&o===1,'öffnen');
 assert.equal(c.key(ev('KeyW')),1,'offen: Spiel bekommt keine Taste');assert.equal(c.key(ev('Space')),1);
 block=true;assert.equal(c.key(combo),2);assert.ok(!c.isOpen&&cl===1,'Kombination schließt auch dann, wenn blocked() true wäre');block=false;
 c.key(combo);assert.equal(c.key(ev('Escape')),2);assert.ok(!c.isOpen&&cl===2,'Esc schließt');
 assert.equal(c.key(ev('Escape')),0,'geschlossen: Esc gehört dem Spiel');ok('Öffnen/Schließen per Kombination und Esc, Blockade, Tasten werden nur offen verschluckt')}
{const c=new DevConsole();c.open();c.inp={value:'help',blur(){}};assert.equal(c.key(ev('Enter')),2);assert.equal(c.inp.value,'');assert.match(txt(c),/Verfügbare Befehle/);ok('Enter führt die Eingabezeile aus und leert sie')}
// ---- Sicherheit: harmlose Angriffstests (siehe docs/SECURITY-DEVCONSOLE.md) ----
{const c=new DevConsole();let hit=0;globalThis.__pwn=()=>hit++;
 for(const s of['eval(1+1)','__pwn()','constructor','__proto__','toString','hasOwnProperty x','<img src=x onerror=__pwn()>','<script>__pwn()</script>','help;__pwn()','help && ls','help | cat','$(id)','`id`','help\u0000','help\n__pwn()','\'; DROP TABLE x;--','{{7*7}}','../../etc/passwd'])c.exec(s);
 assert.equal(hit,0,'keine Eingabe führt Code aus');
 assert.ok(c.log.filter(l=>l.cls==='dc-err').length>=15,'jeder Angriff endet als Fehlermeldung');delete globalThis.__pwn;ok('Injection-Eingaben (JS/HTML/SQL/Shell/Prototype) werden nie ausgeführt')}
{const c=new DevConsole();c.exec('a'.repeat(201));assert.match(c.log.at(-1).t,/zu lang/);c.exec('help '+'x'.repeat(41));assert.match(c.log.at(-1).t,/zu lange Argumente/);c.exec('help 1 2 3 4 5 6 7 8 9');assert.match(c.log.at(-1).t,/zu viele/i);
 c.exec('help \u202e\u200b');assert.match(c.log.at(-1).t,/Ungültige Zeichen/);ok('Eingabelänge, Argumentzahl/-länge und Zeichensatz werden geprüft')}
{const c=new DevConsole();c.exec('x'.repeat(30));assert.ok(c.log.at(-1).t.length<=90,'Unbekannter-Befehl-Echo gekürzt');c.add('big','',()=>'y'.repeat(5000));c.exec('big');assert.ok(c.log.at(-1).t.length<=401,'Ausgabe gekürzt');
 c.add('leak','',()=>{throw new Error('Z'.repeat(1000))});c.exec('leak');assert.ok(c.log.at(-1).t.length<=170,'Fehlertext gekürzt');ok('Ausgabe, Echo und Fehlertexte sind längenbegrenzt')}
{let t=0;const c=new DevConsole({now:()=>t});let n=0;c.add('tick','',()=>{n++});for(let i=0;i<100;i++)c.exec('tick');assert.equal(n,30,'30 Eingaben pro Fenster');
 const warn=c.log.filter(l=>/Zu viele Befehle/.test(l.t)).length;assert.equal(warn,1,'Warnung nur einmal, kein Log-Fluten');t=6000;c.exec('tick');assert.equal(n,31,'nach dem Fenster geht es wieder');ok('Rate-Limit: Spam wird gedrosselt und hebt sich selbst wieder auf')}
{const c=new DevConsole();assert.throws(()=>c.add('__proto__','x',()=>1),/Ungültige/);assert.throws(()=>c.add('a b','x',()=>1),/Ungültige/);assert.throws(()=>c.add('ok','x','console.log(1)'),/Ungültige/);ok('Registrierung nimmt nur gültige Namen und echte Funktionen an (kein String-Code)')}
{const c=new DevConsole({deny:()=>true});let n=0;c.add('cheat','',()=>{n++});c.exec('cheat');assert.equal(n,0);assert.match(c.log.at(-1).t,/Online/);ok('Online-Kampf sperrt Befehle')}
{const s=globalThis.localStorage,l=globalThis.location,store={};globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}};
 const{loadUnlocks}=await import('../src/core/unlocks.js');
 globalThis.location={search:'?unlock=anubis,<script>,a'+'b'.repeat(40)+','+Array.from({length:60},(_,i)=>'id'+i).join(',')};const a=loadUnlocks();
 assert.ok(a.includes('anubis')&&a.length<=32&&a.every(x=>/^[a-z0-9_-]{1,24}$/i.test(x)),'nur gültige IDs, maximal 32');
 store['hitisop.unlocks']=JSON.stringify([{x:1},'<b>',42,'leon']);globalThis.location={search:''};assert.deepEqual(loadUnlocks(),['leon'],'manipulierter Speicher wird gefiltert');
 globalThis.localStorage=s;globalThis.location=l;ok('?unlock= und manipulierter Speicher: nur gültige, begrenzte IDs')}
console.log('Dev-Konsolen-Tests bestanden');
