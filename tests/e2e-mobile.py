# Browser-Ende-zu-Ende-Test: Handy quer (Touch-Emulation) – Bild passt in die sichtbare Fläche, Vollbild per erstem Tipp und per ⛶-Knopf.
# Voraussetzung: playwright + chromium (oder Google Chrome), vorher node tools/build.mjs.   Aufruf: python3 tests/e2e-mobile.py
import json, pathlib, tempfile, os
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'dist' / 'hitisop.html').as_uri()
os.chdir(tempfile.mkdtemp(prefix='hitisop-mobile-'))   # Screenshot (mobile.png) landet hier
print('Screenshots in', os.getcwd())
bad = False
def ok(c, m):
    global bad
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: bad = True

with sync_playwright() as p:
    args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']
    try: b = p.chromium.launch(args=args)
    except Exception: b = p.chromium.launch(args=args, channel='chrome')   # kein Playwright-Chromium installiert -> vorhandenes Google Chrome nehmen
    # Handy quer, Browserleiste sichtbar (sichtbare Höhe nur 340 statt z. B. 393)
    ctx = b.new_context(viewport={'width': 800, 'height': 340}, is_mobile=True, has_touch=True, device_scale_factor=2)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1500)

    fs = lambda: pg.evaluate("!!document.fullscreenElement")
    btn_hidden = lambda: pg.evaluate("document.querySelector('.tp-fsb').classList.contains('hide')")
    def geom():
        return pg.evaluate("""(()=>{const c=document.getElementById('screen').getBoundingClientRect();
          const cs=getComputedStyle(document.documentElement);
          return {ih:innerHeight,iw:innerWidth,top:c.top,bottom:c.bottom,left:c.left,right:c.right,w:c.width,h:c.height,
                  appH:cs.getPropertyValue('--app-h').trim(),appW:cs.getPropertyValue('--app-w').trim()}})()""")
    g = geom(); print(json.dumps(g))
    ok(g['appH'] == '340px' and g['appW'] == '800px', '--app-h/--app-w folgen der sichtbaren Fläche')
    ok(g['top'] >= -0.5 and g['bottom'] <= g['ih'] + 0.5, 'Bild liegt komplett in der sichtbaren Höhe (nichts abgeschnitten)')
    ok(abs(g['w'] / g['h'] - 16 / 9) < 0.01, 'Seitenverhältnis 16:9 bleibt')

    # Größe ändern (Leiste klappt ein -> mehr Höhe): Bild muss mitwachsen
    pg.set_viewport_size({'width': 800, 'height': 393}); pg.wait_for_timeout(700)
    g2 = geom(); print(json.dumps(g2))
    ok(g2['appH'] == '393px' and g2['bottom'] <= g2['ih'] + 0.5 and g2['h'] > g['h'], 'Mehr Höhe -> Bild wächst mit, bleibt komplett sichtbar')

    # Vollbild-Knopf vorhanden + sichtbar, noch kein Vollbild
    ok(pg.evaluate("!!document.querySelector('.tp-fsb')") and not btn_hidden(), 'Vollbild-Knopf (⛶) ist da und sichtbar')
    ok(not fs(), 'vor dem ersten Tippen: noch kein Vollbild')

    # Erster Tipp irgendwo (noch im Intro-Video) -> Auto-Vollbild, Knopf verschwindet
    pg.touchscreen.tap(400, 170); pg.wait_for_timeout(900)
    ok(fs(), 'erster Tipp löst automatisch Vollbild aus (auch während des Intros)')
    ok(btn_hidden(), 'im Vollbild ist der Knopf ausgeblendet (HUD bleibt sauber)')
    g3 = geom(); print(json.dumps(g3))
    ok(g3['top'] >= -0.5 and g3['bottom'] <= g3['ih'] + 0.5, 'im Vollbild: Bild komplett sichtbar')

    # Intro überspringen; Vollbild von außen beenden (wie die Zurück-Geste unter Android)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
    pg.evaluate("document.exitFullscreen()"); pg.wait_for_timeout(900)
    ok(not fs() and not btn_hidden(), 'nach dem Beenden ist der Knopf wieder da')
    box = pg.locator('.tp-fsb').bounding_box(); cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    ok(pg.evaluate(f"!!document.elementFromPoint({cx},{cy}).closest('.tp-fsb')"), 'Knopf liegt auf dem Titelbildschirm ganz oben (nichts verdeckt ihn)')

    # Nach bewusstem Beenden wird NICHT erneut erzwungen
    pg.touchscreen.tap(400, 30); pg.wait_for_timeout(700)
    ok(not fs(), 'nach bewusstem Beenden kein erneutes Erzwingen')

    # Knopf bringt Vollbild zurück
    pg.touchscreen.tap(cx, cy); pg.wait_for_timeout(900)
    ok(fs() and btn_hidden(), 'Tipp auf den Knopf startet Vollbild wieder (Knopf verschwindet)')
    pg.screenshot(path='mobile.png')
    ok(not errs, 'keine JS-Fehler' + (': ' + str(errs[:3]) if errs else ''))
    b.close()
print('ALLES OK' if not bad else 'FEHLER')
raise SystemExit(1 if bad else 0)
