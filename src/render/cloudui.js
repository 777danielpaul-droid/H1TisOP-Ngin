// Konto-/Cloud-Fenster (DOM-Overlay #cloud) + Konto-Knopf auf der Startseite (#acct). Kennt keine Netzwerk-Details: ctx() liefert den Zustand, act() meldet Aktionen.
//   ctx() -> { on, user:{email}|null, last:{state,at} }      act(name, arg) -> Promise<{msg?,bad?}|void>   (signin{email,pw} | signup{email,pw} | signout | sync | close)
const cuEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class CloudUi{
 constructor(o){this.o=o;this.el=document.getElementById('cloud');this.body=document.getElementById('cl-body');this.chip=document.getElementById('acct');this.isOpen=false;this.tab='in';this.view='acct';this.board=null;this.boardErr='';this.msg='';this.bad=false;this.busy=false}
 mount(){if(this.chip){this.chip.addEventListener('click',()=>this.o.open());this.chip.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();this.o.open()}})}
  if(!this.el)return;
  this.el.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b||b.disabled||this.busy)return;this.click(b.dataset.k,b.dataset.v)});
  this.el.addEventListener('keydown',e=>{if(!this.isOpen)return;if(e.code==='Escape'){e.preventDefault();this.o.act('close')}
   else if(e.code==='Enter'&&e.target&&e.target.tagName==='INPUT'){e.preventDefault();if(!this.busy)this.click(this.tab==='up'?'signup':'signin')}
   e.stopPropagation()},true);
  this.refreshChip()}
 open(view){this.isOpen=true;this.msg='';this.bad=false;if(view)this.view=view;if(this.view==='board')this.loadBoard();if(this.el)this.el.classList.remove('hidden');this.render();return this}
 close(){this.isOpen=false;if(this.el)this.el.classList.add('hidden')}
 say(m,bad){this.msg=m||'';this.bad=!!bad;const e=document.getElementById('cl-msg');if(e){e.textContent=this.msg;e.classList.toggle('bad',this.bad)}}
 vals(){const e=document.getElementById('cl-email'),p=document.getElementById('cl-pw');return{email:e?e.value.trim():'',pw:p?p.value:''}}
 async loadBoard(){this.board=null;this.boardErr='';this.render();let r;try{r=await this.o.act('board')}catch(e){r=null}if(!this.isOpen)return;if(r&&Array.isArray(r.rows))this.board=r.rows;else{this.board=[];this.boardErr=(r&&r.msg)||'Die Bestenliste konnte nicht geladen werden.'}this.render()}
 async click(k,v){if(k==='tab'){this.tab=v;this.msg='';this.render();return}
  if(k==='view'){this.view=v;this.msg='';if(v==='board')this.loadBoard();else this.render();return}
  if(k==='close'){this.o.act('close');return}
  this.busy=true;this.say('Einen Moment …');this.lock(true);
  let r;try{r=await this.o.act(k,k==='signin'||k==='signup'?this.vals():k==='name'?{name:(document.getElementById('cl-name')||{}).value||''}:undefined)}catch(e){r={msg:'Das hat nicht geklappt.',bad:true}}
  this.busy=false;if(!this.isOpen)return;
  if(r&&r.msg!==undefined){this.msg=r.msg;this.bad=!!r.bad}else this.msg='';
  this.render()}
 lock(on){if(this.body)this.body.querySelectorAll('button,input').forEach(x=>x.disabled=!!on)}
 refreshChip(){if(!this.chip)return;const{on,user}=this.o.ctx();this.chip.classList.toggle('hidden',!on);this.chip.classList.toggle('in',!!user);
  this.chip.textContent=user?'☁ '+(user.email.split('@')[0]||'KONTO').slice(0,18).toUpperCase():'☁ ANMELDEN'}
 render(){this.refreshChip();if(!this.isOpen||!this.body)return;const{on,user,last,google,local,name}=this.o.ctx();let h='';
  const tabs=on?`<div class="cl-tabs"><button data-k="view" data-v="acct" class="${this.view==='acct'?'on':''}">Konto</button><button data-k="view" data-v="board" class="${this.view==='board'?'on':''}">Bestenliste</button></div>`:'';
  if(on&&this.view==='board'){const row=(r,i)=>`<div class="cl-row"><span class="cl-rk">${i+1}</span><span class="cl-nm">${cuEsc(r.name||r.who||'')}</span><span class="cl-fi">${cuEsc(r.who||r.fighter)}${r.win?' ✔':''}</span><span class="cl-sc">${r.score}</span></div>`;
   h=tabs+`<p class="nt-sub">Punkte gibt es im Arcade-Modus: mehr Treffer, Combos und Restleben, weniger eingesteckte Treffer = mehr Punkte. Gewertet wird ein ganzer Durchlauf.</p><h2 class="cl-h">Weltbestenliste</h2>`+(this.board===null?'<p class="nt-sub">Lade …</p>':this.boardErr?`<p class="nt-msg bad">${cuEsc(this.boardErr)}</p>`:this.board.length?`<div class="cl-list">${this.board.map(row).join('')}</div>`:'<p class="nt-sub">Noch keine Einträge – sei der Erste!</p>')+`<h2 class="cl-h">Deine Bestwerte (auf diesem Gerät)</h2>`+((local&&local.length)?`<div class="cl-list">${local.map((r,i)=>row({...r,name:''},i)).join('')}</div>`:'<p class="nt-sub">Noch kein Arcade-Durchlauf gespielt.</p>')+(user?`<div class="cl-form cl-name"><input id="cl-name" value="${cuEsc(name||'')}" maxlength="16" placeholder="Spielername" spellcheck="false" autocomplete="off"><button data-k="name">Namen speichern</button></div>`:'<p class="nt-sub">Melde dich an, damit dein Bestwert in der Weltbestenliste erscheint.</p>')+`<p id="cl-msg" class="nt-msg"></p><div class="nt-foot"><button data-k="close">Schließen</button></div>`}
  else if(!on)h=`<p class="nt-sub">Der Cloud-Speicher ist in dieser Version noch nicht eingerichtet. Das Setup-Skript (supabase-setup) legt ihn automatisch an.</p><div class="nt-foot"><button data-k="close">Schließen</button></div>`;
  else if(user){const st=last.state==='ok'?'Spielstand ist gesichert ✔':last.state==='offline'?'Gerade keine Verbindung – wird später gesichert.':last.state==='conflict'?'Auf einem anderen Gerät wurde auch gespielt – beim nächsten Start werden beide Stände zusammengeführt.':last.state==='error'?'Abgleich hat nicht geklappt.':'';
   h=tabs+`<p class="nt-sub">Angemeldet als <b>${cuEsc(user.email)}</b></p><p class="nt-sub">Booster, Coins, Karten, Farben und Freischaltungen werden automatisch in deinem Konto gesichert und auf jedem Gerät geladen.</p>
   <p class="nt-msg ${last.state==='ok'?'':'bad'}">${cuEsc(st)}</p><div class="nt-menu"><button class="primary" data-k="sync">Jetzt abgleichen</button><button data-k="signout">Abmelden</button></div>
   <p id="cl-msg" class="nt-msg"></p><div class="nt-foot"><button data-k="close">Schließen</button></div>`}
  else{const up=this.tab==='up';
   h=tabs+`<p class="nt-sub">Optional: Mit einem Konto bleibt dein Spielstand erhalten und läuft auf jedem Gerät. Ohne Konto spielst du wie bisher.</p>
   ${google?`<button class="cl-google" data-k="google"><span class="cl-g">G</span>Mit Google anmelden</button><p class="nt-sub cl-or">oder mit E-Mail</p>`:''}
   <div class="cl-tabs"><button data-k="tab" data-v="in" class="${up?'':'on'}">Anmelden</button><button data-k="tab" data-v="up" class="${up?'on':''}">Konto erstellen</button></div>
   <div class="cl-form"><input id="cl-email" type="email" placeholder="E-Mail" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="254">
   <input id="cl-pw" type="password" placeholder="Passwort (mind. 8 Zeichen)" autocomplete="${up?'new-password':'current-password'}" maxlength="72">
   <button class="primary" data-k="${up?'signup':'signin'}">${up?'Konto erstellen':'Anmelden'}</button></div>
   <p id="cl-msg" class="nt-msg"></p><div class="nt-foot"><button data-k="close">Später</button></div>`}
  this.body.innerHTML=h;this.say(this.msg,this.bad);
  const f=this.body.querySelector('#cl-email')||this.body.querySelector('button');if(f)try{f.focus()}catch(e){}}
}
