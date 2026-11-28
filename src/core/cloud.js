// Cloud-Spielstand (Supabase): Konto (E-Mail + Passwort) und Abgleich der Spielstände. Kein DOM, keine Bibliothek (nur fetch + localStorage) -> headless testbar.
// Konfiguration: window.__SUPABASE__={url,key} (steht in supabase.config.json, schreibt das Setup-Skript; der Build bettet es ein). Ohne Konfiguration/Konto bleibt alles lokal wie bisher.
// Der Key ist der ÖFFENTLICHE (anon/publishable) Schlüssel – die Sicherheit kommt von Row Level Security in der Datenbank (supabase/migrations). Nie einen service_role-Key hier eintragen.
// Abgleich: Hash des zuletzt abgeglichenen Stands (CL_HASH) zeigt, ob lokal etwas geändert wurde; CL_SYNC = updated_at der Cloud-Zeile beim letzten Abgleich.
//   lokal unverändert -> Cloud-Stand übernehmen · nur lokal geändert -> hochladen · beides geändert (oder erster Abgleich auf diesem Gerät) -> zusammenführen (Zahlen: größerer Wert, Listen: Vereinigung).
const CL_NAME='hitisop.cloud.name',CL_SENT='hitisop.cloud.sent',CL_PKCE='hitisop.cloud.pkce',CL_SESSION='hitisop.cloud.session',CL_SYNC='hitisop.cloud.sync',CL_HASH='hitisop.cloud.hash';
export const CL_KEYS={loot:'hitisop.loot',unlocks:'hitisop.unlocks',clears:'hitisop.clears',skins:'hitisop.skins'};
const clRd=k=>{try{return localStorage.getItem(k)}catch(e){return null}},clWr=(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}},clDel=k=>{try{localStorage.removeItem(k)}catch(e){}};
const clCfg=()=>{try{const c=globalThis.__SUPABASE__;return c&&typeof c.key==='string'&&c.key&&/^(https:\/\/[a-z0-9-]+\.supabase\.(co|in)|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/i.test(String(c.url||''))?c:null}catch(e){return null}};
export const cloudOn=()=>!!clCfg();
const clErr=(code,j)=>{const e=new Error(code);e.code=code;e.detail=j;return e};

// ---- Eingaben säubern (Cloud-Daten und lokale Daten sind nicht vertrauenswürdig): nur Zahlen/Texte/Listen/Objekte, begrenzte Größe, keine gefährlichen Schlüssel ----
const CL_BADKEY=/^(__proto__|constructor|prototype)$/,CL_KEY=/^[\w.\-]{1,48}$/;
export function cloudClean(v,d=0){
 if(typeof v==='number')return Number.isFinite(v)?Math.max(0,Math.min(1e9,Math.trunc(v))):0;
 if(typeof v==='string')return v.slice(0,64);if(typeof v==='boolean')return v;
 if(d>5)return undefined;
 if(Array.isArray(v)){const a=[];for(const x of v.slice(0,256)){const c=cloudClean(x,d+1);if(c!==undefined)a.push(c)}return a}
 if(v&&typeof v==='object'){const o={};let n=0;for(const k of Object.keys(v)){if(n>=256)break;if(CL_BADKEY.test(k)||!CL_KEY.test(k))continue;const c=cloudClean(v[k],d+1);if(c!==undefined){o[k]=c;n++}}return o}
 return undefined}
export const cloudCanon=v=>{if(Array.isArray(v))return'['+v.map(cloudCanon).join(',')+']';if(v&&typeof v==='object')return'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+cloudCanon(v[k])).join(',')+'}';return JSON.stringify(v===undefined?null:v)};
// Zusammenführen (beide Seiten geändert): Zahlen = größerer Wert, Listen = Vereinigung, Objekte = Schlüssel für Schlüssel, Texte: lokal gewinnt. Auch neue Felder späterer Versionen bleiben so erhalten.
export function cloudMerge(a,b){
 if(a===undefined||a===null)return b;if(b===undefined||b===null)return a;
 if(typeof a==='number'&&typeof b==='number')return Math.max(a,b);
 if(Array.isArray(a)&&Array.isArray(b)){const seen=new Set(),out=[];for(const x of[...a,...b]){const k=cloudCanon(x);if(!seen.has(k)){seen.add(k);out.push(x)}}return out.slice(0,256)}
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){const o={};for(const k of new Set([...Object.keys(a),...Object.keys(b)]))if(!CL_BADKEY.test(k))o[k]=cloudMerge(a[k],b[k]);return o}
 return a}

