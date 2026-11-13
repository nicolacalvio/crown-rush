const $=s=>document.querySelector(s), canvas=$('#arena'),ctx=canvas.getContext('2d');
const cards=[['Cavaliere',3,'#83a1bc','tank'],['Arcieri',3,'#c48eb7','range'],['Gigante',5,'#c79057','giant'],['Palla di fuoco',4,'#e28355','spell'],['Goblin',2,'#92b665','goblin'],['Mago',4,'#8c98d4','mage'],['Valchiria',4,'#cb9374','valk'],['Predoni',3,'#c3b98a','rogue'],['Lancieri',2,'#9eb96b','range'],['Berserker',5,'#d7a26e','tank'],['Balestriere',3,'#a3aaca','range'],['Golem',6,'#95a69a','giant']];
function art(k,team=0){const color=team?'#d4786c':'#6f9bd0',c=cards[k][2];let figure='';if(k===3)figure='<path d="M30 91Q-2 56 55 10Q39 50 76 20Q115 68 74 94Z" fill="#ec7450"/><path d="M41 87Q18 63 57 38Q50 65 72 50Q90 81 62 94Z" fill="#f9d778"/>';else{figure=`<ellipse cx="52" cy="103" rx="32" ry="7" fill="#17232b" opacity=".25"/><path d="M23 101L27 67Q52 50 77 67L83 101Z" fill="${k===2?'#986044':color}"/><path d="M34 101L37 78H66L69 101" fill="${c}"/><path d="M29 70L18 85L29 91M74 70L88 84L77 92" fill="none" stroke="${k===4?'#96c369':'#e7b797'}" stroke-width="13" stroke-linecap="round"/><rect x="33" y="24" width="40" height="42" rx="16" fill="${k===4?'#a5cd70':'#e8ba96'}"/><path d="M31 39V27Q52 5 76 28L76 43L67 36L65 25L39 26L38 41Z" fill="${k===1?'#b86ac7':k===6?'#d18a4b':k===2?'#8c5239':k===5?color:'#637d95'}"/><path d="M42 42H47M60 42H65" stroke="#283640" stroke-width="4"/><path d="M49 54Q54 58 60 53" fill="none" stroke="#8a5442" stroke-width="2"/>`;if(k===0||k===6)figure+='<path d="M87 76L91 27L99 17L102 29L94 78" fill="#d2dee2"/><path d="M82 76L104 79" stroke="#bda76c" stroke-width="5"/><path d="M12 73L33 68L35 89L25 98L13 88Z" fill="#8caaba" stroke="#d0d5c4" stroke-width="3"/>';if(k===1)figure+='<path d="M83 36Q110 65 82 97L85 36L98 65Z" fill="none" stroke="#d0ad73" stroke-width="4"/>';if(k===5)figure+='<path d="M88 100L89 35" stroke="#a8947c" stroke-width="5"/><circle cx="89" cy="30" r="11" fill="#b9cde8"/><path d="M28 30L51 1L77 32" fill="#8195c7"/>';if(k===4)figure+='<path d="M34 29L15 21L31 45M72 29L91 21L74 45" fill="#a5cd70"/><path d="M87 66L97 46L102 69Z" fill="#dce6de"/>';if(k===7)figure+='<path d="M32 33Q48 0 72 30L67 37L40 37Z" fill="#9c9b7b"/><path d="M39 49L67 49L64 60L43 60Z" fill="#5b665b"/>';}
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 115"><defs><radialGradient id="g"><stop stop-color="${c}"/><stop offset="1" stop-color="#273947"/></radialGradient></defs><rect width="110" height="115" fill="url(#g)"/><path d="M8 110L100 8M-20 90L80-10" stroke="#ffffff" opacity=".04" stroke-width="17"/>${figure}</svg>`;}
const sprites=[[],[]];for(let t=0;t<2;t++)for(let k=0;k<cards.length;k++){let im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art(k,t).replace(/<rect width="110" height="115" fill="url\(#g\)"\/>/,'').replace(/<path d="M8 110L100 8M-20 90L80-10"[^>]*\/>/,''));sprites[t][k]=im;}
$('#collection').innerHTML=cards.map((c,k)=>`<div class="mini-card" title="${c[0]} · ${c[1]} elisir">${art(k)}<span class="cost">${c[1]}</span></div>`).join('');
let wasm,started=false,paused=false,selected=-1,last=0,lastHand='',pointer=null,sound=false,audio,toastUntil=0,overlayAction='cpu';const particles=[];
function toast(s){$('#message').textContent=s;toastUntil=performance.now()+2500;}
function beep(f=360){if(!sound)return;audio??=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=f;o.type='sine';g.gain.setValueAtTime(.05,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.start();o.stop(audio.currentTime+.16);}
function select(i){if(!started||paused||wasm.value(2,0))return;selected=i;lastHand='';beep(440);toast(cards[wasm.value(5,i)][0]+(wasm.value(5,i)===3?' · Tocca il bersaglio':' · Tocca la tua metà dell’arena'));}
function rounded(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function tower(x,y,hp,max,team,king=false){if(hp<=0){ctx.fillStyle='#596e5b';for(let i=0;i<5;i++)rounded(x-30+i*12,y+5-(i%2)*7,14,12,3,'#84917b');return;}let c=team?'#b56e61':'#608fb4',light=team?'#e3a192':'#9dc8e0',w=king?66:53;ctx.fillStyle='#244b383b';ctx.beginPath();ctx.ellipse(x+5,y+25,w*.75,17,0,0,Math.PI*2);ctx.fill();rounded(x-w/2-7,y-9,w+14,38,5,'#62715e');rounded(x-w/2-3,y-26,w+6,47,5,'#c5c6a7');rounded(x-w/2,y-30,w,38,3,'#e1dfbc');rounded(x-w/2,y-11,w,25,2,'#b8b99a');rounded(x-w/2+4,y-8,w-8,8,1,'#cccfac');rounded(x-14,y-38,28,33,3,c);polygon([[x-w/2-6,y-28],[x,y-51],[x+w/2+6,y-28]],light);for(let j=-1;j<=1;j++)rounded(x+j*18-6,y-38,12,14,1,'#dedfbd');rounded(x-8,y-18,16,20,6,'#465b59');ctx.fillStyle=light;ctx.font=`${king?30:24}px Georgia`;ctx.textAlign='center';ctx.fillText(king?'♛':'♜',x,y-21);ctx.fillStyle=team?'#d78e7c':'#8cbed6';ctx.fillRect(x+w/2+3,y-57,2,29);polygon([[x+w/2+5,y-56],[x+w/2+24,y-53],[x+w/2+5,y-43]],ctx.fillStyle);rounded(x-32,y+32,64,7,3,'#354e3b');rounded(x-31,y+33,62*hp/max,5,2,team?'#eeab8b':'#b9e29c');ctx.fillStyle='#f0f3d9';ctx.font='bold 11px DM Sans, sans-serif';ctx.fillText(Math.ceil(hp),x,y+52);}
const terrain=document.createElement('canvas');terrain.width=600;terrain.height=720;const terrainCtx=terrain.getContext('2d');
function ground(){ctx.fillStyle='#719b61';ctx.fillRect(0,0,600,720);for(let y=0;y<720;y+=40)for(let x=0;x<600;x+=40){ctx.fillStyle=(x/40+y/40)%2?'#ffffff06':'#21432806';ctx.fillRect(x,y,40,40);}ctx.fillStyle='#5e8955';ctx.fillRect(0,0,30,720);ctx.fillRect(570,0,30,720);ctx.fillStyle='#8a9f73';ctx.fillRect(29,0,5,720);ctx.fillRect(566,0,5,720);for(let y=25;y<720;y+=39){rounded(4,y,22,30,4,'#78886b');rounded(574,y,22,30,4,'#78886b');rounded(7,y,16,8,2,'#98a083');}for(let side of [125,475]){for(let y=30;y<700;y+=32){if(y>320&&y<400)continue;rounded(side-32+(y%64?4:0),y,60,28,3,'#a8b08944');}}ctx.fillStyle='#3c756c';ctx.fillRect(34,326,532,68);ctx.fillStyle='#579a94';ctx.fillRect(34,334,532,52);ctx.fillStyle='#a7b58c';ctx.fillRect(34,322,532,7);ctx.fillRect(34,392,532,7);for(let x=38;x<560;x+=51){rounded(x,345+(x%3)*8,25,2,1,'#a3cabe55');rounded(x+13,365,20,2,1,'#b4dcce33');}for(let x of [125,475]){rounded(x-41,320,82,80,3,'#545e4e');for(let y=325;y<395;y+=10)rounded(x-40,y,80,8,2,'#b9aa82');rounded(x-47,316,10,87,2,'#dbcfaa');rounded(x+37,316,10,87,2,'#dbcfaa');for(let y of [316,392]){rounded(x-49,y,14,14,2,'#e1d9b7');rounded(x+35,y,14,14,2,'#e1d9b7');}}let seed=32;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<180;i++){let x=40+rand()*520,y=rand()*720;if(y>310&&y<410)continue;ctx.strokeStyle='#406e4155';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2,y-4);ctx.moveTo(x,y);ctx.lineTo(x+3,y-3);ctx.stroke();if(i%7===0){ctx.fillStyle=i%2?'#e9dfaa':'#d9b6a0';ctx.fillRect(x+2,y-2,2,2);}}for(let x of [55,545])for(let y of [80,220,490,650]){ctx.fillStyle='#315c42';ctx.beginPath();ctx.ellipse(x+3,y+8,18,10,0,0,7);ctx.fill();for(let j=0;j<3;j++){ctx.fillStyle=['#427147','#518052','#65905b'][j];ctx.beginPath();ctx.arc(x+(j-1)*7,y-j*4,12,0,7);ctx.fill();}}terrainCtx.drawImage(canvas,0,0);}
ground();
function render(t){ctx.clearRect(0,0,600,720);ctx.drawImage(terrain,0,0);let active=started&&!paused&&wasm.value(2,0)===0;if(selected>=0&&active){const spell=wasm.value(5,selected)===3;ctx.fillStyle='#cfe7b315';ctx.fillRect(34,spell?30:400,532,spell?660:290);ctx.strokeStyle='#e5f5bb77';ctx.setLineDash([6,8]);ctx.strokeRect(35,spell?31:400,530,spell?658:288);ctx.setLineDash([]);if(pointer){ctx.beginPath();ctx.arc(pointer.x,pointer.y,spell?90:25,0,7);ctx.fillStyle='#d9f5ab33';ctx.fill();ctx.strokeStyle='#e8f6c6';ctx.stroke();}}
for(let i=0;i<6;i++)tower([125,475,300,125,475,300][i],[590,590,660,130,130,60][i],wasm?wasm.value(4,i):[1800,1800,2800,1800,1800,2800][i],i%3===2?2800:1800,i>2,i%3===2);
if(wasm){let units=[];for(let i=0;i<wasm.value(3,0);i++)units.push(Array.from({length:6},(_,k)=>wasm.unit(i,k)));units.sort((a,b)=>a[1]-b[1]);for(let [x,y,hp,team,kind,cd]of units){let size=kind===2?62:43;ctx.fillStyle='#163d353f';ctx.beginPath();ctx.ellipse(x,y+9,size*.32,8,0,0,7);ctx.fill();ctx.fillStyle=team?'#d18e7e':'#9dcae1';ctx.beginPath();ctx.ellipse(x,y+8,size*.29,6,0,0,7);ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=2;ctx.stroke();let bob=Math.sin(t/110+x)*1.4;let im=sprites[team][kind];if(im.complete)ctx.drawImage(im,x-size/2,y-size+13+bob,size,size);rounded(x-17,y-size+7,34,5,2,'#294a3a');rounded(x-16,y-size+8,32*hp,3,1,team?'#e3a194':'#d1ee9b');if(cd>STATS_CD[kind]-.1){ctx.fillStyle='#fff2c5';ctx.beginPath();ctx.arc(x+15,y-12,3+Math.sin(t)*2,0,7);ctx.fill();}}
let flash=wasm.value(8,2);if(flash>0){let x=wasm.value(8,0),y=wasm.value(8,1);ctx.fillStyle=`rgba(248,181,83,${flash})`;ctx.beginPath();ctx.arc(x,y,90*(1-flash/.9),0,7);ctx.fill();ctx.fillStyle='#fff1c0';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('☄ 420',x,y-35-30*(1-flash/.9));ctx.strokeStyle='#ffe1a8';ctx.lineWidth=2;ctx.stroke();}}
}
const STATS_CD=[.9,1,1.4,1,.6,1.3,1.1,.8,1.1,1.3,.9,1.8];
function updateUI(){let e=wasm.value(0,0),time=Math.ceil(wasm.value(1,0));$('#timer').textContent=`${Math.floor(time/60)}:${String(time%60).padStart(2,'0')}`;$('#timer').style.color=time<=60?'#e7b8e7':'';$('#elixir-value').textContent=Math.floor(e);$('#elixir-fill').style.width=e*10+'%';$('#player-name').textContent=profile?.name||'Tu';$('#opponent-name').textContent=net.role?'Amico':'Il Guardiano';$('#opponent-mode').textContent=net.role?'Sfida online':'Avversario · CPU';$('#restart').textContent=net.role?'Lascia la sfida':'↻ Nuova battaglia';let hand=Array.from({length:4},(_,i)=>wasm.value(5,i)),key=hand.join(',')+selected;if(key!==lastHand){$('#deck').innerHTML=hand.map((k,i)=>`<button class="card ${selected===i?'selected':''}" data-slot="${i}" title="${cards[k][0]} · ${cards[k][1]} elisir" aria-pressed="${selected===i}"><span class="card-art">${art(k)}</span><span class="cost">${cards[k][1]}</span><span class="key">${i+1}</span><span class="card-name">${cards[k][0]}</span></button>`).join('');lastHand=key;}$('#deck').querySelectorAll('.card').forEach((el,i)=>el.classList.toggle('poor',e<cards[hand[i]][1]));$('#player-score').textContent=wasm.value(6,0);$('#enemy-score').textContent=wasm.value(6,1);$('#tower-stat').textContent=wasm.value(6,0)+' / 3';$('#kill-stat').textContent=wasm.value(7,0);if(started&&performance.now()>toastUntil&&selected<0)$('#message').textContent=time<=60?'Ultimo minuto · Elisir ×2':'Scegli una carta · Tasti 1–4';}
function showOverlay(title,desc,button,crown='♛',action='cpu'){overlayAction=action;const el=$('#overlay');el.style.display='flex';el.querySelector('h2').innerHTML=title;el.querySelector('p').textContent=desc;el.querySelector('.big-crown').textContent=crown;$('#start').innerHTML=button+' <span>→</span>';el.querySelector('small').textContent=action==='rematch'?'Rivincita con conferma di entrambi':action==='home'?'Sfida online interrotta':net.role?'Sfida online':'Partita singola · Contro il computer';}
function begin(){prevResult=0;if(net.role){leaveOnline();}wasm=engine;wasm.reset();configureDeck(0,savedDeck);started=true;paused=false;selected=-1;lastHand='';$('#pause').textContent='Ⅱ';$('#overlay').style.display='none';toast('La battaglia inizia! Scegli una carta.');beep(660);}
function togglePause(){if(net.role){toast('La partita online non può essere messa in pausa.');return;}if(!started||wasm.value(2,0))return;paused=!paused;$('#pause').textContent=paused?'▶':'Ⅱ';if(paused)showOverlay('Prenditi un respiro.','La tua battaglia ti aspetta.','Riprendi');else $('#overlay').style.display='none';}
$('#start').onclick=()=>{if(!wasm)return;if(overlayAction==='home'){returnHome();return;}if(overlayAction==='rematch'){requestRematch();return;}if(paused){togglePause();return;}begin();};$('#pause').onclick=togglePause;$('#restart').onclick=()=>{if(!wasm)return;if(net.role){returnHome();return;}if(started&&!wasm.value(2,0)){paused=true;showOverlay('Un nuovo inizio?','Premi il pulsante per ricominciare la battaglia.','Ricomincia');paused=false;started=false;}else begin();};$('#deck').onclick=e=>{const el=e.target.closest('[data-slot]');if(el)select(+el.dataset.slot);};
function pos(e){let r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*600,y:(e.clientY-r.top)/r.height*720};}canvas.addEventListener('pointermove',e=>pointer=pos(e));canvas.addEventListener('pointerleave',()=>pointer=null);canvas.addEventListener('pointerdown',e=>{if(!started||paused||selected<0||wasm.value(2,0))return;let p=pos(e),spell=wasm.value(5,selected)===3;if(net.role==='guest'){send({type:'play',slot:selected,x:p.x,y:720-p.y});selected=-1;lastHand='';return;}let r=wasm.play(selected,p.x,p.y);if(r===1){selected=-1;lastHand='';beep(520);toast(spell?'Palla di fuoco! 420 danni ad area · 200 alle torri':'Truppa schierata!');}else if(r===-1)toast('Serve più elisir. Aspetta un momento.');else toast('Schiera le truppe nella tua metà dell’arena.');});
document.addEventListener('keydown',e=>{if($('#instructions').open)return;if(e.code==='Space'){e.preventDefault();togglePause();}if('1234'.includes(e.key))select(+e.key-1);});$('#sound').onclick=()=>{sound=!sound;$('#sound').style.color=sound?'#d4ed8a':'';$('#sound').title=sound?'Disattiva audio':'Attiva audio';$('#sound').setAttribute('aria-label',$('#sound').title);beep();};$('#help').onclick=()=>{if(started&&!paused&&!wasm.value(2,0))togglePause();$('#instructions').showModal();};$('#close-help').onclick=$('#got-it').onclick=()=>$('#instructions').close();document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused&&wasm.value(2,0)===0)togglePause();});
function showMatchResult(result){showOverlay(result===1?'La corona è tua.':result===2?'Il regno resisterà.':'Degni avversari.',result===1?'Vittoria! Hai conquistato l’arena.':result===2?'Sconfitta. Cambia strategia e riprova.':'Pareggio. È tempo di una rivincita.',net.role?'Rivincita':'Gioca ancora',result===2?'♜':'♛',net.role?'rematch':'cpu');}
let prevResult=0;function frame(t){let dt=last?Math.min((t-last)/1000,.1):0;last=t;if(started&&!paused&&!net.suspended&&net.role!=='guest')wasm.tick(dt);const result=wasm.value(2,0);if(result&&result!==prevResult){recordResult(result);showMatchResult(result);selected=-1;beep(result===1?880:220);}prevResult=result;render(t);updateUI();syncOnline(t);requestAnimationFrame(frame);}
let engine;
function readLocal(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function saveLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('Salvataggio locale non disponibile in questo browser.');return false;}}
const validDeck=d=>Array.isArray(d)&&d.length===8&&new Set(d).size===8&&d.every(k=>Number.isInteger(k)&&k>=0&&k<cards.length);
let savedDeck=readLocal('cr-deck-v2',null);if(!validDeck(savedDeck))savedDeck=[0,1,2,3,4,5,6,7];
let profile=readLocal('cr-profile-v2',null);if(!profile||typeof profile.name!=='string')profile=null;
let draft=[];const descriptions=['Resistente, attacco ravvicinato','Due tiratrici a distanza','Punta soltanto alle torri','420 danni ad area, 200 alle torri','Tre truppe veloci','Attacco a lunga distanza','Guerriera resistente','Due combattenti veloci','Due lancieri economici','Alti danni corpo a corpo','Tiratore equilibrato','Lento, molto resistente, punta alle torri'];
function configureDeck(team,deck){deck.forEach((k,i)=>engine.set_card(team,i,k));}
function showDeck(){draft=[...savedDeck];drawDeck();$('#deck-editor').showModal();}
function drawDeck(){$('#deck-count').textContent=`${draft.length} / 8 carte · Media ${(draft.reduce((a,k)=>a+cards[k][1],0)/(draft.length||1)).toFixed(1)} elisir`;$('#deck-options').innerHTML=cards.map((c,k)=>`<button class="deck-option ${draft.includes(k)?'chosen':''}" data-card="${k}" aria-pressed="${draft.includes(k)}">${art(k)}<b>${c[0]} · ${c[1]} ♦</b><small>${descriptions[k]}</small><span>${draft.includes(k)?'✓ '+(draft.indexOf(k)+1):'Aggiungi'}</span></button>`).join('');$('#save-deck').disabled=draft.length!==8;}
$('#open-deck').onclick=showDeck;$('#deck-options').onclick=e=>{let el=e.target.closest('[data-card]');if(!el)return;let k=+el.dataset.card;if(draft.includes(k))draft=draft.filter(v=>v!==k);else if(draft.length<8)draft.push(k);else{$('#deck-feedback').textContent='Rimuovi una carta per aggiungerne un’altra.';return;}$('#deck-feedback').textContent='';drawDeck();};
$('#save-deck').onclick=()=>{if(!validDeck(draft))return;savedDeck=[...draft];$('#deck-average-value').textContent='♦ '+(savedDeck.reduce((a,k)=>a+cards[k][1],0)/8).toFixed(1);saveLocal('cr-deck-v2',savedDeck);$('#deck-editor').close();toast('Mazzo salvato: sarà usato nella prossima battaglia.');};
function recordResult(result){if(!profile)return;profile.games=(profile.games||0)+1;if(result===1)profile.wins=(profile.wins||0)+1;saveLocal('cr-profile-v2',profile);}
$('#open-profile').onclick=()=>{$('#profile-name').value=profile?.name||'';$('#profile-stats').textContent=profile?`${profile.games||0} partite · ${profile.wins||0} vittorie`:'Stai giocando come ospite.';$('#profile-editor').showModal();};
$('#save-profile').onclick=()=>{let name=$('#profile-name').value.trim();profile=name?{name,games:profile?.games||0,wins:profile?.wins||0}:null;saveLocal('cr-profile-v2',profile);$('#profile-editor').close();toast('Profilo aggiornato.');};$('#clear-profile').onclick=()=>{profile=null;saveLocal('cr-profile-v2',null);$('#profile-editor').close();};
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
const net={role:null,peer:null,conn:null,snapshot:null,ready:false,suspended:false,generation:0,retryTimer:null,joinTimer:null,recoveryTimer:null,target:null,guestId:null,remoteDeck:null,rematchLocal:false,rematchRemote:false};
function onlineStatus(text){$('#online-status').textContent=text;}
function clearNetTimer(key){if(net[key]!==null){clearTimeout(net[key]);net[key]=null;}}
function later(key,ms,callback){clearNetTimer(key);const generation=net.generation;net[key]=setTimeout(()=>{net[key]=null;if(net.role&&net.generation===generation)callback();},ms);}
function leaveOnline(notify=true){const conn=net.conn,peer=net.peer;
  if(notify&&conn?.open){try{conn.send({type:'leave'});}catch{}}
  net.generation++;net.role=null;net.ready=false;net.suspended=false;net.conn=null;net.peer=null;net.target=null;net.guestId=null;net.remoteDeck=null;net.rematchLocal=false;net.rematchRemote=false;
  for(const key of ['retryTimer','joinTimer','recoveryTimer'])clearNetTimer(key);
  // Give the reliable data channel time to deliver the explicit departure.
  if(notify&&conn?.open)setTimeout(()=>{conn.close();peer?.destroy();},150);else{conn?.close();peer?.destroy();}
  wasm=engine;$('#invite-link').value='';onlineStatus('Stanza chiusa.');
}
function returnHome(){leaveOnline();engine.reset();configureDeck(0,savedDeck);wasm=engine;started=false;paused=false;selected=-1;prevResult=0;lastHand='';$('#online-dialog').close();$('#pause').textContent='Ⅱ';showOverlay('La tua arena.','Scegli una nuova sfida online oppure entra in battaglia contro il computer.','Entra in battaglia');}
function onlineFailure(message){leaveOnline(false);started=false;paused=false;selected=-1;prevResult=0;engine.reset();configureDeck(0,savedDeck);$('#online-dialog').close();showOverlay('Sfida terminata',message,'Torna indietro','♜','home');onlineStatus(message);}
function requestRematch(){
  if(!net.role||!net.conn?.open||net.suspended){onlineFailure('L’altro giocatore non è più collegato. Torna indietro per scegliere una nuova sfida.');return;}
  if(!net.ready||!wasm.value(2,0))return;
  net.rematchLocal=true;send({type:'rematch',deck:savedDeck});
  if(net.role==='host'&&net.rematchRemote){startOnline(net.remoteDeck);return;}
  showOverlay('Rivincita richiesta','In attesa che l’amico accetti. Puoi lasciare la stanza dal pulsante Sfida un amico.','In attesa dell’amico…','♛','rematch');
}
function receiveRematch(data){
  if(!net.ready||!wasm.value(2,0)||!validDeck(data.deck))return;
  net.remoteDeck=[...data.deck];net.rematchRemote=true;
  if(net.role==='host'&&net.rematchLocal){startOnline(net.remoteDeck);return;}
  if(!net.rematchLocal)showOverlay('Un’altra sfida?','L’amico ha chiesto una rivincita. Accettate entrambi per ricominciare insieme.','Accetta rivincita','♛','rematch');
}
function armRecovery(){if(net.recoveryTimer!==null)return;later('recoveryTimer',90000,()=>onlineFailure('Riconnessione non riuscita. Riapri la sfida e prova con un nuovo invito.'));}
function recoverOnline(){if(!net.role||!net.peer||net.peer.destroyed)return;if(net.peer.disconnected){if(net.retryTimer===null)later('retryTimer',1500,()=>{try{if(net.peer?.disconnected&&!net.peer.destroyed)net.peer.reconnect();}catch{recoverOnline();}});return;}if(net.role==='guest'&&net.peer.open&&!net.conn){later('retryTimer',1500,connectGuest);}}
function connectionLost(conn){if(net.conn!==conn)return;net.conn=null;if(net.ready){net.suspended=true;selected=-1;showOverlay('Amico disconnesso','L’amico ha perso il collegamento o ha chiuso la pagina. Provo a riconnetterlo; puoi tornare indietro.','Torna indietro','♜','home');armRecovery();}onlineStatus(net.role==='host'?'In attesa della riconnessione dell’amico…':'Riconnessione alla stanza…');recoverOnline();}
function send(data){if(!net.conn?.open)return;try{net.conn.send(data);}catch{const conn=net.conn;connectionLost(conn);conn?.close();}}
function snapshot(){return {v:[Array.from({length:1},()=>engine.value(11,0)),[engine.value(1,0)],[engine.value(2,0)===1?2:engine.value(2,0)===2?1:engine.value(2,0)],[engine.value(3,0)],Array.from({length:6},(_,i)=>engine.value(4,(i+3)%6)),Array.from({length:4},(_,i)=>engine.value(10,i)),[engine.value(6,1),engine.value(6,0)],[engine.value(7,1),engine.value(7,0)],[engine.value(8,0),720-engine.value(8,1),engine.value(8,2)]],u:Array.from({length:engine.value(3,0)},(_,i)=>[engine.unit(i,0),720-engine.unit(i,1),engine.unit(i,2),1-engine.unit(i,3),engine.unit(i,4),engine.unit(i,5)])};}
function startOnline(deck){net.remoteDeck=[...deck];net.rematchLocal=false;net.rematchRemote=false;net.suspended=false;engine.reset();configureDeck(0,savedDeck);configureDeck(1,deck);engine.multiplayer(1);wasm=engine;started=true;paused=false;selected=-1;prevResult=0;lastHand='';net.ready=true;$('#overlay').style.display='none';$('#online-dialog').close();toast('Duel online iniziato!');send({type:'start',snapshot:snapshot()});}
function bindConnection(conn){
  net.conn=conn;const generation=net.generation;const current=()=>net.generation===generation&&net.conn===conn;
  const opened=()=>{if(!current())return;clearNetTimer('joinTimer');onlineStatus('Collegato. Preparazione battaglia…');if(net.role==='guest')send({type:'hello',version:2,deck:savedDeck});};
  conn.on('open',opened);
  conn.on('data',data=>{
    if(!current()||!data||typeof data!=='object')return;
    if(data.type==='leave'){onlineFailure('L’amico ha lasciato la sfida. Torna indietro per scegliere una nuova partita.');return;}
    if(data.type==='rematch'){receiveRematch(data);return;}
    if(net.role==='host'){
      if(data.type==='hello'&&validDeck(data.deck)){
        clearNetTimer('recoveryTimer');net.suspended=false;
        if(net.ready){if(engine.value(2,0))showMatchResult(engine.value(2,0));else $('#overlay').style.display='none';}
        if(!net.ready)startOnline(data.deck);else send({type:'start',snapshot:snapshot()});
      }
      if(data.type==='play'&&net.ready&&Number.isInteger(data.slot)&&data.slot>=0&&data.slot<4&&Number.isFinite(data.x)&&Number.isFinite(data.y)){let r=engine.enemy_play(data.slot,data.x,data.y);send({type:'played',result:r});}
    }else{
      if(data.type==='start'||data.type==='state'){
        if(!data.snapshot?.v||!data.snapshot?.u)return;
        net.snapshot=data.snapshot;
        if(data.type==='start'){
          clearNetTimer('recoveryTimer');net.suspended=false;net.rematchLocal=false;net.rematchRemote=false;
          wasm={value:(k,i)=>net.snapshot?.v[k]?.[i]??0,unit:(i,k)=>net.snapshot?.u[i]?.[k]??0};
          started=true;paused=false;selected=-1;if(!net.ready)prevResult=0;lastHand='';net.ready=true;
          $('#overlay').style.display='none';if(wasm.value(2,0))showMatchResult(wasm.value(2,0));$('#online-dialog').close();onlineStatus('Sfida collegata.');
        }
      }
      if(data.type==='played'&&data.result!==1)toast(data.result===-1?'Serve più elisir.':'Posizione non valida.');
    }
  });
  conn.on('close',()=>{if(current())connectionLost(conn);});
  conn.on('error',()=>{if(current()){connectionLost(conn);conn.close();}});
  if(conn.open)opened();
}
function connectGuest(){
  if(net.role!=='guest'||net.conn||!net.peer?.open)return;
  onlineStatus('Collegamento all’amico…');
  try{const conn=net.peer.connect(net.target,{reliable:true,serialization:'json'});bindConnection(conn);
    later('joinTimer',20000,()=>{if(net.conn===conn&&!conn.open){connectionLost(conn);conn.close();}});
  }catch{recoverOnline();}
}
async function openPeer(role,id){
  if(!engine){onlineStatus('Attendi il caricamento del motore.');return;}
  if(!window.Peer){onlineStatus('Servizio multiplayer non caricato. Ricarica la pagina.');return;}
  leaveOnline();started=false;paused=true;net.role=role;net.target=id;
  // Keep PeerJS defaults: they include STUN AND the provider's TURN relays.
  const peer=net.peer=new window.Peer();const generation=net.generation;
  const current=()=>net.generation===generation&&net.peer===peer;
  onlineStatus('Collegamento al servizio inviti…');
  if(role==='guest')armRecovery();
  peer.on('error',err=>{
    if(!current())return;
    if(['network','socket-error','socket-closed','disconnected','peer-unavailable','webrtc'].includes(err.type)){
      onlineStatus(err.type==='peer-unavailable'?'L’host non è raggiungibile. Attendo che torni alla pagina…':'Rete momentaneamente interrotta: riconnessione in corso…');
      if(net.role==='guest'&&!net.conn?.open){const old=net.conn;net.conn=null;old?.close();armRecovery();}
      later('retryTimer',2000,()=>{if(peer.disconnected)recoverOnline();else if(net.role==='guest')connectGuest();});return;
    }
    onlineFailure('Collegamento non riuscito: '+(err.type||'errore sconosciuto')+'. Crea un nuovo invito.');
  });
  peer.on('disconnected',()=>{if(current()){onlineStatus('Riconnessione al servizio inviti…');recoverOnline();}});
  peer.on('open',peerId=>{
    if(!current())return;clearNetTimer('retryTimer');
    if(role==='host'){
      const url=new URL(location.href);url.hash='duel='+encodeURIComponent(peerId);$('#invite-link').value=url.href;
      onlineStatus(net.ready?'Servizio inviti ricollegato.':'Invito pronto: copialo o condividilo. La stanza resta aperta in attesa.');
    }else connectGuest();
  });
  peer.on('connection',conn=>{
    if(!current()||role!=='host'||(net.guestId&&net.guestId!==conn.peer)||net.conn?.open){conn.close();return;}
    net.guestId=conn.peer;const old=net.conn;net.conn=null;old?.close();bindConnection(conn);
  });
}
let lastNetwork=0;function syncOnline(t){if(net.role==='host'&&net.ready&&!net.suspended&&t-lastNetwork>50){lastNetwork=t;send({type:'state',snapshot:snapshot()});}}
function resumeOnline(){if(net.role){recoverOnline();if(net.role==='guest'&&!net.conn?.open)armRecovery();}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeOnline();});
window.addEventListener('pagehide',()=>{if(net.conn?.open)send({type:'leave'});});
window.addEventListener('pageshow',resumeOnline);window.addEventListener('online',resumeOnline);
$('#open-online').onclick=()=>$('#online-dialog').showModal();$('#create-room').onclick=()=>openPeer('host');$('#leave-room').onclick=returnHome;async function copyInvite(){const url=$('#invite-link').value;if(!url){onlineStatus('Crea prima un invito.');return;}try{await navigator.clipboard.writeText(url);onlineStatus('Link copiato. Puoi inviarlo all’amico.');}catch{$('#invite-link').select();onlineStatus('Seleziona e copia il link dal campo invito.');}}
$('#copy-room').onclick=copyInvite;
$('#share-room').onclick=async()=>{const url=$('#invite-link').value;if(!url){onlineStatus('Crea prima un invito.');return;}try{if(navigator.share)await navigator.share({title:'Crown Rush: sfidami!',url});else await copyInvite();}catch(err){if(err.name!=='AbortError')onlineStatus('Usa Copia link per inviare l’invito.');}finally{resumeOnline();}};

const invite=new URLSearchParams(location.hash.slice(1)).get('duel');if(invite&&/^[a-zA-Z0-9_-]{1,100}$/.test(invite)){$('#join-room').hidden=false;$('#join-room').onclick=()=>openPeer('guest',invite);onlineStatus('Hai ricevuto un invito! Scegli il mazzo, poi entra nella sfida.');$('#online-dialog').showModal();}

try{const response=await fetch('./crown_rush.wasm');if(!response.ok)throw new Error('WASM '+response.status);const module=await WebAssembly.instantiate(await response.arrayBuffer(),{});engine=module.instance.exports;wasm=engine;wasm.reset();configureDeck(0,savedDeck);requestAnimationFrame(frame);}catch(err){showOverlay('Caricamento fallito.','Ricarica la pagina per riprovare.','Ricarica','↻');$('#start').onclick=()=>location.reload();console.error(err);}
