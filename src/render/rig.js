import { drawSpriteFighter, groundShadow } from "./sprites.js";
import { EFFECT } from "../core/config.js";
// Vektor-Skelett-Figuren (Tiger/Wolf). Pose = Winkel-Vektor, Animationen = Keyframes. Kein Asset-Laden nötig.
const PI = Math.PI;
export const PAL = {
  tiger: {
    fur: "#2f6bff",
    dark: "#1a3fb8",
    light: "#7fb0ff",
    belly: "#eef4ff",
    stripe: "#0a1a5c",
    pants: "#2257ee",
    pantsD: "#173fb0",
    sash: "#3a6bff",
    out: "#050d33",
    eye: "#7ff6ff",
    glow: "#3fe0ff",
    stripes: 1,
    wolf: 0,
  },
  wolf: {
    fur: "#6d6761",
    dark: "#3b3633",
    light: "#a39b92",
    belly: "#8e857b",
    stripe: "#25201d",
    pants: "#7a5430",
    pantsD: "#4f341a",
    sash: "#241c26",
    out: "#100b0b",
    eye: "#ff2a3a",
    glow: "#ff3a55",
    stripes: 0,
    wolf: 1,
  },
};
// Pose: [Torso-Neigung, Kopf, Hinterarm(ob,unt), Vorderarm(ob,unt), Hinterbein(Oberschenkel,Schienbein), Vorderbein, X-Versatz, Mund, Hüfthöhe(0=auto)]
// Winkel: 0 = nach unten, +π/2 = nach vorn.
const S = (
  tl,
  hd,
  ba1,
  ba2,
  fa1,
  fa2,
  bt,
  bs,
  ft,
  fs,
  hx = 0,
  mo = 0,
  hy = 0,
) => [tl, hd, ba1, ba2, fa1, fa2, bt, bs, ft, fs, hx, mo, hy];
const ST1 = S(0.12, 0, 0.35, 2.1, 0.75, 2.35, -0.55, -0.15, 0.7, 0.1),
  ST2 = S(0.18, 0.05, 0.4, 2.15, 0.8, 2.4, -0.62, -0.2, 0.76, 0.16);
const CR = S(0.28, 0.08, 0.5, 2.2, 0.95, 2.4, -1.15, 0.35, 1.15, -0.25),
  KOP = S(-1.45, -0.3, -1.2, -1, -0.9, -0.8, 1.2, 1.55, 1.35, 1.55, 0, 1, -22),
  HITP = S(-0.35, -0.45, -0.6, 0.5, 0.1, 1, -0.75, -0.35, 0.35, 0.2, -14, 1);
