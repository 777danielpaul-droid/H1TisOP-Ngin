// Wetter im Vordergrund (Optionen-Menü): Blätter (Kirschblüten), Regen, Nebel und Kombinationen oder zufällig. Reine Logik (kein DOM) -> testbar.
export const WEATHER_MODES=['leaves','rain','fog','both','rainfog','all','random'];   // 'both' = Blätter + Regen (Name bleibt, damit gespeicherte Einstellungen gültig sind)
const SET={leaves:[1,0,0],rain:[0,1,0],fog:[0,0,1],both:[1,1,0],rainfog:[0,1,1],all:[1,1,1]};
// Menge/Dichte je Effekt (Regler im Menü): Faktor 0..2, 1 = Normalwert; ungültig -> 1
export const weatherAmt=v=>{v=+v;return Number.isFinite(v)?Math.max(0,Math.min(2,v)):1};
export const weatherMode=v=>WEATHER_MODES.includes(v)?v:'all';   // unbekannter/leerer Wert (= erster Start) -> alle Effekte an; Auto-Grafik (main.js) regelt die Mengen über GFX.level herunter
// Was läuft tatsächlich? 'random' würfelt (rnd = Math.random) gleichverteilt eine der 6 Varianten. Gewürfelt wird einmal pro Kampf / Demokampf.
export const weatherPick=(mode,rnd=Math.random)=>{mode=weatherMode(mode);if(mode==='random'){const k=Object.keys(SET);mode=k[Math.min(k.length-1,Math.floor(rnd()*k.length))]}const s=SET[mode];return{leaves:!!s[0],rain:!!s[1],fog:!!s[2]}};
