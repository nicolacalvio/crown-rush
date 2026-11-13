import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const noop=()=>{};const context=new Proxy({},{get:(_,k)=>k==='measureText'?()=>({width:0}):noop,set:()=>true});
const elements=new Map();let frame;
function element(key){if(!elements.has(key))elements.set(key,{style:{},classList:{toggle:noop},textContent:'',innerHTML:'',addEventListener:noop,setAttribute:noop,getContext:()=>context,querySelector:s=>element(key+' '+s),querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:600,height:720}),showModal:noop,close:noop});return elements.get(key);}
let listeners={};element('#arena').addEventListener=(n,f)=>listeners[n]=f;
const bytes=await fs.readFile(new URL('../dist/crown_rush.wasm',import.meta.url));
const sandbox={console,Math,WebAssembly,performance,Image:class{complete=true},requestAnimationFrame:f=>frame=f,document:{querySelector:element,querySelectorAll:()=>[],createElement:()=>element('terrain'),addEventListener:noop},fetch:async()=>({ok:true,arrayBuffer:async()=>bytes}),localStorage:{getItem:()=>null,setItem:noop},window:{addEventListener:noop},URL,URLSearchParams,navigator:{},setTimeout:()=>0,clearTimeout:noop,location:{reload:noop,href:"https://example.test/",hash:""},AudioContext:class{}};
const mod=new vm.SourceTextModule((await fs.readFile(new URL('../dist/game.js',import.meta.url),'utf8'))+'\nexport {snapshot,engine,net,configureDeck,validDeck,bindConnection,syncOnline,select,openPeer,leaveOnline,resumeOnline};',{context:vm.createContext(sandbox)});await mod.link(noop);await mod.evaluate();assert.equal(typeof frame,'function');frame(100);assert.equal(element('#timer').textContent,'3:00');element('#start').onclick();frame(120);assert.equal(element('#overlay').style.display,'none');
element('#deck').onclick({target:{closest:()=>({dataset:{slot:'0'}})}});listeners.pointerdown({clientX:125,clientY:500});frame(140);assert.equal(element('#elixir-value').textContent,2);element('#pause').onclick();assert.equal(element('#overlay').style.display,'flex');element('#start').onclick();for(let t=240;t<190000;t+=100)frame(t);assert.equal(element('#overlay').style.display,'flex');assert.match(element('#overlay h2').innerHTML,/corona|regno|avversari/);console.log('PASS: real WASM loading, UI startup, card deployment, elixir, pause/resume, complete match and results.');

const n=mod.namespace;
assert.equal(n.validDeck([0,1,2,3,4,5,6,7]),true);
assert.equal(n.validDeck([0,0,2,3,4,5,6,7]),false);
assert.equal(n.validDeck([0,1,2,3,4,5,6,12]),false);
n.engine.reset();n.configureDeck(0,[3,8,9,10,11,0,1,2]);n.configureDeck(1,[3,11,10,9,8,2,1,0]);n.engine.multiplayer(1);
assert.equal(n.engine.value(5,0),3);
assert.equal(n.engine.enemy_play(0,125,640),1);
assert.equal(n.engine.value(4,0),1600);
const view=n.snapshot();
assert.equal(view.v[4][3],1600);
assert.equal(view.v[5][0],8);
assert.equal(view.v[0][0],1);
assert.equal(view.v[8][1],80);
assert.equal(n.engine.play(0,125,80),1);
assert.equal(n.engine.value(4,3),1600);
assert.equal(n.engine.value(5,0),11);
console.log('PASS: custom decks, mirrored guest hand, elixir, towers, spell targeting and authoritative enemy commands.');

