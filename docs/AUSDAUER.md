# Ausdauer-System (Stamina) und Verschnaufen (HP)

Jede Kampfaktion kostet Ausdauer. Dauer-Button-Spamming lohnt sich dadurch nicht mehr, aber Angriffe reagieren weiterhin sofort auf die Tasten
(keine Verzögerung, Combos und Schlagfolgen bleiben unverändert). Das Kämpfen wird taktischer und etwas langsamer (Runden ca. 15–20 % länger).

Alle Zahlen stehen an **einer** Stelle: `STAMINA` in `src/core/config.js` (Zeiten in Frames, 60 = 1 Sekunde; Ausdauer in Punkten, volle Leiste = 100).
Die Regeln gelten für Spieler, KI-Gegner und Online-Gegner gleich (derselbe Kämpfer-Code, kein Zufall → Online-Lockstep-tauglich).

## Bedienung

| Was                       | Taste                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Verschnaufen (1 Spieler)  | `P` oder `Shift`                                                                                                              |
| Verschnaufen (2 Spieler)  | P1 `V`, P2 `'` / Ziffernblock `,`                                                                                             |
| Verschnaufen (Controller) | `L2`                                                                                                                          |
| Ausdauer an/aus           | Menü `M` → Optionen → „Ausdauer“ (wird gespeichert). Online bestimmt der Gastgeber für beide, der Schalter ist dann gesperrt. |

Anzeige: Die Ausdauerleiste sitzt unter dem Lebensbalken (Gold = normal, orange = knapp, rot pulsierend = erschöpft; die weiße Marke zeigt, ab wann man wieder handlungsfähig ist;
die zwei hellen Striche bei 25 % und 50 % sind die Block-Schwellen). Rote Umrandung + „KEINE AUSDAUER“ = Aktion nicht bezahlbar, „KEIN BLOCK“ / „KEIN SPECIAL-BLOCK“ = Block-Einschränkung.
Beim Verschnaufen leuchtet der Lebensbalken mintgrün („VERSCHNAUFEN +HP“).

## 1. Verbrauch (`STAMINA.cost`, `STAMINA.block`)

Leicht 5 · mittel 9 · schwer 16 · Specials 11–20 (je Move, `special.def` = alle anderen) · Dash 9 · Luft-Dash 11 · Sprung 3 · Doppelsprung 3.
Hypers kosten keine Ausdauer (nur die Hyper-Leiste). Blocken kostet pro geblocktem Treffer `base + Move-Schaden × perDmg`.

## 2. Passive Regeneration (`regen`, `delay`)

`0,3` Punkte pro Frame (~18/s), nachdem `40` Frames nichts verbraucht wurde. **Keine** Regeneration beim Angreifen, Dashen, beim **aktiven Blocken**
(Block-Zustand oder gehaltene Rück-Taste, solange man überhaupt blocken darf) und **nicht während des Verschnaufens**.

## 3. Verschnaufen = HP-Regeneration (`STAMINA.rest`)

Taste `P`/`Shift`/`L2`: Der Kämpfer bleibt am Boden stehen (geduckte Pose) und regeneriert **langsam HP, keine Ausdauer**.

- Dauer: höchstens `150` Frames (2,5 s), abbrechbar nach `45` Frames per Richtung/Taste; `0,04 %` der Max-HP pro Frame (≈ 6 % in voller Länge).
- **Verwundbar** während der ganzen Animation: kein Block, jeder Treffer unterbricht, und der Verschnaufende nimmt `×1,15` Schaden („ERWISCHT!“).
- Begrenzt gegen endloses Heilen: Abklingzeit `90` Frames nach der Höchstdauer, höchstens `20 %` der Max-HP Heilung pro Runde, nur bei angeschlagenen HP.
- Gilt für Spieler und Gegner; **unabhängig vom Ausdauer-Schalter** (auch bei ausgeschalteter Ausdauer nutzbar). Aus in Melee und Story.

## 4. Vollständige Erschöpfung (`emptyDelay`, `exhaust`)

Fällt die Leiste auf 0, gibt es eine **zusätzliche Pause von `150` Frames (2,5 s) ohne jede Regeneration**, auch nicht passiv (normal: 40 Frames). Danach regeneriert sie wieder,
und der Kämpfer bleibt **erschöpft**, bis `35` Punkte erreicht sind. Erschöpft heißt: schwere und mittlere Normals, Specials und Dash gesperrt · Lauftempo ×0,82 · Schaden ×0,7 ·
Block-Schaden (HP) ×1,5 · Regeneration ×0,85 · und unter 25 % ohnehin kein Block (siehe 5.). Immer möglich (nie handlungsunfähig): leichte Angriffe, Laufen, Springen, Verschnaufen.
Leichte Angriffe bei leerer Leiste verlängern die lange Pause nicht. Schwere Normals und Specials sind schon bei zu wenig Ausdauer gesperrt (Preis nicht bezahlbar), nicht erst bei 0.

## 5. Blocken nach eigener Ausdauer (`STAMINA.guard`)

