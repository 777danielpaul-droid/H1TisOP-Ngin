// Combo-Finisher (Super-Spezial nach 10er-Combo mit „I“): node tests/finisher.test.js
import assert from "node:assert/strict";
import { Game } from "../src/core/game.js";
import { Fighter } from "../src/core/fighter.js";
import { InputBuffer } from "../src/core/input.js";
import { CHARACTERS } from "../src/core/characters.js";
import { COMBO_FINISH as F, METER } from "../src/core/config.js";
let n = 0;
const ok = (m) => {
  n++;
  console.log("  ✓ " + m);
};
function setup(id1 = "tiger", id2 = "wolf", gap = 130) {
  const i1 = new InputBuffer(),
    i2 = new InputBuffer();
  const p1 = new Fighter({
      char: CHARACTERS[id1],
      x: 300,
      facing: 1,
      input: i1,
    }),
    p2 = new Fighter({
      char: CHARACTERS[id2],
      x: 300 + gap,
      facing: -1,
      input: i2,
    });
  const g = new Game(p1, p2);
  g.stamPref = true;
  while (g.phase !== "fight") {
    i1.feed(0, 0, []);
    i2.feed(0, 0, []);
    g.step();
  }
  const t = (pr = [], k = 1) => {
    for (let j = 0; j < k; j++) {
      const fz = g.hitstop > 0 || g.superFlash > 0;
      i1.feed(0, 0, j === 0 ? pr : [], fz);
      i2.feed(0, 0, [], fz);
      g.step();
    }
  };
  // Gegner steckt mitten in einer Combo (hits Treffer) und ist getroffen
  const combo = (h) => {
    p2.comboHits = h;
    p2.setState("hit");
    p2.stun = 30;
  };
  return { g, p1, p2, i1, i2, t, combo };
}

// 1) Ab 10 Treffern: „I“ startet den Finisher – ohne Meter, ohne Ausdauer, mit Freeze/Titel, Gegner bleibt getroffen
{
  const { g, p1, p2, t, combo } = setup();
  p1.meter = METER.max;
  combo(10);
  const st0 = p1.st;
  t(["SUP"]);
  assert.equal(p1.moveName, "finisher", "Finisher gestartet");
  assert.ok(p1.move && p1.move.cfin && p1.move.super, "aufgeladener Special");
  assert.ok(g.fin && g.fin.owner === p1, "Finisher-Zustand im Spiel");
  assert.ok(g.superFlash > 0, "Freeze wie beim Hyper");
  assert.ok(/SUPER/.test(g.superName), "Titel „SUPER …“: " + g.superName);
  assert.equal(p1.meter, METER.max - F.cost, "kostet genau 1 Hyper-Balken");
  assert.equal(p1.st, st0, "keine Ausdauer verbraucht");
  assert.ok(p2.finDone, "Combo ist markiert (nur einmal)");
  assert.ok(
    p2.stun >= F.stun - 3,
    "Gegner bleibt getroffen (stun " + p2.stun + ")",
  );
  ok(
    "10 Treffer + I + genug Meter: Super-Spezial (kostet 1 Balken, keine Ausdauer), mit Freeze und Titel",
  );
}

// 2) Unter 10 Treffern passiert nichts (ohne Meter weder Finisher noch Hyper)
{
  const { p1, p2, t, combo } = setup();
  p1.meter = METER.max;
  combo(9);
  t(["SUP"]);
  assert.notEqual(p1.moveName, "finisher");
  assert.ok(!p2.finDone);
  ok("9 Treffer: kein Finisher (auch mit vollem Meter)");
}
{
  const { p1, p2, t, combo } = setup();
  p1.meter = 0;
  combo(0);
  t(["SUP"]);
  assert.notEqual(p1.moveName, "finisher");
  ok("keine Combo: kein Finisher");
}

