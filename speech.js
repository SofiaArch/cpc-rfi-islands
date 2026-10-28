import {STATUS} from './data-model.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function weightedPick(items,weight,random){const sum=items.reduce((n,item)=>n+weight(item),0);let v=random()*sum;return items.find(item=>(v-=weight(item))<0)||items.at(-1)}

// Select two different islands and use their actual RFI records.
export function chooseSpeechPair(speakers,records,recent=[],random=Math.random){
 const eligible=speakers.filter(s=>records.some(r=>r.kind==='rfi'&&r.theme===s.node.id)),chosen=[];
 const priority=s=>records.some(r=>r.theme===s.node.id&&r.status==='pending')?3:1;
 while(eligible.length&&chosen.length<2){
  const first=chosen[0]?.speaker;
  const speaker=weightedPick(eligible,s=>priority(s)*(first?Math.max(.3,Math.hypot(s.anchor.x-first.anchor.x,s.anchor.y-first.anchor.y)/160):1),random);
  for(let i=eligible.length-1;i>=0;i--)if(eligible[i].node.id===speaker.node.id)eligible.splice(i,1);
  const pool=records.filter(r=>r.kind==='rfi'&&r.theme===speaker.node.id),unseen=pool.filter(r=>!recent.includes(r.key)),available=unseen.length?unseen:pool,pending=available.filter(r=>r.status==='pending');
  const options=pending.length&&random()<.8?pending:available,record=options[Math.min(options.length-1,Math.floor(random()*options.length))];
  chosen.push({speaker,record});
 }
 return chosen;
}

const intersects=(a,b,gap=10)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
export function positionSpeechBubbles(items,bounds){
 const margin=5,left=bounds.x+margin,right=bounds.x+bounds.w-margin,top=bounds.y+margin,bottom=bounds.y+bounds.h-margin;
 const candidates=items.map(item=>{
  const w=Math.min(item.w,right-left),h=Math.min(item.h,bottom-top),a=item.anchor,preferred={x:a.x-w/2,y:a.y-h-15};
  const points=[[preferred.x,preferred.y],[a.x-w/2,a.y+18],[a.x-w-18,a.y-h/2],[a.x+18,a.y-h/2],[left,top],[right-w,top],[left,bottom-h],[right-w,bottom-h],[(left+right-w)/2,top],[(left+right-w)/2,bottom-h]];
  return points.map(([x,y])=>{x=clamp(x,left,right-w);y=clamp(y,top,bottom-h);return {x,y,w,h,cost:(x-preferred.x)**2+(y-preferred.y)**2*1.15}}).sort((a,b)=>a.cost-b.cost);
 });
 if(candidates.length<2)return candidates.map(c=>c[0]);
 let best=null;
 for(const a of candidates[0])for(const b of candidates[1])if(!intersects(a,b)&&(!best||a.cost+b.cost<best.cost))best={positions:[a,b],cost:a.cost+b.cost};
 return best?.positions||[candidates[0][0],candidates[1].at(-1)];
}

