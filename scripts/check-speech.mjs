import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chooseSpeechPair,positionSpeechBubbles} from '../speech.js';
import {normalize,THEMES} from '../data-model.js';

const records=normalize(JSON.parse(fs.readFileSync(new URL('../data.json',import.meta.url),'utf8')).bundles);
let seed=728;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const speakers=THEMES.map((node,i)=>({node,walker:{id:node.id+':0'},anchor:{x:80+i*31,y:100+i*17}}));
const recent=[];
for(let round=0;round<80;round++){
 const pair=chooseSpeechPair(speakers,records,recent,random);
 assert.equal(pair.length,2);assert.notEqual(pair[0].speaker.node.id,pair[1].speaker.node.id);
 for(const {speaker,record} of pair){assert.equal(record.kind,'rfi');assert.equal(record.theme,speaker.node.id);assert(records.some(r=>r.key===record.key&&r.title===record.title));recent.push(record.key)}
 recent.splice(0,Math.max(0,recent.length-12));
}
assert.deepEqual(chooseSpeechPair(speakers,[],[],random),[]);
for(const bounds of [{x:164,y:66,w:629,h:530},{x:20,y:66,w:335,h:280},{x:20,y:66,w:265,h:280}])for(let i=0;i<80;i++){
 const items=[0,1].map(()=>({anchor:{x:bounds.x+random()*bounds.w,y:bounds.y+random()*bounds.h},w:bounds.w<400?152:202,h:92})),frames=positionSpeechBubbles(items,bounds);
 assert.equal(frames.length,2);
 for(const f of frames){assert(f.x>=bounds.x&&f.y>=bounds.y);assert(f.x+f.w<=bounds.x+bounds.w+.01&&f.y+f.h<=bounds.y+bounds.h+.01)}
 const [a,b]=frames;assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'Two bubbles must not overlap');
}
console.log('PASS: two distinct islands, authentic local RFI, bounded non-overlapping bubbles across desktop and phone sizes.');