// Exercise the actual host/guest message handlers with two separate WASM instances.
const guest=new vm.SourceTextModule((await fs.readFile(new URL('../dist/game.js',import.meta.url),'utf8'))+'\nexport {net,bindConnection,engine,select};',{context:vm.createContext(sandbox)});
await guest.link(noop);await guest.evaluate();
const g=guest.namespace;
class Wire{constructor(){this.handlers={};this.open=true;this.messages=[];}on(k,f){this.handlers[k]=f;}send(data){this.messages.push(structuredClone(data));}close(){this.open=false;}}
let hostWire=new Wire(),guestWire=new Wire();
n.net.role='host';n.net.ready=false;g.net.role='guest';n.bindConnection(hostWire);g.bindConnection(guestWire);
hostWire.handlers.data({type:'hello',deck:[0,1,2,3,8,9,10,11]});
let startMessage=hostWire.messages.at(-1);assert.equal(startMessage.type,'start');guestWire.handlers.data(startMessage);assert.equal(g.net.ready,true);
g.select(0);listeners.pointerdown({clientX:125,clientY:500});
let command=guestWire.messages.at(-1);assert.equal(command.type,'play');assert.equal(command.y,220);hostWire.handlers.data(command);
assert.equal(n.engine.value(3,0),1);assert.equal(n.engine.unit(0,3),1);
n.syncOnline(500);guestWire.handlers.data(hostWire.messages.at(-1));assert.equal(g.net.snapshot.u[0][1],500);assert.equal(g.net.snapshot.u[0][3],0);assert.equal(g.net.snapshot.v[0][0],2);
console.log('PASS: two WASM instances, invitation handshake, guest input routing and host snapshot synchronization.');