// ---- Spielstand lesen/schreiben (lokal) ----
export function cloudCollect(){const p=(k,d)=>{try{const v=JSON.parse(clRd(k)||'null');return v===null?d:v}catch(e){return d}};
 const out={v:1,unlocks:p(CL_KEYS.unlocks,[]),clears:parseInt(clRd(CL_KEYS.clears)||'0',10)||0};
 const loot=p(CL_KEYS.loot,null),skins=p(CL_KEYS.skins,null);if(loot)out.loot=loot;if(skins)out.skins=skins;
 return cloudClean(out)}
let cloudApplying=false;
export function cloudApply(d){d=cloudClean(d)||{};cloudApplying=true;
 try{if(d.loot&&typeof d.loot==='object')clWr(CL_KEYS.loot,JSON.stringify(d.loot));
  if(Array.isArray(d.unlocks)){const ids=d.unlocks.filter(x=>typeof x==='string'&&/^[a-z0-9_-]{1,24}$/i.test(x)).slice(0,32);clWr(CL_KEYS.unlocks,JSON.stringify(ids))}
  if(typeof d.clears==='number')clWr(CL_KEYS.clears,String(d.clears));
  if(d.skins&&typeof d.skins==='object')clWr(CL_KEYS.skins,JSON.stringify(d.skins))}
 finally{cloudApplying=false}}

// ---- HTTP (GoTrue + PostgREST) ----
async function clFetch(path,o={}){const c=clCfg();if(!c)throw clErr('nocfg');
 const h={apikey:c.key,'Content-Type':'application/json',...(o.headers||{})},tok=o.token||(String(c.key).startsWith('eyJ')?c.key:'');if(tok)h.Authorization='Bearer '+tok;
 let r;try{r=await fetch(c.url+path,{method:o.method||'GET',headers:h,body:o.body===undefined?undefined:JSON.stringify(o.body),keepalive:!!o.keepalive})}catch(e){throw clErr('network')}
 let j=null;try{const t=await r.text();j=t?JSON.parse(t):null}catch(e){}
 if(!r.ok)throw clErr((j&&(j.error_code||j.code))||'http'+r.status,j);
 return j}
