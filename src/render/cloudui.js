// Konto-/Cloud-Fenster (DOM-Overlay #cloud) + Konto-Knopf auf der Startseite (#acct). Kennt keine Netzwerk-Details: ctx() liefert den Zustand, act() meldet Aktionen.
//   ctx() -> { on, user:{email}|null, last:{state,at} }      act(name, arg) -> Promise<{msg?,bad?}|void>   (signin{email,pw} | signup{email,pw} | signout | sync | close)
const cuEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class CloudUi{
 constructor(o){this.o=o;this.el=document.getElementById('cloud');this.body=document.getElementById('cl-body');this.chip=document.getElementById('acct');this.isOpen=false;this.tab='in';this.msg='';this.bad=false;this.busy=false}
 mount(){if(this.chip){this.chip.addEventListener('click',()=>this.o.open());this.chip.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();this.o.open()}})}
  if(!this.el)return;
  this.el.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b||b.disabled||this.busy)return;this.click(b.dataset.k,b.dataset.v)});
  this.el.addEventListener('keydown',e=>{if(!this.isOpen)return;if(e.code==='Escape'){e.preventDefault();this.o.act('close')}
   else if(e.code==='Enter'&&e.target&&e.target.tagName==='INPUT'){e.preventDefault();if(!this.busy)this.click(this.tab==='up'?'signup':'signin')}
   e.stopPropagation()},true);
  this.refreshChip()}
 open(){this.isOpen=true;this.msg='';this.bad=false;if(this.el)this.el.classList.remove('hidden');this.render();return this}
 close(){this.isOpen=false;if(this.el)this.el.classList.add('hidden')}
 say(m,bad){this.msg=m||'';this.bad=!!bad;const e=document.getElementById('cl-msg');if(e){e.textContent=this.msg;e.classList.toggle('bad',this.bad)}}
 vals(){const e=document.getElementById('cl-email'),p=document.getElementById('cl-pw');return{email:e?e.value.trim():'',pw:p?p.value:''}}
 async click(k,v){if(k==='tab'){this.tab=v;this.msg='';this.render();return}
  if(k==='close'){this.o.act('close');return}
  this.busy=true;this.say('Einen Moment …');this.lock(true);
  let r;try{r=await this.o.act(k,k==='signin'||k==='signup'?this.vals():undefined)}catch(e){r={msg:'Das hat nicht geklappt.',bad:true}}
  this.busy=false;if(!this.isOpen)return;
  if(r&&r.msg!==undefined){this.msg=r.msg;this.bad=!!r.bad}else this.msg='';
  this.render()}
 lock(on){if(this.body)this.body.querySelectorAll('button,input').forEach(x=>x.disabled=!!on)}
 refreshChip(){if(!this.chip)return;const{on,user}=this.o.ctx();this.chip.classList.toggle('hidden',!on);this.chip.classList.toggle('in',!!user);
  this.chip.textContent=user?'☁ '+(user.email.split('@')[0]||'KONTO').slice(0,18).toUpperCase():'☁ ANMELDEN'}
 render(){this.refreshChip();if(!this.isOpen||!this.body)return;const{on,user,last,google}=this.o.ctx();let h='';
  if(!on)h=`<p class="nt-sub">Der Cloud-Speicher ist in dieser Version noch nicht eingerichtet. Das Setup-Skript (supabase-setup) legt ihn automatisch an.</p><div class="nt-foot"><button data-k="close">Schließen</button></div>`;
  else if(user){const st=last.state==='ok'?'Spielstand ist gesichert ✔':last.state==='offline'?'Gerade keine Verbindung – wird später gesichert.':last.state==='conflict'?'Auf einem anderen Gerät wurde auch gespielt – beim nächsten Start werden beide Stände zusammengeführt.':last.state==='error'?'Abgleich hat nicht geklappt.':'';
   h=`<p class="nt-sub">Angemeldet als <b>${cuEsc(user.email)}</b></p><p class="nt-sub">Booster, Coins, Karten, Farben und Freischaltungen werden automatisch in deinem Konto gesichert und auf jedem Gerät geladen.</p>
   <p class="nt-msg ${last.state==='ok'?'':'bad'}">${cuEsc(st)}</p><div class="nt-menu"><button class="primary" data-k="sync">Jetzt abgleichen</button><button data-k="signout">Abmelden</button></div>
   <p id="cl-msg" class="nt-msg"></p><div class="nt-foot"><button data-k="close">Schließen</button></div>`}
  else{const up=this.tab==='up';
   h=`<p class="nt-sub">Optional: Mit einem Konto bleibt dein Spielstand erhalten und läuft auf jedem Gerät. Ohne Konto spielst du wie bisher.</p>
   ${google?`<button class="cl-google" data-k="google"><span class="cl-g">G</span>Mit Google anmelden</button><p class="nt-sub cl-or">oder mit E-Mail</p>`:''}
   <div class="cl-tabs"><button data-k="tab" data-v="in" class="${up?'':'on'}">Anmelden</button><button data-k="tab" data-v="up" class="${up?'on':''}">Konto erstellen</button></div>
   <div class="cl-form"><input id="cl-email" type="email" placeholder="E-Mail" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="254">
   <input id="cl-pw" type="password" placeholder="Passwort (mind. 8 Zeichen)" autocomplete="${up?'new-password':'current-password'}" maxlength="72">
   <button class="primary" data-k="${up?'signup':'signin'}">${up?'Konto erstellen':'Anmelden'}</button></div>
   <p id="cl-msg" class="nt-msg"></p><div class="nt-foot"><button data-k="close">Später</button></div>`}
  this.body.innerHTML=h;this.say(this.msg,this.bad);
  const f=this.body.querySelector('#cl-email')||this.body.querySelector('button');if(f)try{f.focus()}catch(e){}}
}
