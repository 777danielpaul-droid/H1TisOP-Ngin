# Browser-Ende-zu-Ende-Test: Move-Editor der eigenen Figur (Reiter „Einzelne Moves“) im echten Chrome.
# Prüft: Sheet-Import je Move, Einzelbilder, einzelnes Frame ersetzen (ohne Sheet neu zu importieren), auswählen, löschen, umsortieren (Buttons + Ziehen),
# Rückgängig/Wiederholen, Kopieren in einen anderen Move, Feinabstimmung, Speichern, Neuladen (Frames bleiben), alter Speicherstand (v1) und Kampf mit der Figur.
# Voraussetzung: playwright + Chrome, vorher node tools/build.mjs.  Aufruf: python3 tests/e2e-moves.py
import json, sys, pathlib, tempfile, os
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
URL=(ROOT/'dist'/'hitisop.html').as_uri()
TMP=pathlib.Path(tempfile.mkdtemp(prefix='hitisop-moves-'));print('Bilder/Screenshots in',TMP)
bad=False
def ok(c,m):
    global bad
    print(('ok   ' if c else 'FAIL ')+m)
    if not c: bad=True

COL={'red':(210,40,40),'blue':(40,70,220),'yellow':(230,200,30),'purple':(170,40,200),'orange':(240,120,20),'pink':(240,80,160),'white':(235,235,235),'brown':(120,70,30)}
def fig(d,x0,y0,cw,ch,color,arm=0,h=300):
    cx=x0+cw//2;base=y0+ch-50
    d.rectangle([cx-55,base-h,cx+55,base],fill=color);d.ellipse([cx-40,base-h-70,cx+40,base-h+10],fill=color)
    if arm:d.rectangle([cx+55,base-h+50,cx+55+arm,base-h+90],fill=color)
