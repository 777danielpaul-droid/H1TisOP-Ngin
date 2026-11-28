import assert from'node:assert/strict';
// KORVUS-Tageswurf: Plaudern = einmal pro Tag die Chance auf ein Spezialpack (Preise: viele Coins oder Los-Ticket), gespeichert, Spezialpack wird zuerst geöffnet.
const store={};globalThis.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};globalThis.location={search:''};
const L=await import('../src/core/loot.js');
const{LOOT,DAILY,dayKey,dailyAvailable,rollDailyChat,openPack,spendTickets,prizeTier}=L;
const day1=new Date(2026,10,27,9,0),day1late=new Date(2026,10,27,23,59),day2=new Date(2026,10,28,0,1);
// ---- Tag ----
assert.equal(dayKey(day1),'2026-11-27');assert.equal(dayKey(day2),'2026-11-28');assert.equal(dayKey(new Date(2026,0,5)),'2026-01-05','zweistellig aufgefüllt');
assert(dailyAvailable(day1),'frischer Spielstand: Tageswurf frei');
console.log('  ✓ Tagesschlüssel (lokaler Kalendertag), zu Beginn frei');
// ---- Wurf: Treffer ----
LOOT.packs=0;LOOT.specials=0;
assert.equal(rollDailyChat(()=>0,day1),'won');assert.equal(LOOT.packs,1);assert.equal(LOOT.specials,1);assert.equal(LOOT.chatDay,'2026-11-27');
assert.equal(JSON.parse(store['hitisop.loot']).specials,1,'Spezialpack gespeichert');assert.equal(JSON.parse(store['hitisop.loot']).chatDay,'2026-11-27','Tag gespeichert');
// ---- einmal pro Tag ----
assert(!dailyAvailable(day1late));assert.equal(rollDailyChat(()=>0,day1late),'already','am selben Tag kein zweiter Wurf');assert.equal(LOOT.packs,1);assert.equal(LOOT.specials,1);
// ---- nächster Tag: Fehlwurf verbraucht den Tag trotzdem ----
assert(dailyAvailable(day2));assert.equal(rollDailyChat(()=>.99,day2),'miss');assert.equal(LOOT.packs,1,'Fehlwurf: kein Pack');assert.equal(LOOT.chatDay,'2026-11-28');assert.equal(rollDailyChat(()=>0,day2),'already','auch nach Fehlwurf kein zweiter Versuch');
// Wahrscheinlichkeit: genau an der Grenze
{LOOT.chatDay='';const p=LOOT.packs;assert.equal(rollDailyChat(()=>DAILY.chance-1e-9,day1),'won');assert.equal(LOOT.packs,p+1);LOOT.chatDay='';assert.equal(rollDailyChat(()=>DAILY.chance,day1),'miss')}
console.log('  ✓ Wurf: Treffer/Fehlwurf, nur einmal pro Tag, Tag wird gespeichert');
// ---- Spezialpack öffnen: zuerst, 3 Preise (Coins oder Ticket) ----
LOOT.packs=2;LOOT.specials=1;LOOT.coins=0;LOOT.tickets=0;
{const r=openPack(()=>.99);assert(r&&r.special===true,'Spezialpack kommt zuerst');assert.equal(r.length,DAILY.slots);
 for(const x of r){assert.equal(x.type,'coins');assert(x.n>=DAILY.coinMin&&x.n<=DAILY.coinMax,'große Menge Coins '+x.n);assert(x.big)}
 assert.equal(LOOT.coins,r.reduce((a,x)=>a+x.n,0),'Coins gutgeschrieben');assert.equal(LOOT.packs,1);assert.equal(LOOT.specials,0);assert.equal(LOOT.tickets,0);
 assert(DAILY.coinMin>50,'größer als jeder normale Coin-Preis (max. 50)');
 const n=openPack(()=>.5);assert(n&&!n.special&&n.length===3,'danach der normale Booster');assert.equal(LOOT.packs,0);assert.equal(openPack(),null,'nichts mehr da')}
