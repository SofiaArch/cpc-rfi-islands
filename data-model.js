export const THEMES=[
 {id:'architecture',name:'建築空間',color:'#c99f77',model:'architecture',q:0,r:-1},
 {id:'structure',name:'結構工程',color:'#b6aa8a',model:'structure',q:-1,r:0},
 {id:'facade',name:'帷幕外牆',color:'#8faeab',model:'facade',q:1,r:-1},
 {id:'landscape',name:'景觀環境',color:'#99af7f',model:'landscape',q:-1,r:-1},
 {id:'power',name:'電力系統',color:'#c6ad72',model:'power',q:0,r:1},
 {id:'water',name:'給排水',color:'#8eafb4',model:'water',q:-1,r:1},
 {id:'fire',name:'消防安全',color:'#ca957d',model:'fire',q:2,r:-1},
 {id:'hvac',name:'空調通風',color:'#a2b4a6',model:'hvac',q:1,r:0},
 {id:'smart',name:'弱電智慧',color:'#a5a1b4',model:'smart',q:1,r:1}
];
export const STATUS={pending:'待回覆',replied:'已回覆',verify:'待核對'};
export function cells(row){const o={};for(const [key,val] of Object.entries(row))o[key.replace(/\d+$/,'')]=String(val??'').trim();return o}
export function dateValue(value){
 const v=String(value||'').trim();if(!v||v==='-'||v==='/')return '';
 if(/^\d{5}(\.\d+)?$/.test(v)){const d=new Date(Date.UTC(1899,11,30)+Number(v)*86400000);return d.toISOString().slice(0,10)}
 const m=v.match(/^(\d{2,4})[.\/-](\d{1,2})(?:[.\/-](\d{1,2}))?\.?(?=$|[\s（(])/);if(!m)return '';
 const yr=+m[1]<1911?+m[1]+1911:+m[1],mo=+m[2],da=m[3]?+m[3]:null;
 if(yr<2000||yr>2100||mo<1||mo>12)return '';
 if(da===null)return `${yr}-${String(mo).padStart(2,'0')}`;
 const d=new Date(Date.UTC(yr,mo-1,da));if(d.getUTCMonth()!==mo-1||d.getUTCDate()!==da)return '';
 return d.toISOString().slice(0,10)
}
export function themeFor(r,source){
 const title=r.D||'',hint=r.H||'',txt=[r.A,title,r.E].join(' ');
 if(/帷幕|洗窗|風雨試驗|視覺模型|外牆/.test(title))return 'facade';
 if(/結構/.test(hint)||/配筋|鋼筋|小樑|大樑|鋼承|梁深|樑深|箍筋|地質改良|筏基層結構|模板優化/.test(title))return 'structure';
 if(/景觀/.test(hint)||/景觀|植栽|草地|草皮|喬木|不織布/.test(title))return 'landscape';
 if(/空調/.test(hint)||/空調|冷卻|冰水|主機|風機|全熱|風管|排氣|通風|冷媒/.test(title)&&!/消防|排煙|防火/.test(title))return 'hvac';
 if(/消防|排煙|滅火|灑水|採水|送水口/.test(txt))return 'fire';
 if(/電信|弱電|智慧|監控|監視|攝影|資訊|電子|網路|資通訊/.test(txt))return 'smart';
 if(/電力|太陽能|電氣|接地|充電|台電|發電機|導線|電線|電磁閥|電源|燈具|照明|開關|電纜/.test(txt))return 'power';
 if(/水利/.test(hint)||/給水|排水|污水|汙水|廢水|雨水|水管|水泵|落水|水表|水箱|浮球|閘閥|滯洪|入流井|出流|衛生設備|油脂|鑄鐵管/.test(txt))return 'water';
 return source==='機電'?'power':'architecture';
}
export function normalize(bundles){
 const records=[],logs=[];
 for(const bundle of bundles){
  const source=bundle.source,main=bundle.sheets.find(s=>s.name==='土建'||s.name==='機電');if(!main)continue;
  const log=bundle.sheets.find(s=>s.name==='寄信紀錄');
  if(log)for(const row of log.rows.slice(1)){
   const r=cells(row);if(!r.B)continue;
   const pairs=[];for(const [k,v] of Object.entries(r))if(/https:\/\//.test(v)){
    const urls=v.split(/\s+/).filter(v=>/^https:\/\/(drive|docs)\.google\.com\//.test(v));
    const names=(r[String.fromCharCode(k.charCodeAt(0)-1)]||'').split('\n');
    urls.forEach((url,i)=>pairs.push({url,name:names[i]||'來源附件'}));
   }
   logs.push({source,code:r.B,date:dateValue(r.A),rawDate:r.A,title:r.C,result:r.D,files:pairs});
  }
  for(const row of main.rows.slice(1)){
   const r=cells(row),rowNo=Number(Object.keys(row)[0]?.match(/\d+/)?.[0]||0);
   if(!r.A||!r.D||r.D==='-'||r.D==='/')continue;
   const kind=r.A.startsWith('RFI')?'rfi':'change',received=dateValue(r.B),replied=dateValue(r.C);
   const hasReply=!!r.F&&r.F!=='/'&&r.F!=='-';
   const status=hasReply&&replied?'replied':hasReply||replied?'verify':'pending';
   records.push({key:kind==='rfi'?`${source}:rfi:${r.A}`:`${source}:${main.name}:${rowNo}`,code:r.A,title:r.D,source,sheet:main.name,row:rowNo,kind,theme:themeFor(r,source),raw:r,received,replied,status,reply:hasReply?r.F:'',professional:r.H||'未填寫',change:!!r.I&&r.I!=='-',drawings:r.E||'',drawingChanged:/v|✓|是/i.test(r.J||''),budgetChanged:!!r.K&&r.K!=='-',changeStage:r.I||'',files:[],logs:[]});
  }
 }
 for(const r of records){r.logs=logs.filter(l=>l.code===r.code&&l.source===r.source);const links=new Map();for(const l of r.logs)for(const f of l.files)links.set(f.url,f);r.files=[...links.values()];}
 return records;
}
export function daysWaiting(record,today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'})){
 if(!record.received||record.received.length!==10)return null;
 return Math.max(0,Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse(record.received+'T00:00:00Z'))/86400000));
}
