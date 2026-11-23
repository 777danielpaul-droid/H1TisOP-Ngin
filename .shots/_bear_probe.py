import pathlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path('/Users/danielpaul/Desktop/hitisop');URL=(ROOT/'dist'/'hitisop.html').as_uri();OUT=ROOT/'.shots'/'_v'
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',args=['--autoplay-policy=no-user-gesture-required'])
    pg=b.new_context(viewport={'width':1280,'height':720}).new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    pg.goto(URL);pg.wait_for_timeout(1500);pg.keyboard.press('Enter');pg.wait_for_timeout(1200)
    pg.evaluate("document.querySelector('#start').classList.contains('min')&&document.querySelector('#startToggle').click()");pg.wait_for_timeout(800)
    pg.locator('#startModes button').first.click();pg.wait_for_timeout(2000)
    print('Videos eingebettet:',pg.evaluate("Object.keys(window.__VIDEOS__||{})"))
    print('bear-Video bereit:',pg.evaluate("(()=>{const s=__renderer.sel,v=s.vid('bear');return v?{ready:s.vidReady(v),w:v.videoWidth,h:v.videoHeight,dur:v.duration,muted:v.muted}:null})()"))
    pg.wait_for_timeout(1500)
    pg.evaluate("__renderer.sel.launch('bear',()=>{},null)")
    for k,ms in enumerate([500,500,500,500,400]):
        pg.wait_for_timeout(ms);pg.screenshot(path=str(OUT/f'launch{k}.png'))
        print(k,pg.evaluate("(()=>{const l=__renderer.sel.ln;return l?{t:l.t,V:l.V,time:+(l.vid?l.vid.currentTime:0).toFixed(2),playing:l.vid&&!l.vid.paused}:'fertig'})()"))
    print('errors',errs);b.close()
