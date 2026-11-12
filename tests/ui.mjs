import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const noop=()=>{};const context=new Proxy({},{get:(_,k)=>k==='measureText'?()=>({width:0}):noop,set:()=>true});
const elements=new Map();let frame;
function element(key){if(!elements.has(key))elements.set(key,{style:{},classList:{toggle:noop},textContent:'',innerHTML:'',addEventListener:noop,setAttribute:noop,getContext:()=>context,querySelector:s=>element(key+' '+s),querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:600,height:720}),showModal:noop,close:noop});return elements.get(key);}
let listeners={};element('#arena').addEventListener=(n,f)=>listeners[n]=f;
const bytes=await fs.readFile(new URL('../dist/crown_rush.wasm',import.meta.url));
const sandbox={console,Math,WebAssembly,performance,Image:class{complete=true},requestAnimationFrame:f=>frame=f,document:{querySelector:element,querySelectorAll:()=>[],createElement:()=>element('terrain'),addEventListener:noop},fetch:async()=>({ok:true,arrayBuffer:async()=>bytes}),localStorage:{getItem:()=>null,setItem:noop},window:{},URL,URLSearchParams,navigator:{},setTimeout:()=>0,clearTimeout:noop,location:{reload:noop,href:"https://example.test/",hash:""},AudioContext:class{}};
const mod=new vm.SourceTextModule((await fs.readFile(new URL('../dist/game.js',import.meta.url),'utf8'))+'\nexport {snapshot,engine,net,configureDeck,validDeck,bindConnection,syncOnline,select};',{context:vm.createContext(sandbox)});await mod.link(noop);await mod.evaluate();assert.equal(typeof frame,'function');frame(100);assert.equal(element('#timer').textContent,'3:00');element('#start').onclick();frame(120);assert.equal(element('#overlay').style.display,'none');
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
