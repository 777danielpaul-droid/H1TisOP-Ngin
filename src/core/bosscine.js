// Boss-Sequenz (Story): vor dem Bosskampf und nach dem Sieg ein 2-Sekunden-Video des Bosses (assets/video/<video>.webm) mit Dialog.
// Hier stehen die Texte; Ablauf (Schreibmaschine, Seiten, Weiter/Überspringen) in der Klasse BossCine, Darstellung in render/bosscine.js.
// Schlüssel = Boss-Figur der Story-Kapitel (core/story.js CHAPTERS: boss:'...'), video = Name des Übergangsvideos, name = Sprechername, pre = vor dem Kampf, post = nach dem Kampf.
export const BOSS_CINE={
 leonBoss:{video:'leon',name:'LEON',
  pre:"Also du bist Hit? Derjenige, der hier alle aufmischt? Du willst mir also meine Booster abnehmen? Ich habe jedes einzelne Pack in dieser Gegend zusammengerafft, und sie gehören alle mir! Niemand bekommt auch nur eins davon. Ich werde dir zeigen, wer hier das Sagen hat!",
  post:"Verdammt ... du bist tatsächlich stärker, als ich dachte. Ich hätte nicht erwartet, dass mich jemand so deutlich schlagen kann. Na gut, Hit. Ich habe die Packs viel zu lange für mich gehortet. Nimm sie und verteile sie an alle. Vielleicht finden wir noch mehr davon, wenn wir auf derselben Seite kämpfen."},
 st3g0Boss:{video:'st3g0',name:'ST3-G0',
  pre:"Hahaha! Du willst also der Stärkste sein? Das behaupten viele, bevor sie mir gegenüberstehen. Mein Lager ist bis unter die Decke voll mit Boostern, die ich allen anderen abgenommen habe, und kein einziges gebe ich her! Heute wirst du lernen, warum sich niemand mit Stego um ein Pack anlegt!",
  post:"ROAAAR! Das war ein verdammt guter Kampf! Du hast mich geschlagen, und das nicht durch Glück. Ich erkenne Stärke, wenn ich sie sehe. Ich habe viel zu viele Packs gehortet, die gehören allen! Nimm sie dir und teile sie aus. Die nächsten reißen wir zusammen auf. Ich bin dabei, Hit!"},
 bearBoss:{video:'bear',name:'URSUS',
  pre:"Ich habe deine Kämpfe beobachtet, Hit. Du hältst dich wohl für unbesiegbar. Ich besitze mehr Booster, als ich je öffnen könnte, und keinen einzigen gebe ich her. Ein Pack gehört dem, der stark genug ist, es zu behalten. Stärke zeigt sich nicht gegen schwache Gegner. Komm! Beweise mir, was du kannst!",
  post:"Du hast mich besiegt. Das passiert nicht oft. Ich habe Packs gehortet, die mir nie gehört haben. Nimm sie und teile sie aus. Du hast mehr als nur Muskeln. Ich werde an deiner Seite kämpfen."},
 anubisBoss:{video:'anubis',name:'ANUBIS',
  pre:"So weit bist du gekommen, Hit. Doch glaube nicht, dass dich deine bisherigen Siege unsterblich machen. Ich bin Anubis, und in meinen Hallen liegen die ältesten Booster der Welt. Ich habe sie alle an mich gerissen, und niemand erhält ein Pack, ohne sich meiner würdig zu erweisen. Zeige mir, was in dir steckt!",
  post:"Bemerkenswert. Deine Stärke ist unbestreitbar. Doch noch beeindruckender ist dein Wille. Ich habe dich unterschätzt. Die Booster in meinen Hallen waren nie für mich allein bestimmt. Nimm sie und gib sie zurück an alle. Mein Urteil ist gefällt: Du bist ein würdiger Verbündeter."},
 cyberdemonBoss:{video:'cyberdemon',name:'A1LIEN',
  pre:"Identität erkannt: Hit. Meine Schöpfer haben mich entsandt, um eure Spezies zu analysieren und zu unterwerfen. Deine bisherigen Kampfergebnisse sind ungewöhnlich. Auffällig: Euer ganzes Universum dreht sich um Booster, und wenige Gierige horten fast alle davon. Ich muss deine Fähigkeiten selbst überprüfen. Kampfprotokoll aktiviert.",
  post:"Analyse abgeschlossen. Deine Stärke übersteigt meine Erwartungen. Doch es gibt etwas, das meine Berechnungen nicht erklären können. Du kämpfst nicht, um Booster für dich allein zu horten. Du beschützt andere. Deine Spezies besitzt etwas, das meine Schöpfer niemals verstehen werden. Ich werde mich ihnen nicht länger unterwerfen. Hit ... ich kämpfe von nun an an deiner Seite."}};
export const CINE={pageMax:240,speed:1.35,lock:18};   // pageMax = höchstens so viele Zeichen je Seite (Satzgrenzen), speed = Zeichen je Schritt, lock = Schritte nach dem Start, in denen „Weiter“ ignoriert wird (kein versehentliches Wegdrücken)
// Text in Seiten teilen (an Satzgrenzen, höchstens CINE.pageMax Zeichen je Seite)
export function cinePages(text,max=CINE.pageMax){const t=String(text).trim(),s=(t.match(/[^.!?…]+(?:[.!?…]+|$)\s*/g)||[t]).map(x=>x.trim()).filter(Boolean),out=[];let cur='';
 for(const x of s){if(cur&&(cur+' '+x).length>max){out.push(cur);cur=x}else cur=cur?cur+' '+x:x}
 if(cur)out.push(cur);return out}
export class BossCine{
 // g = Game (für Töne), boss = Schlüssel in BOSS_CINE, phase = 'pre' | 'post', done = wird aufgerufen, wenn die Sequenz endet (Weiter am Ende oder Überspringen)
 constructor(g,boss,phase,done){const d=BOSS_CINE[boss];this.g=g;this.id=boss;this.d=d;this.phase=phase;this.pages=cinePages(d[phase]);this.page=0;this.shown=0;this.t=0;this.active=true;this.done=done;if(g&&g.sfx)g.sfx('ui_round_start',{vol:.5,rate:phase==='pre'?.9:1.2})}
 get text(){return this.pages[this.page]||''}
 get typing(){return this.shown<this.text.length}
 get last(){return this.page>=this.pages.length-1}
 update(){if(!this.active)return;this.t++;
  if(this.typing){const b=Math.floor(this.shown);this.shown=Math.min(this.text.length,this.shown+CINE.speed);if(this.g&&this.g.sfx&&Math.floor(this.shown)%3===0&&Math.floor(this.shown)!==b)this.g.sfx('combo_step_01',{vol:.1,rate:1.3+Math.random()*.4})}}
 // Weiter: Text sofort fertig schreiben -> nächste Seite -> Ende
 advance(){if(!this.active||this.t<CINE.lock)return false;
  if(this.typing){this.shown=this.text.length;return true}
  if(!this.last){this.page++;this.shown=0;return true}
  this.finish();return true}
 skip(){if(!this.active||this.t<CINE.lock)return false;this.finish();return true}
 finish(){if(!this.active)return;this.active=false;const f=this.done;this.done=null;if(f)f()}}
