import {THEMES} from './data-model.js';
import {IslandSpeech} from './speech.js';
const TAU=Math.PI*2;
const rgb=c=>c.replace('#','').match(/../g).map(x=>parseInt(x,16));
const tint=(c,k)=>'#'+rgb(c).map(v=>Math.max(0,Math.min(255,Math.round(v*k))).toString(16).padStart(2,'0')).join('');
export class IslandCity{
 constructor(canvas,labels,onSelect,onQuestion){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.labels=labels;this.onSelect=onSelect;this.yaw=-.48;this.zoom=1;this.pitch=.57;this.selected=null;this.hover=null;this.dirty=true;this.mesh=[];this.nodes=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.paused=this.reduced;this.animationTime=0;
  this.build();this.speech=new IslandSpeech(this,document.querySelector('#speechLayer'),onQuestion);this.bind();this.resizeObserver=new ResizeObserver(()=>{this.resize();this.dirty=true});this.resizeObserver.observe(canvas);this.resize();this.loop();
 }
 build(){
  const definitions=[{id:'center',name:'綠能研發中心',model:'center',q:0,r:0,color:'#b7bc93'},...THEMES];
  for(const [i,d] of definitions.entries()){
   const R=68,gap=1.11,x=1.5*R*gap*d.q,z=Math.sqrt(3)*R*gap*(d.r+d.q/2),node={...d,x,z,index:i,parts:[],lift:0};this.nodes.push(node);this.current=node;
   this.hex(0,-12,0,R,12,'#d7c9ac','#c6b799');this.hex(0,0,0,R-1,3,'#d4d9b6','#b8c398');this.hex(0,3,0,R-5,1,'#c8d1aa','#a9ba8a');
   // Paths on each hexagonal lawn give the models a shared scale.
   this.box(-5,4,-57,10,.5,114,'#e3d7bc');this.box(-55,4,-4,110,.5,8,'#e4d8bd');
   // A continuous perimeter promenade keeps walkers clear of the buildings.
   for(let side=0;side<6;side++){
    const a=side*TAU/6,b=(side+1)*TAU/6;
    this.poly([[59*Math.cos(a),4.2,59*Math.sin(a)],[63*Math.cos(a),4.2,63*Math.sin(a)],[63*Math.cos(b),4.2,63*Math.sin(b)],[59*Math.cos(b),4.2,59*Math.sin(b)]],'#e4d8bd');
   }
   this.makeModel(d.model,d.color);
   const greens=['#819965','#91a56f','#a3b27a','#7e9564'];
   for(let k=0;k<7;k++){
    const a=(k/7)*TAU+i*.81,r=46+(k%2)*6,tx=Math.cos(a)*r,tz=Math.sin(a)*r;
    if(k===2||k===5)continue;this.tree(tx,tz,13+(k%3)*4,greens[(k+i)%greens.length]);
   }
   // Miniature benches, bollards, people, and planted borders.
   this.box(-45,5,-8,15,2,5,'#ad9470');this.box(-44,4,-8,2,3,4,'#908870');this.box(-33,4,-8,2,3,4,'#908870');
   for(let p=0;p<3;p++)this.add({type:'walker',id:`${d.id}:${p}`,phase:(i*.137+p*.31)%1,speed:.021+(i%4)*.0025+p*.0015,direction:p===1?-1:1,lane:p===1?60:62,color:['#b66f53','#638b93','#c49d55'][(i+p)%3],hardHat:(i+p)%3===0});
   const b=document.createElement('button');b.className='island-label'+(d.id==='center'?' center-label':'');b.dataset.theme=d.id;b.innerHTML=d.id==='center'?'<span>2135 · 綠能研發中心</span>':`<small>${String(i).padStart(2,'0')}</small><span>${d.name}</span><span class="label-count">0</span>`;b.setAttribute('aria-label',d.name+'，查看釋疑');b.addEventListener('click',()=>{this.select(d.id);this.onSelect(d.id)});for(const event of ['mouseenter','focus'])b.addEventListener(event,()=>{this.hover=d.id;this.dirty=true});for(const event of ['mouseleave','blur'])b.addEventListener(event,()=>{if(this.hover===d.id)this.hover=null;this.dirty=true});this.labels.append(b);node.label=b;
  }
  this.current=null;
 }
 add(part){this.current.parts.push(part)}
 poly(pts,color,normal=[0,1,0]){this.add({type:'poly',pts,color,normal})}
 box(x,y,z,w,h,d,color){
  const a=[x,y,z],b=[x+w,y,z],c=[x+w,y,z+d],e=[x,y,z+d],A=[x,y+h,z],B=[x+w,y+h,z],C=[x+w,y+h,z+d],D=[x,y+h,z+d];
  this.poly([A,B,C,D],tint(color,1.08),[0,1,0]);this.poly([a,b,B,A],tint(color,.91),[0,0,-1]);this.poly([b,c,C,B],tint(color,.84),[1,0,0]);this.poly([c,e,D,C],tint(color,.98),[0,0,1]);this.poly([e,a,A,D],tint(color,1.01),[-1,0,0]);
 }
 hex(x,y,z,r,h,top,side){
  const low=[],high=[];for(let i=0;i<6;i++){const a=TAU*i/6;low.push([x+r*Math.cos(a),y,z+r*Math.sin(a)]);high.push([x+r*Math.cos(a),y+h,z+r*Math.sin(a)])}this.poly(high,top);for(let i=0;i<6;i++){const j=(i+1)%6,a=(i+.5)*TAU/6;this.poly([low[i],low[j],high[j],high[i]],tint(side,.93+.06*Math.cos(a)),[Math.cos(a),0,Math.sin(a)])}
 }
 cylinder(x,y,z,r,h,color,segments=16){
  const top=[];for(let i=0;i<segments;i++){const a=TAU*i/segments,b=TAU*(i+1)/segments;top.push([x+r*Math.cos(a),y+h,z+r*Math.sin(a)]);this.poly([[x+r*Math.cos(a),y,z+r*Math.sin(a)],[x+r*Math.cos(b),y,z+r*Math.sin(b)],[x+r*Math.cos(b),y+h,z+r*Math.sin(b)],[x+r*Math.cos(a),y+h,z+r*Math.sin(a)]],tint(color,.88+.13*Math.cos(a+2)),[Math.cos((a+b)/2),0,Math.sin((a+b)/2)])}this.poly(top,tint(color,1.08));
 }
 sphere(x,y,z,r,color){this.add({type:'sphere',x,y,z,r,color})}
 tree(x,z,h,color){this.cylinder(x,4,z,1.2,h*.55,'#a2906c',6);this.sphere(x,4+h*.7,z,h*.37,color);this.sphere(x-2,6+h,z-1,h*.3,tint(color,1.06));this.sphere(x+2,5+h*.9,z+2,h*.27,tint(color,.99))}
 walkerPose(walker,time){
  time=walker.speaking?walker.speechLocalTime:time-(walker.pauseOffset||0);
  const turns=((walker.phase+time*.001*walker.speed*walker.direction)%1+1)%1,step=turns*6,side=Math.floor(step),fraction=step-side,a=side*TAU/6,b=(side+1)*TAU/6;
  const x=walker.lane*(Math.cos(a)*(1-fraction)+Math.cos(b)*fraction),z=walker.lane*(Math.sin(a)*(1-fraction)+Math.sin(b)*fraction);
  const heading=Math.atan2((Math.sin(b)-Math.sin(a))*walker.direction,(Math.cos(b)-Math.cos(a))*walker.direction)-Math.PI/2,gait=walker.speaking?0:Math.sin(time*.009+walker.phase*TAU),bob=Math.abs(gait)*.3;
  return {x,z,heading,gait,bob};
 }
 walkerParts(walker,time){
  const {x,z,heading,gait,bob}=this.walkerPose(walker,time);
  const previous=this.current,bucket={parts:[]};this.current=bucket;
  this.box(-2,8.5+bob,-1.35,4,4.4,2.7,walker.color);
  this.sphere(0,15+bob,0,2.1,'#d8b68f');
  if(walker.hardHat){this.sphere(0,16.1+bob,0,2.25,'#d6b65d');this.box(-2.5,15.4+bob,-2.1,5,.65,4.2,'#d6b65d')}
  for(const sign of [-1,1]){
   const stride=gait*sign;
   this.box(sign*1.25-.7,4.5+Math.max(0,stride)*.45,stride*1.25-.6,1.4,4.1,1.3,'#707d70');
   this.box(sign*1.25-.85,4.4+Math.max(0,stride)*.45,stride*1.25-.9,1.7,.8,2.1,'#686e60');
   this.box(sign*2.65-.55,8.8+bob,-stride*1.5-.55,1.1,3.2,1.1,walker.color);
   this.sphere(sign*2.65,8.4+bob,-stride*1.5, .7,'#d8b68f');
  }
  this.current=previous;
  const co=Math.cos(heading),si=Math.sin(heading),turn=([px,py,pz])=>[x+px*co-pz*si,py,z+px*si+pz*co];
  return bucket.parts.map(part=>part.type==='poly'?{...part,pts:part.pts.map(turn),normal:[part.normal[0]*co-part.normal[2]*si,part.normal[1],part.normal[0]*si+part.normal[2]*co]}:{...part,...Object.fromEntries(['x','y','z'].map((key,i)=>[key,turn([part.x,part.y,part.z])[i]]))});
 }
 windows(x,y,z,w,h,d,rows=4,cols=5){
  const gap=2,ww=(w-6)/cols,hh=(h-7)/rows;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   this.box(x+3+c*ww,y+3+r*hh,z-.2,ww-gap,hh-gap,.4,(r+c)%3?'#9cbab3':'#becfc0');
   this.box(x+w-.1,y+3+r*hh,z+3+c*(d-5)/cols,.4,hh-gap,(d-5)/cols-2,'#a2bcb2');
  }
 }
 building(x,z,w,d,h,color,rows=3){this.box(x,5,z,w,h,d,color);this.windows(x,5,z,w,h,d,rows,Math.max(3,Math.round(w/7)));this.box(x-1,5+h,z-1,w+2,2,d+2,tint(color,1.05))}
 solar(x,z,y,w=14,d=21){this.box(x,y-3,z,w,3,d,'#c0bea0');this.poly([[x,y,z],[x+w,y,z],[x+w,y+5,z+d],[x,y+5,z+d]],'#6d9491');for(let c=1;c<3;c++)this.poly([[x+w*c/3-.2,y+.1,z],[x+w*c/3+.2,y+.1,z],[x+w*c/3+.2,y+5.1,z+d],[x+w*c/3-.2,y+5.1,z+d]],'#a9c0b1');for(let r=1;r<4;r++)this.poly([[x,y+5*r/4+.2,z+d*r/4],[x+w,y+5*r/4+.2,z+d*r/4],[x+w,y+5*r/4+.3,z+d*r/4+.35],[x,y+5*r/4+.3,z+d*r/4+.35]],'#a9c0b1')}
 makeModel(type,col){
  if(type==='center'){
   this.box(-36,5,-24,72,5,55,'#d9d6bb');
   this.building(-28,-16,24,26,64,'#dedac1',7);this.building(-1,-20,29,34,87,'#dedbc3',9);this.building(-32,16,60,18,23,'#e0d2b5',3);
   for(let i=0;i<5;i++)this.box(-1,12+i*15,-20.7,29,3,1,'#ba9f79');
   this.box(1,94,-18,25,3,30,'#b0bc91');this.solar(3,-14,99,18,15);
   this.box(-24,71,-13,15,3,19,'#99ad80');this.tree(-18,-2,9,'#8ba16d');
   this.box(-24,7,37,48,2,5,'#d1c3a0');
  }else if(type==='architecture'){
   this.building(-32,-22,44,33,38,'#d5b28e',4);this.building(12,-16,21,28,53,'#dfd4b6',5);
   this.box(-34,44,-24,48,3,37,'#bc9773');this.box(-8,7,12,43,12,18,'#e7dcc4');
   for(let i=0;i<4;i++)this.box(-3+i*10,8,30,5,11,1,'#a0b4a1');
   this.box(-22,7,27,11,7,7,'#c89c6f');
  }else if(type==='facade'){
   for(let i=0;i<3;i++){const x=-31+i*22,h=44+i*12;this.building(x,-18,18,35,h,'#d5d7be',5+i);this.box(x-1,6,-19,2,h+1,37,'#a69f7f');this.box(x+18,6,-19,2,h+1,37,'#c1af8d');for(let j=0;j<5;j++)this.box(x,12+j*(h/5),-19,18,1.3,1,'#b7c7b4')}
   this.box(-30,6,24,63,3,7,'#c7bb99');
  }else if(type==='structure'){
   this.box(-33,5,-23,57,4,48,'#cbc4a4');
   for(let h=0;h<3;h++){let y=10+h*20;this.box(-31,y,-21,53,2,44,'#dad2b4');for(let a=0;a<3;a++)for(let b=0;b<2;b++)this.box(-30+a*24,y,-20+b*39,2.6,20,2.6,'#c2aa7b')}
   this.box(-43,5,18,7,88,7,'#c4ad73');for(let i=0;i<7;i++)this.box(-44,12+i*11,18,9,1.5,8,'#b29c65');this.box(-45,90,17,75,3,7,'#ccb475');this.box(15,70,20,1,21,1,'#9d9b7a');this.box(10,68,16,10,3,8,'#a8aaa0');
  }else if(type==='landscape'){
   this.hex(-12,4,-7,27,1,'#acc5bd','#9cb5ab');this.hex(-12,5,-7,22,1,'#b3caca','#adc5ba');
   for(let i=0;i<6;i++){const a=i*TAU/6;this.box(Math.cos(a)*36-5,5,Math.sin(a)*36-3,9,2,5,'#d7c8a4')}
   for(let i=0;i<5;i++)this.tree(20+i*5,10-i*9,17+(i%2)*6,'#8ca572');
   this.cylinder(-21,5,30,16,2,'#ddd1b0');this.cylinder(-21,7,30,12,2,'#d1c39f');this.cylinder(-21,9,30,8,2,'#c4b794');
  }else if(type==='power'){
   this.building(-35,-27,27,20,20,'#c9bc8d',2);for(let r=0;r<2;r++)for(let c=0;c<3;c++)this.solar(-32+c*21,3+r*20,10,17,15);
   this.cylinder(29,4,-21,2,61,'#d8d5b8',8);this.sphere(29,66,-21,3,'#d9d7be');
   this.add({type:'rotor',x:29,y:66,z:-21,r:18,color:'#e7dfc1'});
   this.box(-3,5,-32,15,19,16,'#c4b078');this.box(0,25,-29,9,3,10,'#d8c793');
  }else if(type==='water'){
   this.box(-40,4,-24,80,2,51,'#d9d4b3');
   for(let i=0;i<3;i++){this.cylinder(-24+i*24,6,-7,10,28+(i%2)*9,'#b2c5bc');this.cylinder(-24+i*24,34+(i%2)*9,-7,10.6,2,'#d9d9be');this.cylinder(-24+i*24,37+(i%2)*9,-7,3,2,'#aab8a5')}
   this.box(-31,7,18,61,5,3,'#8fada7');this.box(-32,7,-2,3,20,23,'#9eb6af');this.box(26,7,-2,3,20,23,'#9eb6af');
   this.cylinder(0,6,-37,10,5,'#9db9b0');
  }else if(type==='fire'){
   this.box(-33,5,-22,60,31,34,'#d4b69a');this.box(-35,36,-24,64,3,38,'#bf8d71');
   for(let i=0;i<3;i++)this.box(-27+i*17,6,12,12,18,1,'#bca986');
   this.box(-19,5,20,13,7,23,'#bf8268');this.box(-19,12,21,13,6,9,'#d19a7e');this.box(-18,14,30,11,4,.5,'#b8c6b4');this.box(-18,19,27,11,1,2,'#d1b569');
   for(const z of [22,37]){this.cylinder(-20,4,z,2,2,'#777d68',8);this.cylinder(-6,4,z,2,2,'#777d68',8)}
   this.box(29,5,-19,8,55,8,'#dfceb2');this.box(27,60,-21,12,4,12,'#b58c6d');
  }else if(type==='hvac'){
   this.box(-37,5,-26,73,21,50,'#d6d7bc');this.box(-39,26,-28,77,2,54,'#c2c7a6');
   for(let r=0;r<2;r++)for(let c=0;c<3;c++){this.box(-31+c*23,28,-20+r*24,18,10,18,'#c1cbb7');this.cylinder(-22+c*23,38,-11+r*24,6.2,1,'#91a697');this.cylinder(-22+c*23,39,-11+r*24,2,1,'#b5bfa8')}
   for(let i=0;i<5;i++)this.box(-34+i*14,11,24,8,8,.4,'#a6b7a4');
  }else if(type==='smart'){
   this.building(-31,-18,37,34,31,'#d8d1bd',3);this.building(9,-11,23,27,44,'#cbc5b4',4);
   for(let i=0;i<3;i++){this.box(-25+i*11,38,-12,6,12,9,'#a3afa2');for(let y=0;y<3;y++)this.box(-24+i*11,40+y*3,-12.5,4,1,.5,'#7f9e91')}
   this.cylinder(23,52,-1,1,29,'#aaa994',6);this.sphere(23,82,-1,2,'#cdc5a7');this.cylinder(-30,5,28,1,23,'#9ba58b',6);this.box(-33,28,27,8,3,4,'#b6bca2');
  }
 }
 bind(){
  let drag=null,moved=false;
  this.canvas.addEventListener('pointerdown',e=>{this.pointerDragging=true;drag={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch};moved=false;this.canvas.setPointerCapture(e.pointerId)});
  this.canvas.addEventListener('pointermove',e=>{
   if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;this.yaw=drag.yaw+dx*.005;this.pitch=Math.max(.35,Math.min(.95,drag.pitch+dy*.0025));this.dirty=true}
   else{const rect=this.canvas.getBoundingClientRect(),hit=this.hit(e.clientX-rect.left,e.clientY-rect.top);if(hit?.id!==this.hover){this.hover=hit?.id;this.canvas.style.cursor=hit?'pointer':'grab';this.dirty=true}}
  });
  this.canvas.addEventListener('pointerup',e=>{this.pointerDragging=false;if(!moved){const r=this.canvas.getBoundingClientRect(),node=this.hit(e.clientX-r.left,e.clientY-r.top);if(node){this.select(node.id);this.onSelect(node.id)}}drag=null;this.dirty=true});
  this.canvas.addEventListener('pointercancel',()=>{drag=null;this.pointerDragging=false;this.dirty=true});this.canvas.addEventListener('pointerleave',()=>{this.hover=null;this.dirty=true});
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoomBy(e.deltaY>0?-.06:.06)},{passive:false});
 }
 resize(){this.width=this.canvas.clientWidth;this.height=this.canvas.clientHeight;this.perimeter=this.width>=760;this.canvas.parentElement.dataset.layout=this.perimeter?'perimeter':'stacked';const dp=Math.min(devicePixelRatio||1,2);this.canvas.width=this.width*dp;this.canvas.height=this.height*dp;this.dp=dp;this.labelSizingDirty=true}
 project(x,y,z){const xx=x*Math.cos(this.yaw)+z*Math.sin(this.yaw),zz=-x*Math.sin(this.yaw)+z*Math.cos(this.yaw);return [this.ox+xx*this.scale,this.oy+(zz*Math.sin(this.pitch)-y*Math.cos(this.pitch))*this.scale,zz*Math.cos(this.pitch)+y*Math.sin(this.pitch)]}
 setupProjection(){
  const coords=[];for(const n of this.nodes)for(let i=0;i<6;i++){const a=TAU*i/6,x=n.x+Math.cos(a)*72,z=n.z+Math.sin(a)*72,xx=x*Math.cos(this.yaw)+z*Math.sin(this.yaw),zz=-x*Math.sin(this.yaw)+z*Math.cos(this.yaw);coords.push([xx,zz*Math.sin(this.pitch)]);coords.push([xx,zz*Math.sin(this.pitch)-100*Math.cos(this.pitch)])}
  const minX=Math.min(...coords.map(p=>p[0])),maxX=Math.max(...coords.map(p=>p[0])),minY=Math.min(...coords.map(p=>p[1])),maxY=Math.max(...coords.map(p=>p[1]));
  const side=this.perimeter?164:20;this.viewport={x:side,y:66,w:this.width-side*2,h:this.height-160};
  this.scale=Math.min(this.viewport.w/(maxX-minX),this.viewport.h/(maxY-minY))*this.zoom;this.ox=this.viewport.x+this.viewport.w/2-(minX+maxX)/2*this.scale;this.oy=this.viewport.y+this.viewport.h/2-(minY+maxY)/2*this.scale;
 }
 updateCounts(records){
  for(const n of this.nodes){
   const rs=records.filter(r=>r.kind==='rfi'&&(n.id==='center'||r.theme===n.id)),total=rs.length,handled=rs.filter(r=>r.status==='replied').length,remaining=total-handled,verify=rs.filter(r=>r.status==='verify').length;
   n.total=total;n.handled=handled;n.hp=handled;n.remaining=remaining;n.pending=rs.filter(r=>r.status==='pending').length;
   const ratio=total?handled/total*100:0;
   n.label.classList.toggle('full-health',total>0&&handled===total);
   n.label.innerHTML=`<span class="island-title"><span class="island-name">${n.name}</span><span class="island-hp">HP <b>${handled}</b>/${total}</span></span><span class="island-counts"><span>全部問題 <b>${total}</b></span><span>已處理 <b>${handled}</b></span></span><span class="island-health" role="meter" aria-label="${n.name}處理進度血量" aria-valuemin="0" aria-valuemax="${Math.max(1,total)}" aria-valuenow="${handled}" aria-valuetext="HP ${handled}/${total}，已處理 ${handled}，尚未處理 ${remaining}"><span style="width:${ratio}%"></span></span>`;
   n.label.setAttribute('aria-label',`${n.name}，全部問題${total}筆，已處理${handled}筆，HP ${handled}/${total}${verify?`，另有${verify}筆待核對`:''}，查看釋疑清單`);
   n.label.title=`${n.id==='center'?'全部島嶼總覽':n.name}｜處理越多，血量越多。已處理＝有回覆日期及內容的 RFI；待核對尚未計入 HP。`;
  }
  this.speech?.setRecords(records);this.labelSizingDirty=true;this.dirty=true;
 }
 select(id){this.selected=id;for(const n of this.nodes)n.label.classList.toggle('chosen',n.id===id);this.dirty=true}
 zoomBy(amount){this.zoom=Math.max(.65,Math.min(1.8,this.zoom+amount));this.dirty=true}
 rotate(){this.yaw-=.35;this.dirty=true}
 reset(){this.yaw=-.48;this.pitch=.57;this.zoom=1;this.select(null)}
 hit(x,y){return [...this.nodes].sort((a,b)=>this.project(b.x,0,b.z)[2]-this.project(a.x,0,a.z)[2]).find(n=>{const pts=n.hit;if(!pts)return false;let hit=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit})}
 toggleAnimation(){this.paused=!this.paused;this.dirty=true;return this.paused}
 loop(){const frame=t=>{const elapsed=this.frameTime===undefined?0:Math.min(t-this.frameTime,100);this.frameTime=t;if(!this.paused)this.animationTime+=elapsed;if(this.dirty||!this.paused&&t-(this.last||0)>50){this.render(this.animationTime);this.last=t;this.dirty=false}requestAnimationFrame(frame)};requestAnimationFrame(frame)}
 render(time){
  if(!this.width||!this.height)return;this.setupProjection();this.speech.tick(time);const c=this.ctx;c.setTransform(this.dp,0,0,this.dp,0,0);c.clearRect(0,0,this.width,this.height);c.save();c.beginPath();c.rect(this.viewport.x,this.viewport.y,this.viewport.w,this.viewport.h);c.clip();
  const draw=[];const cam=[-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),Math.cos(this.yaw)*Math.cos(this.pitch)];
  for(const n of this.nodes){
   const lift=n.id===this.selected?6:n.id===this.hover?3:0;
   // A soft floating shadow sits below each thick, sand-colored hexagonal base.
   const sh=[];for(let i=0;i<6;i++){const a=i*TAU/6;sh.push(this.project(n.x+Math.cos(a)*65,-22,n.z+Math.sin(a)*65))}
   c.save();c.fillStyle='#79825718';c.shadowColor='#62754125';c.shadowBlur=18*this.scale;c.shadowOffsetY=10*this.scale;this.path(sh);c.fill();c.restore();
   n.hit=[];for(let i=0;i<6;i++){const a=i*TAU/6;n.hit.push(this.project(n.x+Math.cos(a)*68,4+lift,n.z+Math.sin(a)*68))}
   if(n.id===this.selected||n.id===this.hover){c.save();this.path(n.hit);c.strokeStyle='#8da17388';c.lineWidth=3;c.stroke();c.restore()}
   const parts=n.parts.flatMap(part=>part.type==='walker'?this.walkerParts(part,time):[part]);
   for(const part of parts){
    if(part.type==='poly'){
     if(part.normal[0]*cam[0]+part.normal[1]*cam[1]+part.normal[2]*cam[2]<-.01)continue;
     const pts=part.pts.map(p=>this.project(n.x+p[0],p[1]+lift,n.z+p[2]));draw.push({type:'poly',pts,color:part.color,depth:pts.reduce((s,p)=>s+p[2],0)/pts.length});
    }else if(part.type==='sphere'){const p=this.project(n.x+part.x,part.y+lift,n.z+part.z);draw.push({...part,p,depth:p[2]})}
    else if(part.type==='rotor'){
     const rot=.4+time*.00045,center=[n.x+part.x,part.y+lift,n.z+part.z];
     for(let k=0;k<3;k++){const a=rot+k*TAU/3,b=a+.09,r=part.r;const pts=[this.project(center[0]+Math.cos(a)*2,center[1]+Math.sin(a)*2,center[2]+1),this.project(center[0]+Math.cos(a)*r,center[1]+Math.sin(a)*r,center[2]+1),this.project(center[0]+Math.cos(b)*r,center[1]+Math.sin(b)*r,center[2]+1),this.project(center[0]+Math.cos(a+.7)*3,center[1]+Math.sin(a+.7)*3,center[2]+1)];draw.push({type:'poly',pts,color:part.color,depth:pts.reduce((s,p)=>s+p[2],0)/4})}
    }
   }
  }
  draw.sort((a,b)=>a.depth-b.depth);
  for(const d of draw){if(d.type==='poly'){this.path(d.pts);c.fillStyle=d.color;c.fill();c.strokeStyle=d.color;c.lineWidth=.35;c.stroke()}
   else {const rr=d.r*this.scale,gr=c.createRadialGradient(d.p[0]-rr*.35,d.p[1]-rr*.5,rr*.1,d.p[0],d.p[1],rr);gr.addColorStop(0,tint(d.color,1.1));gr.addColorStop(1,tint(d.color,.92));c.fillStyle=gr;c.beginPath();c.arc(d.p[0],d.p[1],rr,0,TAU);c.fill()}}
  c.restore();
  if(this.labelSizingDirty){for(const n of this.nodes)n.labelSize=[n.label.offsetWidth,n.label.offsetHeight];this.labelSizingDirty=false}
  if(!this.perimeter){for(const n of this.nodes){n.label.style.left='';n.label.style.top='';n.label.style.opacity='1'}return}
  const columns=[this.nodes.slice(1,6),[this.nodes[0],...this.nodes.slice(6)]];
  for(const [side,column] of columns.entries())for(const [row,n] of column.entries()){
   const [w,h]=n.labelSize||[140,58],x=side?this.width-w/2-8:w/2+8,first=90+h/2,last=this.height-100-h/2,y=first+row*(last-first)/(column.length-1);
   n.label.style.left=x+'px';n.label.style.top=y+'px';n.label.style.opacity='1';
   if(n.id===this.hover||n.id===this.selected){const [ax,ay]=this.project(n.x,6,n.z+35),edge=x+(side?-w/2:w/2);c.beginPath();c.moveTo(edge,y);c.lineTo(side?this.viewport.x+this.viewport.w+5:this.viewport.x-5,y);c.lineTo(ax,ay);c.strokeStyle='#82996eb3';c.lineWidth=1;c.stroke();c.fillStyle='#82996e';c.beginPath();c.arc(ax,ay,2.3,0,TAU);c.fill()}
  }
 }
 path(pts){const c=this.ctx;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath()}
}