// Tickets
LOOT.packs=1;LOOT.specials=1;LOOT.coins=0;LOOT.tickets=0;
{const r=openPack(()=>0);assert(r.every(x=>x.type==='ticket'&&x.n===1),'alle drei Tickets');assert.equal(LOOT.tickets,3);assert.equal(LOOT.coins,0);assert.equal(JSON.parse(store['hitisop.loot']).tickets,3,'Tickets gespeichert')}
// Mischung ist möglich
{let k=0;const seq=[0,.99,.5,.4];LOOT.packs=1;LOOT.specials=1;LOOT.coins=0;LOOT.tickets=0;const r=openPack(()=>seq[k++%seq.length]);assert(r.some(x=>x.type==='ticket')&&r.some(x=>x.type==='coins'),'Coins und Ticket gemischt')}
console.log('  ✓ Spezialpack: drei Preise (viele Coins oder Los-Ticket), zuerst geöffnet, gespeichert');
// ---- Sicherheit: specials nie größer als packs ----
LOOT.packs=1;LOOT.specials=5;{const r=openPack(()=>.99);assert(r.special);assert.equal(LOOT.packs,0);assert.equal(LOOT.specials,0,'auf packs begrenzt')}
// ---- Tickets abgeben (für Verlosungen) ----
LOOT.tickets=2;assert(!spendTickets(3)&&LOOT.tickets===2,'zu wenig: nichts passiert');assert(spendTickets(2)&&LOOT.tickets===0);assert(!spendTickets(1));assert(!spendTickets(0)&&!spendTickets(-1)&&!spendTickets(NaN),'ungültige Mengen');
console.log('  ✓ Tickets abgeben, specials ≤ packs');
// ---- Neustart: alles bleibt ----
LOOT.packs=3;LOOT.specials=2;LOOT.tickets=4;LOOT.chatDay='2026-11-28';L.saveLoot();
{const m=await import('../src/core/loot.js?neustart');assert.equal(m.LOOT.specials,2);assert.equal(m.LOOT.tickets,4);assert.equal(m.LOOT.chatDay,'2026-11-28');assert(!m.dailyAvailable(day2)&&m.dailyAvailable(new Date(2026,10,29)),'Tageswurf überlebt den Neustart')}
// alter Spielstand ohne die neuen Felder
store['hitisop.loot']=JSON.stringify({packs:2,coins:30,cards:{},skins:{},stages:[]});
{const m=await import('../src/core/loot.js?alt');assert.equal(m.LOOT.specials,0);assert.equal(m.LOOT.tickets,0);assert.equal(m.LOOT.chatDay,'');assert.equal(m.LOOT.packs,2)}
// kaputter Spielstand: specials wird auf packs begrenzt
store['hitisop.loot']=JSON.stringify({packs:1,specials:9,tickets:'x',chatDay:5});
{const m=await import('../src/core/loot.js?kaputt');assert.equal(m.LOOT.specials,1);assert.equal(m.LOOT.tickets,0);assert.equal(m.LOOT.chatDay,'')}
console.log('  ✓ Persistenz: Neustart, alter und beschädigter Spielstand');
// ---- Darstellung: Preis-Karten ----
{const{prizeFace,SPECIAL_STYLE,PACK}=await import('../src/render/lootui.js');
 const t=prizeFace({type:'ticket',n:1}),c=prizeFace({type:'coins',n:90,big:true}),o=prizeFace({type:'coins',n:20});
 assert.equal(t.t1,'LOS-TICKET');assert.equal(t.t2,'+1');assert(/Verlosung/.test(t.t3));assert.equal(c.t2,'+90');assert(/Spezial/.test(c.t3));assert.equal(o.t3,'für den Shop','normale Coins unverändert');
 assert(SPECIAL_STYLE.d<PACK.rows&&SPECIAL_STYLE.c<PACK.cols,'Pack-Motiv liegt im Sheet');
 assert.equal(prizeTier({type:'ticket',n:1}),3,'Ticket = großer Preis');assert.equal(prizeTier({type:'coins',n:20}),0);assert.equal(prizeTier({type:'coins',n:45}),1,'normale Coins unverändert');assert.equal(prizeTier({type:'coins',n:60}),1);assert.equal(prizeTier({type:'coins',n:120}),2);
 const{PackOpen}=await import('../src/render/packopen.js');const rw=[{type:'ticket',n:1},{type:'coins',n:90,big:true},{type:'coins',n:70,big:true}];rw.special=true;
 const po=new PackOpen(rw,null);assert(po.special&&po.style===SPECIAL_STYLE,'Spezialpack: eigenes Motiv');assert.equal(po.maxTier,3);
 assert(!new PackOpen([{type:'coins',n:5},{type:'coins',n:5},{type:'coins',n:5}],null).special,'normaler Booster bleibt normal')}
