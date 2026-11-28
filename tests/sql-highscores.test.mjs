// Prüft die ECHTE SQL-Funktion submit_highscore in einer eingebauten Postgres-Datenbank (PGlite) gegen den JS-Zwilling verifyRun.
// Nicht Teil von "npm test" (braucht ein Zusatzpaket):  npm i --no-save @electric-sql/pglite && node tests/sql-highscores.test.mjs
import assert from'node:assert/strict';import fs from'node:fs';import crypto from'node:crypto';
let PGlite;try{({PGlite}=await import('@electric-sql/pglite'))}catch(e){console.log('übersprungen: @electric-sql/pglite nicht installiert (npm i --no-save @electric-sql/pglite)');process.exit(0)}
import{verifyRun}from'../src/core/score.js';
const db=new PGlite(),sql=fs.readFileSync(new URL('../supabase/migrations/20261128010000_highscores.sql',import.meta.url),'utf8');
await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid',true),'')::uuid $$;`);
await db.exec(sql);await db.exec(sql);   // idempotent
const user=async()=>{const id=crypto.randomUUID();await db.query('insert into auth.users values($1)',[id]);await db.exec(`select set_config('app.uid','${id}',false)`);return id};
const call=async(n,f,d,l)=>{try{return{ok:true,r:(await db.query('select public.submit_highscore($1,$2,$3,$4::jsonb) as r',[n,f,d,JSON.stringify(l)])).rows[0].r}}catch(e){return{ok:false,msg:e.message}}};
const rnd=n=>Math.floor(Math.random()*n);
let valid=0,rejected=0;
for(let k=0;k<300;k++){const n=1+rnd(8),log=Array.from({length:n},(_,i)=>{const last=i===n-1,w=last?(Math.random()<.5?1:0):1,rd=Math.random()<.9?2+rnd(2):1+rnd(11),mut=Math.random()<.35,h=rnd(70*rd+(mut?60:0)),wr=w?2:1;
  return[Math.random()<.04?2:w,h,rnd(40),Math.min(h,rnd(28)),rnd(wr+2),rnd(100*wr+(mut?60:5)),rnd(99*wr+(mut?60:5)),rd,last&&Math.random()<.5?1:(Math.random()<.03?1:0)]}),diff=rnd(4),js=verifyRun(log,diff);
 await user();const sq=await call('Test','tiger',diff,log);
 if(js.ok){valid++;assert.ok(sq.ok&&sq.r.score===js.score,'Abweichung bei '+JSON.stringify(log))}else{rejected++;assert.ok(!sq.ok,'SQL nahm an, JS lehnt ab ('+js.reason+'): '+JSON.stringify(log))}}
console.log('  ✓ SQL = JS bei '+valid+' gültigen und '+rejected+' ungültigen Protokollen');
const good=[[1,20,2,6,2,180,60,2,0]];await user();assert.equal((await call('Ich','wolf',2,good)).r.score,8610);assert.match((await call('x','wolf',2,good)).msg,/too fast/,'Zeitsperre');
for(const q of["insert into public.highscores(user_id,name,score,fighter) values(gen_random_uuid(),'X',1,'a')","update public.highscores set score=999999","delete from public.highscores","select user_id from public.highscores"])
 for(const role of['authenticated','anon']){await db.exec(`set role ${role}`);await assert.rejects(()=>db.query(q),/permission denied/,role+': '+q);await db.exec('reset role')}
await db.exec('set role anon');assert.ok((await db.query('select name,score from public.highscores limit 1')).rows.length>=0);await assert.rejects(()=>db.query("select public.submit_highscore('a','b',0,'[[1]]'::jsonb)"),/permission denied/);await db.exec('reset role');
console.log('  ✓ Schreiben nur über die Funktion, Lesen ohne user_id, anon darf nicht einreichen');
console.log('SQL-Highscore-Tests bestanden');process.exit(0);
