import{CHARACTERS}from'../core/characters.js';
import{H,W}from'../core/config.js';
// Darstellung der Boss-Sequenz (core/bosscine.js): das 2-Sekunden-Video des Bosses (Schleife) und darunter die Dialogbox mit Schreibmaschinen-Text.
// Wird als letzte Ebene über dem HUD gezeichnet; ohne laufende Sequenz werden die Videos nur angehalten.
const cineVids={};
function cineVid(id){if(id in cineVids)return cineVids[id];let v=null;const src=typeof window!=='undefined'&&window.__VIDEOS__&&window.__VIDEOS__[id];
 if(src&&typeof document!=='undefined'){try{v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.loop=true;let u=src;try{const b=atob(src.slice(src.indexOf(',')+1)),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);u=URL.createObjectURL(new Blob([a],{type:'video/webm'}))}catch(e){}v.src=u;v.load()}catch(e){v=null}}
 return cineVids[id]=v}
const cineReady=v=>!!v&&!v.error&&v.readyState>=2&&v.videoWidth>0;
function cineWrap(g,hud,s,size,maxW){const out=[];let line='';for(const w of String(s).split(' ')){const tr=line?line+' '+w:w;if(line&&hud.mw(g,tr,size)>maxW){out.push(line);line=w}else line=tr}if(line)out.push(line);return out}
export function drawBossCine(g,hud,game,t){const c=game.story&&game.story.cine;
 if(!c||!c.active){for(const k in cineVids){const v=cineVids[k];if(v&&!v.paused){v.pause();v.currentTime=0}}return}
 const ch=CHARACTERS[c.id]||{},col=ch.glow||'#9fe8ff',v=cineVid(c.d.video),al=Math.min(1,c.t/12);
 const pw=592,ph=333,px=(W-pw)/2,py=18,bx=60,by=py+ph+15,bw=W-120,bh=H-by-12;
 g.save();g.globalAlpha=al;g.fillStyle='rgba(2, 2, 8, 0.94)';g.fillRect(0,0,W,H);   // Spiel dahinter abdunkeln
 g.save();g.shadowColor=col;g.shadowBlur=26;g.fillStyle='#000';g.fillRect(px-3,py-3,pw+6,ph+6);g.restore();
 if(cineReady(v)){if(v.paused)v.play().catch(()=>{});g.drawImage(v,px,py,pw,ph)}
 const gr=g.createLinearGradient(0,py,0,py+46);gr.addColorStop(0,'rgba(0,0,0,.65)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(px,py,pw,46);
 g.strokeStyle=col;g.lineWidth=2;g.globalAlpha=al*.9;g.strokeRect(px-3,py-3,pw+6,ph+6);g.globalAlpha=al;
 hud.lab(g,c.phase==='pre'?'VOR DEM KAMPF':'NACH DEM KAMPF',px+12,py+20,11,'#ffffff','left',3,col,'800');
 // Dialogbox
 g.save();hud.kChamfer(g,bx,by,bw,bh,10);g.fillStyle='rgba(10, 10, 18, 0.9)';g.fill();g.strokeStyle=col;g.lineWidth=1.4;g.globalAlpha=al*.8;g.stroke();g.restore();
 hud.lab(g,c.d.name,bx+20,by+27,16,col,'left',3,col,'800');
 if(c.pages.length>1)hud.lab(g,(c.page+1)+' / '+c.pages.length,bx+bw-20,by+24,10,'#8e96c8','right',2,null,'600');
 const size=17,lines=cineWrap(g,hud,c.text,size,bw-44);let left=Math.floor(c.shown);
 lines.forEach((ln,i)=>{if(left<=0)return;hud.txt(g,ln.slice(0,left),bx+22,by+58+i*23,size,'#f2f0ff','left');left-=ln.length+1});
 if(!c.typing&&Math.sin(t*.2)>-.3)hud.lab(g,c.last?'ENTER  ▶':'ENTER  ▼',bx+bw-20,by+bh-14,11,'#ffffff','right',2,col,'700');
 hud.lab(g,'LEERTASTE – ÜBERSPRINGEN',bx+20,by+bh-14,9,'#8e96c8','left',2,null,'600');
 g.restore()}
