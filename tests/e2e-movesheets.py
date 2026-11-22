# Browser-Test: Sheets je Move im Move-Editor (empfohlenes Raster, Prompt, automatische Rastererkennung, Zuordnung per Dateiname, Hyper-Slot).
# Voraussetzung: playwright + Chrome, vorher node tools/build.mjs.  Aufruf: python3 tests/e2e-movesheets.py
import sys, pathlib, tempfile
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
URL=(ROOT/'dist'/'hitisop.html').as_uri()
TMP=pathlib.Path(tempfile.mkdtemp(prefix='hitisop-movesheets-'));print('Bilder in',TMP)
bad=False
def ok(c,m):
    global bad
    print(('ok   ' if c else 'FAIL ')+m)
    if not c: bad=True
COL=[(235,235,235),(210,40,40),(40,70,220),(230,200,30),(170,40,200),(240,120,20),(240,80,160),(120,70,30)]
def sheet(path,n,cols,rows,cw=420,ch=520):
    im=Image.new('RGB',(cols*cw,rows*ch),(0,255,0));d=ImageDraw.Draw(im)
    for i in range(n):
        x0,y0=(i%cols)*cw,(i//cols)*ch;cx=x0+cw//2;base=y0+ch-50;c=COL[i%len(COL)] if i else COL[0]
        d.rectangle([cx-55,base-300,cx+55,base],fill=c);d.ellipse([cx-40,base-370,cx+40,base-290],fill=c)
        if i:d.rectangle([cx+55,base-250,cx+55+20+10*i,base-210],fill=c)
    im.save(path)
sheet(TMP/'hyper.png',8,4,2);sheet(TMP/'punch.png',6,3,2);sheet(TMP/'cpunch.png',6,3,2);sheet(TMP/'foo.png',6,3,2);sheet(TMP/'bar.png',6,3,2);sheet(TMP/'kick_sheet.png',6,3,2)
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',headless=True,args=['--use-gl=swiftshader','--enable-unsafe-swiftshader'])
    ctx=b.new_context(viewport={'width':1280,'height':900});ctx.grant_permissions(['clipboard-read','clipboard-write'],origin=None) if False else None
    pg=ctx.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    def settle(ms=500):
        try:pg.wait_for_function("!document.querySelector('#st-pane-moves.busy')",timeout=25000)
        except Exception:pass
        pg.wait_for_timeout(ms)
    def status():return pg.evaluate("document.getElementById('st-status').textContent")
    def chip(k):return pg.locator(f'.mv-chip[data-k="{k}"]')
    def nthumbs():return pg.evaluate("document.querySelectorAll('#st-pane-moves .mv-th').length")
    def pick(paths):
        with pg.expect_file_chooser() as fc:pg.click('#mv-pick')
        fc.value.set_files([str(x) for x in paths]);settle(900)
    def vals():return pg.evaluate("[document.getElementById('mv-cols').value,document.getElementById('mv-rows').value]")
    pg.goto(URL);pg.wait_for_timeout(1500);pg.keyboard.press('Enter');pg.wait_for_timeout(900)
    pg.evaluate("document.getElementById('btn-studio').click()");pg.wait_for_timeout(800);pg.click('#st-tab-moves')
    pg.wait_for_function("document.getElementById('st-status').textContent===''",timeout=20000);settle(300)
    # 1) empfohlenes Raster je Move
    for k,g in [('hyper',['4','2']),('punch',['3','2']),('walk',['4','2']),('airhit',['3','2'])]:
        chip(k).click();pg.wait_for_timeout(150);rec=pg.evaluate("document.getElementById('mv-rec').textContent")
        ok(vals()==g and (g[0]+'×'+g[1]) in rec,f'{k}: empfohlenes Raster {g[0]}×{g[1]} vorbelegt und angezeigt')
    # 2) Prompt kopieren (Zwischenablage oder Auffang-Weg)
    chip('hyper').click();pg.wait_for_timeout(150)
    pg.evaluate("document.getElementById('st-desc').value='a red panda monk';document.getElementById('st-desc').dispatchEvent(new Event('input'))")
    pg.click('#mv-prompt');pg.wait_for_timeout(500)
    ok('Prompt für' in status() and 'Hyper-Special' in status(),'Prompt kopieren: Status meldet den Move – '+status()[:90])
    ok(pg.evaluate("document.getElementById('mv-prompt').textContent")=='Kopiert ✓','Knopf zeigt „Kopiert ✓“')
    try:
        clip=pg.evaluate("navigator.clipboard.readText()")
        ok('4 columns x 2 rows' in clip and 'red panda monk' in clip and 'Hyper special' in clip,'Zwischenablage: Raster, Figurenbeschreibung und Move-Text enthalten')
    except Exception as e:print('     (Zwischenablage im Headless nicht lesbar – übersprungen)')
    # 3) automatische Rastererkennung: Raster absichtlich falsch eingestellt, Sheet ist 4x2
    pg.fill('#mv-cols','3');pg.fill('#mv-rows','2');pg.dispatch_event('#mv-cols','change')
    pick([TMP/'hyper.png'])
    ok(nthumbs()==7 and 'Raster 4×2 erkannt' in status(),f'Hyper: Raster erkannt, 7 Frames (nach Kalibrierzelle) – {nthumbs()} Frames, {status()[:80]}')
    ok(vals()==['4','2'],'Raster-Felder zeigen das erkannte Raster')
    # 4) automatisch aus: eingestelltes Raster gilt
    pg.uncheck('#mv-auto');pg.fill('#mv-cols','4');pg.fill('#mv-rows','2');pick([TMP/'hyper.png'])
    ok(nthumbs()==7 and 'erkannt' not in status(),'Automatik aus: eingestelltes Raster 4×2 -> 7 Frames, keine Erkennung')
    pg.check('#mv-auto')
    # 5) mehrere Sheets, Zuordnung über den Dateinamen
    pick([TMP/'punch.png',TMP/'cpunch.png'])
    ok('2 Sheets importiert' in status(),'zwei Dateien auf einmal: '+status()[:100])
    chip('punch').click();pg.wait_for_timeout(200);a=nthumbs()
    chip('cpunch').click();pg.wait_for_timeout(200);c=nthumbs()
    chip('hyper').click();pg.wait_for_timeout(200);h=nthumbs()
    ok((a,c,h)==(5,5,7),f'Schlag 5, Duck-Schlag 5, Hyper unverändert 7 Frames: {(a,c,h)}')
    # 6) Datei ohne passenden Namen -> gewählter Move; mehrere unpassende -> Hinweis
    chip('kick').click();pg.wait_for_timeout(150);pick([TMP/'kick_sheet.png'])
    ok(nthumbs()==5 and 'Tritt' in status(),'einzelne Datei ohne Move-Namen -> gewählter Move (Tritt): '+status()[:70])
    chip('block').click();pg.wait_for_timeout(150);pick([TMP/'foo.png',TMP/'bar.png'])
    ok('passen zu keinem Move' in status() and nthumbs()==0,'zwei Dateien ohne Move-Namen: Hinweis, nichts importiert')
    # 7) Sheets-Reiter hat den Hyper-Slot
    pg.click('#st-tab-sheets');pg.wait_for_timeout(400)
    rows=pg.evaluate("document.querySelectorAll('.st-row').length");hy=pg.evaluate("[...document.querySelectorAll('.st-row')].some(r=>r.textContent.includes('Hyper-Special'))")
    ok(rows==20 and hy,f'Sheets-Reiter: {rows} Slots, Hyper-Special dabei')
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,'keine JS-Fehler im Browser'+('' if not real else ': '+str(real[:3])))
    b.close()
print('\nFEHLER' if bad else '\nalle Move-Sheet-E2E-Prüfungen bestanden');sys.exit(1 if bad else 0)
