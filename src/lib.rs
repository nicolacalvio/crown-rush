//! Deterministic battle simulation. Coordinates use a 600 x 720 arena.
#[derive(Clone)]
struct Unit { x:f32,y:f32,hp:f32,max:f32,team:usize,kind:usize,cd:f32 }
struct Game { units:Vec<Unit>, towers:[f32;6], tower_cd:[f32;6], elixir:f32, bot_elixir:f32, time:f32, bot_cd:f32, seed:u32, hand:[usize;4], queue:Vec<usize>, result:i32, kills:[u32;2], flash:[f32;3] }
const TX:[f32;6]=[125.,475.,300.,125.,475.,300.];
const TY:[f32;6]=[590.,590.,660.,130.,130.,60.];
const COST:[f32;8]=[3.,3.,5.,4.,2.,4.,4.,3.];
// hp, damage, speed, range, attack interval, spawn count
const STATS:[[f32;6];8]=[[650.,85.,47.,25.,0.9,1.],[220.,55.,42.,125.,1.,2.],[1700.,115.,27.,30.,1.4,1.],[1.,220.,0.,85.,1.,0.],[130.,38.,70.,22.,0.6,3.],[420.,105.,38.,145.,1.3,1.],[680.,120.,43.,27.,1.1,1.],[320.,75.,65.,26.,0.8,2.]];
impl Game {
 fn new()->Self { Self { units:vec![],towers:[1800.,1800.,2800.,1800.,1800.,2800.],tower_cd:[0.;6],elixir:5.,bot_elixir:5.,time:180.,bot_cd:3.,seed:1234567,hand:[0,1,2,3],queue:vec![4,5,6,7],result:0,kills:[0;2],flash:[-1.,-1.,0.] } }
 fn spawn(&mut self,kind:usize,team:usize,x:f32,y:f32){
  if kind==3 { for u in &mut self.units {if u.team!=team && (u.x-x).hypot(u.y-y)<90. {u.hp-=260.;}} for i in 0..6 {if i/3!=team && (TX[i]-x).hypot(TY[i]-y)<100. {self.towers[i]=(self.towers[i]-180.).max(0.);}} self.flash=[x,y,0.5]; return; }
  let s=STATS[kind];for n in 0..s[5] as usize {self.units.push(Unit{x:(x+(n as f32-(s[5]-1.)/2.)*22.).clamp(35.,565.),y,hp:s[0],max:s[0],team,kind,cd:0.4});}
 }
 fn play(&mut self,slot:usize,x:f32,y:f32)->i32 {
  if slot>3 || self.result!=0 || !(25. ..=575.).contains(&x) || !(25. ..=695.).contains(&y) {return 0;}
  let k=self.hand[slot]; if self.elixir<COST[k] {return -1;} if k!=3 && y<395. {return -2;}
  self.elixir-=COST[k];self.spawn(k,0,x,y);self.hand[slot]=self.queue.remove(0);self.queue.push(k);1
 }
 fn tick(&mut self,dt:f32){
  if self.result!=0 {return;} let dt=dt.clamp(0.,0.1); self.time=(self.time-dt).max(0.);let rate=if self.time<=60. {0.72}else{0.36};self.elixir=(self.elixir+dt*rate).min(10.);self.bot_elixir=(self.bot_elixir+dt*rate).min(10.);self.flash[2]=(self.flash[2]-dt).max(0.);
  self.bot_cd-=dt;if self.bot_cd<=0. {self.seed=self.seed.wrapping_mul(1664525).wrapping_add(1013904223);let k=[0,1,2,4,5,6,7][(self.seed as usize>>8)%7];if self.bot_elixir>=COST[k]{self.bot_elixir-=COST[k];let x=if self.seed%2==0{125.}else{475.};self.spawn(k,1,x,200.);self.bot_cd=2.8;}else{self.bot_cd=0.7;}}
  for i in 0..6 {self.tower_cd[i]-=dt;if self.towers[i]<=0. {continue;} let mut nearest=None;let mut distance=190.;for (j,u) in self.units.iter().enumerate(){let d=(u.x-TX[i]).hypot(u.y-TY[i]);if u.hp>0. && u.team!=i/3 && d<distance {distance=d;nearest=Some(j);}}if self.tower_cd[i]<=0. {if let Some(j)=nearest{self.units[j].hp-=75.;self.tower_cd[i]=0.85;}}}
  for i in 0..self.units.len() {if self.units[i].hp<=0. {continue;}self.units[i].cd-=dt;let u=self.units[i].clone();let s=STATS[u.kind];let mut target=None;let mut dmin=155.;
   for (j,v) in self.units.iter().enumerate(){if v.team!=u.team && v.hp>0. && u.kind!=2 {let d=(v.x-u.x).hypot(v.y-u.y);if d<dmin {dmin=d;target=Some(j);}}}
   let mut ti=if u.x<300. {3}else{4};if u.team==1{ti-=3;}if self.towers[ti]<=0. {ti=if u.team==0{5}else{2};}
   let (mut gx,mut gy,range)=if let Some(j)=target {(self.units[j].x,self.units[j].y,s[3])}else{(TX[ti],TY[ti],s[3]+25.)};let d=(gx-u.x).hypot(gy-u.y);
   if d<=range {if u.cd<=0. {if let Some(j)=target {self.units[j].hp-=s[1];}else{self.towers[ti]=(self.towers[ti]-s[1]).max(0.);}self.units[i].cd=s[4];}}
   else {if (u.y-360.)*(gy-360.)<0. && (u.y-360.).abs()>12. {gx=if u.x<300.{125.}else{475.};gy=if u.y>360.{340.}else{380.};}let dist=(gx-u.x).hypot(gy-u.y).max(1.);let step=(s[2]*dt).min(dist);self.units[i].x+=(gx-u.x)/dist*step;self.units[i].y+=(gy-u.y)/dist*step;}
  }
  for u in &self.units {if u.hp<=0. {self.kills[1-u.team]+=1;}} self.units.retain(|u|u.hp>0.);
  if self.towers[5]<=0. {self.result=1;}else if self.towers[2]<=0. {self.result=2;}else if self.time<=0. {let a=self.score(0);let b=self.score(1);self.result=if a>b{1}else if b>a{2}else{let ally:f32=self.towers[..3].iter().sum();let enemy:f32=self.towers[3..].iter().sum();if (ally-enemy).abs()<1. {3}else if ally>enemy{1}else{2}};}
 }
 fn score(&self,team:usize)->i32{let o=if team==0{3}else{0};if self.towers[o+2]<=0.{3}else{(self.towers[o]<=0.)as i32+(self.towers[o+1]<=0.)as i32}}
}
thread_local! { static GAME: std::cell::RefCell<Game> = std::cell::RefCell::new(Game::new()); }
#[no_mangle]pub extern "C" fn reset(){GAME.with(|g| *g.borrow_mut()=Game::new());}
#[no_mangle]pub extern "C" fn tick(dt:f32){GAME.with(|g|g.borrow_mut().tick(dt));}
#[no_mangle]pub extern "C" fn play(slot:u32,x:f32,y:f32)->i32{GAME.with(|g|g.borrow_mut().play(slot as usize,x,y))}
#[no_mangle]pub extern "C" fn value(k:u32,i:u32)->f32 {GAME.with(|cell|{let g=cell.borrow();let i=i as usize;match k{0=>g.elixir,1=>g.time,2=>g.result as f32,3=>g.units.len()as f32,4=>*g.towers.get(i).unwrap_or(&0.),5=>*g.hand.get(i).unwrap_or(&0)as f32,6=>g.score(i.min(1))as f32,7=>g.kills[i.min(1)]as f32,8=>g.flash[i.min(2)],9=>g.queue[0]as f32,_=>0.}})}
#[no_mangle]pub extern "C" fn unit(i:u32,k:u32)->f32{GAME.with(|cell|{if let Some(u)=cell.borrow().units.get(i as usize){match k{0=>u.x,1=>u.y,2=>u.hp/u.max,3=>u.team as f32,4=>u.kind as f32,5=>u.cd,_=>0.}}else{0.}})}
#[cfg(test)]mod tests{use super::*;#[test]fn deployment_rules(){let mut g=Game::new();assert_eq!(g.play(0,125.,200.),-2);assert_eq!(g.elixir,5.);assert_eq!(g.play(0,125.,500.),1);assert_eq!(g.units.len(),1);assert_eq!(g.hand[0],4);assert_eq!(g.play(2,125.,500.),-1);}#[test]fn cap_and_bot(){let mut g=Game::new();for _ in 0..1000{g.tick(0.1);}assert!(g.elixir<=10.);assert!(!g.units.is_empty());assert!(g.towers[..3].iter().sum::<f32>()<6400.);}#[test]fn spell_and_end(){let mut g=Game::new();g.spawn(0,1,125.,200.);g.spawn(3,0,125.,200.);assert_eq!(g.units[0].hp,390.);g.towers[5]=0.;g.tick(0.1);assert_eq!(g.result,1);let time=g.time;g.tick(0.1);assert_eq!(g.time,time);}#[test]fn complete_match(){let mut g=Game::new();for n in 0..1900{if n%35==0 {g.play((n/35)%4,125.,430.);}g.tick(0.1);}assert!(g.result>0);assert!(g.units.len()<150);}}
