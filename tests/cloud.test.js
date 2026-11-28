import assert from'node:assert/strict';
// Cloud-Spielstand: Supabase wird durch einen Speicher-Server nachgebaut (GoTrue + PostgREST + Row Level Security), je "Gerät" ein eigener localStorage.
const mkStore=()=>{const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v))},removeItem:k=>{m.delete(k)},m}};
const board=new Map(),scoreCalls=[],nameCalls=[];const r204=()=>({ok:true,status:204,text:async()=>''});const users=new Map(),rows=new Map(),tokens=new Map();let clock=1000,net=true,confirm=false;
const J=(st,o)=>({ok:st<300,status:st,text:async()=>o===undefined?'':JSON.stringify(o)});
globalThis.__SUPABASE__={url:'https://test.supabase.co',key:'anon-key'};
globalThis.fetch=async(url,o={})=>{if(!net)throw new Error('offline');const u=new URL(url),b=o.body?JSON.parse(o.body):{},h=o.headers||{};assert.equal(h.apikey,'anon-key');
 const token=()=>{const t=(h.Authorization||'').replace('Bearer ','');return tokens.get(t)};
 const sess=id=>{const t='tok'+(++clock),r='ref'+clock;tokens.set(t,id);tokens.set(r,id);return{access_token:t,refresh_token:r,expires_in:3600,user:{id,email:users.get(id).email}}};
 if(u.pathname==='/auth/v1/signup'){if([...users.values()].some(x=>x.email===b.email))return J(422,{error_code:'user_already_exists'});if(b.password.length<8)return J(422,{error_code:'weak_password'});const id='u'+(users.size+1);users.set(id,{email:b.email,pw:b.password});return J(200,confirm?{id}:sess(id))}
 if(u.pathname==='/auth/v1/token'){if(u.searchParams.get('grant_type')==='pkce'){const ch=globalThis.__chal;const h=(await import('node:crypto')).createHash('sha256').update(b.code_verifier).digest('base64url');if(b.auth_code!=='gcode'||h!==ch)return J(400,{error_code:'bad_code_verifier'});if(!users.has('ug'))users.set('ug',{email:'g@gmail.com',pw:'-'});return J(200,sess('ug'))}
  if(u.searchParams.get('grant_type')==='refresh_token'){const id=tokens.get(b.refresh_token);return id?J(200,sess(id)):J(400,{error_code:'refresh_token_not_found'})}
  const id=[...users].find(([,x])=>x.email===b.email&&x.pw===b.password);return id?J(200,sess(id[0])):J(400,{error_code:'invalid_credentials'})}
 if(u.pathname==='/auth/v1/logout')return J(204);
 if(u.pathname==='/rest/v1/savegames'){const uid=token();if(!uid)return J(401,{code:'401'});
  if(!o.method||o.method==='GET'){assert.equal(u.searchParams.get('user_id'),'eq.'+uid);return J(200,rows.has(uid)?[rows.get(uid)]:[])}
  assert.equal(b.user_id,uid,'RLS: nur eigene Zeile');const r={data:b.data,updated_at:'2026-11-28T10:00:'+String(++clock%60).padStart(2,'0')+'Z'};rows.set(uid,r);return J(201,[r])}
 if(u.pathname==='/rest/v1/rpc/submit_highscore'){const uid=token();if(!uid)return J(401,{code:'28000'});scoreCalls.push(b);assert.equal(b.p_score,undefined,'Client schickt keine Punktzahl');const v=verifyRun(b.p_log,b.p_diff);if(!v.ok)return J(400,{code:'P0001',message:'invalid_run: '+v.reason});
  const cur=board.get(uid);if(!cur||cur.score<v.score)board.set(uid,{name:b.p_name,score:v.score,fighter:b.p_fighter,stages:v.stages,diff:b.p_diff,win:v.win});else cur.name=b.p_name;
  return J(200,{score:v.score,rank:[...board.values()].filter(x=>x.score>board.get(uid).score).length+1})}
 if(u.pathname==='/rest/v1/rpc/set_highscore_name'){const uid=token();if(!uid)return J(401,{code:'28000'});nameCalls.push(b.p_name);if(board.has(uid))board.get(uid).name=b.p_name;return r204()}
 if(u.pathname==='/rest/v1/highscores'){return J(200,[...board.values()].sort((a,b)=>b.score-a.score).slice(0,+u.searchParams.get('limit')))}
 return J(404,{})};
