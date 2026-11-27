// Anpassungen an den Spielfiguren (Editor): Bereinigung, Überlagerung von CHARACTERS, Zurücksetzen, Online-Schutz. node tests/overrides.test.js
import assert from'node:assert/strict';
// Künstlicher Browser-Speicher (in Node gibt es keinen localStorage)
const mem={};const fake={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}};
try{Object.defineProperty(globalThis,'localStorage',{value:fake,configurable:true,writable:true})}catch(e){globalThis.localStorage=fake}
const{CHARACTERS}=await import('../src/core/characters.js');
const O=await import('../src/core/overrides.js');
let n=0;const ok=(name,fn)=>{fn();n++;console.log('  ✓ '+name)};

ok('ovrClean: Grenzen, Name, Farbe, unbekannte Felder fallen weg',()=>{
 const c=O.ovrClean({name:' rot<b> panda!! ',hp:99999,walk:'1.1',dmg:-4,def:'x',glow:'#FF00AA',evil:1,mods:{}});
 assert.equal(c.name,'ROTB PANDA!!');assert.equal(c.hp,3000);assert.equal(c.walk,1.1);assert.equal(c.dmg,.2);assert.ok(!('def' in c));assert.equal(c.glow,'#ff00aa');assert.ok(!('evil' in c)&&!('mods' in c));
 assert.deepEqual(O.ovrClean(null),{});assert.deepEqual(O.ovrClean({glow:'rot'}),{})});

ok('ovrSet legt Werte über CHARACTERS, Original bleibt abrufbar',()=>{
 const hp0=CHARACTERS.tiger.hp,name0=CHARACTERS.tiger.name;
 assert.equal(O.ovrSet('tiger',{hp:1500,name:'blitz'}),true);
 assert.equal(CHARACTERS.tiger.hp,1500);assert.equal(CHARACTERS.tiger.name,'BLITZ');assert.equal(O.ovrOriginal('tiger','hp'),hp0);assert.equal(O.ovrOriginal('tiger','name'),name0);
 assert.equal(O.ovrHas('tiger'),true);assert.equal(O.ovrHas('kitsune'),false)});

ok('unveränderte Felder (gleich dem Original) werden nicht gespeichert',()=>{
 O.ovrSet('tiger',{hp:1500,name:'BLITZ',walk:CHARACTERS.tiger.walk,glow:CHARACTERS.tiger.glow});
 const s=JSON.parse(mem[O.OVR_KEY]);assert.deepEqual(Object.keys(s.tiger).sort(),['hp','name'])});

ok('Feld zurückändern entfernt es wieder, Figur ohne Änderungen verschwindet',()=>{
 const hp0=O.ovrOriginal('tiger','hp'),name0=O.ovrOriginal('tiger','name');
 O.ovrSet('tiger',{hp:hp0,name:'BLITZ'});assert.equal(CHARACTERS.tiger.hp,hp0);assert.equal(CHARACTERS.tiger.name,'BLITZ');
 O.ovrSet('tiger',{hp:hp0,name:name0});assert.equal(O.ovrHas('tiger'),false);assert.equal(mem[O.OVR_KEY],undefined)});

ok('ovrReset stellt alle Felder wieder her; andere Figuren bleiben unberührt',()=>{
 const k0={...CHARACTERS.kitsune};O.ovrSet('tiger',{hp:900,dmg:1.5,def:.8,walk:1.4,glow:'#112233'});O.ovrSet('kitsune',{hp:1234});
 O.ovrReset('tiger');assert.equal(CHARACTERS.tiger.hp,1056);assert.equal(CHARACTERS.tiger.dmg,1.073);assert.equal(CHARACTERS.tiger.glow,'#3fe0ff');
 assert.equal(CHARACTERS.kitsune.hp,1234);assert.equal(CHARACTERS.kitsune.name,k0.name);assert.equal(O.ovrHas('kitsune'),true)});

ok('ovrApplyAll nach Neustart (Original zurück, dann aus dem Speicher laden)',()=>{
 CHARACTERS.kitsune.hp=1110;                       // wie frisch geladenes Spiel
 O.ovrApplyAll();assert.equal(CHARACTERS.kitsune.hp,1234)});

ok('ovrSuspend: Online-Kampf mit Originalwerten, danach wieder die Anpassungen',()=>{
 O.ovrSuspend(true);assert.equal(CHARACTERS.kitsune.hp,1110);
 O.ovrSuspend(false);assert.equal(CHARACTERS.kitsune.hp,1234)});

ok('Eigene Figur „custom“ und unbekannte IDs sind tabu; kaputter Speicher stört nicht',()=>{
 assert.equal(O.ovrSet('custom',{hp:1}),false);assert.equal(O.ovrSet('gibtsnicht',{hp:1}),false);
 mem[O.OVR_KEY]='{kaputt';assert.deepEqual(O.ovrAll(),{});
 mem[O.OVR_KEY]=JSON.stringify({nix:{hp:5},tiger:{hp:'abc'}});assert.deepEqual(O.ovrAll(),{})});

ok('ovrSpriteAnims: eigene Animationen gewinnen, fehlende der Originalfigur bekommen Idle als Behelf, Original bleibt unverändert',()=>{
 const orig={idle:{frames:['a']},judgement:{frames:['j']},soul:{frames:['s']}},mine={idle:{frames:['x'],loop:1},soul:{frames:['y']},extra:{frames:['e']}};
 const snap=JSON.stringify(orig),r=O.ovrSpriteAnims(orig,mine);
 assert.equal(r.idle,mine.idle);assert.equal(r.soul,mine.soul);assert.equal(r.extra,mine.extra);
 assert.equal(r.judgement,mine.idle);assert.equal(JSON.stringify(orig),snap);
 assert.deepEqual(O.ovrSpriteAnims(orig,{}),{});assert.deepEqual(O.ovrSpriteAnims(null,mine),mine)});

ok('Frame-Anpassung: ovrFxClean (nur Atlas-Frames, mind. 1, fps/loop begrenzt) und ovrFxSimplify (nur Abweichungen)',()=>{
 const valid={a:1,b:1,c:1};
 assert.deepEqual(O.ovrFxClean({frames:['a','x','c',5],fps:'99',loop:0,evil:1},valid),{frames:['a','c'],fps:60,loop:0});
 assert.deepEqual(O.ovrFxClean({frames:['x']},valid),{});assert.deepEqual(O.ovrFxClean({frames:['x','a']},null),{frames:['x','a']});
 assert.deepEqual(O.ovrFxClean({fps:0},valid),{fps:1});assert.deepEqual(O.ovrFxClean(null,valid),{});assert.deepEqual(O.ovrFxClean('x',valid),{});
 const orig={frames:['a','b','c'],fps:8,loop:1};
 assert.deepEqual(O.ovrFxSimplify({frames:['a','b','c'],fps:8,loop:1},orig),{});
 assert.deepEqual(O.ovrFxSimplify({frames:['a','c'],fps:8},orig),{frames:['a','c']});
 assert.deepEqual(O.ovrFxSimplify({frames:['a','b','c'],fps:12,loop:0},orig),{fps:12,loop:0});
 assert.deepEqual(O.ovrFxSimplify({loop:0},{frames:['a']}),{});   // Original ohne loop = 0 -> keine Abweichung
 assert.deepEqual(O.ovrFxSimplify(null,orig),{})});

O.ovrReset('kitsune');
console.log('Spielfiguren-Anpassungen: Tests bestanden ('+n+')');
