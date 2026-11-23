import { W, H, GFX } from "./config.js";
const qn = (n) => Math.max(1, Math.round(n * GFX.fx));
// >>> Dezenz-Regler für Treffer-/Sieg-Glitzer (NICHT für das Feuerwerk) <<<  amt = Menge der Funkelsterne, size = Sterngröße, glint = große Glanzsterne, flare = Lichtkern, ring = Sterne auf Ringen/Druckwellen. 1 = wie vorher.
export const GLT = { amt: 0.38, size: 0.6, glint: 0.55, flare: 0.7, ring: 0.5 };
const qs = (n) => Math.max(1, Math.round(n * GFX.fx * GLT.amt)); // Partikelmenge je Qualitätsstufe
// Feuerwerk-Parameter (1:1 aus Ghostwriter, Zeiten in Sekunden bzw. Frames bei 60 FPS, Distanzen in logischen Pixeln)
const FW = {
  rise: [39, 57],
  stars: 210,
  radius: [0.24, 0.36],
  jitter: 0.06,
  depth: 0.2,
  drag: 1.9,
  gravity: 190,
  life: [1.7, 2.7],
  size: 11,
  pool: 4400,
};
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
// Rakete nach k Frames: schnell am Anfang, zum Scheitel langsamer, mit leichtem Wackeln
function fwPos(r, age) {
  const k = Math.min(1, Math.max(0, age / r.rise)),
    e = 1 - Math.pow(1 - k, 2.2);
  return {
    x: r.x0 + Math.sin(age * 0.2) * 5 * (1 - k),
    y: r.y0 - (r.y0 - r.topY) * e,
    k,
  };
}
// Hex-Farbe -> Farbton (0..360); fast weiß/grau -> kühles Blau
function hexHue(c) {
  let h = String(c || "").replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((x) => x + x)
      .join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return 200;
  const r = parseInt(h.slice(0, 2), 16) / 255,
    g = parseInt(h.slice(2, 4), 16) / 255,
    b = parseInt(h.slice(4, 6), 16) / 255,
    mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  if (d < 0.08) return 200;
  let t =
    mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  t *= 60;
  return t < 0 ? t + 360 : t;
}
const fwBucket = (h) => Math.floor((((h % 360) + 360) % 360) / 10);
// 37 Sprites (36 Farbtöne + weiß), einmalig und erst beim ersten Zeichnen gebaut (läuft so auch ohne Browser in den Tests)
let FWATLAS = null;
function fwAtlas() {
  if (FWATLAS) return FWATLAS;
  FWATLAS = [];
  for (let i = 0; i < 37; i++) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d"),
      h = i * 10 + 5,
      gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (i === 36) {
      gr.addColorStop(0, "hsla(0, 0%, 100%, 1)");
      gr.addColorStop(0.12, "hsla(200, 70%, 96%, 0.95)");
      gr.addColorStop(0.3, "hsla(220, 90%, 85%, 0.4)");
      gr.addColorStop(1, "hsla(220, 100%, 80%, 0)");
    } else {
      gr.addColorStop(0, `hsla(${h}, 100%, 92%, 1)`);
      gr.addColorStop(0.12, `hsla(${h}, 100%, 80%, 0.95)`);
      gr.addColorStop(0.3, `hsla(${h}, 100%, 62%, 0.45)`);
      gr.addColorStop(1, `hsla(${h}, 100%, 55%, 0)`);
    }
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    FWATLAS.push(c);
  }
  return FWATLAS;
}
// ---- Funkel-Sterne: gleiche Optik wie die Feuerwerks-Sterne (weicher Farb-Glow aus dem Atlas, blinkt mit sin³, auf den Blink-Spitzen ein Kreuzglanz) ----
const SPK = new Map();
// Farbe (Hex) -> Atlas-Index 0..36 (36 = weiß); fast weiße/graue Farben = weiß, sonst der Farbton
export function sparkIdx(c) {
  let i = SPK.get(c);
  if (i !== undefined) return i;
  let h = String(c || "").replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((x) => x + x)
      .join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) i = 36;
  else {
    const r = parseInt(h.slice(0, 2), 16) / 255,
      g = parseInt(h.slice(2, 4), 16) / 255,
      b = parseInt(h.slice(4, 6), 16) / 255,
      mx = Math.max(r, g, b),
      d = mx - Math.min(r, g, b);
    i = d < 0.07 || (mx > 0.8 && d < 0.2) ? 36 : fwBucket(hexHue(c));
  }
  SPK.set(c, i);
  return i;
}
const HSL94 = Array.from({ length: 37 }, (_, i) =>
    i === 36 ? "#ffffff" : `hsl(${i * 10 + 5}, 100%, 94%)`,
  ),
  HSL90 = Array.from({ length: 37 }, (_, i) =>
    i === 36 ? "#ffffff" : `hsl(${i * 10 + 5}, 100%, 90%)`,
  ); // Farbstrings einmal vorberechnet