export const A = {
  idle: {
    d: 1.2,
    loop: 1,
    k: [
      [0, ST1],
      [0.6, ST2],
      [1.2, ST1],
    ],
  },
  walk: {
    d: 0.64,
    loop: 1,
    k: [
      [0, S(0.12, 0, 0.35, 2.1, 0.75, 2.35, -0.65, -0.2, 0.7, 0.15)],
      [0.16, S(0.14, 0, 0.4, 2.1, 0.7, 2.3, 0.1, -0.6, -0.1, -0.1)],
      [0.32, S(0.12, 0, 0.35, 2.1, 0.75, 2.35, 0.65, 0.15, -0.65, -0.2)],
      [0.48, S(0.14, 0, 0.4, 2.1, 0.7, 2.3, -0.1, -0.1, 0.1, -0.6)],
      [0.64, S(0.12, 0, 0.35, 2.1, 0.75, 2.35, -0.65, -0.2, 0.7, 0.15)],
    ],
  },
  crouch: { d: 1, k: [[0, CR]] },
  air: { d: 1, k: [[0, S(0.1, 0, 1, 2.6, 0.9, 2.5, 0.5, -0.9, 0.9, -0.4)]] },
  dash: {
    d: 1,
    k: [[0, S(0.5, 0.1, -0.4, 1.2, 0.5, 2.4, -0.9, -0.5, 0.9, -0.3)]],
  },
  airdash: {
    d: 1,
    k: [[0, S(0.9, 0.1, 0.4, 1.6, 1.1, 1.8, 0.5, -0.9, -0.2, -1)]],
  },
  punch: {
    d: 0.4,
    k: [
      [0, ST1],
      [0.08, S(0, 0, 0.35, 2.1, 0.3, 2.7, -0.55, -0.15, 0.7, 0.1, -6)],
      [0.14, S(0.32, 0.05, 0.2, 2, 1.52, 1.6, -0.7, -0.15, 0.75, 0.1, 14, 1)],
      [0.26, S(0.32, 0.05, 0.2, 2, 1.52, 1.6, -0.7, -0.15, 0.75, 0.1, 14, 1)],
      [0.4, ST1],
    ],
  },
  kick: {
    d: 0.6,
    k: [
      [0, ST1],
      [0.14, S(-0.05, 0, 0.4, 2.1, 0.7, 2.3, -0.45, -0.1, 1.35, 0.2, -4)],
      [0.24, S(-0.2, -0.02, 0.4, 2.1, 0.7, 2.3, -0.45, -0.1, 1.5, 1.45, 8, 1)],
      [0.36, S(-0.2, -0.02, 0.4, 2.1, 0.7, 2.3, -0.45, -0.1, 1.5, 1.45, 8, 1)],
      [0.48, S(-0.05, 0, 0.4, 2.1, 0.7, 2.3, -0.45, -0.1, 1.35, 0.2, -4)],
      [0.6, ST1],
    ],
  },
  heavy: {
    d: 0.62,
    k: [
      [0, ST1],
      [0.2, S(-0.15, -0.05, 0.3, 2.2, -0.7, 0.5, -0.6, -0.1, 0.5, 0.05, -12)],
      [0.28, S(0.4, 0.08, 0.3, 2.1, 1.5, 1.55, -0.85, -0.1, 0.95, 0.3, 24, 1)],
      [0.42, S(0.4, 0.08, 0.3, 2.1, 1.5, 1.55, -0.85, -0.1, 0.95, 0.3, 24, 1)],
      [0.62, ST1],
    ],
  },
  upper: {
    d: 0.6,
    k: [
      [0, ST1],
      [0.14, S(0.2, 0.05, 0.4, 2.1, -0.1, 0.6, -0.9, 0.1, 1, -0.3, -4)],
      [0.24, S(0.05, -0.1, 0.4, 2.1, 2.75, 2.9, -0.1, -0.1, 0.15, 0.05, 14, 1)],
      [0.38, S(0.05, -0.1, 0.4, 2.1, 2.75, 2.9, -0.1, -0.1, 0.15, 0.05, 14, 1)],
      [0.6, ST1],
    ],
  },
  special: {
    d: 0.85,
    k: [
      [0, ST1],
      [0.25, S(0, 0, -0.2, 1.4, 0.2, 1.5, -0.7, -0.1, 0.8, 0.1, -8)],
      [
        0.38,
        S(0.28, 0.05, 1.5, 1.55, 1.5, 1.55, -0.75, -0.15, 0.8, 0.1, 12, 1),
      ],
      [0.6, S(0.28, 0.05, 1.5, 1.55, 1.5, 1.55, -0.75, -0.15, 0.8, 0.1, 12, 1)],
      [0.85, ST1],
    ],
  },
  cpunch: {
    d: 0.36,
    k: [
      [0, CR],
      [0.08, S(0.32, 0.08, 0.4, 2.1, 0.4, 2.5, -1.15, 0.35, 1.15, -0.25, -4)],
      [
        0.14,
        S(0.45, 0.1, 0.4, 2.1, 1.55, 1.6, -1.15, 0.35, 1.15, -0.25, 10, 1),
      ],
      [
        0.26,
        S(0.45, 0.1, 0.4, 2.1, 1.55, 1.6, -1.15, 0.35, 1.15, -0.25, 10, 1),
      ],
      [0.36, CR],
    ],
  },
  ckick: {
    d: 0.5,
    k: [
      [0, CR],
      [0.1, S(0.35, 0.08, 0.5, 2.2, 0.95, 2.4, -1, 1.4, 1.15, 0.2, -2, 0, -60)],
      [0.2, S(0.55, 0.1, 0.5, 2.2, 0.95, 2.4, -1, 1.4, 1.35, 1.5, 10, 1, -32)],
      [0.34, S(0.55, 0.1, 0.5, 2.2, 0.95, 2.4, -1, 1.4, 1.35, 1.5, 10, 1, -32)],
      [0.5, CR],
    ],
  },
  jpunch: {
    d: 0.35,
    k: [
      [0, S(0.1, 0, 1, 2.6, 0.5, 2.9, 0.5, -0.9, 0.9, -0.4)],
      [0.1, S(0.3, 0.05, 0.5, 2.4, 1.5, 1.6, 0.3, -0.7, 0.8, -0.4, 6, 1)],
      [0.35, S(0.3, 0.05, 0.5, 2.4, 1.5, 1.6, 0.3, -0.7, 0.8, -0.4, 6, 1)],
    ],
  },
  jkick: {
    d: 0.4,
    k: [
      [0, S(0.1, 0, 1, 2.6, 0.9, 2.5, 0.5, -0.9, 0.9, -0.4)],
      [0.12, S(-0.1, 0, 0.5, 2.2, 0.9, 2.4, 0.3, -0.9, 1.45, 1.4, 6, 1)],
      [0.4, S(-0.1, 0, 0.5, 2.2, 0.9, 2.4, 0.3, -0.9, 1.45, 1.4, 6, 1)],
    ],
  },
  jheavy: {
    d: 0.5,
    k: [
      [0, S(0, 0, 2.5, 2.8, 2.6, 2.8, 0.6, -0.8, 0.9, -0.5)],
      [0.15, S(0.6, 0.1, 1.2, 1, 1.1, 0.9, 0.6, -0.8, 0.9, -0.3, 8, 1)],
      [0.5, S(0.6, 0.1, 1.2, 1, 1.1, 0.9, 0.6, -0.8, 0.9, -0.3, 8, 1)],
    ],
  },
  hit: {
    d: 0.4,
    k: [
      [0, HITP],
      [0.4, S(-0.2, -0.25, -0.4, 0.7, 0.2, 1.2, -0.7, -0.3, 0.4, 0.15, -8, 1)],
    ],
  },
  airhit: {
    d: 1,
    k: [[0, S(-0.5, -0.5, -0.7, 0.6, 0.2, 1.2, 0.3, -0.6, 0.6, -0.8, -6, 1)]],
  },
  block: {
    d: 1,
    k: [[0, S(0.05, 0.1, 0.9, 2.8, 1.05, 2.9, -0.5, -0.1, 0.6, 0.1)]],
  },
  cblock: {
    d: 1,
    k: [[0, S(0.3, 0.1, 0.9, 2.8, 1.05, 2.9, -1.15, 0.35, 1.15, -0.25)]],
  },
  kd: { d: 1, k: [[0, KOP]] },
  wakeup: {
    d: 0.25,
    k: [
      [0, KOP],
      [0.25, ST1],
    ],
  },
  win: {
    d: 1,
    loop: 1,
    k: [
      [0, S(-0.05, -0.1, 2.7, 2.8, 2.6, 2.7, -0.5, -0.1, 0.6, 0.1, 0, 1)],
      [
        0.5,
        S(-0.1, -0.15, 2.55, 2.7, 2.8, 2.9, -0.55, -0.12, 0.65, 0.12, 0, 1),
      ],
      [1, S(-0.05, -0.1, 2.7, 2.8, 2.6, 2.7, -0.5, -0.1, 0.6, 0.1, 0, 1)],
    ],
  },
};
function poseOf(f) {
  const a = A[f.anim] || A.idle;
  const t = a.loop ? (f.sf / 60) % a.d : Math.min(f.animU, 1) * a.d;
  const k = a.k;
  if (k.length === 1) return k[0][1].slice();
  let i = 0;
  while (i < k.length - 2 && t > k[i + 1][0]) i++;
  const [t0, p0] = k[i],
    [t1, p1] = k[i + 1];
  let u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0 || 1)));
  u = u * u * (3 - 2 * u);
  return p0.map((v, j) => v + (p1[j] - v) * u);
}
const rot = (x, y, a) => [
  x * Math.cos(a) - y * Math.sin(a),
  x * Math.sin(a) + y * Math.cos(a),
];
function chain(g, x, y, segs, col, out) {
  const p = [[x, y]];
  for (const [a, l] of segs) {
    const q = p[p.length - 1];
    p.push([q[0] + Math.sin(a) * l, q[1] + Math.cos(a) * l]);
  }
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const pass of [0, 1]) {
    g.strokeStyle = pass ? col : out;
    segs.forEach((s, i) => {
      g.lineWidth = s[2] + (pass ? 0 : 5);
      g.beginPath();
      g.moveTo(...p[i]);
      g.lineTo(...p[i + 1]);
      g.stroke();
    });
  }
  return p;
}
function stripesOn(g, p0, p1, th, C) {
  if (!C.stripes) return;
  g.strokeStyle = C.stripe;
  g.lineWidth = 3;
  for (const u of [0.3, 0.55, 0.8]) {
    const x = p0[0] + (p1[0] - p0[0]) * u,
      y = p0[1] + (p1[1] - p0[1]) * u,
      dx = p1[0] - p0[0],
      dy = p1[1] - p0[1],
      l = Math.hypot(dx, dy) || 1,
      px = (-dy / l) * th * 0.42,
      py = (dx / l) * th * 0.42;
    g.beginPath();
    g.moveTo(x - px, y - py);
    g.lineTo(x + px, y + py);
    g.stroke();
  }
}
function arm(g, sx, sy, a1, a2, C, far) {
  const col = far ? C.dark : C.fur;
  const p = chain(
    g,
    sx,
    sy,
    [
      [a1, 38, 22],
      [a2, 34, 18],
    ],
    col,
    C.out,
  );
  stripesOn(g, p[0], p[1], 22, C);
  stripesOn(g, p[1], p[2], 18, C);
  const dx = Math.sin(a2),
    dy = Math.cos(a2);
  g.fillStyle = "#e9eef8";
  g.strokeStyle = C.out;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(p[2][0] - dx * 4, p[2][1] - dy * 4, 9.5, 0, 7);
  g.fill();
  g.stroke();
  const fx = p[2][0] + dx * 9,
    fy = p[2][1] + dy * 9;
  g.fillStyle = col;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(fx, fy, 13, 0, 7);
  g.fill();
  g.stroke();
  g.strokeStyle = C.out;
  g.lineWidth = 1.5;
  for (const o of [-5, 0, 5]) {
    g.beginPath();
    g.moveTo(fx + dy * o * 0.9 + dx * 2, fy - dx * o * 0.9 + dy * 2);
    g.lineTo(fx + dy * o * 0.9 + dx * 10, fy - dx * o * 0.9 + dy * 10);
    g.stroke();
  }
  return [fx, fy];
}
function leg(g, hx, hy, th, sh, C, far) {
  const pc = far ? C.pantsD : C.pants;
  const p = chain(
    g,
    hx,
    hy,
    [
      [th, 46, 36],
      [sh, 44, 29],
    ],
    pc,
    C.out,
  );
  g.fillStyle = "#e9eef8";
  g.strokeStyle = C.out;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(p[2][0], p[2][1], 11, 0, 7);
  g.fill();
  g.stroke();
  const fa = sh + PI / 2,
    q = chain(
      g,
      p[2][0],
      p[2][1] + 3,
      [[fa, 26, 16]],
      far ? C.dark : C.fur,
      C.out,
    );
  g.strokeStyle = "#f3f3f3";
  g.lineWidth = 2.2;
  for (const o of [-5, 0, 5]) {
    g.beginPath();
    g.moveTo(
      q[1][0] + Math.sin(fa) * 3 - Math.cos(fa) * o * 0.5,
      q[1][1] + Math.cos(fa) * 3 + Math.sin(fa) * o * 0.5,
    );
    g.lineTo(
      q[1][0] + Math.sin(fa) * 9 - Math.cos(fa) * o * 0.5,
      q[1][1] + Math.cos(fa) * 9 + Math.sin(fa) * o * 0.5,
    );
    g.stroke();
  }
}
function tail(g, C, t, sway) {
  let x = -10,
    y = -8;
  const pts = [[x, y]];
  for (let i = 0; i < 8; i++) {
    const a = PI + 0.1 + i * 0.19 + Math.sin(t * 3 - i * 0.7) * 0.12 + sway;
    x += Math.cos(a) * (C.wolf ? 14 : 15);
    y += Math.sin(a) * (C.wolf ? 14 : 15);
    pts.push([x, y]);
  }
  g.lineCap = "round";
  for (const pass of [0, 1])
    for (let i = 0; i < 8; i++) {
      g.strokeStyle = pass ? (C.stripes && i % 2 ? C.stripe : C.fur) : C.out;
      g.lineWidth = (C.wolf ? 16 : 12) - i * 0.7 + (pass ? 0 : 4);
      g.beginPath();
      g.moveTo(...pts[i]);
      g.lineTo(...pts[i + 1]);
      g.stroke();
    }
}
function torso(g, C) {
  const gr = g.createLinearGradient(-32, 0, 32, 0);
  gr.addColorStop(0, C.dark);
  gr.addColorStop(0.45, C.fur);
  gr.addColorStop(1, C.dark);
  g.fillStyle = gr;
  g.strokeStyle = C.out;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(-16, 2);
  g.bezierCurveTo(-20, -16, -36, -26, -32, -50);
  g.quadraticCurveTo(0, -68, 32, -50);
  g.bezierCurveTo(36, -26, 20, -16, 16, 2);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = C.belly;
  g.globalAlpha = C.wolf ? 0.45 : 0.95;
  g.beginPath();
  g.ellipse(4, -30, 15, 25, 0, 0, 7);
  g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = C.out;
  g.lineWidth = 2;
  g.globalAlpha = 0.55;
  for (const x of [-10, 12]) {
    g.beginPath();
    g.ellipse(x, -40, 13, 9, 0, 0, PI);
    g.stroke();
  }
  for (const y of [-27, -18, -9]) {
    g.beginPath();
    g.moveTo(-8, y);
    g.lineTo(16, y);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(4, -31);
  g.lineTo(4, -3);
  g.stroke();
  g.globalAlpha = 1;
  if (C.stripes) {
    g.strokeStyle = C.stripe;
    g.lineWidth = 3.2;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(-31 + i * 2, -46 + i * 10);
      g.lineTo(-19 + i * 2, -41 + i * 10);
      g.stroke();
      g.beginPath();
      g.moveTo(33 - i * 2, -46 + i * 10);
      g.lineTo(22 - i * 2, -41 + i * 10);
      g.stroke();
    }
  } else {
    g.strokeStyle = C.stripe;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(-6, -52);
    g.lineTo(6, -36);
    g.stroke();
  }
  for (const [x, y, r] of [
    [-19, -48, 14],
    [23, -48, 15],
  ]) {
    g.fillStyle = C.fur;
    g.strokeStyle = C.out;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
    g.stroke();
  }
}
function head(g, C, mouth, dead) {
  g.lineJoin = "round";
  if (C.wolf) {
    g.fillStyle = C.dark;
    g.strokeStyle = C.out;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-16, -40);
    for (let i = 0; i < 6; i++) {
      g.lineTo(-30 + i * 3, -34 + i * 7);
      g.lineTo(-20 + i * 3, -30 + i * 7);
    }
    g.lineTo(-4, -6);
    g.lineTo(10, -30);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.fillStyle = C.fur;
  g.strokeStyle = C.out;
  g.lineWidth = 3;
  g.beginPath();
  if (C.wolf) {
    g.moveTo(-14, -34);
    g.lineTo(-8, -66);
    g.lineTo(8, -38);
  } else {
    g.arc(-7, -41, 10, 0, 7);
  }
  g.fill();
  g.stroke();
  g.fillStyle = C.wolf ? "#3a2220" : "#e8f0ff";
  g.beginPath();
  if (C.wolf) {
    g.moveTo(-10, -38);
    g.lineTo(-7, -56);
    g.lineTo(3, -40);
  } else {
    g.arc(-7, -41, 5, 0, 7);
  }
  g.fill();
  g.save();
  g.translate(14, -8);
  g.rotate(mouth * 0.45);
  g.fillStyle = C.wolf ? C.dark : C.light;
  g.strokeStyle = C.out;
  g.beginPath();
  g.ellipse(C.wolf ? 12 : 8, 3, C.wolf ? 17 : 13, 5.5, 0, 0, 7);
  g.fill();
  g.stroke();
  if (mouth > 0.3) {
    g.fillStyle = "#fff";
    for (const x of C.wolf ? [6, 14, 22] : [4, 12]) {
      g.beginPath();
      g.moveTo(x, -1);
      g.lineTo(x + 3, -7);
      g.lineTo(x + 6, -1);
      g.fill();
    }
    g.fillStyle = "#a01830";
    g.fillRect(2, -1, C.wolf ? 20 : 14, 2);
  }
  g.restore();
  g.fillStyle = C.fur;
  g.strokeStyle = C.out;
  g.beginPath();
  g.ellipse(4, -22, 22, 20, 0, 0, 7);
  g.fill();
  g.stroke();
  if (C.stripes) {
    g.fillStyle = C.belly;
    g.beginPath();
    g.ellipse(10, -11, 14, 9, 0, 0, 7);
    g.fill();
    g.strokeStyle = C.stripe;
    g.lineWidth = 3;
    for (const [a, b, c, d] of [
      [-2, -40, 2, -31],
      [6, -41, 8, -32],
      [-10, -26, -3, -24],
      [-10, -17, -2, -17],
    ]) {
      g.beginPath();
      g.moveTo(a, b);
      g.lineTo(c, d);
      g.stroke();
    }
    g.strokeStyle = C.out;
  }
  g.fillStyle = C.wolf ? C.light : C.belly;
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(C.wolf ? 27 : 24, -16, C.wolf ? 22 : 15, C.wolf ? 9 : 10, 0, 0, 7);
  g.fill();
  g.stroke();
  g.fillStyle = "#10101a";
  g.beginPath();
  g.ellipse(C.wolf ? 47 : 37, -20, 4.5, 3.5, 0, 0, 7);
  g.fill();
  if (C.stripes) {
    g.strokeStyle = "#dfe8ff";
    g.lineWidth = 1.2;
    for (const o of [-3, 2, 7]) {
      g.beginPath();
      g.moveTo(30, -12 + o);
      g.lineTo(50, -16 + o * 1.6);
      g.stroke();
    }
  }
  if (dead) {
    g.strokeStyle = C.out;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(9, -31);
    g.lineTo(19, -23);
    g.moveTo(19, -31);
    g.lineTo(9, -23);
    g.stroke();
  } else {
    g.fillStyle = C.eye;
    g.beginPath();
    g.moveTo(7, -30);
    g.lineTo(21, -26);
    g.lineTo(9, -23);
    g.closePath();
    g.fill();
    g.strokeStyle = C.out;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(3, -36);
    g.lineTo(23, -27);
    g.stroke();
  }
  if (C.wolf) {
    g.strokeStyle = "#b52a3a";
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(2, -40);
    g.lineTo(12, -18);
    g.stroke();
  }
}
// Leuchten an der Faust + Hyper-Beam (gemeinsam für Vektor- und Sprite-Figuren; im lokalen, nach vorn gespiegelten Raum)
export function attackFx(g, f, fist, glow) {
  const m = f.move;
  if (f.state === "attack" && m && m.glow) {
    const act = f.mf >= m.su - 3 && f.mf <= m.su + m.ac + 4,
      charge = m.proj && f.mf > 4 && f.mf < m.su + 8;
    g.save();
    g.globalCompositeOperation = "lighter";
    if (act || charge) {
      const gr = g.createRadialGradient(
        fist[0],
        fist[1],
        2,
        fist[0],
        fist[1],
        40,
      );
      gr.addColorStop(0, "#fff");
      gr.addColorStop(0.35, glow);
      gr.addColorStop(1, "#0000");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(fist[0], fist[1], 40, 0, 7);
      g.fill();
    }
    if (m.beam && f.mf >= m.su && f.mf < m.su + m.ac) {
      const pulse = 0.75 + Math.sin(f.mf * 1.3) * 0.25,
        h = 44 * pulse,
        x0 = fist[0],
        BL = m.box ? m.box[2] : 560;
      const bg = g.createLinearGradient(0, fist[1] - h, 0, fist[1] + h);
      bg.addColorStop(0, "#0000");
      bg.addColorStop(0.35, glow);
      bg.addColorStop(0.5, "#fff");
      bg.addColorStop(0.65, glow);
      bg.addColorStop(1, "#0000");
      g.fillStyle = bg;
      g.fillRect(x0, fist[1] - h, BL, h * 2);
      const eg = g.createLinearGradient(x0 + BL - 180, 0, x0 + BL, 0);
      eg.addColorStop(0, "#fff0");
      eg.addColorStop(1, "#000f");
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = eg;
      g.fillRect(x0 + BL - 180, fist[1] - h - 2, 180, h * 2 + 4);
    }
    g.restore();
  }
  if (f.state === "attack" && m && m.fx === "tails") tailsFx(g, f, m, glow);
  else if (f.state === "attack" && m && m.fx === "breath") breathFx(g, f, m);
  else if (f.state === "attack" && m && m.fx === "bolt") boltFx(g, f, m);
  else if (f.state === "attack" && m && m.fx === "swarm") swarmFx(g, f, m);
  else if (f.state === "attack" && m && m.super && !m.fx)
    superFx(g, f, m, glow);
}
// Gemeinsamer Hyper-Fallback für Figuren ohne eigenen FX-Zweig (z. B. Leon/Ursus):
// Die vorhandene Sprite-Pose bleibt sichtbar, bekommt aber dieselbe visuelle Wucht wie die übrigen Hypers.
function superFx(g, f, m, glow) {
  const t = f.mf,
    su = m.su,
    end = su + m.ac;
  if (t < su - 14 || t > end + 14) return;
  const grow = Math.min(1, Math.max(0, (t - su + 14) / 14)),
    fade = t > end ? Math.max(0, 1 - (t - end) / 14) : 1,
    pulse = 0.82 + 0.18 * Math.sin(t * 0.72),
    reach = Math.max(180, ((m.box && m.box[2]) || 300) * 0.58);
  g.save();
  g.globalCompositeOperation = "lighter";
  if (t < su + 8) {
    const a = fade * (t < su ? Math.min(1, grow) : 1) * 0.42,
      rx = 54 + 24 * pulse,
      ry = 86 + 30 * pulse;
    const ag = g.createRadialGradient(0, -86, 8, 0, -86, ry * 1.35);
    ag.addColorStop(0, "#fff");
    ag.addColorStop(0.28, glow);
    ag.addColorStop(1, "#0000");
    g.globalAlpha = a;
    g.fillStyle = ag;
    g.beginPath();
    g.ellipse(0, -86, rx, ry, 0, 0, 7);
    g.fill();
  }
  if (t >= su - 2) {
    const a = fade * Math.min(1, (t - su + 2) / 8),
      cx = 34,
      cy = -88;
    for (const [o, w, al] of [
      [0, 5, 0.32],
      [10, 2.4, 0.7],
      [20, 1, 0.95],
    ]) {
      g.globalAlpha = a * al;
      g.strokeStyle = glow;
      g.lineWidth = w;
      g.beginPath();
      g.arc(cx, cy, 34 + o + pulse * 4, -0.72, 0.72);
      g.stroke();
    }
    const beam = g.createLinearGradient(cx, 0, cx + reach, 0);
    beam.addColorStop(0, "#ffffff");
    beam.addColorStop(0.12, glow);
    beam.addColorStop(1, "#0000");
    g.globalAlpha = a * 0.38;
    g.fillStyle = beam;
    g.beginPath();
    g.moveTo(cx, cy - 18);
    g.lineTo(cx + reach, cy - 6);
    g.lineTo(cx + reach, cy + 6);
    g.lineTo(cx, cy + 18);
    g.closePath();
    g.fill();
    g.globalAlpha = a * 0.6;
    g.strokeStyle = "#fff";
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(0, 0, 26 + (((t - su) * 3) % 28), 0, Math.PI);
    g.stroke();
  }
  g.restore();
}
// Rabenschwarm (Korvus-Hyper): ein Schwarm dunkler Raben mit violettem Schweif stürmt über die Trefferbox nach vorn. Weltmaß wie tailsFx (Ursprung = Körpermitte, nach vorn = +x).
function swarmFx(g, f, m) {
  const t = f.mf,
    t0 = m.su - 6,
    t1 = m.su + m.ac;
  if (t < t0 || t > t1 + 14) return;
  const grow = Math.min(1, (t - t0) / 10),
    fade = t > t1 ? Math.max(0, 1 - (t - t1) / 14) : 1,
    L = (m.box ? m.box[2] + m.box[0] : 460) * 0.95,
    N = 11,
    oy = -92,
    VIO = "#b57cff",
    HOT = "#ecd9ff";
  const H = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  g.save();
  g.globalCompositeOperation = "lighter";
  g.lineCap = "round";
  g.lineJoin = "round";
  for (let i = 0; i < N; i++) {
    const sp = 0.65 + H(i * 3.1) * 0.6,
      ph = (((t - t0) * sp) / 46 + H(i * 7.7)) % 1,
      u = Math.min(1, grow * ph * 1.15),
      x = 40 + u * L,
      spread = (0.12 + H(i * 1.9) * 0.88) * (0.25 + 0.75 * u),
      y =
        oy +
        (H(i * 5.3) - 0.5) * 2 * 210 * spread * 0.55 +
        Math.sin(t * 0.25 + i) * 9,
      s = (26 + H(i * 2.2) * 20) * (0.75 + 0.5 * u),
      fl = 0.5 + 0.5 * Math.sin(t * 0.75 + i * 2.1),
      wing = -0.15 + fl * 1.05,
      blink =
        Math.sin(t * 1.7 + i * 4.3) > -0.35
          ? 1
          : 0.25 + 0.2 * Math.sin(t * 3 + i), // Neon-Flackern: kurz fast aus, dann wieder an
      a =
        Math.min(1, u * 5) * (1 - Math.max(0, u - 0.85) / 0.15) * fade * blink,
      up = 0.3 + wing * 1.5;
    g.save();
    g.translate(x, y);
    const P = new Path2D(); // Raben-Silhouette nur als Linien: oberer Flügel, unterer Flügel, Körper+Kopf+Schnabel, Schwanz
    P.moveTo(s * 0.1, -s * 0.05);
    P.quadraticCurveTo(-s * 0.2, -s * up * 0.9, -s * 1.0, -s * up);
    P.quadraticCurveTo(-s * 0.75, -s * up * 0.45, -s * 0.95, -s * up * 0.2);
    P.quadraticCurveTo(-s * 0.5, -s * 0.08, -s * 0.35, s * 0.02);
    P.moveTo(s * 0.05, s * 0.03);
    P.quadraticCurveTo(
      -s * 0.2,
      s * (0.15 + up * 0.35),
      -s * 0.75,
      s * (0.3 + up * 0.5),
    );
    P.quadraticCurveTo(-s * 0.45, s * 0.12, -s * 0.35, 0);
    P.moveTo(-s * 0.3, 0);
    P.quadraticCurveTo(s * 0.1, -s * 0.2, s * 0.32, -s * 0.12);
    P.arc(s * 0.38, -s * 0.06, s * 0.16, -2.6, 0.2);
    P.lineTo(s * 0.84, -s * 0.03);
    P.lineTo(s * 0.52, s * 0.02);
    P.quadraticCurveTo(s * 0.2, s * 0.2, -s * 0.3, 0);
    P.moveTo(-s * 0.3, -s * 0.03);
    P.lineTo(-s * 0.9, -s * 0.2);
    P.moveTo(-s * 0.3, 0);
    P.lineTo(-s * 0.98, -s * 0.02);
    P.moveTo(-s * 0.3, s * 0.03);
    P.lineTo(-s * 0.9, s * 0.18);
    g.globalAlpha = a * 0.28;
    g.strokeStyle = VIO;
    g.lineWidth = 9;
    g.stroke(P); // weiter Glow
    g.globalAlpha = a * 0.7;
    g.strokeStyle = VIO;
    g.lineWidth = 3.6;
    g.stroke(P); // Neon-Körper
    g.globalAlpha = a;
    g.strokeStyle = HOT;
    g.lineWidth = 1.4;
    g.stroke(P); // heißer Laserkern
    g.globalAlpha = a * 0.8;
    g.strokeStyle = VIO;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(-s * 1.0, 0);
    g.lineTo(-s * 4.2, 0);
    g.stroke(); // Laser-Schweif (eine Linie)
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(s * 0.42, -s * 0.08, s * 0.05, 0, 7);
    g.fill(); // Auge
    g.restore();
  }
  g.restore();
}
// Neunschwanz-Inferno (Kitsune-Hyper): neun Geisterfeuer-Schwänze fächern sich nach vorn auf, wippen, enden in Flammenkugeln. Weltmaß (passt zur Trefferbox m.box), Ursprung = Körpermitte.
function tailsFx(g, f, m, glow) {
  const t = f.mf,
    t0 = m.su - 8,
    t1 = m.su + m.ac;
  if (t < t0 || t > t1 + 10) return;
  const grow = Math.min(1, (t - t0) / 12),
    fade = t > t1 ? Math.max(0, 1 - (t - t1) / 10) : 1,
    L = (m.box ? m.box[2] + m.box[0] : 460) * 0.92 * grow,
    N = 9;
  g.save();
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = fade;
  const ox = -6,
    oy = -72,
    pulse = 0.8 + 0.2 * Math.sin(t * 0.9);
  const gr = g.createRadialGradient(ox, oy, 4, ox, oy, 70 * grow);
  gr.addColorStop(0, "#fff");
  gr.addColorStop(0.4, glow);
  gr.addColorStop(1, "#0000");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(ox, oy, 70 * grow, 0, 7);
  g.fill(); // Kern-Leuchten
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1),
      ang = -0.95 + u * 1.55 + Math.sin(t * 0.22 + i * 1.7) * 0.09,
      len =
        L *
        (0.7 +
          0.3 * Math.sin(i * 2.3 + 1) * 0.5 +
          0.3 * (1 - Math.abs(u - 0.45) * 1.2)),
      cx = ox + Math.cos(ang) * len,
      cy = oy + Math.sin(ang) * len * 0.8 + 30 * Math.sin(u * 3) - 6,
      bend = Math.sin(t * 0.4 + i * 1.1) * 42,
      mx = ox + Math.cos(ang) * len * 0.5 - Math.sin(ang) * bend,
      my = oy + Math.sin(ang) * len * 0.4 + Math.cos(ang) * bend,
      w = 15 * pulse;
    const nx = -Math.sin(ang),
      ny = Math.cos(ang);
    g.beginPath();
    g.moveTo(ox - nx * w, oy - ny * w);
    g.quadraticCurveTo(mx - nx * w * 1.3, my - ny * w * 1.3, cx, cy);
    g.quadraticCurveTo(
      mx + nx * w * 1.3,
      my + ny * w * 1.3,
      ox + nx * w,
      oy + ny * w,
    );
    g.closePath();
    const lg = g.createLinearGradient(ox, oy, cx, cy);
    lg.addColorStop(0, "#fff");
    lg.addColorStop(0.3, glow);
    lg.addColorStop(1, "#0000");
    g.fillStyle = lg;
    g.fill(); // Schweif
    g.strokeStyle = "#ffffffcc";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(ox, oy);
    g.quadraticCurveTo(mx, my, cx, cy);
    g.stroke(); // heller Kern
    const R = 16 + 6 * Math.sin(t * 0.7 + i);
    const fg = g.createRadialGradient(cx, cy, 1, cx, cy, R * 1.8);
    fg.addColorStop(0, "#fff");
    fg.addColorStop(0.4, glow);
    fg.addColorStop(1, "#0000");
    g.fillStyle = fg;
    g.beginPath();
    g.arc(cx, cy, R * 1.8, 0, 7);
    g.fill();
  } // Flammenkugel an der Spitze
  g.restore();
}
// Drachen-Feuersturm (ST3-G0-Hyper): Feuerstrom aus dem Maul, kegelförmig nach vorn leicht abwärts. Glutballen wandern nach außen, werden größer und verlöschen; Weltmaß (Länge = m.box[2]).
function breathFx(g, f, m) {
  const t = f.mf,
    t0 = m.su - 6,
    t1 = m.su + m.ac;
  if (t < t0 || t > t1 + 12) return;
  const grow = Math.min(1, (t - t0) / 10),
    fade = t > t1 ? Math.max(0, 1 - (t - t1) / 12) : 1,
    L = (m.box ? m.box[2] : 520) * grow,
    MX = 59,
    MY = -158,
    N = 30,
    slope = 0.14;
  g.save();
  g.globalCompositeOperation = "lighter";
  for (let j = N - 1; j >= 0; j--) {
    const p = (j / N + t * 0.042) % 1,
      x = MX + p * L,
      y = MY + p * L * slope + Math.sin(t * 0.45 + j * 2.1) * p * 16,
      r = 9 + p * (70 + 14 * Math.sin(t * 0.6 + j)),
      a = fade * Math.pow(1 - p, 0.55) * (p < 0.04 ? p / 0.04 : 1);
    if (a <= 0.02) continue;
    g.globalAlpha = Math.min(1, a);
    const gr = g.createRadialGradient(x, y, r * 0.1, x, y, r);
    gr.addColorStop(0, "#fffbd0");
    gr.addColorStop(0.35, "#ffc531");
    gr.addColorStop(0.7, "#ff5a14cc");
    gr.addColorStop(1, "#c0180000");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }
  g.globalAlpha = fade;
  const mg = g.createRadialGradient(MX, MY, 2, MX, MY, 38);
  mg.addColorStop(0, "#fff");
  mg.addColorStop(0.4, "#ffc531");
  mg.addColorStop(1, "#ff5a1400");
  g.fillStyle = mg;
  g.beginPath();
  g.arc(MX, MY, 38, 0, 7);
  g.fill(); // Leuchten am Maul
  for (let i = 0; i < 10; i++) {
    const p = (i * 0.137 + t * 0.03) % 1,
      x = MX + p * L * (0.5 + (0.5 * ((i * 7) % 3)) / 2),
      y =
        MY +
        p * L * slope * 1.1 -
        (10 + ((i * 13) % 40)) * p -
        Math.sin(t * 0.3 + i) * 8;
    g.globalAlpha = fade * (1 - p);
    g.fillStyle = "#ffd27a";
    g.beginPath();
    g.arc(x, y, 2.2, 0, 7);
    g.fill();
  } // Funken
  g.restore();
}
// Blitz-Kamehameha (H!T-Hyper): 1) Blitz schlägt von oben in den Kopf ein, 2) Körper knistert / lädt sich auf, 3) Blitzkugel zwischen den Händen, 4) breiter Blitzstrahl nach vorn.
// Weltmaß; Zeitpunkte relativ zu m.su (Startup) und m.ac (aktiv). Zackenlinien sind pro Frame neu gewürfelt (deterministisch) = Flackern.
const rn = (a, b) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function zig(g, x0, y0, x1, y1, n, amp, seed) {
  g.beginPath();
  g.moveTo(x0, y0);
  const dx = x1 - x0,
    dy = y1 - y0,
    l = Math.hypot(dx, dy) || 1,
    nx = -dy / l,
    ny = dx / l;
  for (let i = 1; i < n; i++) {
    const u = i / n,
      o = (rn(i, seed) - 0.5) * 2 * amp;
    g.lineTo(x0 + dx * u + nx * o, y0 + dy * u + ny * o);
  }
  g.lineTo(x1, y1);
}
function bolt(g, x0, y0, x1, y1, n, amp, seed, w, a) {
  // dreifach gezeichneter Blitz: weiter Schein, Mantel, weißer Kern
  for (const [lw, col, al] of [
    [w * 3.2, "#3fa0ff", 0.28],
    [w * 1.6, "#8fd8ff", 0.6],
    [w * 0.55, "#ffffff", 1],
  ]) {
    g.globalAlpha = a * al;
    g.strokeStyle = col;
    g.lineWidth = lw;
    zig(g, x0, y0, x1, y1, n, amp, seed);
    g.stroke();
  }
}
function boltFx(g, f, m) {
  const t = f.mf,
    su = m.su,
    end = su + m.ac,
    seed = Math.floor(t / 2) * 3.7;
  if (t < 3 || t > end + 10) return;
  const HX = -26,
    HY = -170,
    OX = 74,
    OY = -105,
    L = (m.box ? m.box[2] : 620) * 0.96;
  g.save();
  g.globalCompositeOperation = "lighter";
  g.lineCap = "round";
  g.lineJoin = "round";
  if (t >= 3 && t <= 26) {
    const a = t < 8 ? (t - 3) / 5 : Math.max(0, 1 - (t - 8) / 18); // 1) Einschlag von oben
    bolt(g, HX + rn(1, seed) * 30 - 15, -1100, HX, HY, 22, 34, seed, 5, a);
    for (let b = 0; b < 2; b++) {
      const y = -900 + b * 260 + rn(b, seed) * 120;
      bolt(
        g,
        HX + (rn(b, 2) - 0.5) * 20,
        y,
        HX + (b ? 1 : -1) * (80 + rn(b, seed) * 60),
        y + 130,
        5,
        14,
        seed + b,
        2.2,
        a * 0.8,
      );
    } // Verästelungen
    g.globalAlpha = a * 0.8;
    const hg = g.createRadialGradient(HX, HY, 2, HX, HY, 90);
    hg.addColorStop(0, "#fff");
    hg.addColorStop(0.35, "#8fd8ff");
    hg.addColorStop(1, "#3fa0ff00");
    g.fillStyle = hg;
    g.beginPath();
    g.arc(HX, HY, 90, 0, 7);
    g.fill();
  }
  if (t >= 7 && t <= end + 8) {
    const fade =
      t > end ? Math.max(0, 1 - (t - end) / 8) : Math.min(1, (t - 7) / 8); // 2) Aufladen: Aura + Körperblitze
    g.globalAlpha = fade * (0.28 + 0.08 * Math.sin(t * 0.9));
    const ag = g.createRadialGradient(0, -95, 10, 0, -95, 150);
    ag.addColorStop(0, "#bfe6ff");
    ag.addColorStop(0.5, "#3fa0ff");
    ag.addColorStop(1, "#1060ff00");
    g.fillStyle = ag;
    g.beginPath();
    g.ellipse(0, -95, 120, 150, 0, 0, 7);
    g.fill();
    for (let i = 0; i < 7; i++) {
      const sd = seed + i * 5.3,
        x = (rn(i, sd) - 0.5) * 130,
        y = -20 - rn(i + 9, sd) * 160,
        an = rn(i + 3, sd) * 6.28,
        l = 22 + rn(i + 5, sd) * 36;
      bolt(
        g,
        x,
        y,
        x + Math.cos(an) * l,
        y + Math.sin(an) * l,
        4,
        7,
        sd,
        1.6,
        fade * 0.9,
      );
    }
  }
  if (t >= su * 0.4 && t < su) {
    const u = (t - su * 0.4) / (su * 0.6),
      R = 6 + u * 20 + Math.sin(t * 1.3) * 2.5; // 3) Blitzkugel zwischen den Händen
    g.globalAlpha = 1;
    const sg = g.createRadialGradient(18, -96, 1, 18, -96, R * 2);
    sg.addColorStop(0, "#fff");
    sg.addColorStop(0.35, "#9fe0ff");
    sg.addColorStop(1, "#3fa0ff00");
    g.fillStyle = sg;
    g.beginPath();
    g.arc(18, -96, R * 2, 0, 7);
    g.fill();
    for (let i = 0; i < 6; i++) {
      const an = rn(i, seed) * 6.28;
      bolt(
        g,
        18,
        -96,
        18 + Math.cos(an) * R * 2.2,
        -96 + Math.sin(an) * R * 2.2,
        4,
        6,
        seed + i,
        1.5,
        0.9,
      );
    }
  }
  if (t >= su && t <= end + 10) {
    const grow = Math.min(1, (t - su + 1) / 6),
      fade = t > end ? Math.max(0, 1 - (t - end) / 10) : 1,
      len = L * grow,
      wob = 1 + 0.1 * Math.sin(t * 1.7); // 4) Blitzstrahl
    const jag = (w, a) => {
      g.globalAlpha = fade * a;
      g.lineWidth = w;
      zig(g, OX, OY, OX + len, OY + Math.sin(t * 0.5) * 5, 16, 10, seed);
      g.stroke();
    };
    g.strokeStyle = "#2f7fff";
    jag(104 * wob, 0.2);
    g.strokeStyle = "#6fd0ff";
    jag(66 * wob, 0.38);
    g.strokeStyle = "#cfeeff";
    jag(34 * wob, 0.8);
    g.strokeStyle = "#fff";
    jag(14 * wob, 1);
    for (let i = 0; i < 7; i++) {
      const u = (i + rn(i, seed)) / 7,
        bx = OX + len * u,
        by = OY,
        an = (rn(i + 4, seed) < 0.5 ? -1 : 1) * (0.35 + rn(i + 8, seed) * 0.5);
      bolt(
        g,
        bx,
        by,
        bx + Math.cos(an) * 70,
        by +
          Math.sin(an) * 70 * (rn(i, 3) < 0.5 ? 1 : -1) +
          (rn(i, 5) - 0.5) * 40,
        4,
        9,
        seed + i,
        2,
        fade * 0.9,
      );
    } // Seitenblitze
    g.globalAlpha = fade;
    for (const [cx, R] of [
      [OX + 8, 64],
      [OX + len, 84],
    ]) {
      const bg = g.createRadialGradient(cx, OY, 2, cx, OY, R);
      bg.addColorStop(0, "#fff");
      bg.addColorStop(0.4, "#8fd8ff");
      bg.addColorStop(1, "#3fa0ff00");
      g.fillStyle = bg;
      g.beginPath();
      g.arc(cx, OY, R, 0, 7);
      g.fill();
    } // Leuchten an Hand und Spitze
    g.globalAlpha = fade * 0.35;
    g.fillStyle = "#8fd8ff";
    g.beginPath();
    g.ellipse(OX + len * 0.5, 8, len * 0.5, 9, 0, 0, 7);
    g.fill();
  } // Bodenschein
  g.restore();
}
// Zeichnet einen Kämpfer. Füße stehen bei (f.x, f.y); f nach rechts blickend, gespiegelt via f.facing.
export function drawFighter(g, f, clock, alpha = 1, floorY = 470) {
  if (f.char.sprites) return drawSpriteFighter(g, f, clock, alpha, floorY); // Sprite-Figur (Atlas) statt Vektor-Skelett
  const C = PAL[f.char.pal],
    po = poseOf(f),
    [tl, hd, ba1, ba2, fa1, fa2, bt, bs, ft, fs, hx, mouth, hy] = po;
  g.save();
  g.globalAlpha = alpha;
  if (f.comboFlash > 0) {
    const fa = f.comboFlash / EFFECT.comboFlash;
    g.save();
    g.globalCompositeOperation = "lighter";
    g.fillStyle = "#ffffff";
    g.globalAlpha = 0.55 * fa;
    g.fillRect(-70, -165, 140, 170);
    g.restore();
  }
  if (alpha >= 0.4) groundShadow(g, f.x, floorY, Math.max(0, floorY - f.y), 56); // weicher Kontaktschatten (wie bei den Sprite-Figuren)
  g.translate(f.x, f.y);
  g.scale(f.facing, 1);
  const drop =
    Math.max(
      Math.cos(bt) * 46 + Math.cos(bs) * 44,
      Math.cos(ft) * 46 + Math.cos(fs) * 44,
    ) + 10;
  g.translate(hx, hy ? hy : -drop);
  if (f.state === "tumble") g.rotate(-f.sf * 0.3);
  const sh = (x, y) => rot(x, y, tl),
    bsx = sh(-18, -48),
    fsx = sh(22, -48),
    neck = sh(6, -58);
  tail(g, C, clock, f.state === "walk" ? -0.1 : 0);
  arm(g, bsx[0], bsx[1], ba1, ba2, C, 1);
  leg(g, -10, 0, bt, bs, C, 1);
  g.save();
  g.rotate(tl);
  torso(g, C);
  g.restore();
  g.save();
  g.rotate(tl * 0.5);
  g.fillStyle = C.sash;
  g.strokeStyle = C.out;
  g.lineWidth = 3;
  g.fillRect(-21, -14, 42, 15);
  g.strokeRect(-21, -14, 42, 15);
  g.beginPath();
  g.arc(10, -6, 7, 0, 7);
  g.fill();
  g.stroke();
  const sw = Math.sin(clock * 4) * 3 - hx * 0.15;
  for (const [o, l] of [
    [0, 38],
    [10, 30],
  ]) {
    g.beginPath();
    g.moveTo(8 + o, -2);
    g.lineTo(2 + o + sw, l);
    g.lineTo(12 + o + sw, l - 6);
    g.lineTo(16 + o, -2);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.restore();
  leg(g, 12, 0, ft, fs, C, 0);
  g.save();
  g.translate(neck[0], neck[1]);
  g.rotate(hd + tl * 0.4);
  head(
    g,
    C,
    mouth,
    f.anim === "hit" || f.state === "ko" || f.state === "knockdown",
  );
  g.restore();
  const fist = arm(g, fsx[0], fsx[1], fa1, fa2, C, 0);
  attackFx(g, f, fist, C.glow);
  g.restore();
}
export function drawTrail(g, f, clock) {
  for (const t of f.trail) {
    g.save();
    g.filter = "none";
    drawFighter(g, t, clock, Math.max(0, 0.28 - t.age * 0.02), 470);
    g.restore();
  }
}
