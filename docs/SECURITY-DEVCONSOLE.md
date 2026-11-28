# Sicherheit: Entwicklerkonsole & Eingaben

Geprüft: `src/render/devconsole.js`, `src/core/devcmds.js`, `src/core/unlocks.js`, `src/main.js` (Konsole, Move-Liste, globale Hooks),
`innerHTML`-Stellen in `netui.js`, `musicpanel.js`, `customstudio.js`. Tests: `node tests/devconsole.test.js`.

## Bereits sicher (unverändert)
- Kein `eval`/`new Function`/`document.write` im gesamten `src/`.
- Konsolenausgabe nur per `textContent`; Befehle nur aus der `Map` (kein Prototype-Zugriff).
- `netui.js` (`ntEsc`), `customstudio.js` (`esc`) und `musicpanel.js` (`textContent`) escapen Fremddaten. Übrige `innerHTML`-Stellen nutzen nur Konstanten.
- Konsole öffnet nicht im Online-Kampf; Befehle kennen nur Whitelist-IDs (`give`).

## Gefundene Schwachstellen und Behebung
| # | Fund | Risiko | Behebung |
|---|------|--------|----------|
| 1 | `window.__game/__arcade/__dev/__net …` waren immer global | Umgehung der Konsole per Browser-Konsole (God-Mode, `__dev.add`) | Hooks nur noch auf localhost/Datei/LAN (`main.js`, Ende). e2e-Tests laufen lokal weiter. |
| 2 | Move-Liste (`fillMoves`) setzte `char.name/pros/cons` und Move-Labels ungefiltert per `innerHTML` | XSS über Custom-/Community-Charaktere | HTML-Escape `_hx` für alle Zellen. |
| 3 | `?unlock=` und gespeicherte Unlocks ohne Prüfung | beliebige Strings/Mengen im Speicher | ID-Format `[a-z0-9_-]{1,24}`, max. 32; manipulierter Speicher wird gefiltert. |
| 4 | Konsole ohne Längen-/Zeichen-/Argumentgrenzen | Spam, Riesen-Ausgaben | 200 Zeichen, 8 Argumente à 40, Zeichen-Whitelist (Buchstaben, Ziffern, `_-.,:=+!?#/@'"`), `maxlength` im Feld. |
| 5 | Kein Rate-Limit | Befehls-Spam | 30 Eingaben / 5 s, Warnung nur einmal (kein Log-Fluten). |
| 6 | Fehler-/Echo-Texte ungekürzt | Log-Flut, Info-Leck | Ausgabe 400, Fehler 160, Echo 24 Zeichen. |
| 7 | `add()` akzeptierte beliebige Namen/Nicht-Funktionen | Registrierung von String-Code | Name `[a-z][a-z0-9_-]{0,23}`, `fn` muss Funktion sein. |
| 8 | `give coins` unbegrenzt | Überlauf | Obergrenze 999 999. |
| 9 | Befehle nur beim Öffnen gegen Online gesperrt | Befehl während Online-Match | Hook `deny` prüft bei jedem Befehl. |

## Bewusst nicht geändert / Restrisiko
- Das Spiel ist rein clientseitig: Wer eigenen JS-Code im Tab ausführt (Browser-Konsole), kann `localStorage` und Spielobjekte ändern. Das ist ohne Server-Autorität nicht verhinderbar. Die Härtung entfernt die bequemen Einstiegspunkte (Punkt 1).
- Strg+Alt+D ist auch im öffentlichen Build für jeden nutzbar (Cheats betreffen nur lokalen Spielstand). Falls gewünscht: Konsole per Build-Flag nur lokal aktivieren – bisher nicht eingebaut, um das Verhalten nicht zu ändern.
- `server/server.js` wurde nicht geprüft (nicht Teil der Konsole; keine Konsolenbefehle erreichen ihn).
- `dist/` wird erst durch `build` aktualisiert.

## Angriffstests (harmlos, automatisiert)
`eval(1+1)`, `__pwn()`, `<img onerror>`, `<script>`, `help;…`, `&&`, `|`, `$(id)`, Backtick, NUL, Zeilenumbruch, SQL-Fragment,
`{{7*7}}`, `../`, `__proto__`/`constructor`/`toString`, Überlänge, zu viele Argumente, Bidi-/Zero-Width-Zeichen, 100 Befehle am Stück,
`?unlock=` mit 60+ und ungültigen IDs, manipulierter Unlock-Speicher.


## Nachtrag: öffentlicher Build und Server
- **Dev-Konsole im öffentlichen Build aus:** `main.js` registriert und mountet sie nur auf localhost/Datei/LAN (`_localHost`). Auf dem Live-Host öffnet Strg+Alt+D nichts, `window.__*` existiert nicht.
- **Server (`server/server.js`) geprüft:** Der Server wertet keine Spielnachrichten aus (reines Relay, max. 4 KB, Rate-Limit pro Verbindung), die feste Routenliste verhindert Path-Traversal. Der Client validiert Gegner-Nachrichten (`netplay.js`).
- **Neu:** max. 8 fehlgeschlagene Beitrittsversuche pro Verbindung (Durchprobieren der 4-Buchstaben-Codes), `nosniff`/`no-referrer`-Header (Server und `render.yaml`), optionale Herkunftsprüfung per Umgebungsvariable `ALLOWED_ORIGINS` (leer = aus).
- **Offen:** Content-Security-Policy erst nach Test gegen den echten Build setzen (sonst Gefahr, Video/Audio/WebSocket zu blockieren). Pro-IP-Limit nur sinnvoll, wenn die Proxy-Kette von Render sicher bekannt ist.