| Eigene Ausdauer     | Normale Angriffe blocken | Spezialattacken blocken |
| ------------------- | ------------------------ | ----------------------- |
| unter 25 %          | nein                     | nein                    |
| 25 % bis unter 50 % | ja                       | nein                    |
| ab 50 %             | ja                       | ja                      |

„Spezialattacken“ = Specials, Projektile (Energiewelle …) und Hypers. Schwellen sind Anteile der eigenen Leiste (Figuren mit `char.stam` haben eine größere/kleinere Leiste).

## 6. Ein-/Ausschalten, Geltungsbereich

- Optionen → „Ausdauer“ aus = bisheriges Kampfsystem ohne jede Ausdauer-Beschränkung (inkl. Blocken). Standard: `STAMINA.on`.
- Online: Der Gastgeber bestimmt die Einstellung für beide (steht im Start-Paket, ist im Prüfwert enthalten, siehe `netmatch.js`/`netplay.js`); die neue Taste ist das 7. Tasten-Bit.
- Nicht aktiv in Melee und Story (viele Gegner gleichzeitig mit eigener KI). Pro Figur: `char.stam` (Faktor auf Leiste/Regeneration; H!T hat `1.15`, weil Dashes ihn mehr kosten), `char.noStamina = true` schaltet es ab.
- KI: zahlt nur, was sie bezahlen kann (schwer → mittel → leicht), hält bei knapper Ausdauer Abstand/wartet ab und verschnauft angeschlagen in sicherer Distanz (`rest` je Stufe in `ai.js`).

## 7. Regler im M-Menü (Optionen)

Vier Regler und ein „Standard“-Knopf, jeweils als **Faktor auf die Werte aus `config.js`** (1,00× = Standard, wird in `localStorage` als `tf_stamtune` gespeichert):

| Regler                             | wirkt auf                                                        | Bereich    |
| ---------------------------------- | ---------------------------------------------------------------- | ---------- |
| Ausdauer-Regeneration              | `STAMINA.regen` (schneller/langsamer auffüllen)                  | 0,25× – 3× |
| Pause vor der Regeneration (Delay) | `STAMINA.delay` (0 = Regeneration setzt sofort ein)              | 0× – 3×    |
| Pause nach Erschöpfung (Delay)     | `STAMINA.emptyDelay` (0 = keine Strafpause)                      | 0× – 3×    |
| Verschnaufen – HP-Regeneration     | `STAMINA.rest.hpPct` (HP-Tempo; die Obergrenze pro Runde bleibt) | 0,25× – 3× |

Online gelten **die Werte des Gastgebers** für beide (stehen im Start-Paket, `tune` in `netmatch.js`); die Regler sind dann gesperrt und zeigen den aktiven Wert.
Der Online-Test prüft das mit abweichenden lokalen Werten beim Gast. Wertebereiche: `STAM_TUNE` in `config.js`.

## Balancing-Stand

Gemessen mit KI gegen KI (Stufe „Hart“, `node tools/balance.mjs --n=60`): Leiste im Schnitt ~55 % gefüllt, ~3 % der Zeit erschöpft, ~14 % der Zeit unter 25 %,
Runden ~37 s (ohne Ausdauer ~31 s), Hypers ~0,85 pro Runde (ohne ~0,2).
**Spam-Test** (`node tools/spam-check.mjs`, ein Spammer drückt ununterbrochen zufällige Angriffe gegen die KI „Hart“): ohne Ausdauer gewinnt der Spammer 98 %, mit Ausdauer ~22 % (er ist ~75 % der Zeit erschöpft).

## Typische Anpassungen

| Ziel                                   | Stellschraube                                                      |
| -------------------------------------- | ------------------------------------------------------------------ |
| Ausdauer insgesamt knapper/großzügiger | alle `cost` skalieren, `regen`                                     |
| Auspowern härter/milder bestrafen      | `emptyDelay`, `exhaust.until/dmg/speed/chip`                       |
| Blocken teurer (gegen Turtling)        | `block.perDmg`, `block.base`, `guard.none/special`                 |
| Verschnaufen stärker/schwächer         | `rest.hpPct`, `rest.max`, `rest.cap`, `rest.cooldown`, `rest.vuln` |
| Figur flinker/zäher                    | `char.stam` in `characters.js`                                     |
| Standard Ein/Aus                       | `STAMINA.on`                                                       |

## Werkzeuge

- `node tests/stamina.test.js` – prüft alle Regeln (Kosten, Pause, Block-Schwellen, kein Regenerieren beim Blocken, Auspowern, Einschränkungen, Verschnaufen, Schalter, KI, Determinismus).
- `node tools/balance.mjs [--n=60] [--level=2] [--stam=0|1] [--tune=S.regen=.3,S.cost.L=4,tiger.hp=1000]` – Gewinnquoten-Matrix, Schaden je Move, Ausdauer-Kennzahlen, HP-Heilung. `--tune` überschreibt Werte nur für den Lauf.
- `node tools/spam-check.mjs [--n=100] [--level=2] [--tune=...]` – lohnt sich Spamming noch?
- `node tools/balance-fit.mjs [--measure]` – gleicht Leben/Schaden der Figuren schrittweise in Richtung 50 % Gewinnquote an.
