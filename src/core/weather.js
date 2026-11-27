// Wetter im Vordergrund (Optionen-Menü): Blätter (Kirschblüten), Regen, beides oder zufällig. Reine Logik (kein DOM) -> testbar.
export const WEATHER_MODES=['leaves','rain','both','random'];
export const weatherMode=v=>WEATHER_MODES.includes(v)?v:'leaves';   // unbekannter/leerer Wert -> bisheriges Verhalten (Blätter)
// Was läuft tatsächlich? 'random' würfelt (rnd = Math.random): Blätter, Regen oder beides, je 1/3. Gewürfelt wird einmal pro Kampf / Demokampf.
export const weatherPick=(mode,rnd=Math.random)=>{mode=weatherMode(mode);if(mode==='random'){const r=rnd();mode=r<1/3?'leaves':r<2/3?'rain':'both'}return{leaves:mode!=='rain',rain:mode!=='leaves'}};