const device=()=>{const s=mkStore();globalThis.localStorage=s;return s};
const{verifyRun}=await import('../src/core/score.js');
const{cloudSubmitScore,cloudPushName,cloudFlushScore,cloudBoard,cloudSetName,cloudName,cloudCleanName,cloudGoogleOk,cloudGoogleStart,cloudOAuthReturn,cloudBoot,cloudOn,cloudClean,cloudMerge,cloudCanon,cloudCollect,cloudApply,cloudSignUp,cloudSignIn,cloudSignOut,cloudSync,cloudUser,cloudMessage,cloudCheck,CL_KEYS}=await import('../src/core/cloud.js');
const loot=o=>JSON.stringify({packs:0,coins:0,cards:{},skins:{},stages:[],items:{},...o});
// 1) Säubern: keine gefährlichen Schlüssel, nur begrenzte Werte
const bad=JSON.parse('{"__proto__":{"x":1},"constructor":{"y":1},"coins":-5,"a b":1,"ok":{"n":3.9,"s":"'+'x'.repeat(200)+'"},"f":{"g":null}}');
const c=cloudClean(bad);assert.equal(Object.getPrototypeOf(c),Object.prototype);assert.equal({}.x,undefined);assert.deepEqual(Object.keys(c).sort(),['coins','f','ok']);assert.equal(c.coins,0);assert.equal(c.ok.n,3);assert.equal(c.ok.s.length,64);
console.log('  ✓ Cloud-Daten werden gesäubert (kein __proto__, Zahlen/Texte begrenzt)');
// 2) Zusammenführen
const m=cloudMerge({coins:50,packs:1,cards:{a:2},unlocks:['x'],skins:{tiger:[1]}},{coins:30,packs:4,cards:{a:1,b:5},unlocks:['y','x'],skins:{tiger:[2],st3g0:[1]}});
assert.deepEqual(m,{coins:50,packs:4,cards:{a:2,b:5},unlocks:['x','y'],skins:{tiger:[1,2],st3g0:[1]}});assert.equal(cloudCanon({b:1,a:[2]}),cloudCanon({a:[2],b:1}));
console.log('  ✓ Zusammenführen: Zahlen = Maximum, Listen = Vereinigung, nichts geht verloren');
// 3) Nicht eingerichtet / nicht angemeldet
let dA=device();assert(cloudOn());assert.equal((await cloudSync()).state,'out');
const keep=globalThis.__SUPABASE__;globalThis.__SUPABASE__=undefined;assert(!cloudOn());assert.equal((await cloudSync()).state,'off');globalThis.__SUPABASE__={url:'http://evil.example.com',key:'k'};assert(!cloudOn(),'fremde URL wird abgelehnt');globalThis.__SUPABASE__=keep;
assert.equal(cloudCheck('kein-mail','12345678'),'bad_email');assert.equal(cloudCheck('a@b.de','kurz'),'bad_pw');assert.equal(cloudCheck('a@b.de','langgenug1'),'');assert(cloudMessage('invalid_credentials').includes('Passwort'));assert(cloudMessage('xyz').includes('xyz'));
console.log('  ✓ Ohne Konfiguration/Konto bleibt alles lokal; Eingaben werden geprüft');
// 4) Konto erstellen + erster Upload (Gerät A)
dA.setItem(CL_KEYS.loot,loot({coins:120,packs:2,cards:{tiger:1}}));dA.setItem(CL_KEYS.unlocks,JSON.stringify(['anubis']));dA.setItem(CL_KEYS.clears,'2');
await assert.rejects(()=>cloudSignIn('a@b.de','falsch123'),e=>e.code==='invalid_credentials');
let r=await cloudSignUp('a@b.de','geheim123');assert.equal(r.confirm,false);assert.equal(cloudUser().email,'a@b.de');await assert.rejects(()=>cloudSignUp('a@b.de','geheim123'),e=>e.code==='user_already_exists');
let s=await cloudSync();assert.equal(s.state,'ok');assert.equal(s.reload,false);assert.equal(rows.get('u1').data.loot.coins,120);assert.deepEqual(rows.get('u1').data.unlocks,['anubis']);assert.equal(rows.get('u1').data.clears,2);
console.log('  ✓ Konto erstellen, lokaler Stand wird hochgeladen');
// 5) Zweites Gerät (leer) meldet sich an: bekommt den Stand, Neuladen nötig
let dB=device();await cloudSignIn('a@b.de','geheim123');s=await cloudSync();assert.equal(s.reload,true);assert.equal(JSON.parse(dB.getItem(CL_KEYS.loot)).coins,120);assert.equal(dB.getItem(CL_KEYS.clears),'2');
s=await cloudSync();assert.equal(s.state,'ok');assert.equal(s.reload,false,'danach kein erneutes Neuladen (keine Schleife)');
console.log('  ✓ Zweites Gerät lädt den Cloud-Stand genau einmal');
// 6) Gerät B spielt weiter (nur lokal geändert) -> hochladen; Gerät A bekommt es beim nächsten Start
dB.setItem(CL_KEYS.loot,loot({coins:40,packs:6,cards:{tiger:3}}));s=await cloudSync({live:true});assert.equal(s.state,'ok');assert.equal(rows.get('u1').data.loot.coins,40,'ausgegeben = niedriger Stand wird übernommen (kein Max, wenn nur ein Gerät geändert hat)');
globalThis.localStorage=dA;s=await cloudSync();assert.equal(s.reload,true);assert.equal(JSON.parse(dA.getItem(CL_KEYS.loot)).packs,6);
console.log('  ✓ Änderungen wandern zwischen den Geräten; Ausgeben wird nicht zurückgedreht');
// 7) Beide Geräte geändert -> im Spiel nur Hinweis, beim Start Zusammenführen
globalThis.localStorage=dA;dA.setItem(CL_KEYS.unlocks,JSON.stringify(['anubis','rabe']));globalThis.localStorage=dB;dB.setItem(CL_KEYS.unlocks,JSON.stringify(['anubis','leon']));
s=await cloudSync({live:true});assert.equal(s.state,'ok','B ist zuerst: nur hier geändert');
globalThis.localStorage=dA;s=await cloudSync({live:true});assert.equal(s.state,'conflict');assert.equal(s.reload,false);assert.deepEqual(JSON.parse(dA.getItem(CL_KEYS.unlocks)),['anubis','rabe'],'mitten im Spiel wird lokal nichts verändert');
s=await cloudSync();assert.equal(s.reload,true);assert.deepEqual(JSON.parse(dA.getItem(CL_KEYS.unlocks)).sort(),['anubis','leon','rabe']);assert.deepEqual(rows.get('u1').data.unlocks.sort(),['anubis','leon','rabe']);
console.log('  ✓ Beide Geräte geändert: beim Start zusammengeführt, mitten im Spiel nichts überschrieben');
// 8) Offline / Fehler stören das Spiel nicht
net=false;dA.setItem(CL_KEYS.clears,'9');s=await cloudSync({live:true});assert.equal(s.state,'offline');assert.equal(dA.getItem(CL_KEYS.clears),'9');net=true;s=await cloudSync({live:true});assert.equal(s.state,'ok');assert.equal(rows.get('u1').data.clears,9);
console.log('  ✓ Offline: lokaler Stand bleibt, wird später nachgeholt');
// 9) Abgelaufene Sitzung wird erneuert; ungültige führt zum Abmelden
const sess=JSON.parse(dA.getItem('hitisop.cloud.session'));sess.expires_at=1;dA.setItem('hitisop.cloud.session',JSON.stringify(sess));assert.equal((await cloudSync()).state,'ok');assert(JSON.parse(dA.getItem('hitisop.cloud.session')).expires_at>Date.now()/1000);
const s2=JSON.parse(dA.getItem('hitisop.cloud.session'));s2.expires_at=1;s2.refresh_token='kaputt';dA.setItem('hitisop.cloud.session',JSON.stringify(s2));assert.equal((await cloudSync()).state,'out');assert.equal(cloudUser(),null);
console.log('  ✓ Sitzung wird erneuert bzw. sauber beendet');
// 10) Abmelden: lokaler Stand bleibt, Cloud-Marker weg
await cloudSignIn('a@b.de','geheim123');await cloudSync();await cloudSignOut();assert.equal(cloudUser(),null);assert.equal(dA.getItem('hitisop.cloud.hash'),null);assert.equal(JSON.parse(dA.getItem(CL_KEYS.loot)).packs,6);
// 11) Bestätigungs-Mail aktiv: kein Login, aber Hinweis
confirm=true;r=await cloudSignUp('neu@b.de','geheim123');assert.equal(r.confirm,true);assert.equal(cloudUser(),null);
console.log('  ✓ Abmelden behält den lokalen Stand; Bestätigungs-Mail wird gemeldet');
// 12) Google-Anmeldung (PKCE): Weiterleitung, Rückkehr mit Code, Fehlerfälle
globalThis.location={protocol:'https:',origin:'https://hit-isop.onrender.com',pathname:'/',search:'',hash:'',assign(u){this.last=u}};let hist='';globalThis.history={replaceState(a,b,u){hist=u}};
const dG=device();assert(!cloudGoogleOk(),'ohne "google":true in der Konfiguration kein Google-Knopf');globalThis.__SUPABASE__={url:'https://test.supabase.co',key:'anon-key',google:true};assert(cloudGoogleOk());
location.protocol='file:';assert(!cloudGoogleOk(),'als lokale Datei kein Google');await assert.rejects(()=>cloudGoogleStart(),e=>e.code==='nogoogle');location.protocol='https:';
await cloudGoogleStart();const au=new URL(location.last);assert.equal(au.pathname,'/auth/v1/authorize');assert.equal(au.searchParams.get('provider'),'google');assert.equal(au.searchParams.get('code_challenge_method'),'s256');assert.equal(au.searchParams.get('redirect_to'),'https://hit-isop.onrender.com/');
globalThis.__chal=au.searchParams.get('code_challenge');assert(dG.getItem('hitisop.cloud.pkce').length>=43,'PKCE-Verifier gespeichert');
assert.equal(await cloudOAuthReturn(),null,'ohne ?code passiert nichts');
location.search='?room=ABCD&code=gcode';dG.setItem(CL_KEYS.clears,'4');const o=await cloudOAuthReturn();assert.deepEqual(o,{ok:true});assert.equal(cloudUser().email,'g@gmail.com');assert.equal(hist,'/?room=ABCD','code aus der Adresse entfernt, andere Parameter bleiben');assert.equal(dG.getItem('hitisop.cloud.pkce'),null);
let bs=await cloudSync();assert.equal(bs.state,'ok');assert.equal(rows.get('ug').data.clears,4,'Spielstand des Google-Kontos wird hochgeladen');
// fremder ?code ohne eigene Weiterleitung wird ignoriert; Abbruch bei Google; falscher Code
location.search='?code=gcode';assert.equal(await cloudOAuthReturn(),null);await cloudSignOut();
await cloudGoogleStart();location.search='?error=access_denied&error_description=denied';assert.deepEqual(await cloudOAuthReturn(),{error:'oauth_denied'});assert.equal(cloudUser(),null);
await cloudGoogleStart();globalThis.__chal=new URL(location.last).searchParams.get('code_challenge');location.search='?code=falsch';assert.deepEqual(await cloudOAuthReturn(),{error:'oauth_failed'});
await cloudGoogleStart();globalThis.__chal=new URL(location.last).searchParams.get('code_challenge');location.search='?code=gcode';const bt=await cloudBoot();assert.equal(cloudUser().email,'g@gmail.com');assert.notEqual(bt.oauthError,'oauth_failed');
console.log('  ✓ Google-Anmeldung: PKCE-Weiterleitung, Code-Tausch, Abbruch/Fehler sauber, Spielstand wird gesichert');
// 13) Bestenliste: Server rechnet nach (Protokoll statt Punktzahl), Nachreichen, Spielername, Lesen ohne Konto
{await cloudSignOut();board.set('x1',{name:'ALT',score:9000,fighter:'wolf',stages:3,diff:1,win:true});board.set('x2',{name:'<b>EVIL</b>',score:100,fighter:'ti ger!',stages:1,diff:0,win:false});
 const good=[[1,20,2,6,2,180,60,2,0]];const e={score:8610,fighter:'tiger',stages:1,diff:2,win:false,log:good};assert.equal(verifyRun(good,2).score,8610);
 assert.deepEqual(await cloudSubmitScore(e),{state:'out'},'ohne Konto: nichts wird gesendet');assert.equal(scoreCalls.length,0);
 const rows0=await cloudBoard(10);assert.equal(rows0.length,2,'Lesen geht ohne Konto');assert.equal(rows0[0].score,9000);assert.equal(rows0[1].name,'bEVILb','Namen werden gesäubert');assert.equal(rows0[1].fighter,'tiger');
 await cloudSignIn('a@b.de','geheim123');assert.match(cloudName(),/^SPIELER-[0-9A-Z]{2,4}$/,'Standardname ohne E-Mail/Klarnamen');
 let r=await cloudSubmitScore(e);assert.equal(r.state,'ok');assert.equal(r.score,8610,'Punkte vom Server berechnet');assert.equal(r.rank,2);assert.deepEqual(scoreCalls[0].p_log,good);assert.equal(scoreCalls[0].p_name,cloudName());
 assert.equal(await cloudFlushScore(e),null,'schon gesendet: kein zweites Mal');assert.equal(scoreCalls.length,1);
 const fake={...e,score:480000,log:[[1,9999,0,99,2,200,198,2,1]]};r=await cloudSubmitScore(fake);assert.equal(r.state,'rejected','erfundene Werte lehnt der Server ab');assert.equal(board.get('u1').score,8610,'Bestenliste unverändert');assert.equal(await cloudFlushScore(fake),null,'abgelehnte Läufe werden nicht endlos wiederholt');
 assert.equal((await cloudFlushScore({...e,score:9999,log:[]})),null,'ohne Protokoll (Altdaten) kein Senden');
 const better=[[1,30,0,8,2,200,90,2,0]],bs=verifyRun(better,2).score;r=await cloudFlushScore({...e,score:bs,log:better});assert.equal(r.state,'ok');assert.equal(board.get('u1').score,bs,'besserer Wert wird nachgereicht');
 assert.equal(cloudSetName('  Tiger<>Fan! '),'TigerFan');assert.equal(cloudName(),'TigerFan');assert.throws(()=>cloudSetName('<>'),x=>x.code==='bad_name');assert.equal(cloudCleanName('x'.repeat(40)).length,16);assert.equal(await cloudPushName(),true);assert.deepEqual(nameCalls,['TigerFan']);assert.equal(board.get('u1').name,'TigerFan');
 const off=[[1,50,0,9,2,200,90,2,0]],os=verifyRun(off,2).score;assert.ok(os>bs);net=false;r=await cloudSubmitScore({...e,score:os,log:off});assert.equal(r.state,'offline');net=true;assert.equal((await cloudFlushScore([{...e,score:os,log:off},{...e,score:bs,log:better}])).state,'ok','nach dem Offline-Fehler beim nächsten Start nachgereicht');
 await cloudSignOut();assert.equal((await cloudFlushScore(e)),null)}
console.log('  ✓ Bestenliste: Server rechnet nach, erfundene Werte abgelehnt, Nachreichen, Spielername, Offline');
console.log('Cloud-Tests bestanden');process.exit(0);
