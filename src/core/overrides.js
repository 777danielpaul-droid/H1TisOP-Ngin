// Anpassungen an den eingebauten Spielfiguren (Editor „Spielfiguren“). Eine Schicht über CHARACTERS: die Quelldateien (characters.js, movesets.js) bleiben unverändert,
// nur die vom Editor geänderten Felder werden beim Start über die Originalwerte gelegt und lassen sich jederzeit zurücksetzen. Gespeichert im Browser (localStorage).
// Ohne localStorage (Tests, gesperrter Speicher) passiert nichts. Online-Kämpfe laufen immer mit den Originalwerten (ovrSuspend), sonst würden beide Seiten auseinanderlaufen.
import{CHARACTERS}from'./characters.js';
export const OVR_KEY='hitisop.overrides';
// Änderbare Zahlenwerte mit Grenzen (die Oberfläche zeigt sie als Leben, Tempo = walk, Schaden = dmg, Abwehr = 100/def)
export const OVR_LIMITS={hp:[50,3000],walk:[.4,2],dmg:[.2,3],def:[.4,2]};
export const OVR_FIELDS=['name','hp','walk','dmg','def','glow'];
const ORIG={};   // id -> {Feld: Originalwert} für alle gerade überschriebenen Felder
let suspended=false;
const round=(k,v)=>k==='hp'?Math.round(v):Math.round(v*1000)/1000;
// Eingabe bereinigen: nur bekannte Felder, Zahlen in Grenzen, Name wie bei eigenen Figuren, Farbe als #rrggbb
export function ovrClean(o){const r={};if(!o||typeof o!=='object')return r;
 if(typeof o.name==='string'){const n=o.name.replace(/[^\p{L}\p{N} !.\-_']/gu,'').trim().toUpperCase().slice(0,14);if(n)r.name=n}
 for(const k in OVR_LIMITS){if(o[k]==null||o[k]==='')continue;const v=+o[k];if(Number.isFinite(v))r[k]=round(k,Math.min(OVR_LIMITS[k][1],Math.max(OVR_LIMITS[k][0],v)))}
 if(typeof o.glow==='string'&&/^#[0-9a-fA-F]{6}$/.test(o.glow))r.glow=o.glow.toLowerCase();
 return r}
export const ovrAll=()=>{try{const v=JSON.parse(localStorage.getItem(OVR_KEY)||'{}');if(!v||typeof v!=='object'||Array.isArray(v))return{};const out={};
 for(const id in v)if(CHARACTERS[id]&&id!=='custom'){const c=ovrClean(v[id]);if(Object.keys(c).length)out[id]=c}return out}catch(e){return{}}};
const store=all=>{try{if(Object.keys(all).length)localStorage.setItem(OVR_KEY,JSON.stringify(all));else localStorage.removeItem(OVR_KEY);return true}catch(e){return false}};
// Originalwert eines Feldes (auch wenn es gerade überschrieben ist)
export const ovrOriginal=(id,k)=>{const c=CHARACTERS[id];return ORIG[id]&&k in ORIG[id]?ORIG[id][k]:c&&c[k]};
// Überschreibungen einer Figur auf CHARACTERS legen; Felder, die nicht mehr überschrieben sind, bekommen ihren Originalwert zurück
export function ovrApply(id,o){const c=CHARACTERS[id];if(!c||id==='custom')return;const orig=ORIG[id]||(ORIG[id]={});o=suspended?{}:ovrClean(o);
 for(const k of Object.keys(orig))if(!(k in o)){c[k]=orig[k];delete orig[k]}
 for(const k in o){if(!(k in orig))orig[k]=c[k];c[k]=o[k]}}
export function ovrApplyAll(){const a=ovrAll();for(const id in a)ovrApply(id,a[id])}
// Eine Figur speichern: Felder, die dem Original entsprechen, fallen weg; leer = Figur ist wieder original. -> true, wenn gespeichert
export function ovrSet(id,o){if(!CHARACTERS[id]||id==='custom')return false;o=ovrClean(o);
 for(const k of Object.keys(o))if(o[k]===ovrOriginal(id,k))delete o[k];
 const all=ovrAll();if(Object.keys(o).length)all[id]=o;else delete all[id];
 const ok=store(all);ovrApply(id,all[id]||{});return ok}
export const ovrReset=id=>ovrSet(id,{});
export const ovrHas=id=>!!ovrAll()[id];
// Online-Kampf: Originalwerte für alle, danach wieder die eigenen Anpassungen
export function ovrSuspend(on){suspended=!!on;const all=ovrAll();for(const id of new Set([...Object.keys(ORIG),...Object.keys(all)]))ovrApply(id,all[id]||{})}
// Ersatz-Sprites: Die eigenen Animationen (meta.anims) ersetzen die der Originalfigur. Was die Moves der Figur kennen, das eigene Sheet aber nicht liefert,
// bekommt „idle“ als Behelf (sonst fehlt der Eintrag im Kampf). Die Original-Liste wird nie verändert.
export function ovrSpriteAnims(orig,mine){const out={};mine=mine||{};const fb=mine.idle||Object.values(mine)[0];
 if(fb)for(const k of Object.keys(orig||{}))out[k]=mine[k]||fb;
 return Object.assign(out,mine)}
// Frame-Anpassung einer Standard-Animation (Editor, Atlas bleibt das Original): frames = Namen aus dem Atlas (mind. 1, unbekannte fallen weg), fps 1..60, loop 0/1.
// valid = meta.frames des Atlas (oder null = nicht prüfen).
export function ovrFxClean(e,valid){const r={};if(!e||typeof e!=='object')return r;
 if(Array.isArray(e.frames)){const f=e.frames.filter(n=>typeof n==='string'&&(!valid||Object.prototype.hasOwnProperty.call(valid,n)));if(f.length)r.frames=f}
 if(e.fps!=null&&e.fps!==''&&Number.isFinite(+e.fps))r.fps=Math.min(60,Math.max(1,Math.round(+e.fps)));
 if(e.loop!=null)r.loop=e.loop?1:0;
 return r}
// Nur das behalten, was vom Original abweicht (gleiche Frame-Liste / gleiches Tempo / gleiche Schleife fallen weg); {} = Animation ist wieder original.
export function ovrFxSimplify(e,orig){const r={};if(!e||!orig)return r;
 if(e.frames&&JSON.stringify(e.frames)!==JSON.stringify(orig.frames))r.frames=e.frames;
 if(e.fps!=null&&e.fps!==orig.fps)r.fps=e.fps;
 if(e.loop!=null&&(e.loop?1:0)!==(orig.loop?1:0))r.loop=e.loop?1:0;
 return r}