const clSess=()=>{try{const s=JSON.parse(clRd(CL_SESSION)||'null');return s&&typeof s.access_token==='string'&&typeof s.refresh_token==='string'&&s.user&&typeof s.user.id==='string'?s:null}catch(e){return null}};
const clStore=j=>{const s={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in|0||3600),user:{id:j.user&&j.user.id,email:j.user&&j.user.email}};clWr(CL_SESSION,JSON.stringify(s));return s};
export const cloudUser=()=>{const s=clSess();return s?{id:s.user.id,email:s.user.email||''}:null};
async function clToken(){const s=clSess();if(!s)return null;if(s.expires_at-30>Date.now()/1000)return s.access_token;
 try{return clStore(await clFetch('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh_token}})).access_token}
 catch(e){if(e.code==='network')throw e;clDel(CL_SESSION);return null}}   // abgelehnt (Sitzung abgelaufen/widerrufen) -> abgemeldet

export async function cloudSignUp(email,pw){const j=await clFetch('/auth/v1/signup',{method:'POST',body:{email,password:pw}});
 if(j&&j.access_token){clStore(j);return{user:cloudUser(),confirm:false}}return{user:null,confirm:true}}   // confirm: Bestätigungs-Mail muss erst angeklickt werden
export async function cloudSignIn(email,pw){clStore(await clFetch('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password:pw}}));return cloudUser()}
export async function cloudSignOut(){try{if(clSess())await cloudSync({live:true})}catch(e){}
 const s=clSess();if(s){try{await clFetch('/auth/v1/logout?scope=local',{method:'POST',token:s.access_token})}catch(e){}}
 clDel(CL_SESSION);clDel(CL_SYNC);clDel(CL_HASH);clDel(CL_SENT);cloudLast={state:'out',at:0}}   // lokaler Stand bleibt auf diesem Gerät

// ---- Abgleich ----
export let cloudLast={state:cloudOn()?'out':'off',at:0};
let clBusy=Promise.resolve();
const clPull=async(tok,uid)=>{const r=await clFetch('/rest/v1/savegames?select=data,updated_at&user_id=eq.'+encodeURIComponent(uid)+'&limit=1',{token:tok});return Array.isArray(r)&&r[0]?r[0]:null};
const clPush=async(tok,uid,data,keepalive)=>{const r=await clFetch('/rest/v1/savegames?on_conflict=user_id',{method:'POST',token:tok,keepalive,headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{user_id:uid,data}});
 const at=Array.isArray(r)&&r[0]?r[0].updated_at:null;if(at)clWr(CL_SYNC,at);clWr(CL_HASH,cloudCanon(data));return at};
// opts.live: im laufenden Spiel nur hochladen (nie lokale Daten verändern/neu laden). Rückgabe: {state:'off|out|ok|offline|error|conflict', reload}. reload=true: lokaler Stand wurde ersetzt -> Seite neu laden.
export function cloudSync(opts={}){const run=clBusy.then(()=>clSyncOnce(opts),()=>clSyncOnce(opts));clBusy=run.catch(()=>{});return run}
async function clSyncOnce(opts){
 const set=(state,more)=>{cloudLast={state,at:Date.now()};return{state,reload:false,...more}};
 if(!clCfg())return set('off');if(!clSess())return set('out');
 let tok;try{tok=await clToken()}catch(e){return set('offline')}if(!tok)return set('out');
 const uid=clSess().user.id;let row;
 try{row=await clPull(tok,uid)}catch(e){return set(e.code==='network'?'offline':'error',{code:e.code})}
 const local=cloudCollect(),localH=cloudCanon(local),dirty=clRd(CL_HASH)!==localH;
 try{
  if(!row){await clPush(tok,uid,local);return set('ok')}
  const remote=cloudClean(row.data)||{},remoteH=cloudCanon(remote),changedElsewhere=row.updated_at!==clRd(CL_SYNC);
  if(remoteH===localH){clWr(CL_SYNC,row.updated_at);clWr(CL_HASH,localH);return set('ok')}
  if(!dirty&&!opts.live){cloudApply(remote);clWr(CL_SYNC,row.updated_at);clWr(CL_HASH,remoteH);cloudLast={state:'ok',at:Date.now()};return{state:'ok',reload:true}}   // lokal unverändert -> Cloud-Stand übernehmen
  if(!dirty)return set('conflict');
  if(!changedElsewhere){await clPush(tok,uid,local);return set('ok')}   // nur hier geändert
  if(opts.live)return set('conflict');   // beides geändert: erst beim nächsten Start zusammenführen (nicht mitten im Spiel)
  const merged=cloudClean(cloudMerge(local,remote));cloudApply(merged);await clPush(tok,uid,cloudCollect());cloudLast={state:'ok',at:Date.now()};return{state:'ok',reload:true}
 }catch(e){return set(e.code==='network'?'offline':'error',{code:e.code})}}

// ---- Anmeldung mit Google (OAuth über Supabase, PKCE): nur wenn supabase.config.json "google":true enthält (schreibt supabase-setup) und die Seite über http(s) läuft (nicht als lokale Datei). ----
export const cloudGoogleOk=()=>{try{const c=clCfg();return!!(c&&c.google&&/^https?:$/.test(location.protocol)&&globalThis.crypto&&crypto.subtle)}catch(e){return false}};
const clB64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function cloudGoogleStart(){if(!cloudGoogleOk())throw clErr('nogoogle');
 const v=clB64(crypto.getRandomValues(new Uint8Array(48))),ch=clB64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
 clWr(CL_PKCE,v);location.assign(clCfg().url+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(location.origin+location.pathname)+'&code_challenge='+ch+'&code_challenge_method=s256')}
// Rückkehr von Google: ?code=… in der Adresse gegen eine Sitzung tauschen (nur wenn wir vorher selbst weitergeleitet haben = Verifier vorhanden). Rückgabe: null | {ok} | {error}
export async function cloudOAuthReturn(){let q;try{q=new URLSearchParams(location.search)}catch(e){return null}
 const v=clRd(CL_PKCE),code=q.get('code'),err=q.get('error_description')||q.get('error');if(!v||(!code&&!err))return null;
 clDel(CL_PKCE);for(const k of['code','error','error_code','error_description'])q.delete(k);
 try{const s=q.toString();history.replaceState(null,'',location.pathname+(s?'?'+s:'')+location.hash)}catch(e){}
 if(!code)return{error:'oauth_denied'};
 try{clStore(await clFetch('/auth/v1/token?grant_type=pkce',{method:'POST',body:{auth_code:code,code_verifier:v}}));return{ok:true}}catch(e){return{error:e.code==='network'?'network':'oauth_failed'}}}
// Beim Spielstart aufrufen (nimmt auch die Rückkehr von Google entgegen)
export async function cloudBoot(){cloudWatch();const o=await cloudOAuthReturn(),r=await cloudSync();return o&&o.error?{...r,oauthError:o.error}:r}
// Spielstand-Schlüssel werden geschrieben -> kurz warten (Änderungen bündeln) und hochladen. Ohne Konto passiert nichts.
let clTimer=0,clWatching=false;
export function cloudSoon(ms=3500){if(!clSess())return;clearTimeout(clTimer);clTimer=setTimeout(()=>{cloudSync({live:true})},ms);if(clTimer&&clTimer.unref)clTimer.unref()}
export function cloudWatch(){if(clWatching)return;clWatching=true;
 try{if(typeof Storage!=='undefined'&&!Storage.prototype.__hitisopCloud){const orig=Storage.prototype.setItem,w=new Set(Object.values(CL_KEYS));
  Storage.prototype.setItem=function(k,v){orig.call(this,k,v);try{if(!cloudApplying&&w.has(k)&&this===globalThis.localStorage)cloudSoon()}catch(e){}};Storage.prototype.__hitisopCloud=true}}catch(e){}
 try{const flush=()=>{try{const s=clSess(),c=clCfg();if(!s||!c||s.expires_at-5<=Date.now()/1000)return;const d=cloudCollect();if(cloudCanon(d)!==clRd(CL_HASH))clPush(s.access_token,s.user.id,d,true).catch(()=>{})}catch(e){}};   // Seite wird versteckt/geschlossen: ungesicherten Stand noch schnell hochladen
  addEventListener('pagehide',flush);addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()})}catch(e){}}

// ---- Bestenliste (Tabelle highscores + Funktion submit_highscore, siehe supabase/migrations) ----
// Lesen darf jeder (auch ohne Konto); Eintragen nur mit Konto. Die Spieler-ID kommt serverseitig aus dem Login. Angezeigt wird nur ein frei wählbarer Spielername (kein E-Mail-/Google-Name).
export const cloudCleanName=n=>String(n||'').replace(/[^A-Za-z0-9 äöüÄÖÜß_.-]/g,'').trim().slice(0,16);
export const cloudName=()=>{const n=cloudCleanName(clRd(CL_NAME));if(n.length>=2)return n;const u=clSess();return'SPIELER-'+(u?u.user.id.replace(/-/g,'').slice(0,4).toUpperCase():'0000')};
export function cloudSetName(n){const c=cloudCleanName(n);if(c.length<2)throw clErr('bad_name');clWr(CL_NAME,c);return c}
const clInt=(v,hi)=>Math.max(0,Math.min(hi,Math.trunc(+v)||0));
// e = Eintrag aus core/score.js. Der Server behält nur den besten Wert je Spieler. Rückgabe {state:'ok'|'out'|'offline'|'error', rank}
export async function cloudSubmitScore(e){if(!clCfg()||!clSess()||!e)return{state:'out'};
 try{const tok=await clToken();if(!tok)return{state:'out'};
  const r=await clFetch('/rest/v1/rpc/submit_highscore',{method:'POST',token:tok,body:{p_name:cloudName(),p_score:clInt(e.score,500000),p_fighter:String(e.fighter||'').replace(/[^A-Za-z0-9_]/g,'').slice(0,24)||'unknown',p_stages:clInt(e.stages,40),p_diff:clInt(e.diff,9),p_win:!!e.win,p_hits:clInt(e.hits,99999),p_taken:clInt(e.taken,99999),p_max_combo:clInt(e.maxCombo,999)}});
  clWr(CL_SENT,String(clInt(e.score,500000)));return{state:'ok',rank:typeof r==='number'?r:0}}
 catch(x){return{state:x.code==='network'?'offline':'error',code:x.code}}}
// Beim Start / nach dem Anmelden: besten lokalen Wert nachreichen, falls er noch nicht in der Cloud ist (Offline gespielt, vor dem Anmelden gespielt)
export async function cloudFlushScore(best){if(!best||!clSess())return null;if(best.score<=(parseInt(clRd(CL_SENT)||'0',10)||0))return null;return cloudSubmitScore(best)}
export async function cloudBoard(limit=10){const n=clInt(limit,50)||10,j=await clFetch('/rest/v1/highscores?select=name,score,fighter,stages,diff,win&order=score.desc&limit='+n);
 return(Array.isArray(j)?j:[]).slice(0,n).map(r=>({name:cloudCleanName(r&&r.name)||'?',score:clInt(r&&r.score,500000),fighter:String(r&&r.fighter||'').replace(/[^A-Za-z0-9_]/g,'').slice(0,24),stages:clInt(r&&r.stages,40),diff:clInt(r&&r.diff,9),win:!!(r&&r.win)}))}

// ---- Fehlertexte ----
const CL_MSG={invalid_credentials:'E-Mail oder Passwort stimmt nicht.',user_already_exists:'Zu dieser E-Mail gibt es schon ein Konto – bitte anmelden.',email_exists:'Zu dieser E-Mail gibt es schon ein Konto – bitte anmelden.',
 weak_password:'Das Passwort ist zu schwach (mindestens 8 Zeichen).',email_not_confirmed:'Bitte zuerst den Link in der Bestätigungs-Mail anklicken.',over_request_rate_limit:'Zu viele Versuche – bitte kurz warten.',over_email_send_rate_limit:'Zu viele E-Mails – bitte später nochmal.',
 signup_disabled:'Neue Konten sind gerade nicht möglich.',validation_failed:'Bitte eine gültige E-Mail-Adresse und ein Passwort eingeben.',network:'Keine Verbindung zum Cloud-Server.',nocfg:'Der Cloud-Speicher ist in dieser Version nicht eingerichtet (supabase-setup ausführen).',
 bad_email:'Bitte eine gültige E-Mail-Adresse eingeben.',bad_name:'Der Spielername braucht 2–16 Zeichen (Buchstaben, Zahlen, Leerzeichen, _ . -).',oauth_denied:'Die Anmeldung mit Google wurde abgebrochen.',oauth_failed:'Die Anmeldung mit Google hat nicht geklappt – bitte nochmal versuchen.',nogoogle:'Google-Anmeldung geht nur online oder über localhost (nicht als lokale Datei).',bad_pw:'Das Passwort braucht mindestens 8 Zeichen.'};
export const cloudMessage=code=>CL_MSG[code]||'Das hat nicht geklappt ('+(code||'Fehler')+').';
export const cloudCheck=(email,pw)=>!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)?'bad_email':pw.length<8||pw.length>72?'bad_pw':'';