const glowOf = (i) => {
  try {
    return fwAtlas()[i];
  } catch (e) {
    return null;
  }
}; // ohne Browser (Tests) -> null, es wird dann nur ein Punkt gezeichnet
// Ein Funkelstern an (x,y): r = Radius des Glows, spr = Atlas-Index, tw = Blinkwert 0..1, glint 0 = nie Kreuz, 1 = Kreuz auf starken Blinks, 2 = größer + Diagonalen. Alpha setzt der Aufrufer (globalAlpha).
export function sparkDraw(g, x, y, r, spr, tw, glint = 1) {
  const A = glowOf(spr);
  if (A) g.drawImage(A, x - r, y - r, r * 2, r * 2);
  else g.fillRect(x - r * 0.35, y - r * 0.35, r * 0.7, r * 0.7);
  if (glint > 0 && tw > (glint > 1 ? 0.5 : 0.72)) {
    const L = Math.min(r, 12) * (1 + 1.7 * tw) * (glint > 1 ? 1.3 : 1);
    g.fillStyle = HSL94[spr]; // Kreuzglanz: spitz zulaufende Zacken statt Haarlinien
    star4(g, x, y, L, 0, 0.075);
    if (glint > 1) star4(g, x, y, L * 0.52, 0.7854, 0.1);
  }
}
// spitzer 4-Zack-Stern (Glanzstern)
const star4 = (g, x, y, sz, rot, w = 0.13) => {
  const c = Math.cos(rot),
    n = Math.sin(rot),
    q = sz * w,
    P = [0, -sz, q, -q, sz, 0, q, q, 0, sz, -q, q, -sz, 0, -q, -q];
  g.beginPath(); // ohne Canvas-Transformation (günstiger)
  for (let i = 0; i < 16; i += 2) {
    const px = P[i],
      py = P[i + 1],
      X = x + px * c - py * n,
      Y = y + px * n + py * c;
    i ? g.lineTo(X, Y) : g.moveTo(X, Y);
  }
  g.closePath();
  g.fill();
};
const SPK_COLS = ["#ffffff", "#ffe27a", "#7df9ff", "#ff7ae6"];
export class ParticleSystem {
  constructor() {
    this.p = [];
    this.tw = [];
    this.gn = [];
    this.rings = [];
    this.fl = [];
    this.sl = [];
    this.sh = [];
    this.gl = [];
    this.sd = [];
    this.pw = [];
    this.bt = [];
    this.rk = [];
    this.ff = [];
    this.ft = 0;
    this.fs = Array.from({ length: FW.pool }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      z: 0,
      age: 0,
      life: 0,
      r: 1,
      cls: 0,
      ph: 0,
      sp: 0,
      ho: 0,
      white: false,
      h: 200,
    }));
    this.fn = 0;
    this.onBoom = null;
  }
  burst(x, y, o = {}) {
    const n = qn(o.count || 12);
    for (let i = 0; i < n; i++) {
      const a =
        (o.angle !== undefined ? o.angle : Math.random() * 6.283) +
        (Math.random() - 0.5) * (o.spread !== undefined ? o.spread : 6.283);
      const s = (o.speed || 6) * (0.4 + Math.random() * 0.9);
      const l = (o.life || 24) * (0.7 + Math.random() * 0.5);
      this.p.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: l,
        max: l,
        size: o.size || 3,
        color: o.color || "#fff",
        g: o.gravity !== undefined ? o.gravity : 0.15,
        streak: o.streak !== undefined ? o.streak : 1,
      });
    }
  }
  // Schnelle, helle Impact-Partikel (Treffer-Blitz)
  spark(x, y, color, count = 8, speed = 10) {
    count = qn(count);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * 6.283,
        s = speed * (0.4 + Math.random() * 1.2),
        l = (8 + Math.random() * 10) | 0;
      this.p.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: l,
        max: l,
        size: 1.5 + Math.random() * 2,
        color,
        g: 0.25,
        streak: 0.7,
        flash: true,
      });
    }
  }
  // Sternförmige Explosion für Combos / Heavy-Hits
  starburst(x, y, color, count = 16) {
    count = qn(count);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 6.283 + Math.random() * 0.5,
        s = 2 + Math.random() * 7,
        l = (16 + Math.random() * 24) | 0;
      this.p.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: l,
        max: l,
        size: 2.5,
        g: 0.04,
        streak: 1.4,
        color,
      });
    }
  }
  // Schwebenes Konfetti für Wins
  confetti(x, y, color, count = 30) {
    const cols = [color, "#ffffff", "#ffd23f", "#ff4a4a", "#3fe0ff", "#7dffc8"];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * 6.283,
        s = 0.8 + Math.random() * 3,
        l = (50 + Math.random() * 90) | 0;
      this.p.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 0.6,
        life: l,
        max: l,
        size: 2.5 + Math.random() * 3.5,
        color: cols[i % cols.length],
        g: 0.025,
        streak: 0,
        confetti: true,
      });
    }
  }
  // Lichtblitz mit 4-Zacken-Stern (Impact-Flare)
  flare(x, y, color, size = 60, life = 10, rot = 0) {
    if (GFX.fx < 0.5 && size < 150) return;
    size *= GLT.flare;
    this.fl.push({ x, y, color, size, life, l0: life, rot });
  }
  // Klingen-/Schlagstreifen entlang der Schlagrichtung
  slash(x, y, color, ang, len = 90, life = 9, w = 7) {
    if (GFX.fx < 0.5 && len < 150 && Math.random() > 0.5) return;
    this.sl.push({ x, y, color, ang, len, life, l0: life, w });
  }
  // Flache Bodenwelle (Landung, Wandbruch, Knockdown)
  shock(x, y, color, max = 140, life = 20) {
    const n = Math.max(
      3,
      Math.min(12, Math.round((max / 26) * GFX.fx * GLT.ring)),
    );
    this.sh.push({
      x,
      y,
      color,
      r: 8,
      max,
      life,
      l0: life,
      a0: Math.random() * 6.283,
      sp: Array.from({ length: n }, () => Math.random() * 6.283),
    });
  }
  // ---- Glitzer: funkelnde 4-Zack-Sterne (Farben wechseln, flackern) ----
  glitter(x, y, o = {}) {
    if (this.gl.length > 1000 * GFX.fx) return;
    const n = qn(o.count || 14),
      cols = o.colors || ["#ffffff", "#ffe27a", "#7df9ff", "#ff7ae6"];
    for (let i = 0; i < n; i++) {
      const a =
          (o.angle !== undefined ? o.angle : Math.random() * 6.283) +
          (Math.random() - 0.5) * (o.spread !== undefined ? o.spread : 6.283),
        s = (o.speed || 6) * (o.exact ? 1 : 0.25 + Math.random()),
        l = (o.life || 40) * (0.6 + Math.random() * 0.8);
      this.gl.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: l,
        max: l,
        size: (o.size || 4) * (0.5 + Math.random()),
        col: cols[(Math.random() * cols.length) | 0],
        rot: Math.random() * 3,
        vr: (Math.random() - 0.5) * 0.3,
        g: o.gravity !== undefined ? o.gravity : 0.12,
        ph: Math.random() * 6.28,
        age: 0,
      });
    }
  }
  // Drehende Splitter/Konfetti-Plättchen (kippen beim Fallen = glitzern)
  shard(x, y, o = {}) {
    if (this.sd.length > 500) return;
    const n = o.count || 8,
      cols = o.colors || ["#ffffff", "#ffe27a", "#7df9ff", "#ff7ae6"];
    for (let i = 0; i < n; i++) {
      const a =
          (o.angle !== undefined ? o.angle : Math.random() * 6.283) +
          (Math.random() - 0.5) * (o.spread !== undefined ? o.spread : 6.283),
        s = (o.speed || 6) * (0.3 + Math.random()),
        l = (o.life || 50) * (0.7 + Math.random() * 0.6);
      this.sd.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: l,
        max: l,
        w: (o.w || 5) * (0.6 + Math.random()),
        h: (o.h || 10) * (0.6 + Math.random()),
        col: cols[(Math.random() * cols.length) | 0],
        rot: Math.random() * 6.283,
        vr: (Math.random() - 0.5) * 0.4,
        g: o.gravity !== undefined ? o.gravity : 0.3,
        drag: o.drag || 0.985,
        ph: Math.random() * 6.28,
        age: 0,
      });
    }
  }
  // Comic-Zackenstern (Treffer-Explosion) + Blitzbogen
  starpop(x, y, color, size = 70, life = 9) {
    if (GFX.fx < 0.5 && size < 150) return;
    this.pw.push({
      x,
      y,
      color,
      size,
      life,
      l0: life,
      rot: Math.random() * 6.283,
      n: 9 + ((Math.random() * 5) | 0),
      seed: Math.random() * 100,
    });
  }
  bolt(x, y, color, ang, len = 120, life = 7) {
    if (GFX.fx < 0.5 || (GFX.fx < 1 && Math.random() > 0.5)) return;
    const pts = [[x, y]];
    let px = x,
      py = y,
      a = ang;
    const n = 6;
    for (let i = 0; i < n; i++) {
      a += (Math.random() - 0.5) * 1.1;
      px += (Math.cos(a) * len) / n;
      py += (Math.sin(a) * len) / n;
      pts.push([px, py]);
    }
    this.bt.push({ pts, color, life, l0: life });
  }
  // Feuerwerk (aus Ghostwriter übernommen): Rakete steigt mit Schweif auf und platzt zu einer Kugel aus blinkenden Sternen.
  // x,y = Start, ty = Höhe der Explosion, color = Grundfarbe der Kugel (Hex)
  rocket(x, y, ty, color, sc = 1) {
    this.rk.push({
      sc,
      x0: x,
      y0: y,
      topY: ty,
      age: 0,
      rise: FW.rise[0] + Math.random() * (FW.rise[1] - FW.rise[0]),
      h: hexHue(color),
      x: x,
      y: y,
    });
  }
  _fwStar() {
    const p = this.fs[this.fn];
    this.fn = (this.fn + 1) % this.fs.length;
    const roll = Math.random();
    p.cls = roll < 0.6 ? 0 : roll < 0.92 ? 1 : 2;
    p.r =
      p.cls === 0
        ? 0.8 + Math.random() * 0.4
        : p.cls === 1
          ? 1.3 + Math.random() * 0.7
          : 2.2 + Math.random() * 0.8;
    p.ph = Math.random() * 6.2832;
    p.sp = 2 + Math.random() * 6;
    p.ho = (Math.random() - 0.5) * 50;
    p.white = Math.random() < 0.14;
    p.alive = true;
    p.age = 0;
    p.z = 0;
    return p;
  }
  // Die Explosion: echte Kugel. Flugrichtungen gleichmäßig auf einer 3D-Kugel (Fibonacci-Spirale), sichtbar ist die Seitenansicht.
  boom(r) {
    const R =
        (r.sc || 1) *
        Math.min(W, H) *
        (FW.radius[0] + Math.random() * (FW.radius[1] - FW.radius[0])),
      off = Math.random() * 6.2832;
    const NS = Math.max(40, Math.round(FW.stars * GFX.fireworks * (r.nx || 1)));
    for (let i = 0; i < NS; i++) {
      const p = this._fwStar(),
        z = 1 - (2 * (i + 0.5)) / NS + (Math.random() - 0.5) * 0.04,
        side = Math.sqrt(Math.max(0, 1 - z * z)),
        ang = off + i * GOLDEN,
        v = R * FW.drag * (1 - Math.random() * FW.jitter);
      p.x = r.x;
      p.y = r.y;
      p.vx = Math.cos(ang) * side * v;
      p.vy = Math.sin(ang) * side * v;
      p.z = z;
      p.life =
        (FW.life[0] + Math.random() * (FW.life[1] - FW.life[0])) *
        (r.sc && r.sc < 1 ? 0.65 : 1) *
        (r.lf || 1);
      p.h = r.h;
    }
    this.ff.push({ x: r.x, y: r.y, age: 0 });
    if (this.onBoom) this.onBoom(r);
  }
  // Riesen-Kugel für den Finalschlag (ohne Aufstieg, sofort): sc = Radius-Faktor (1 = normale Rakete ~ 130-195 px), nx = Sternenmenge, lf = Lebensdauer; r.fin -> kein Böller-Sound, dafür Flare/Starburst im onBoom-Handler
  mega(x, y, color, sc = 2.5, nx = 3, lf = 1.4) {
    const r = { sc, x, y, h: hexHue(color), nx, lf, fin: true, mega: true };
    this.boom(r);
  }
  // ---- Funkeln (Hit-/Sieg-Effekte): blinkende Sterne wie beim Feuerwerk. Einheiten: Pixel/Bild ----
  // x,y Start · o: count, speed, life (Bilder), size (Durchmesser-Faktor, ~10), colors (Hex-Liste), gravity, dr (Reibung je Bild, <1), angle+spread (Richtung), exact (alle gleich schnell), jx/jy (Streuung des Startpunkts),
  //   delay (max. Verzögerung -> die Sterne zünden nacheinander), blink [min,max] (rad/Bild), glint 0 = ohne Kreuzglanz, z (Tiefe -1..1)
  _spk(x, y, vx, vy, o, life, cls, z) {
    const cols = o.colors || SPK_COLS,
      c = cols[(Math.random() * cols.length) | 0],
      bl = o.blink || [0.24, 0.58];
    let spr = sparkIdx(c);
    if (spr !== 36) {
      if (Math.random() < 0.12) spr = 36;
      else spr = (spr + ((Math.random() * 3) | 0) + 35) % 36;
    }
    this.tw.push({
      x: x + (o.jx ? (Math.random() - 0.5) * o.jx : 0),
      y: y + (o.jy ? (Math.random() - 0.5) * o.jy : 0),
      vx,
      vy,
      g: o.gravity !== undefined ? o.gravity : 0.05,
      dr: o.dr !== undefined ? o.dr : 0.95,
      age: -(o.delay ? Math.random() * o.delay : 0),
      life,
      r:
        (o.size || 10) *
        0.64 *
        GLT.size *
        (cls === 0
          ? 0.8 + Math.random() * 0.4
          : cls === 1
            ? 1.3 + Math.random() * 0.7
            : 2.2 + Math.random() * 0.8),
      spr,
      sp: bl[0] + Math.random() * (bl[1] - bl[0]),
      ph: Math.random() * 6.283,
      gc: o.glint === 0 ? 0 : cls,
      z: z || 0,
    });
  }
  sparkle(x, y, o = {}) {
    if (this.tw.length > 1100 * GFX.fx) return;
    const n = qs(o.count || 12);
    for (let i = 0; i < n; i++) {
      const a =
          (o.angle !== undefined ? o.angle : Math.random() * 6.283) +
          (Math.random() - 0.5) * (o.spread !== undefined ? o.spread : 6.283),
        s = (o.speed || 5) * (o.exact ? 1 : 0.25 + Math.random() * 0.95),
        roll = Math.random();
      this._spk(
        x,
        y,
        Math.cos(a) * s,
        Math.sin(a) * s,
        o,
        (o.life || 50) * (0.65 + Math.random() * 0.7),
        roll < 0.6 ? 0 : roll < 0.92 ? 1 : 2,
        o.z,
      );
    }
  }
  // Kugel aus Funkelsternen (wie die Feuerwerks-Kugel, aber im Vordergrund): R = Endradius in Pixeln
  sparkleBall(x, y, color, R = 120, o = {}) {
    if (this.tw.length > 1100 * GFX.fx) return;
    const N = qs(o.count || 80),
      dr = o.dr || 0.94,
      v0 = (R * (1 - dr)) / dr,
      off = Math.random() * 6.283,
      oo = {
        ...o,
        colors: o.colors || [color, color, "#ffffff", "#ffe27a"],
        dr,
        gravity: o.gravity !== undefined ? o.gravity : 0.035,
      };
    for (let i = 0; i < N; i++) {
      const z = 1 - (2 * (i + 0.5)) / N + (Math.random() - 0.5) * 0.04,
        side = Math.sqrt(Math.max(0, 1 - z * z)),
        ang = off + i * GOLDEN,
        v = v0 * (1 - Math.random() * 0.08),
        roll = Math.random();
      this._spk(
        x,
        y,
        Math.cos(ang) * side * v,
        Math.sin(ang) * side * v,
        oo,
        (o.life || 80) * (0.75 + Math.random() * 0.5),
        roll < 0.6 ? 0 : roll < 0.92 ? 1 : 2,
        z,
      );
    }
  }
  // Ring aus Funkelsternen, der nach außen läuft (flach wie ring(): Höhe = 70 %)
  sparkleRing(x, y, color, R = 80, o = {}) {
    if (this.tw.length > 1100 * GFX.fx) return;
    const N = qs(o.count || Math.round(10 + R / 7)),
      dr = o.dr || 0.9,
      v0 = (R * (1 - dr)) / dr,
      off = Math.random() * 6.283,
      oo = {
        ...o,
        colors: o.colors || [color, color, "#ffffff"],
        dr,
        gravity: o.gravity !== undefined ? o.gravity : 0,
      };
    for (let i = 0; i < N; i++) {
      const a = off + (i / N) * 6.2832;
      this._spk(
        x,
        y,
        Math.cos(a) * v0,
        Math.sin(a) * v0 * 0.7,
        oo,
        (o.life || 34) * (0.8 + Math.random() * 0.4),
        Math.random() < 0.75 ? 0 : 1,
        0,
      );
    }
  }
  // Glanzstern: großer, spitzer Stern mit weichem Glow, poppt auf und blinkt aus (ersetzt Comic-Zackenstern/Fadenkreuz). delay = Bilder bis zum Erscheinen
  glint(x, y, color, size = 60, life = 14, delay = 0) {
    if (GFX.fx < 0.5 && size < 120) return;
    size *= GLT.glint;
    this.gn.push({
      x,
      y,
      spr: sparkIdx(color),
      size,
      life,
      l0: life,
      rot: (Math.random() - 0.5) * 0.6,
      d: delay,
      sp: 0.45 + Math.random() * 0.35,
      ph: Math.random() * 6.283,
    });
  }
  ring(x, y, color, max = 60) {
    const n = Math.max(
      3,
      Math.min(16, Math.round((max / 9) * GFX.fx * GLT.ring)),
    );
    this.rings.push({
      x,
      y,
      r: 6,
      max,
      color,
      life: 14,
      l0: 14,
      a0: Math.random() * 6.283,
      sp: Array.from({ length: n }, () => Math.random() * 6.283),
    });
  }
  update() {
    for (const p of this.p) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.vx *= 0.96;
      p.life--;
    }
    this.p = this.p.filter((p) => p.life > 0);
    for (const r of this.rings) {
      r.r += (r.max - r.r) * 0.25;
      r.life--;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const l of [this.fl, this.sl]) for (const e of l) e.life--;
    this.fl = this.fl.filter((e) => e.life > 0);
    this.sl = this.sl.filter((e) => e.life > 0);
    for (const q of this.gl) {
      q.x += q.vx;
      q.y += q.vy;
      q.vy += q.g;
      q.vx *= 0.97;
      q.rot += q.vr;
      q.life--;
      q.age++;
    }
    this.gl = this.gl.filter((q) => q.life > 0);
    for (const q of this.sd) {
      q.x += q.vx;
      q.y += q.vy;
      q.vy += q.g;
      q.vx *= q.drag;
      q.vy *= q.drag;
      q.rot += q.vr;
      q.life--;
      q.age++;
    }
    this.sd = this.sd.filter((q) => q.life > 0);
    for (const q of this.tw) {
      if (q.age < 0) {
        q.age++;
        continue;
      }
      q.vx *= q.dr;
      q.vy = q.vy * q.dr + q.g;
      q.x += q.vx;
      q.y += q.vy;
      q.age++;
    }
    this.tw = this.tw.filter((q) => q.age < q.life);
    for (const e of this.gn) {
      if (e.d > 0) e.d--;
      else e.life--;
    }
    this.gn = this.gn.filter((e) => e.life > 0);
    for (const l of [this.pw, this.bt]) for (const e of l) e.life--;
    this.pw = this.pw.filter((e) => e.life > 0);
    this.bt = this.bt.filter((e) => e.life > 0);
    this.ft++;
    const dt = 1 / 60;
    for (let i = this.rk.length - 1; i >= 0; i--) {
      const r = this.rk[i];
      r.age++;
      const q = fwPos(r, r.age);
      r.x = q.x;
      r.y = q.y;
      if (q.k >= 1) {
        this.rk.splice(i, 1);
        this.boom(r);
        continue;
      }
      const p = this._fwStar();
      p.cls = 0;
      p.r = 0.7 + Math.random() * 0.4;
      p.x = q.x + (Math.random() - 0.5) * 4;
      p.y = q.y + 4;
      p.vx = (Math.random() - 0.5) * 40;
      p.vy = 30 + Math.random() * 60;
      p.life = 0.5 + Math.random() * 0.4;
      p.h = r.h;
    }
    const dec = Math.exp(-FW.drag * dt);
    for (const p of this.fs) {
      if (!p.alive) continue;
      p.age += dt;
      p.vy += FW.gravity * dt;
      p.vx *= dec;
      p.vy *= dec;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age > p.life) p.alive = false;
    }
    for (let i = this.ff.length - 1; i >= 0; i--) {
      this.ff[i].age += dt;
      if (this.ff[i].age > 0.4) this.ff.splice(i, 1);
    }
    for (const r of this.sh) {
      r.r += (r.max - r.r) * 0.18;
      r.life--;
    }
    this.sh = this.sh.filter((r) => r.life > 0);
  }
  _drawFw(g) {
    if (!this.rk.length && !this.ff.length && !this.fs.some((p) => p.alive))
      return;
    const A = fwAtlas(),
      T = this.ft / 60;
    for (const f of this.ff) {
      const k = f.age / 0.4,
        sz = 220 + 260 * k;
      g.globalAlpha = 0.55 * (1 - k) * (1 - k);
      g.drawImage(A[36], f.x - sz / 2, f.y - sz / 2, sz, sz);
    }
    for (const r of this.rk) {
      for (let j = 0; j < 6; j++) {
        const q = fwPos(r, Math.max(0, r.age - j * 1.56)),
          sz = 20 - j * 2.2;
        g.globalAlpha = (1 - j / 6) * (j === 0 ? 1 : 0.55);
        g.drawImage(A[36], q.x - sz / 2, q.y - sz / 2, sz, sz);
      }
    }
    for (const p of this.fs) {
      if (!p.alive) continue;
      const s = 0.5 + 0.5 * Math.sin(T * p.sp + p.ph),
        tw = s * s * s,
        fade = Math.min(1, p.age / 0.05) * Math.min(1, (p.life - p.age) / 0.8),
        a = (0.28 + 0.72 * tw) * fade;
      if (a < 0.01) continue;
      const hue = p.h + 30 + p.ho,
        sp = A[p.white ? 36 : fwBucket(hue)],
        sz =
          p.r *
          FW.size *
          (0.8 + 0.5 * tw) *
          (0.65 + 0.35 * fade) *
          (1 + FW.depth * p.z);
      g.globalAlpha = a;
      g.drawImage(sp, p.x - sz / 2, p.y - sz / 2, sz, sz);
      if (p.vx * p.vx + p.vy * p.vy > 67600) {
        g.globalAlpha = a * 0.35;
        g.drawImage(
          sp,
          p.x - p.vx * 0.018 - sz / 2,
          p.y - p.vy * 0.018 - sz / 2,
          sz,
          sz,
        );
        g.globalAlpha = a * 0.16;
        g.drawImage(
          sp,
          p.x - p.vx * 0.036 - sz / 2,
          p.y - p.vy * 0.036 - sz / 2,
          sz,
          sz,
        );
      }
      if (p.cls >= 1 && tw > (p.cls === 2 ? 0.55 : 0.85)) {
        const L = p.r * (3 + 6 * tw) * (p.cls === 2 ? 1.6 : 1);
        g.globalAlpha = Math.min(1, a * 0.9);
        g.lineWidth = 1;
        g.strokeStyle =
          "hsla(" + (((hue % 360) + 360) % 360).toFixed(1) + ", 100%, 90%, 1)";
        g.beginPath();
        g.moveTo(p.x - L, p.y);
        g.lineTo(p.x + L, p.y);
        g.moveTo(p.x, p.y - L);
        g.lineTo(p.x, p.y + L);
        if (p.cls === 2) {
          const d = L * 0.5;
          g.moveTo(p.x - d, p.y - d);
          g.lineTo(p.x + d, p.y + d);
          g.moveTo(p.x - d, p.y + d);
          g.lineTo(p.x + d, p.y - d);
        }
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  }
  // Feuerwerk als eigene Ebene: Renderer zeichnet es hinter den Häusern (drawFw) und den Rest davor (draw(g,true)); Menü-Feuerwerk nutzt weiter draw(g)
  drawFw(g) {
    g.save();
    g.globalCompositeOperation = "lighter";
    this._drawFw(g);
    g.restore();
  }
  draw(g, noFw) {
    g.save();
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    for (const p of this.p) {
      const a = p.life / p.max;
      g.globalAlpha = a;
      g.strokeStyle = p.color;
      if (p.confetti) {
        g.fillStyle = p.color;
        g.fillRect(p.x - 1.5, p.y - 1.5, p.size * a * 2, p.size * a * 2);
      } else {
        g.lineWidth = Math.max(0.8, p.size * a);
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.vx * p.streak * 1.6, p.y - p.vy * p.streak * 1.6);
        g.stroke();
      }
    }
    for (const r of this.rings) {
      const u = r.life / r.l0;
      g.globalAlpha = u * 0.34;
      g.strokeStyle = r.color;
      g.lineWidth = 1 + 1.6 * u;
      g.beginPath();
      g.ellipse(r.x, r.y, r.r, r.r * 0.7, 0, 0, 7);
      g.stroke(); // dünner Leitring, die Sterne darauf sind der eigentliche Effekt
      if (r.sp) {
        const si = sparkIdx(r.color),
          n = r.sp.length,
          sr = (3.2 + r.max / 42) * GLT.size * (0.55 + 0.45 * u);
        for (let i = 0; i < n; i++) {
          const an = r.a0 + (i / n) * 6.2832,
            s = 0.5 + 0.5 * Math.sin(this.ft * 0.5 + r.sp[i]),
            tw = s * s * s;
          g.globalAlpha = Math.min(1, u * 1.7) * (0.3 + 0.7 * tw);
          sparkDraw(
            g,
            r.x + Math.cos(an) * r.r,
            r.y + Math.sin(an) * r.r * 0.7,
            sr * (0.7 + 0.5 * tw),
            si,
            tw,
            r.max > 150 ? 1 : 0,
          );
        }
      }
    }
    for (const r of this.sh) {
      const u = r.life / r.l0;
      g.globalAlpha = u * 0.55;
      g.strokeStyle = r.color;
      g.lineWidth = 1 + 3 * u;
      g.beginPath();
      g.ellipse(r.x, r.y, r.r, r.r * 0.16, 0, 0, 7);
      g.stroke();
      g.globalAlpha = u * 0.3;
      g.strokeStyle = "#fff";
      g.lineWidth = 1 + 1.2 * u;
      g.beginPath();
      g.ellipse(r.x, r.y, r.r * 0.96, r.r * 0.15, 0, 0, 7);
      g.stroke();
      if (r.sp) {
        const si = sparkIdx(r.color),
          n = r.sp.length,
          sr = (3.6 + r.max / 60) * GLT.size * (0.55 + 0.45 * u);
        for (let i = 0; i < n; i++) {
          const an = r.a0 + (i / n) * 6.2832,
            s = 0.5 + 0.5 * Math.sin(this.ft * 0.45 + r.sp[i]),
            tw = s * s * s;
          g.globalAlpha = Math.min(1, u * 1.6) * (0.3 + 0.7 * tw);
          sparkDraw(
            g,
            r.x + Math.cos(an) * r.r,
            r.y + Math.sin(an) * r.r * 0.16 - (1 - u) * 14 * (0.3 + tw),
            sr * (0.7 + 0.5 * tw),
            si,
            tw,
            0,
          );
        }
      }
    }
    for (const e of this.sl) {
      const u = e.life / e.l0,
        L = e.len * (1.15 - 0.35 * u),
        w = e.w * u;
      g.save();
      g.translate(e.x, e.y);
      g.rotate(e.ang);
      for (const [c, k, a] of [
        [e.color, 1, 0.75],
        ["#ffffff", 0.42, 0.95],
      ]) {
        g.globalAlpha = a * u;
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(-L / 2, 0);
        g.lineTo(0, -w * k);
        g.lineTo(L / 2, 0);
        g.lineTo(0, w * k);
        g.fill();
      }
      g.restore();
    }
    for (const e of this.fl) {
      const u = e.life / e.l0,
        S = e.size * (0.5 + 0.7 * (1 - u)),
        gr = g.createRadialGradient(e.x, e.y, 0, e.x, e.y, S);
      gr.addColorStop(0, "#ffffff");
      gr.addColorStop(0.25, e.color);
      gr.addColorStop(1, "#0000");
      g.globalAlpha = u;
      g.fillStyle = gr;
      g.fillRect(e.x - S, e.y - S, S * 2, S * 2);
      g.save();
      g.translate(e.x, e.y);
      g.rotate(e.rot);
      g.fillStyle = "#fff";
      g.globalAlpha = u * u * 0.8;
      for (let k = 0; k < 2; k++) {
        g.rotate(k ? 1.5708 : 0);
        g.beginPath();
        g.moveTo(-S * 1.05, 0);
        g.lineTo(0, -S * 0.035);
        g.lineTo(S * 1.05, 0);
        g.lineTo(0, S * 0.035);
        g.fill();
      }
      g.restore();
    }
    const star = (x, y, sz, rot) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.beginPath();
      g.moveTo(0, -sz);
      g.lineTo(sz * 0.17, -sz * 0.17);
      g.lineTo(sz, 0);
      g.lineTo(sz * 0.17, sz * 0.17);
      g.lineTo(0, sz);
      g.lineTo(-sz * 0.17, sz * 0.17);
      g.lineTo(-sz, 0);
      g.lineTo(-sz * 0.17, -sz * 0.17);
      g.closePath();
      g.fill();
      g.restore();
    };
    for (const q of this.sd) {
      const u = q.life / q.max,
        fl = Math.abs(Math.cos(q.age * 0.35 + q.ph));
      g.globalAlpha = Math.min(1, u * 1.8) * (0.5 + 0.5 * fl);
      g.fillStyle = q.col;
      g.save();
      g.translate(q.x, q.y);
      g.rotate(q.rot);
      g.fillRect(-q.w / 2, (-q.h * fl) / 2, q.w, Math.max(1, q.h * fl));
      g.restore();
    }
    for (const q of this.gl) {
      const u = q.life / q.max,
        tw = 0.5 + 0.5 * Math.sin(q.age * 0.9 + q.ph),
        a = Math.min(1, u * 1.6) * (0.45 + 0.55 * tw);
      g.globalAlpha = a;
      g.fillStyle = q.col;
      star(q.x, q.y, q.size * (0.6 + 0.4 * u), q.rot);
      g.globalAlpha = a * 0.9;
      g.fillStyle = "#fff";
      star(q.x, q.y, q.size * 0.42, q.rot);
    }
    // Funkelsterne: blinken wie die Feuerwerks-Sterne (sin³), schnelle ziehen einen Schweif, auf Blink-Spitzen Kreuzglanz
    for (const p of this.tw) {
      if (p.age < 0) continue;
      const k = p.age / p.life,
        fade = Math.min(1, p.age / 4) * Math.min(1, (1 - k) / 0.45),
        s = 0.5 + 0.5 * Math.sin(p.age * p.sp + p.ph),
        tw = s * s * s,
        a = (0.25 + 0.75 * tw) * fade;
      if (a < 0.05) continue;
      const r = p.r * (0.8 + 0.5 * tw) * (0.65 + 0.35 * fade) * (1 + 0.2 * p.z);
      g.globalAlpha = a;
      sparkDraw(g, p.x, p.y, r, p.spr, tw * fade, p.gc);
      if (r > 3 && p.vx * p.vx + p.vy * p.vy > 30) {
        const A = glowOf(p.spr);
        if (A) {
          g.globalAlpha = a * 0.32;
          g.drawImage(
            A,
            p.x - p.vx * 1.1 - r * 0.8,
            p.y - p.vy * 1.1 - r * 0.8,
            r * 1.6,
            r * 1.6,
          );
          g.globalAlpha = a * 0.14;
          g.drawImage(
            A,
            p.x - p.vx * 2.2 - r * 0.65,
            p.y - p.vy * 2.2 - r * 0.65,
            r * 1.3,
            r * 1.3,
          );
        }
      }
    }
    for (const e of this.gn) {
      if (e.d > 0) continue;
      const k = 1 - e.life / e.l0,
        att = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8,
        S =
          e.size *
          Math.max(0, att) *
          (0.85 + 0.15 * Math.sin(e.life * e.sp * 2 + e.ph)),
        A = glowOf(e.spr),
        c = HSL90[e.spr];
      if (S < 1) continue;
      if (A) {
        g.globalAlpha = Math.min(1, att * 1.2) * 0.85;
        g.drawImage(A, e.x - S * 0.7, e.y - S * 0.7, S * 1.4, S * 1.4);
      }
      g.globalAlpha = Math.min(1, att * 1.5);
      g.fillStyle = c;
      star4(g, e.x, e.y, S, e.rot);
      g.globalAlpha = Math.min(1, att * 1.2) * 0.8;
      g.fillStyle = "#ffffff";
      star4(g, e.x, e.y, S * 0.55, e.rot + 0.7854, 0.16);
      g.beginPath();
      g.arc(e.x, e.y, Math.max(1, S * 0.09), 0, 6.283);
      g.fill();
    }
    for (const e of this.bt) {
      const u = e.life / e.l0;
      for (const [c, w, a] of [
        [e.color, 5, 0.55],
        ["#ffffff", 1.8, 1],
      ]) {
        g.globalAlpha = a * u;
        g.strokeStyle = c;
        g.lineWidth = w;
        g.beginPath();
        e.pts.forEach((p, i) =>
          i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]),
        );
        g.stroke();
      }
    }
    for (const e of this.pw) {
      const u = e.life / e.l0,
        sc = 0.5 + 0.5 * Math.sqrt(1 - u),
        n = e.n;
      for (const [k, c, a] of [
        [1, e.color, 0.9],
        [0.55, "#ffffff", 1],
      ]) {
        g.globalAlpha = Math.min(1, u * 1.5) * a;
        g.fillStyle = c;
        g.beginPath();
        for (let i = 0; i < n * 2; i++) {
          const r =
              e.size *
              sc *
              k *
              (i % 2
                ? 0.42
                : 0.78 + 0.45 * (Math.sin(e.seed + i * 12.9) * 0.5 + 0.5)),
            an = (i * Math.PI) / n + e.rot;
          i
            ? g.lineTo(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r)
            : g.moveTo(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r);
        }
        g.closePath();
        g.fill();
      }
    }
    if (!noFw) this._drawFw(g);
    g.restore();
  }
}