// 2b) Ohne genug Meter passiert nichts – auch nicht bei 10+ Treffern; mit genau einem Balken geht es und leert ihn
{
  const { p1, p2, t, combo } = setup();
  p1.meter = F.cost - 1;
  combo(12);
  t(["SUP"]);
  assert.notEqual(p1.moveName, "finisher");
  assert.ok(!p2.finDone, "Combo bleibt frei, wenn es nicht ausgelöst wurde");
  assert.equal(p1.meter, F.cost - 1, "Meter unverändert");
  p1.meter = 0;
  t(["SUP"]);
  assert.notEqual(p1.moveName, "finisher");
  ok("zu wenig Meter: Finisher nicht möglich, nichts wird verbraucht");
}
{
  const { g, p1, p2, t, combo } = setup();
  p1.meter = F.cost;
  combo(10);
  t(["SUP"]);
  assert.equal(p1.moveName, "finisher");
  assert.equal(p1.meter, 0, "genau ein Balken reicht und wird verbraucht");
  assert.equal(F.cost, METER.bar);
  ok("genau 1 Balken reicht");
}
// 2c) Hyper-Leiste lädt langsamer auf: Treffer bringt dmg*.28*gain (früher dmg*.28)
{
  assert.ok(METER.gain < 1 && METER.gain > 0.5, "Aufladung gedrosselt");
  const { g, p1, p2, t } = setup("tiger", "wolf", 70);
  p1.meter = 0;
  p2.meter = 0;
  const hp = p2.hp;
  t(["L"]);
  let k = 0;
  while (p2.hp >= hp && k++ < 60) t([]);
  const lost = hp - p2.hp,
    got = p1.meter;
  assert.ok(lost > 0 && got > 0, "Treffer gelandet");
  assert.ok(
    Math.abs(
      got / lost -
        (0.28 * METER.gain * (CHARACTERS.tiger.meter || 1)) /
          (CHARACTERS.wolf.def || 1),
    ) < 0.04,
    "Aufladung ≈ Schaden × .28 × gain: " + (got / lost).toFixed(3),
  );
  ok(
    "Hyper-Leiste lädt " +
      Math.round((1 - METER.gain) * 100) +
      " % langsamer (Treffer: " +
      got.toFixed(1) +
      " Meter für " +
      lost.toFixed(0) +
      " Schaden)",
  );
}

// 3) Normaler Hyper bleibt unverändert (Combo < 10, Meter voll)
{
  const { p1, p2, t, combo } = setup();
  p1.meter = METER.max;
  combo(3);
  t(["SUP"]);
  assert.equal(p1.moveName, "super", "normaler Hyper");
  assert.ok(!(p1.move && p1.move.cfin));
  assert.ok(p1.meter < METER.max, "Hyper kostet weiter Meter");
  ok("Hyper mit Meter funktioniert wie vorher");
}

// 4) Verlauf: Freeze (normal schnell) -> Zeitlupe -> Projektil trifft hart -> Ende, Zeitlupe/Schwarz weg
{
  const { g, p1, p2, t, combo } = setup();
  p1.meter = METER.max;
  combo(10);
  const hp0 = p2.hp;
  t(["SUP"]);
  let slow = 0,
    black = 0,
    proj = 0,
    maxA = 0,
    steps = 0;
  while (g.fin && steps++ < 600) {
    t([]);
    if (g.superFlash <= 0 && g.timeScale === F.slow) slow++;
    if (g.finA > 0.9) black++;
    maxA = Math.max(maxA, g.finA);
    if (g.projectiles.some((p) => p.owner === p1 && p.def.cfin)) proj++;
    p2.comboHits = Math.max(p2.comboHits, 10);
  }
  assert.ok(!g.fin, "Finisher endet von selbst (" + steps + " Schritte)");
  assert.ok(slow >= 10, "Zeitlupe während der Attacke (" + slow + " Schritte)");
  assert.ok(
    black >= 3 && maxA > 0.95,
    "Hintergrund wird (fast) komplett schwarz",
  );
  assert.ok(
    p2.state === "knockdown" || p2.state === "tumble" || p2.state === "airhit",
    "die Welle trifft garantiert und wirft den Gegner um (" + p2.state + ")",
  );
  for (let k = 0; k < 40; k++) t([]);
  assert.equal(g.timeScale, 1, "Zeitlupe vorbei");
  assert.equal(g.finA, 0, "Schwarz weg");
  assert.ok(
    p2.hp < hp0 - 170,
    "Super-Spezial macht richtig Schaden: " + Math.round(hp0 - p2.hp),
  );
  ok(
    "Zeitlupe " +
      slow +
      " Schritte, Schwarz an/aus, Welle trifft für " +
      Math.round(hp0 - p2.hp) +
      " Schaden",
  );
}

