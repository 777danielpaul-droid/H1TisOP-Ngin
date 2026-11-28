import assert from'node:assert/strict';
// Cloud-Spielstand: Supabase wird durch einen Speicher-Server nachgebaut (GoTrue + PostgREST + Row Level Security), je "Gerät" ein eigener localStorage.
const mkStore=()=>{const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v))},removeItem:k=>{m.delete(k)},m}};
const users=new Map(),rows=new Map(),tokens=new Map();let clock=1000,net=true,confirm=false;
const J=(st,o)=>({ok:st<300,status:st,text:async()=>o===undefined?'':JSON.stringify(o)});
globalThis.__SUPABASE__={url:'https://test.supabase.co',key:'anon-key'};
globalThis.fetch=async(url,o={})=>{if(!net)throw new Error('offline');const u=new URL(url),b=o.body?JSON.parse(o.body):{},h=o.headers||{};assert.equal(h.apikey,'anon-key');
 const token=()=>{const t=(h.Authorization||'').replace('Bearer ','');return tokens.get(t)};
 const sess=id=>{const t='tok'+(++clock),r='ref'+clock;tokens.set(t,id);tokens.set(r,id);return{access_token:t,refresh_token:r,expires_in:3600,user:{id,email:users.get(id).email}}};
 if(u.pathname==='/auth/v1/signup'){if([...users.values()].some(x=>x.email===b.email))return J(422,{error_code:'user_already_exists'});if(b.password.length<8)return J(422,{error_code:'weak_password'});const id='u'+(users.size+1);users.set(id,{email:b.email,pw:b.password});return J(200,confirm?{id}:sess(id))}
 if(u.pathname==='/auth/v1/token'){if(u.searchParams.get('grant_type')==='refresh_token'){const id=tokens.get(b.refresh_token);return id?J(200,sess(id)):J(400,{error_code:'refresh_token_not_found'})}
  const id=[...users].find(([,x])=>x.email===b.email&&x.pw===b.password);return id?J(200,sess(id[0])):J(400,{error_code:'invalid_credentials'})}
 if(u.pathname==='/auth/v1/logout')return J(204);
 if(u.pathname==='/rest/v1/savegames'){const uid=token();if(!uid)return J(401,{code:'401'});
  if(!o.method||o.method==='GET'){assert.equal(u.searchParams.get('user_id'),'eq.'+uid);return J(200,rows.has(uid)?[rows.get(uid)]:[])}
  assert.equal(b.user_id,uid,'RLS: nur eigene Zeile');const r={data:b.data,updated_at:'2026-11-28T10:00:'+String(++clock%60).padStart(2,'0')+'Z'};rows.set(uid,r);return J(201,[r])}
 return J(404,{})};
const device=()=>{const s=mkStore();globalThis.localStorage=s;return s};
const{cloudOn,cloudClean,cloudMerge,cloudCanon,cloudCollect,cloudApply,cloudSignUp,cloudSignIn,cloudSignOut,cloudSync,cloudUser,cloudMessage,cloudCheck,CL_KEYS}=await import('../src/core/cloud.js');
const loot=o=>JSON.stringify({packs:0,coins:0,cards:{},skins:{},stages:[],items:{},...o});
// 1) Säubern: keine gefährlichen Schlüssel, nur begrenzte Werte
const bad=JSON.parse('{"__proto__":{"x":1},"constructor":{"y":1},"coins":-5,"a b":1,"ok":{"n":3.9,"s":"'+'x'.repeat(200)+'"},"f":{"g":function(){}}}');
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
console.log('Cloud-Tests bestanden');process.exit(0);