export class IslandSpeech{
 constructor(city,layer,onQuestion){
  this.city=city;this.layer=layer;this.onQuestion=onQuestion;this.records=[];this.active=[];this.recent=[];this.enabled=true;this.suspended=false;this.nextAt=1200;this.lastTime=0;
  this.svg=document.createElementNS('http://www.w3.org/2000/svg','svg');this.svg.setAttribute('class','speech-leaders');this.svg.setAttribute('aria-hidden','true');layer.append(this.svg);
 }
 setRecords(records){this.clear(this.city.animationTime);this.records=records.filter(r=>r.kind==='rfi');this.recent=[];this.nextAt=this.city.animationTime+1200}
 setEnabled(value){this.enabled=!!value;if(!this.enabled)this.clear(this.city.animationTime);else this.nextAt=this.city.animationTime+800;this.city.dirty=true;this.layer.hidden=!this.enabled||this.suspended;return this.enabled}
 setSuspended(value){this.suspended=!!value;if(value)for(const b of this.active){b.hovered=false;b.focused=false}this.layer.hidden=!this.enabled||this.suspended;this.city.dirty=true}
 clear(time){for(const b of [...this.active])this.remove(b,time)}
 remove(b,time){
  const walker=b.speaker.walker;
  walker.pauseOffset=(walker.pauseOffset||0)+Math.max(0,time-walker.speechStartedAt);delete walker.speaking;delete walker.speechLocalTime;delete walker.speechStartedAt;
  b.el.remove();b.line.remove();b.marker.remove();this.active=this.active.filter(v=>v!==b);
 }
 anchor(speaker,time){const p=this.city.walkerPose(speaker.walker,time),lift=speaker.node.id===this.city.selected?6:speaker.node.id===this.city.hover?3:0;const v=this.city.project(speaker.node.x+p.x,17+p.bob+lift,speaker.node.z+p.z);return {x:v[0],y:v[1]}}
 speakers(time){
  const v=this.city.viewport,out=[];
  for(const node of this.city.nodes.filter(n=>n.id!=='center')){
   const options=node.parts.filter(p=>p.type==='walker').map(walker=>{const p=this.city.walkerPose(walker,time),a=this.city.project(node.x+p.x,17+p.bob,node.z+p.z),depth=this.city.project(node.x,0,node.z)[2];return {node,walker,anchor:{x:a[0],y:a[1]},score:a[2]-depth+Math.random()*10}}).filter(s=>s.anchor.x>v.x+8&&s.anchor.x<v.x+v.w-8&&s.anchor.y>v.y+10&&s.anchor.y<v.y+v.h-8).sort((a,b)=>b.score-a.score);
   if(options.length)out.push(options[0]);
  }
  return out;
 }
 spawn(time){
  const pair=chooseSpeechPair(this.speakers(time),this.records,this.recent);
  for(const choice of pair){
   const {speaker,record}=choice,walker=speaker.walker;
   walker.speechLocalTime=time-(walker.pauseOffset||0);walker.speechStartedAt=time;walker.speaking=true;
   const el=document.createElement('button');el.type='button';el.className='rfi-bubble '+record.status;el.dataset.rfiKey=record.key;el.dataset.speakerTheme=speaker.node.id;el.dataset.speakerId=walker.id;
   el.setAttribute('aria-label',`${speaker.node.name}人物提問：${record.title}；${STATUS[record.status]}，點選查看釋疑 ${record.code}`);
   const header=document.createElement('span');header.className='speech-header';
   const name=document.createElement('span');name.textContent='💬 '+speaker.node.name;
   const status=document.createElement('span');status.className='speech-status';status.textContent=STATUS[record.status];header.append(name,status);
   const title=document.createElement('span');title.className='speech-question';title.textContent=record.title;
   const foot=document.createElement('span');foot.className='speech-foot';const code=document.createElement('span');code.textContent=record.code;const cta=document.createElement('span');cta.textContent='查看 ↗';foot.append(code,cta);el.append(header,title,foot);
   const line=document.createElementNS('http://www.w3.org/2000/svg','path'),marker=document.createElementNS('http://www.w3.org/2000/svg','circle');marker.setAttribute('r','3');this.svg.append(line,marker);
   const bubble={...choice,el,line,marker,expiresAt:time+5000,hovered:false,focused:false};
   el.addEventListener('mouseenter',()=>bubble.hovered=true);el.addEventListener('mouseleave',()=>bubble.hovered=false);el.addEventListener('focus',()=>bubble.focused=true);el.addEventListener('blur',()=>bubble.focused=false);
   el.addEventListener('click',()=>this.onQuestion?.(record.key));this.layer.append(el);this.active.push(bubble);
   this.recent.push(record.key);this.recent=this.recent.slice(-12);
  }
  this.nextAt=time+(pair.length?10000+Math.random()*5000:1500);
 }
 tick(time){
  const elapsed=Math.max(0,time-this.lastTime);this.lastTime=time;
  const suspended=this.suspended||this.city.pointerDragging;
  this.layer.hidden=!this.enabled||suspended;
  for(const b of this.active)if(suspended||b.hovered||b.focused)b.expiresAt+=elapsed;
  if(!this.enabled)return;
  if(suspended){this.nextAt+=elapsed;return}
  for(const b of [...this.active])if(time>=b.expiresAt)this.remove(b,time);
  if(!this.active.length&&this.records.length&&time>=this.nextAt)this.spawn(time);
  const v=this.city.viewport;
  if(this.active.some(b=>{const a=this.anchor(b.speaker,time);return a.x<v.x||a.x>v.x+v.w||a.y<v.y||a.y>v.y+v.h})){this.clear(time);this.nextAt=time+900;return}
  const frames=positionSpeechBubbles(this.active.map(b=>({anchor:this.anchor(b.speaker,time),w:b.el.offsetWidth,h:b.el.offsetHeight})),v);
  this.svg.setAttribute('viewBox',`0 0 ${this.city.width} ${this.city.height}`);
  this.active.forEach((b,i)=>{
   const frame=frames[i],a=this.anchor(b.speaker,time);b.el.style.left=frame.x+'px';b.el.style.top=frame.y+'px';
   const x=clamp(a.x,frame.x+10,frame.x+frame.w-10),y=a.y>frame.y+frame.h/2?frame.y+frame.h:frame.y;
   b.line.setAttribute('d',`M ${a.x} ${a.y} L ${x} ${y}`);b.marker.setAttribute('cx',a.x);b.marker.setAttribute('cy',a.y);
  });
 }
}