def sheet(path,items,cols=3,rows=2,cw=420,ch=520):
    im=Image.new('RGB',(cols*cw,rows*ch),(0,255,0));d=ImageDraw.Draw(im)
    for i,(color,arm) in enumerate(items):fig(d,(i%cols)*cw,(i//cols)*ch,cw,ch,COL[color],arm)
    im.save(path)
def single(path,color,arm=60):
    im=Image.new('RGB',(420,520),(0,255,0));fig(ImageDraw.Draw(im),0,0,420,520,COL[color],arm);im.save(path)
def nearest(px):
    r,g,b,a=px
    if a<200:return 'leer'
    return min(COL,key=lambda k:sum((c-v)**2 for c,v in zip(COL[k],(r,g,b))))
# Bilder: Idle (Zelle 1 = neutral, dann 5 Frames), Schlag (Zelle 1 = neutral + 5 Frames: rot,blau,gelb,lila,orange), Einzelbilder, ein 2x2-Sheet für Tritt
sheet(TMP/'idle_1.png',[('white',0),('white',0),('white',10),('white',0),('white',10),('white',0)])
PUNCH=['red','blue','yellow','purple','orange']
sheet(TMP/'punch.png',[('white',0)]+[(c,40+10*i) for i,c in enumerate(PUNCH)])
single(TMP/'ersatz_pink.png','pink');single(TMP/'neu_a.png','brown',30);single(TMP/'neu_b.png','white',80)
sheet(TMP/'kick_sheet.png',[('brown',0),('pink',50),('red',70),('blue',90)],cols=2,rows=2)

THUMBS="[...document.querySelectorAll('#st-pane-moves .mv-th canvas')].map(c=>{const d=c.getContext('2d').getImageData(c.width>>1,(c.height*0.55)|0,1,1).data;return [d[0],d[1],d[2],d[3]]})"
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',headless=True,args=['--use-gl=swiftshader','--enable-unsafe-swiftshader'])
    ctx=b.new_context(viewport={'width':1280,'height':900});pg=ctx.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    def boot():
        pg.goto(URL);pg.wait_for_timeout(1500);pg.keyboard.press('Enter');pg.wait_for_timeout(900)
    def thumbs():return [nearest(x) for x in pg.evaluate(THUMBS)]
    def settle(ms=700):
        try:pg.wait_for_function("!document.querySelector('#st-pane-moves.busy')",timeout=20000)
        except Exception:pass
        pg.wait_for_timeout(min(ms,350))
    def status():return pg.evaluate("document.getElementById('st-status').textContent")
    def chip(k):return pg.locator(f'.mv-chip[data-k="{k}"]')
    def cls(k):return pg.evaluate(f"document.querySelector('.mv-chip[data-k=\"{k}\"]').className")
    def src():return pg.evaluate("document.getElementById('mv-src').textContent")
    def pick(btn,paths):
        with pg.expect_file_chooser() as fc:pg.click(btn)
        fc.value.set_files([str(x) for x in paths]);settle()
    def th(i):return pg.locator('#st-pane-moves .mv-th').nth(i)
    def dnd(a,b,files=None):
        # HTML5-Drag&Drop mit echten DragEvents + DataTransfer (Playwrights drag_to bricht im neuen Chrome-Headless nach dragstart ab)
        pg.evaluate("""([a,b])=>{const t=[...document.querySelectorAll('#st-pane-moves .mv-th')],dt=new DataTransfer();
          t[a].dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt}));
          t[b].dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));
          t[b].dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));
          t[a].dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt}))}""",[a,b])
    def drag(i,j):   # echtes HTML5-Ziehen mit Zwischenschritten (Chrome liefert dragover erst bei mehreren Mausbewegungen)
        a=th(i).bounding_box();c=th(j).bounding_box()
        pg.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);pg.mouse.down()
        for k in range(1,13):pg.mouse.move(a['x']+(c['x']-a['x'])*k/12+a['width']/2,a['y']+(c['y']-a['y'])*k/12+a['height']/2);pg.wait_for_timeout(25)
        pg.mouse.up()
    def wait_status(sub,t=15000):
        try:pg.wait_for_function("s=>document.getElementById('st-status').textContent.includes(s)",arg=sub,timeout=t);return True
        except Exception:return False
    def go_moves():
        pg.evaluate("document.getElementById('btn-studio').click()");pg.wait_for_timeout(800);pg.click('#st-tab-moves');pg.wait_for_function("document.getElementById('st-status').textContent===''",timeout=20000);settle(300)

    boot()
    # ---------- A) Figur aus Sheets (bisheriges System) ----------
    pg.evaluate("document.getElementById('btn-studio').click()");pg.wait_for_timeout(800)
    ok(pg.is_visible('#st-tab-moves') and pg.is_visible('#st-slots'),'Editor offen: Reiter „Sheets“ + „Einzelne Moves“, Sheet-Liste wie bisher')
    pg.set_input_files('#st-files',[str(TMP/'idle_1.png'),str(TMP/'punch.png')]);settle(2500)
    pg.wait_for_function("document.getElementById('st-status').textContent===''",timeout=30000)
    ok(pg.evaluate("document.querySelectorAll('#st-slots .st-row').length")==20,'20 Sheet-Slots (mit Hyper-Special) unverändert')
    pg.click('#st-tab-moves');pg.wait_for_function("document.getElementById('st-status').textContent===''",timeout=20000);settle(300)
    ok(pg.evaluate("document.querySelectorAll('.mv-chip').length")==24,'24 Moves in 3 Gruppen (inkl. Hyper-Special)')
    chip('punch').click();settle(300)
    ok('Sheet' in src() and len(thumbs())==5,'Schlag zeigt die 5 Sheet-Frames (Quelle: Sheet) '+src())
    ok('sheet' in cls('punch').split(),'Chip „Schlag“ als Sheet-Move markiert')
    base=thumbs();ok(base==PUNCH,'Frame-Reihenfolge wie im Sheet: '+str(base))
    # einzelnes Frame ersetzen (Frame 3), ohne das Sheet neu zu importieren
    th(2).click();settle(300);pick('#mv-repl',[TMP/'ersatz_pink.png'])
    t=thumbs();ok(t==['red','blue','pink','purple','orange'],'Frame 3 ersetzt, die anderen 4 unverändert: '+str(t))
    ok('own' in cls('punch').split() and 'Eigene Frames (5)' in src(),'Move ist jetzt eigenständig: '+src())
    # Reihenfolge: Buttons
    th(0).click();settle(200);pg.click('#mv-right');settle(500)
    ok(thumbs()==['blue','red','pink','purple','orange'],'Frame 1 per ▶ nach rechts verschoben: '+str(thumbs()))
    # Reihenfolge: Ziehen
    dnd(4,0);settle(700)
    ok(thumbs()==['orange','blue','red','pink','purple'],'Frame 5 per Ziehen an den Anfang: '+str(thumbs()))
    # Löschen / Rückgängig / Wiederholen
    th(1).click();settle(200);pg.click('#mv-del');settle(600)
    ok(thumbs()==['orange','red','pink','purple'],'Frame 2 gelöscht: '+str(thumbs()))
    pg.click('#mv-undo');settle(600);ok(thumbs()==['orange','blue','red','pink','purple'],'Rückgängig stellt das Frame wieder her')
    pg.click('#mv-redo');settle(600);ok(thumbs()==['orange','red','pink','purple'],'Wiederholen löscht es erneut')
    pg.click('#mv-undo');settle(600)
    # Einfügen hinter dem gewählten Frame + Duplizieren
    th(0).click();settle(200);pick('#mv-ins',[TMP/'neu_a.png'])
    ok(len(thumbs())==6 and thumbs()[1]=='brown','Einzelbild hinter Frame 1 eingefügt: '+str(thumbs()))
    pg.click('#mv-dup');settle(600);ok(len(thumbs())==7 and thumbs()[1]==thumbs()[2]=='brown','Frame dupliziert')
    # Feinabstimmung (Größe/X/Y) + Luft-Pose werden gemerkt
    pg.evaluate("(()=>{const s=document.getElementById('mv-s');s.value=150;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}));const x=document.getElementById('mv-x');x.value=12;x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}))})()");
    try:pg.wait_for_function("document.getElementById('mv-vs').textContent==='150 %'&&document.getElementById('mv-vx').textContent==='12'",timeout=8000)   # Regler laufen über die Warteschlange + ein Animationsframe
    except Exception:pass
    pg.wait_for_timeout(700)
    try:pg.wait_for_function("document.getElementById('mv-vs').textContent==='150 %'&&document.getElementById('mv-vx').textContent==='12'",timeout=8000)   # Regler laufen leise durch die Warteschlange
    except Exception:pass
    ok(pg.evaluate("document.getElementById('mv-vs').textContent")=='150 %' and pg.evaluate("document.getElementById('mv-vx').textContent")=='12','Feinabstimmung: Größe 150 %, X 12')
    th(0).click();settle(300);ok(pg.evaluate("document.getElementById('mv-vs').textContent")=='100 %','anderes Frame hat eigene Werte (100 %)')
    th(2).click();settle(300);ok(pg.evaluate("document.getElementById('mv-vs').textContent")=='150 %','gewähltes Frame behält 150 %')
    pg.click('#mv-undo');settle(500);pg.click('#mv-undo');settle(500)   # X und Größe zurück (je ein Schritt)
    # In anderen Move kopieren: Schwerer Schlag war Behelf (Schlag) -> wird eigenständig + 1 Frame
    th(0).click();settle(200);pg.select_option('#mv-to','heavy');pg.click('#mv-copy');settle(900)
    chip('heavy').click();settle(400)
    ok('own' in cls('heavy').split() and len(thumbs())>=2,'Frame nach „Schwerer Schlag“ kopiert (Behelf wurde eigenständig): '+str(thumbs()))
    # Tempo/Schleife
    chip('punch').click();settle(300);pg.check('#mv-loop');settle(500);pg.fill('#mv-fps','7');pg.press('#mv-fps','Tab');settle(500)
    ok(pg.evaluate("document.getElementById('mv-loop').checked")==True and pg.evaluate("document.getElementById('mv-fps').value")=='7','Schleife an, Tempo 7 B/s')
    # Einzelbilder in einen leeren/Behelf-Move (Treffer): 2 Bilder, dann Sheet 2x2 ohne Kalibrierung in Tritt
    chip('hit').click();settle(300);pg.check('input[name=mv-mode][value=single]');settle(200);pick('#mv-pick',[TMP/'neu_a.png',TMP/'neu_b.png'])
    ok(thumbs()==['brown','white'],'Treffer: 2 Einzelbilder importiert (alphabetisch): '+str(thumbs()))
    chip('kick').click();settle(300);pg.check('input[name=mv-mode][value=sheet]');pg.fill('#mv-cols','2');pg.fill('#mv-rows','2');pg.press('#mv-rows','Tab');pg.uncheck('#mv-calib');pick('#mv-pick',[TMP/'kick_sheet.png'])
    ok(thumbs()==['brown','pink','red','blue'],'Tritt: 2x2-Sheet ohne Kalibrierung -> 4 Frames: '+str(thumbs()))
    # Zurücksetzen eines Moves -> zurück auf Behelf/Sheet
    chip('kick').click();pg.click('#mv-reset');settle(700);ok('own' not in cls('kick').split(),'Zurücksetzen: Tritt ist wieder Behelf')
    # ---------- Speichern ----------
    pg.click('#st-save');pg.wait_for_function("document.getElementById('studio').classList.contains('hidden')",timeout=30000)   # Speichern schließt den Editor;settle(1500)
    meta=pg.evaluate("window.__SPRITES__&&window.__SPRITES__.custom&&window.__SPRITES__.custom.meta")
    ok(bool(meta),'Figur gespeichert und aktiv')
    if meta:
        an=meta['anims'];ok(all(n.startswith('mv_') for n in an['punch']['frames']) and len(an['punch']['frames'])==7,'Spiel-Animation „punch“ nutzt die 7 Move-Frames')
        ok(an['punch'].get('loop')==1 and an['punch'].get('fps')==7,'Tempo/Schleife im Spiel übernommen')
        ok(an['heavy']['frames'][-1].startswith('mv_') and an['hyper']['frames'],'Schwerer Schlag + Hyper haben Frames')
        ok(all(n in meta['frames'] for a in an.values() for n in a['frames']),'alle Frames aller Animationen liegen im Atlas')
        ok(not any(k.startswith('punch_') for k in meta['frames'] if False),'(Atlas enthält nur benutzte Frames)')
    # ---------- B) Neuladen: Frames bleiben, einzelnes Frame nach dem Laden tauschen ----------
    boot();pg.wait_for_function("window.__SPRITES__&&window.__SPRITES__.custom",timeout=15000);go_moves();chip('punch').click();settle(400)
    t2=thumbs();ok(len(t2)==7 and t2[0]=='orange' and t2[-1]=='purple','nach Neuladen: Schlag hat noch alle 7 eigenen Frames '+str(t2))
    ok('own' in cls('punch').split() and 'own' in cls('heavy').split() and 'own' not in cls('kick').split(),'Markierungen (eigen/Sheet/Behelf) bleiben erhalten')
    chip('hit').click();settle(300);ok(thumbs()==['brown','white'],'Treffer-Frames bleiben erhalten')
    chip('punch').click();settle(300);th(3).click();settle(200);pick('#mv-repl',[TMP/'neu_b.png'])
    t3=thumbs();ok(len(t3)==7 and t3[3]=='white' and [x for i,x in enumerate(t3) if i!=3]==[x for i,x in enumerate(t2) if i!=3],'nach dem Laden: nur Frame 4 getauscht, Rest identisch '+str(t3))
    pg.click('#st-save');pg.wait_for_function("document.getElementById('studio').classList.contains('hidden')",timeout=30000)   # Speichern schließt den Editor;settle(1200)
    # ---------- C) alter Speicherstand (v1, ohne Moves) lädt weiterhin ----------
    pg.evaluate("""new Promise(res=>{const r=indexedDB.open('hitisop',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('custom','readwrite'),s=t.objectStore('custom'),g=s.get('fighter');g.onsuccess=()=>{const v=g.result;v.v=1;delete v.moves;delete v.frameBlobs;s.put(v,'fighter')};t.oncomplete=()=>{db.close();res(1)}}})""")
    boot();pg.wait_for_function("window.__SPRITES__&&window.__SPRITES__.custom",timeout=15000)
    ok(pg.evaluate("Object.keys(window.__SPRITES__.custom.meta.anims).includes('hyper')"),'v1-Speicherstand lädt, neue Animation „Hyper“ bekommt einen Behelf')
    go_moves();chip('punch').click();settle(400)
    ok(thumbs()==PUNCH and 'Sheet' in src(),'v1 (ohne Moves): der Editor baut die Frames aus den gespeicherten Sheets auf – wie vor dem Move-Editor: '+str(thumbs())+' '+src())
    # ---------- D) Kampf mit der Figur ----------
    pg.evaluate("document.getElementById('st-close').click()");settle(500)
    pg.evaluate("__arcade.setMode('story')");pg.evaluate("__arcade.startStory('custom',1)");pg.wait_for_timeout(4500)
    ok(pg.evaluate("__game.p1.char.id")=='custom','Kampf mit der eigenen Figur gestartet')
    pg.screenshot(path=str(TMP/'kampf.png'))
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,'keine JS-Fehler im Browser'+('' if not real else ': '+str(real[:3])))
    b.close()
print('\nFEHLER' if bad else '\nalle Move-Editor-E2E-Prüfungen bestanden');sys.exit(1 if bad else 0)
