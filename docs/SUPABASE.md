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

## Highscores
Noch nicht gebaut (im Spiel gibt es bisher keine echte Highscore-Liste). Vorschlag: eigene Tabelle `highscores` mit Insert-Policy für angemeldete Spieler, Lesen für alle.

## Anmeldung mit Google
Oben im Fenster „Mit Google anmelden“ (OAuth über Supabase, PKCE). Der Knopf erscheint nur, wenn `supabase.config.json` `"google": true` enthält und das Spiel über http(s) läuft (Render, `npm start`/localhost – **nicht** als lokale Datei). Einrichtung macht `supabase-setup` mit: Es öffnet die Google-Cloud-Konsole, kopiert die Weiterleitungs-Adresse `https://<ref>.supabase.co/auth/v1/callback` in die Zwischenablage und fragt einmal nach Client-ID + Secret (Google gibt die nur dort heraus); danach aktiviert es Google per Supabase-API und erlaubt die Rückkehr-Adressen (`HITISOP_SITE_URL`, Standard `https://hit-isop.onrender.com`, plus localhost). Alternativ `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` als Umgebungsvariablen oder in `supabase/.env`. E-Mail + Passwort bleibt als Alternative.
