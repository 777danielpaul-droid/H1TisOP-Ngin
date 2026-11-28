// Richtet den Cloud-Spielstand (Supabase) komplett automatisch ein – nichts eintippen, nichts in Dateien eintragen:
//   Anmelden (einmalig im Browser) -> Projekt "hitisop" anlegen/finden -> Tabelle + Sicherheitsregeln einspielen -> öffentliche Zugangsdaten in supabase.config.json schreiben.
// Aufruf: ./supabase-setup.sh  (Windows: supabase-setup.bat). Gefahrlos wiederholbar.
import{spawnSync}from'node:child_process';import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';import os from'node:os';import readline from'node:readline/promises';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),NAME='hitisop',REGION='eu-central-1';
const log=m=>console.log(m),die=m=>{console.error('\n✖ '+m);process.exit(1)};
const has=c=>spawnSync(c,['--version'],{stdio:'ignore',shell:process.platform==='win32'}).status===0;
const base=has('supabase')?['supabase']:['npx','--yes','supabase'];
const sb=(args,o={})=>spawnSync(base[0],[...base.slice(1),...args],{cwd:root,encoding:'utf8',shell:process.platform==='win32',stdio:o.inherit?'inherit':['ignore','pipe','pipe']});
const json=(args)=>{const r=sb([...args,'-o','json']);if(r.status!==0)return{err:(r.stderr||r.stdout||'').trim()};try{return{v:JSON.parse(r.stdout)}}catch(e){return{err:'Antwort nicht lesbar: '+(r.stdout||'').slice(0,200)}}};
const pick=(o,...k)=>{for(const x of k)if(o&&o[x]!==undefined&&o[x]!==null)return o[x]};
const list=v=>Array.isArray(v)?v:(v&&Array.isArray(v.projects)?v.projects:[]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

log('H!TisOP · Cloud-Spielstand einrichten\n');
// 1) Anmelden (nur falls nötig; öffnet einmal den Browser)
let pl=json(['projects','list']);
if(pl.err){log('→ Supabase-Anmeldung nötig. Es öffnet sich gleich der Browser – dort einmal bestätigen.\n');sb(['login'],{inherit:true});pl=json(['projects','list']);if(pl.err)die('Anmeldung bei Supabase hat nicht geklappt:\n'+pl.err)}
// 2) Projekt finden oder anlegen
const cfgPath=path.join(root,'supabase.config.json');let ref=null,created=false;
try{const c=JSON.parse(fs.readFileSync(cfgPath,'utf8'));const m=/^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(c.url||'');if(m&&list(pl.v).some(p=>pick(p,'ref','id')===m[1]))ref=m[1]}catch(e){}
if(!ref){const p=list(pl.v).find(p=>pick(p,'name')===NAME);if(p)ref=pick(p,'ref','id')}
if(!ref){
 log('→ Lege Projekt "'+NAME+'" an (Region '+REGION+') …');
 const orgs=json(['orgs','list']);if(orgs.err)die('Organisationen nicht lesbar:\n'+orgs.err);const org=list(orgs.v.organizations?orgs.v.organizations:orgs.v)[0]||(Array.isArray(orgs.v)?orgs.v[0]:null);const orgId=pick(org,'id','slug');if(!orgId)die('Keine Supabase-Organisation gefunden. Bitte einmal auf supabase.com anmelden und eine Organisation anlegen.');
 const pw=crypto.randomBytes(24).toString('base64url');
 const cr=json(['projects','create',NAME,'--org-id',String(orgId),'--db-password',pw,'--region',REGION]);if(cr.err)die('Projekt konnte nicht angelegt werden:\n'+cr.err);
 ref=pick(cr.v,'ref','id');if(!ref)die('Projekt angelegt, aber die Projekt-ID fehlt in der Antwort.');created=true;
 fs.mkdirSync(path.join(root,'supabase'),{recursive:true});fs.writeFileSync(path.join(root,'supabase','.env'),'# Datenbank-Passwort (nicht einchecken – steht in .gitignore)\nSUPABASE_DB_PASSWORD='+pw+'\n',{mode:0o600});
}
log('→ Projekt: '+ref);
// 3) Warten bis die Datenbank bereit ist
for(let i=0;i<60;i++){const r=json(['projects','list']);const p=r.v&&list(r.v).find(p=>pick(p,'ref','id')===ref);const st=String(pick(p,'status')||'').toUpperCase();if(!p||st.includes('ACTIVE'))break;if(i===0)log('  … Datenbank startet (das dauert ca. 1–2 Minuten)');await sleep(6000)}
// 4) Verknüpfen + Tabelle/Regeln einspielen
fs.mkdirSync(path.join(root,'supabase','.temp'),{recursive:true});
sb(['link','--project-ref',ref]);if(!fs.existsSync(path.join(root,'supabase','.temp','project-ref')))fs.writeFileSync(path.join(root,'supabase','.temp','project-ref'),ref);
const dir=path.join(root,'supabase','migrations');
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()){let ok=false,last='';for(let i=0;i<10&&!ok;i++){const r=sb(['db','query','--linked','-f',path.join(dir,f)]);ok=r.status===0;last=(r.stderr||r.stdout||'').trim();if(!ok)await sleep(5000)}if(!ok)die('Datenbank-Skript '+f+' ist fehlgeschlagen:\n'+last);log('→ Datenbank eingerichtet: '+f)}
// 5) Neues Projekt: Konto sofort nutzbar (ohne Bestätigungs-Mail), Passwort mind. 8 Zeichen
if(created){const r=sb(['config','push','--yes']);log(r.status===0?'→ Anmelde-Einstellungen gesetzt':'  (Anmelde-Einstellungen konnten nicht automatisch gesetzt werden – das Spiel funktioniert trotzdem; Bestätigungs-Mail wird dann berücksichtigt)')}
// 6) Öffentlichen Schlüssel (anon/publishable) holen. Erst über die CLI; deren "api-keys"-Befehl scheitert in manchen Versionen an einem Datumsfeld (inserted_at) -> dann direkt über die Supabase-API mit dem Token der CLI-Anmeldung.
const pickKey=arr=>{if(!Array.isArray(arr))return null;const k=arr.find(x=>pick(x,'name','id')==='anon')||arr.find(x=>/publishable/i.test(String(pick(x,'type','name','id')||'')));return k&&pick(k,'api_key','key')||null};
const cliToken=()=>{
 let t=process.env.SUPABASE_ACCESS_TOKEN||'';
 if(!t)try{t=fs.readFileSync(path.join(os.homedir(),'.supabase','access-token'),'utf8').trim()}catch(e){}
 if(!t&&process.platform==='darwin'){const r=spawnSync('security',['find-generic-password','-s','Supabase CLI','-a','supabase','-w'],{encoding:'utf8',stdio:['ignore','pipe','ignore']});if(r.status===0)t=(r.stdout||'').trim()}
 if(t.startsWith('go-keyring-base64:'))try{t=Buffer.from(t.slice(18),'base64').toString('utf8').trim()}catch(e){t=''}
 return/^\S{20,}$/.test(t)?t:''};