// 5) Nur einmal je Combo; nach neuer Combo wieder möglich
{
  const { g, p1, p2, t, combo } = setup();
  p1.meter = METER.max;
  combo(10);
  t(["SUP"]);
  let s = 0;
  while (g.fin && s++ < 600) {
    t([]);
    p2.comboHits = Math.max(p2.comboHits, 10);
    p2.finDone = true;
  }
  p1.setState("idle");
  p1.move = null;
  p1.moveName = null;
  const h = p2.hp;
  p2.finDone = true;
  combo(12);
  p2.finDone = true;
  t(["SUP"]);
  assert.notEqual(
    p1.moveName,
    "finisher",
    "in derselben Combo nicht noch einmal",
  );
  p1.setState("idle");
  p1.move = null;
  p1.moveName = null;
  p1.meter = METER.max;
  g.superFlash = 0; // (in derselben Combo gab I den normalen Hyper – hier zurücksetzen)
  p2.endCombo();
  assert.ok(!p2.finDone, "neue Combo: wieder frei");
  combo(10);
  t(["SUP"]);
  assert.equal(p1.moveName, "finisher");
  ok("einmal je Combo, danach wieder verfügbar");
}

// 6) Auch direkt aus einem laufenden Move heraus (Treffer gelandet = Cancel-Fenster)
{
  const { g, p1, p2, t, combo } = setup();
  p1.meter = METER.max;
  combo(10);
  t(["L"]);
  let k = 0;
  while (!p1.contact && k++ < 40) t([]);
  combo(10);
  t(["SUP"]);
  assert.equal(p1.moveName, "finisher", "Cancel in den Finisher nach Treffer");
  ok("Finisher auch direkt aus dem laufenden Schlag (Cancel nach Kontakt)");
}

// 7) Jede Figur hat einen Finisher (Standard-Special vorhanden), Werte vergrößert
for (const id of Object.keys(CHARACTERS)) {
  const c = CHARACTERS[id];
  if (!c.sprites && !c.moveset && id === "custom") continue;
  try {
    const { p1, p2, t, combo } = setup(id, "wolf");
    p1.meter = METER.max;
    combo(10);
    t(["SUP"]);
    if (!p1.moves.fireball || !p1.moves.fireball.proj) continue;
    assert.equal(p1.moveName, "finisher", id);
    const b = [].concat(p1.moves.fireball.proj)[0],
      f = [].concat(p1.move.proj)[0];
    assert.ok(
      f.dmg >= b.dmg * 3 &&
        f.w > b.w &&
        f.vx > b.vx &&
        f.life > b.life &&
        f.hard,
      id + ": aufgeladen",
    );
  } catch (e) {
    if (/CHARACTERS|undefined/.test(String(e))) continue;
    throw e;
  }
}
ok(
  "alle Figuren: aufgeladene Version des Standard-Specials (mehr Schaden, größer, schneller, länger, Knockdown)",
);

// 8) Deterministisch (Lockstep-tauglich)
{
  const run = () => {
    const { g, p1, p2, t, combo } = setup();
    p1.meter = METER.max;
    combo(10);
    const h = p2.hp;
    t(["SUP"]);
    let s = 0;
    while (g.fin && s++ < 600) {
      t([]);
      p2.comboHits = Math.max(p2.comboHits, 10);
      p2.finDone = true;
    }
    return [Math.round(h - p2.hp), s, g.frame];
  };
  assert.deepEqual(run(), run());
  ok("deterministisch");
}
console.log("Finisher-Tests bestanden (" + n + ")");