// Reproduce phone sharing/signaling suspension and make timers deterministic.
const tasks=new Map();let timerId=0;
sandbox.setTimeout=(fn,ms)=>{const id=++timerId;tasks.set(id,{fn,ms});return id;};
sandbox.clearTimeout=id=>tasks.delete(id);
function runTimers(){const pending=[...tasks.values()];tasks.clear();for(const task of pending)task.fn();}
const created=[];
class FakePeer{
  constructor(...args){this.args=args;this.handlers={};this.open=false;this.disconnected=false;this.destroyed=false;this.reconnects=0;created.push(this);}
  on(event,fn){this.handlers[event]=fn;}
  emit(event,data){this.handlers[event]?.(data);}
  reconnect(){this.reconnects++;this.disconnected=false;}
  destroy(){this.destroyed=true;}
  connect(id){this.lastTarget=id;const c=new Wire();c.open=false;c.peer=id;this.lastConnection=c;return c;}
}
sandbox.window.Peer=FakePeer;
sandbox.navigator.share=async()=>{const p=created.at(-1);p.disconnected=true;p.open=false;p.emit('error',{type:'network'});p.emit('disconnected');};
const recovery=new vm.SourceTextModule((await fs.readFile(new URL('../dist/game.js',import.meta.url),'utf8'))+'\nexport {net,openPeer,leaveOnline,resumeOnline,engine,started,paused,wasm,frame,requestRematch,returnHome};',{context:vm.createContext(sandbox)});
await recovery.link(noop);await recovery.evaluate();const r=recovery.namespace;
await r.openPeer('host');const host=created.at(-1);host.open=true;host.emit('open','stable-invite');
assert.equal(host.args.length,0,'Preserve built-in TURN instead of replacing ICE configuration');
assert.equal(tasks.size,0,'Waiting host must not expire after two minutes');
const inviteBefore=element('#invite-link').value;assert.match(inviteBefore,/#duel=stable-invite/);
await element('#share-room').onclick();assert.equal(r.net.role,'host');assert.equal(host.destroyed,false);runTimers();runTimers();assert.equal(host.reconnects,1);
host.open=true;host.emit('open','stable-invite');assert.equal(element('#invite-link').value,inviteBefore);
// Old session callbacks/timers cannot close a newly created room.
await r.openPeer('host');const next=created.at(-1);host.emit('error',{type:'network'});assert.equal(r.net.peer,next);assert.equal(tasks.size,0);
next.open=true;next.emit('open','replacement');const first=new Wire();first.peer='friend';next.emit('connection',first);
first.handlers.data({type:'hello',deck:[0,1,2,3,4,5,6,7]});assert.equal(r.net.ready,true);
r.engine.tick(.1);const remaining=r.engine.value(1,0);first.handlers.close();assert.equal(r.net.suspended,true);assert.equal(r.net.role,'host');
const returning=new Wire();returning.peer='friend';next.emit('connection',returning);returning.handlers.data({type:'hello',deck:[0,1,2,3,4,5,6,7]});assert.equal(r.net.suspended,false);assert.equal(returning.messages.at(-1).type,'start');assert.equal(returning.messages.at(-1).snapshot.v[1][0],remaining,'Rejoining must not reset the battle clock');assert.equal(tasks.size,0);
first.handlers.close();assert.equal(r.net.conn,returning,'Late close events from old data channels must be ignored');
r.leaveOnline();runTimers();assert.equal(tasks.size,0);
await r.openPeer('guest','temporarily-offline-host');const retrying=created.at(-1);retrying.open=true;retrying.emit('open','guest-id');retrying.emit('error',{type:'peer-unavailable'});assert.equal(r.net.role,'guest');assert.equal(retrying.destroyed,false);assert.ok(tasks.size>0);r.leaveOnline();runTimers();assert.equal(r.net.role,null);
console.log('PASS: phone share-sheet suspension, stable invitation, signaling reconnect, TURN defaults, unlimited lobby wait, guest retry, resumed match and stale callbacks.');


// A finished online round requires both players to accept a rematch.
await r.openPeer('host');const rematchPeer=created.at(-1);rematchPeer.open=true;rematchPeer.emit('open','rematch-host');
const opponent=new Wire();opponent.peer='opponent';rematchPeer.emit('connection',opponent);opponent.handlers.data({type:'hello',deck:[0,1,2,3,4,5,6,7]});
for(let i=0;i<1900;i++)r.engine.tick(.1);
r.frame(200000);assert.match(element('#start').innerHTML,/Rivincita/);assert.ok(r.engine.value(2,0)>0);
element('#start').onclick();assert.equal(r.net.role,'host');assert.equal(opponent.messages.at(-1).type,'rematch');assert.ok(r.engine.value(2,0)>0,'Requesting alone must not restart or switch to CPU');
opponent.handlers.data({type:'rematch',deck:[0,1,2,3,8,9,10,11]});assert.equal(r.engine.value(2,0),0);assert.equal(r.engine.value(1,0),180);assert.equal(opponent.messages.at(-1).type,'start');assert.equal(r.net.role,'host');
// Explicit departure immediately stops the match and only offers navigation home.
opponent.handlers.data({type:'leave'});assert.equal(r.net.role,null);assert.equal(r.started,false);assert.match(element('#overlay p').textContent,/ha lasciato/);assert.match(element('#start').innerHTML,/Torna indietro/);
element('#start').onclick();assert.equal(r.started,false);r.frame(200100);r.frame(200200);assert.equal(r.engine.value(1,0),180,'Back navigation must not start CPU simulation');
// Leaving locally announces the departure and returns to the idle screen.
await r.openPeer('host');const leavingPeer=created.at(-1);leavingPeer.open=true;leavingPeer.emit('open','leaving-host');const leavingWire=new Wire();leavingWire.peer='friend';leavingPeer.emit('connection',leavingWire);leavingWire.handlers.data({type:'hello',deck:[0,1,2,3,4,5,6,7]});element('#leave-room').onclick();assert.equal(leavingWire.messages.at(-1).type,'leave');assert.equal(r.started,false);assert.equal(r.net.role,null);runTimers();assert.equal(tasks.size,0);
console.log('PASS: mutual online rematch, explicit opponent departure, idle back navigation and leave notification without CPU fallback.');
