// Sieger-Kampfaura (render/renderer.js celeb): Neon-Nebel für ALLE Figuren, H!T zusätzlich Blitzaura; die alten Flammen-/Spritesheet-Auren sind gelöscht.  node tests/celeb.test.js
import assert from'node:assert/strict';import fs from'node:fs';
import{Renderer}from'../src/render/renderer.js';import{CHARACTERS,ROSTER}from'../src/core/characters.js';
const ok=n=>console.log('  ✓',n);
const ids=[...new Set([...ROSTER,'anubis','cyberdemon','st3g0','leon','bear','rabe'])].filter(i=>CHARACTERS[i]);
const run=(id,front,t=90)=>{const log=[],g=new Proxy({},{get:(o,k)=>k in o?o[k]:(...a)=>{log.push(k);return/^create/.test(k)?{addColorStop(){}}:undefined},set(o,k,v){o[k]=v;return true}});
 const fog={n:0,col:null,draw(gg,tt,r,hex){this.n++;this.col=hex;this.r=r},blit(){}},self={auraFog:{[id]:fog}};
 const f={char:CHARACTERS[id],x:480,y:470};Renderer.prototype.celeb.call(self,g,{celeb:{f,t},frame:t},front);return{log,fog}};
// Nebel bei allen Figuren (hinten gemalt, vorn nur nachgelegt), in der Figurenfarbe, um den Gewinner
for(const id of ids){const back=run(id,false),front=run(id,true);assert.equal(back.fog.n,1,id+': Nebel wird hinter der Figur gemalt');assert.equal(front.fog.n,0,id+': vorn nur nachgelegt (blit), nicht neu gemalt');
 assert.equal(back.fog.col,CHARACTERS[id].glow||'#ffffff',id+': Nebelfarbe = Neonfarbe der Figur');const r=back.fog.r;assert.ok(r.x<480&&r.x+r.w>480&&r.y<470&&r.y+r.h>470-100,id+': Nebel liegt um den Gewinner');
 assert.ok(!back.log.includes('quadraticCurveTo')&&!front.log.includes('quadraticCurveTo'),id+': keine Flammen-/Zungenkontur mehr')}
ok('Nebel in der Figurenfarbe um den Gewinner bei allen '+ids.length+' Figuren (hinten gemalt, vorn nachgelegt), keine Flammenkontur');
// H!T: Blitzaura zusätzlich zum Nebel; alle anderen ohne Blitze
{const t=run('tiger',true,90),k=run('kitsune',true,90);assert.equal(run('tiger',false).fog.n,1,'H!T hat den Nebel auch');
 let bolts=0,others=0;for(let tt=0;tt<60;tt+=2){bolts+=run('tiger',true,tt).log.filter(x=>x==='lineTo').length;others+=run('kitsune',true,tt).log.filter(x=>x==='lineTo').length}
 assert.ok(bolts>others+20,'H!T zeichnet vorn Blitze (lineTo-Pfade), andere nicht ('+bolts+' vs '+others+')');ok('H!T: Blitzaura zusätzlich zum Nebel, alle anderen nur Nebel')}
// Die alten Auren sind gelöscht
assert.equal(typeof Renderer.prototype.auraSprite,'undefined','kein Spritesheet-Aura-Loader mehr');
assert.ok(!fs.existsSync(new URL('../assets/aura',import.meta.url)),'assets/aura gelöscht');assert.ok(!fs.readFileSync(new URL('../tools/build.mjs',import.meta.url),'utf8').includes('__AURA__'),'build.mjs bettet keine Auren mehr ein');
ok('alte Auren gelöscht: auraSprite, assets/aura, __AURA__-Einbettung');
// ohne Siegerfigur nichts zeichnen
{const log=[],g=new Proxy({},{get:(o,k)=>(...a)=>{log.push(k)}});Renderer.prototype.celeb.call({},g,{celeb:null},false);assert.equal(log.length,0);ok('ohne Finale wird nichts gezeichnet')}
console.log('Siegeraura-Tests bestanden');