let key=null;const ks=json(['projects','api-keys','--project-ref',ref]);if(!ks.err)key=pickKey(ks.v);
if(!key){const tok=cliToken();if(tok){try{const r=await fetch('https://api.supabase.com/v1/projects/'+ref+'/api-keys',{headers:{Authorization:'Bearer '+tok}});if(r.ok)key=pickKey(await r.json());else log('  (Supabase-API antwortete mit '+r.status+')')}catch(e){log('  (Supabase-API nicht erreichbar)')}}}
if(!key)die('Öffentlicher Schlüssel (anon/publishable) konnte nicht automatisch gelesen werden.\nProjekt '+ref+' ist aber fertig eingerichtet; das Skript einfach erneut ausführen, sobald "supabase projects api-keys" bei dir funktioniert (oder SUPABASE_ACCESS_TOKEN setzen).');
// 7) Anmeldung mit Google. Google gibt die Client-ID nur über die Google-Cloud-Konsole heraus – das kann kein Skript für dich anlegen; dafür wird einmal Client-ID + Secret eingefügt (Weiterleitungs-Adresse liegt schon in der Zwischenablage).
let google=false;try{google=JSON.parse(fs.readFileSync(cfgPath,'utf8')).google===true}catch(e){}
const envFile=path.join(root,'supabase','.env'),envVal=n=>{if(process.env[n])return process.env[n];try{const m=new RegExp('^'+n+'=(.*)$','m').exec(fs.readFileSync(envFile,'utf8'));return m?m[1].trim():''}catch(e){return''}};
if(!google){
 let cid=envVal('GOOGLE_CLIENT_ID'),sec=envVal('GOOGLE_CLIENT_SECRET');const cb='https://'+ref+'.supabase.co/auth/v1/callback';
 if((!cid||!sec)&&process.stdin.isTTY){
  log('\n→ Google-Anmeldung einrichten (einmalig, ca. 3 Minuten):');
  log('   1. Google-Cloud-Konsole öffnet sich. Projekt wählen/anlegen (ggf. erst „OAuth-Zustimmungsbildschirm“: extern, App-Name hitisop).');
  log('   2. „Anmeldedaten erstellen“ → „OAuth-Client-ID“ → Anwendungstyp „Webanwendung“.');
  log('   3. Bei „Autorisierte Weiterleitungs-URIs“ einfügen:  '+cb+'   (ist schon kopiert)');
  log('   4. Client-ID und Client-Secret hier einfügen. Nur Enter = Google überspringen.\n');
  if(process.platform==='darwin'){spawnSync('pbcopy',{input:cb});spawnSync('open',['https://console.cloud.google.com/apis/credentials'])}
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});cid=(await rl.question('Client-ID: ')).trim();if(cid)sec=(await rl.question('Client-Secret: ')).trim();rl.close()}
 if(cid&&sec){
  const tok=cliToken();if(!tok)log('  (Supabase-Token nicht gefunden – Google konnte nicht aktiviert werden)');
  else try{const site=process.env.HITISOP_SITE_URL||'https://hit-isop.onrender.com';
   const r=await fetch('https://api.supabase.com/v1/projects/'+ref+'/config/auth',{method:'PATCH',headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({external_google_enabled:true,external_google_client_id:cid,external_google_secret:sec,site_url:site,uri_allow_list:[site+'/**','http://localhost:3000/**','http://localhost:*/**','http://127.0.0.1:*/**'].join(',')})});
   if(r.ok){google=true;log('→ Google-Anmeldung aktiviert')}else log('  (Supabase lehnte die Google-Einstellung ab: HTTP '+r.status+')')}catch(e){log('  (Supabase-API nicht erreichbar)')}}
 else log('→ Google übersprungen (später einfach ./supabase-setup.sh erneut ausführen).')}
fs.writeFileSync(cfgPath,JSON.stringify({url:'https://'+ref+'.supabase.co',key,google},null,2)+'\n');
log('\n✔ Fertig. supabase.config.json wurde geschrieben (öffentlicher Schlüssel – darf im Spiel stehen).');
log('  Jetzt wie gewohnt bauen (npm run build / VS Code) – im Titelmenü erscheint oben rechts „☁ ANMELDEN“ (Taste L).');