console.log('  ✓ Darstellung: Ticket-/Spezial-Karten, eigenes Pack-Motiv');
// ---- Würfel: Zahl passt immer zum Ergebnis ----
{const{DIE,dieWins,dieValue,DEV}=L;assert.equal(DIE,20);assert.equal(dieWins(),Math.round(DAILY.chance*20),'Treffer = obere Zahlen, Anteil = Chance');const lo=DIE-dieWins()+1;
 for(let i=0;i<200;i++){const r=Math.random;assert(dieValue(true,r)>=lo&&dieValue(true,r)<=DIE,'Treffer-Zahl');assert(dieValue(false,r)>=1&&dieValue(false,r)<lo,'Nieten-Zahl')}
 assert.equal(dieValue(true,()=>0),lo);assert.equal(dieValue(true,()=>.9999),DIE);assert.equal(dieValue(false,()=>0),1);assert.equal(dieValue(false,()=>.9999),lo-1);
 const o=DAILY.chance;DAILY.chance=0;assert.equal(dieWins(),1,'mindestens eine Gewinnzahl');DAILY.chance=1;assert.equal(dieWins(),DIE-1,'immer mindestens eine Niete');DAILY.chance=o}
// ---- Dev-Schalter ----
{const{DEV}=L;LOOT.chatDay='';LOOT.packs=0;LOOT.specials=0;
 DEV.force='win';assert.equal(rollDailyChat(()=>.99,day1),'won','erzwungen: Treffer trotz schlechtem Wurf');
 assert.equal(rollDailyChat(()=>0,day1),'already','Limit gilt weiter');
 DEV.noLimit=true;assert(dailyAvailable(day1));DEV.force='miss';assert.equal(rollDailyChat(()=>0,day1),'miss','Limit aus: nochmal würfeln, erzwungene Niete');
 DEV.force='win';assert.equal(rollDailyChat(()=>.99,day1),'won');assert.equal(LOOT.packs,2);DEV.force=null;
 assert(['won','miss'].includes(rollDailyChat(()=>0,day1)),'Limit aus: beliebig oft');
 DEV.noLimit=false;assert.equal(LOOT.chatDay,'2026-11-27');LOOT.chatDay=dayKey(day1);assert.equal(rollDailyChat(()=>0,day1),'already','Limit wieder an')}
// Befehl in der Konsole
{const{registerDevCommands}=await import('../src/core/devcmds.js');const cmds={};const con={add:(n,d,f)=>{cmds[n]=f}};registerDevCommands(con,{game:{},arcade:{}});
 const{DEV}=L;assert(cmds.daily);LOOT.chatDay=dayKey(new Date());assert(!dailyAvailable());cmds.daily([]);assert(dailyAvailable(),'daily (reset)');
 cmds.daily(['aus']);assert(DEV.noLimit);LOOT.chatDay=dayKey(new Date());assert(dailyAvailable(),'Limit aus');cmds.daily(['an']);assert(!DEV.noLimit&&!dailyAvailable());cmds.daily(['reset']);
 cmds.daily(['win']);assert.equal(DEV.force,'win');cmds.daily(['miss']);assert.equal(DEV.force,'miss');cmds.daily(['zufall']);assert.equal(DEV.force,null);
 assert.throws(()=>cmds.daily(['quatsch']),/Benutzung/)}
