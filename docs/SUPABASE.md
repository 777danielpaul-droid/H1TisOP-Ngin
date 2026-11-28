# Konto & Cloud-Spielstand (Supabase)

Optionales Login (E-Mail + Passwort); der Spielstand wird in der Cloud gesichert und auf jedem Gerät geladen. Ohne Konto spielt man wie bisher lokal.

## Einrichten (einmalig, ohne Tippen)
`./supabase-setup.sh` (Windows: `supabase-setup.bat`). Das Skript meldet die Supabase-CLI an (einmal Browser), legt das Projekt „hitisop“ an bzw. findet es, spielt `supabase/migrations/*.sql` ein und schreibt `supabase.config.json` (URL + **öffentlicher** anon/publishable-Key – darf im Spiel und im Repo stehen). Danach normal bauen (`npm run build`). Wiederholbar. Alternativ für Hoster: Umgebungsvariablen `HITISOP_SUPABASE_URL` / `HITISOP_SUPABASE_KEY` beim Build.

## Aufbau
- `src/core/cloud.js` – Konto + Abgleich (nur `fetch` + `localStorage`, kein DOM, Tests: `tests/cloud.test.js`).
- `src/render/cloudui.js` – Fenster `#cloud` und Knopf `#acct` (Titelmenü oben rechts, Taste **L**, Optionen → „Konto & Cloud-Spielstand“).
- `supabase/migrations/…_savegames.sql` – Tabelle `savegames` (eine Zeile je Spieler, `data` = JSON), Row Level Security: jeder nur seine Zeile, `anon` hat keinen Zugriff. `updated_at` setzt der Server.
- `tools/build.mjs` bettet die Konfiguration als `window.__SUPABASE__` ein.

## Was synchronisiert wird
`hitisop.loot`, `hitisop.unlocks`, `hitisop.clears`, `hitisop.skins` (Coins, Booster, Karten, Farben, Stages, Items, Freischaltungen, Durchläufe …). Neue Felder in diesen Objekten werden automatisch mitgenommen. Einstellungen, Editor-Werte und Online-Daten bleiben lokal.

## Abgleich-Regeln
- Start/Anmelden: lokal unverändert → Cloud-Stand übernehmen · nur lokal geändert → hochladen · beides geändert oder erstes Gerät → zusammenführen (Zahlen: Maximum, Listen: Vereinigung).
- Wurde der lokale Stand ersetzt, lädt die Seite **einmal** neu (der Stand steckt zur Laufzeit im Speicher).
- Im laufenden Spiel wird nur hochgeladen (nach ca. 3,5 s Ruhe, beim Verlassen der Seite sofort), nie lokal überschrieben.
- Abmelden lässt den lokalen Stand auf dem Gerät.

## Sicherheit
Nur der öffentliche Key im Client, **nie** den `service_role`-Key. Cloud-Daten werden beim Lesen gesäubert (`cloudClean`: Typen, Größe, keine `__proto__`-Schlüssel). `supabase/.env` (Datenbank-Passwort des automatisch angelegten Projekts) steht in `.gitignore`. Neue Projekte bekommen per `supabase/config.toml` „keine Bestätigungs-Mail“, Passwort ab 8 Zeichen.

## Punkte & Highscores
Punkte gibt es im **Arcade-Modus** (`src/core/score.js`, Werte in `SCORE`). Pro Stage: + 100 je verteiltem Treffer, + Combo-Bonus (längste Combo), − 75 je eingesteckten Treffer, + 1000 Stage geschafft, + 500 je Runde ohne Treffer (PERFEKT), + 2000 ganze Stage ohne Treffer (FLAWLESS), + Restleben und Restzeit; danach × (1 + 0,25 je Schwierigkeitsstufe) × 1,5 beim Endgegner. Bei Niederlage zählen nur Treffer/Combo abzüglich eingesteckter Treffer. Die Punkte aller Stages eines Durchlaufs ergeben den Highscore; er wird bei Game Over/Sieg gewertet. Der Stage-/Ende-Bildschirm zeigt Punkte, Gesamt und Highscore.
- **Lokal** (immer): `hitisop.scores`, die 20 besten Durchläufe, auch ohne Konto.
- **Cloud**: Tabelle `highscores` (ein Bestwert je Spieler), Lesen für alle, Schreiben nur über die Funktion `submit_highscore()` (Spieler-ID aus dem Login). Sichtbar ist nur ein frei wählbarer **Spielername** (Standard `SPIELER-XXXX`, kein E-Mail-/Google-Name). Anzeige: Cloud-Fenster → Reiter „Bestenliste“. Bestwerte, die offline oder vor dem Anmelden erspielt wurden, werden beim nächsten Start nachgereicht.
- **Fälschungsschutz (Stufe 1: Plausibilitätsprüfung):** Der Client schickt nicht die Punktzahl, sondern das Stage-Protokoll (`run.log`: je Stage Treffer, eingesteckte Treffer, Combo, perfekte Runden, Restleben, Restzeit, Runden). `submit_highscore()` rechnet die Punkte selbst aus und lehnt Unmögliches ab (zu viele Treffer je Runde, Restzeit > 99 s, Niederlage mitten im Lauf, falsche Rundenzahl …); zusätzlich mind. 20 s Abstand zwischen zwei Einträgen. Direktes Schreiben in die Tabelle ist gesperrt. Grenzen: `LIMITS` in `src/core/score.js` (gemessen: KI gegen KI schafft max. 33 Treffer/Runde, Combo 12; erlaubt sind 60/25). Wer das Protokoll selbst baut, kann weiterhin „gerade noch mögliche“ Werte einsenden (also ein fast perfekter Lauf ist ohne Spielen erfindbar) – das verhindert absurde Werte, aber keinen entschlossenen Betrüger. Stufe 2 (bei Bedarf): Eingaben aufzeichnen und serverseitig nachspielen (Edge Function), dafür muss die KI mit festem Zufallswert laufen.
- Eintrag löschen (z. B. bei Betrug): Supabase-Dashboard → SQL Editor → `delete from public.highscores where name = '…';`
- Prüfungen: `tests/score.test.js` (JS-Zwilling `verifyRun`, echte KI-Durchläufe, Zahlen-Abgleich mit der SQL-Datei) und optional `npm i --no-save @electric-sql/pglite && node tests/sql-highscores.test.mjs` (die echte SQL-Funktion in einer Postgres-Datenbank).
- Statistik pro Kämpfer: `fighter.sc` (core/combat.js `hit()`, core/game.js `endRound()`). Tests: `tests/score.test.js`.

## Anmeldung mit Google
Oben im Fenster „Mit Google anmelden“ (OAuth über Supabase, PKCE). Der Knopf erscheint nur, wenn `supabase.config.json` `"google": true` enthält und das Spiel über http(s) läuft (Render, `npm start`/localhost – **nicht** als lokale Datei). Einrichtung macht `supabase-setup` mit: Es öffnet die Google-Cloud-Konsole, kopiert die Weiterleitungs-Adresse `https://<ref>.supabase.co/auth/v1/callback` in die Zwischenablage und fragt einmal nach Client-ID + Secret (Google gibt die nur dort heraus); danach aktiviert es Google per Supabase-API und erlaubt die Rückkehr-Adressen (`HITISOP_SITE_URL`, Standard `https://hit-isop.onrender.com`, plus localhost). Alternativ `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` als Umgebungsvariablen oder in `supabase/.env`. E-Mail + Passwort bleibt als Alternative.