console.log('  ✓ Würfel-Zahlen passend zum Ergebnis, Dev-Schalter (Limit aus/an, Ergebnis erzwingen)');
// ---- Händler-Dialog mit Würfel-Animation ----
{const{CHARACTERS}=await import('../src/core/characters.js');const{Game}=await import('../src/core/game.js');const{Fighter}=await import('../src/core/fighter.js');const{AIController}=await import('../src/core/ai.js');
 const{Arcade}=await import('../src/core/arcade.js');const{InputBuffer}=await import('../src/core/input.js');const{Dealer,LINES,ROLL,resetDealerMemory}=await import('../src/core/blackmarket.js');const{DEV}=L;
 resetDealerMemory();const kb=new InputBuffer(),dummy=new AIController(0);
 const p1=new Fighter({char:CHARACTERS.tiger,x:340,facing:1,input:kb}),p2=new Fighter({char:CHARACTERS.tiger,x:620,facing:-1,input:dummy});
 const game=new Game(p1,p2),arc=new Arcade(game,p1,p2,dummy);arc.setMode('story');arc.startStory('tiger',1);const s=game.story,d=s.dealer;
 const step=n=>{for(let i=0;i<n;i++){game.step();arc.update()}};step(300);p1.x=d.x-80;p1.y=d.y;step(3);assert(d.open()&&d.active);d.key('Enter');
 const chatIdx=d.opts.findIndex(o=>o.label==='PLAUDERN');assert(chatIdx>=0);const rnd0=Math.random;
 // Tag frei: Hinweis am Knopf; Treffer -> Würfel rollt, danach Spezialpack-Text
 LOOT.chatDay='';LOOT.packs=0;LOOT.specials=0;d.rebuild();assert(/Tagesglück/.test(d.opts[chatIdx].sub),'Knopf zeigt: heute noch eine Chance');
 Math.random=()=>0;d.choose(chatIdx);Math.random=rnd0;
 assert(d.roll&&d.roll.res==='won','Würfel rollt');assert.equal(d.roll.val,L.dieValue(true,()=>0),'Endzahl passt zum Treffer');assert.equal(d.say,'','kein Text während des Würfelns');
 assert.equal(LOOT.packs,1,'Ergebnis steht sofort fest und ist gespeichert');assert.equal(JSON.parse(store['hitisop.loot']).specials,1);
 assert(!d.choose(0)&&!d.click(0)&&d.node==='menu','während des Würfelns keine Auswahl');assert(d.key('ArrowDown')&&d.key('Escape')&&d.active&&d.roll,'Tasten gesperrt (Escape auch)');
 const seen=new Set();for(let i=0;i<ROLL.settle-1;i++){step(1);seen.add(d.roll.show);assert(d.roll.show>=1&&d.roll.show<=20)}assert(seen.size>4,'Zahlen wechseln beim Taumeln');
 step(ROLL.end);assert.equal(d.roll,null,'Animation zu Ende');assert(LINES.gift.includes(d.say),'Korvus meldet das Spezialpack');assert.equal(LOOT.packs,1,'Pack nur einmal');assert(d.opts.length>=4);
 assert(!/Tagesglück/.test(d.opts[chatIdx].sub),'danach kein Tagesglück-Hinweis mehr');
 // zweites Plaudern am selben Tag: nur Gerücht, kein Würfel
 d.choose(chatIdx);assert.equal(d.roll,null,'kein zweiter Wurf am selben Tag');assert.equal(LOOT.packs,1);assert(d.say.length>10&&!LINES.gift.includes(d.say),'normales Gerücht');
 // neuer Tag, Niete: Würfel, Ergebnis Niete, Hinweis auf morgen + Gerücht
 LOOT.chatDay='2000-01-01';LOOT.packs=0;LOOT.specials=0;Math.random=()=>.99;d.choose(chatIdx);Math.random=rnd0;
 assert(d.roll&&d.roll.res==='miss');assert(d.roll.val<=20-L.dieWins(),'Nieten-Zahl');
 // ENTER überspringt erst nach kurzer Zeit
 step(3);d.key('Enter');assert(d.roll&&d.roll.t<ROLL.end-1,'ganz am Anfang noch nicht überspringbar');step(12);d.key('Enter');step(3);assert.equal(d.roll,null,'ENTER überspringt');
 assert.equal(LOOT.packs,0,'Niete: kein Pack');assert(LINES.nothing.some(x=>d.say.startsWith(x)),'Hinweis: morgen wieder');
 // Gespräch endet mitten im Würfeln (z. B. Welle beginnt): Ergebnis bleibt, nichts hängt
 LOOT.chatDay='';LOOT.packs=0;LOOT.specials=0;DEV.force='win';d.rebuild();d.choose(chatIdx);assert(d.roll);step(5);d.close(true);assert.equal(d.roll,null);assert(!d.active);assert.equal(LOOT.packs,1,'Spezialpack bleibt erhalten');
 DEV.force=null;assert(d.open()||true);
 // Dev: Limit aus -> sofort wieder würfeln
 DEV.noLimit=true;DEV.force='miss';if(!d.active){p1.x=d.x-80;p1.y=d.y;step(3);d.open();d.key('Enter')}d.rebuild();d.choose(d.opts.findIndex(o=>o.label==='PLAUDERN'));assert(d.roll,'Limit aus: Würfel rollt wieder');step(ROLL.end+2);d.choose(d.opts.findIndex(o=>o.label==='PLAUDERN'));assert(d.roll,'und gleich noch einmal');DEV.noLimit=false;DEV.force=null}
console.log('  ✓ Händler: Würfel-Animation (Tasten gesperrt, ENTER überspringt, Abbruch sicher), Ergebnis passt, einmal pro Tag');
console.log('dailychat OK');
