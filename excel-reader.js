// Bounded XLSX reader using the browser's native ZIP decompression and XML parser.
export async function readXlsx(file){
 if(file.size>15*1024*1024)throw Error('檔案超過 15 MB，請使用釋疑管理表。');
 const buf=await file.arrayBuffer(),u=new Uint8Array(buf),v=new DataView(buf),decode=new TextDecoder();let end=-1;
 for(let i=u.length-22;i>=Math.max(0,u.length-65558);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break}
 if(end<0)throw Error('無法讀取此 Excel，請選擇 .xlsx 格式。');
 const entries=new Map();let p=v.getUint32(end+16,true);const count=v.getUint16(end+10,true);
 if(count>3000)throw Error('工作簿內容過大。');
 for(let i=0;i<count;i++){
  if(v.getUint32(p,true)!==0x02014b50)throw Error('Excel 壓縮目錄損壞。');
  const method=v.getUint16(p+10,true),size=v.getUint32(p+20,true),expanded=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),offset=v.getUint32(p+42,true),name=decode.decode(u.slice(p+46,p+46+nl));
  if(expanded>30*1024*1024)throw Error('工作表解壓縮大小超過上限。');
  entries.set(name,{method,size,offset});p+=46+nl+el+cl;
 }
 async function text(name){const e=entries.get(name);if(!e)return '';const pos=e.offset+30+v.getUint16(e.offset+26,true)+v.getUint16(e.offset+28,true),bytes=u.slice(pos,pos+e.size);if(e.method===0)return decode.decode(bytes);if(e.method!==8)throw Error('不支援此 Excel 壓縮格式。');try{return await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()}catch{throw Error('此瀏覽器無法解壓縮 Excel，請使用新版 Chrome、Edge 或 Safari。')}}
 function xml(str){const doc=new DOMParser().parseFromString(str,'application/xml');if(doc.querySelector('parsererror'))throw Error('Excel XML 內容損壞。');return doc}
 const stringsRaw=await text('xl/sharedStrings.xml'),strings=stringsRaw?[...xml(stringsRaw).getElementsByTagName('si')].map(s=>[...s.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
 const wb=xml(await text('xl/workbook.xml')),rels=xml(await text('xl/_rels/workbook.xml.rels')),targets={};for(const r of rels.getElementsByTagName('Relationship'))targets[r.getAttribute('Id')]=r.getAttribute('Target');
 const sheets=[];for(const sh of wb.getElementsByTagName('sheet')){
  const target=targets[sh.getAttribute('r:id')],path=target?.startsWith('/')?target.slice(1):'xl/'+target;if(!target)continue;
  const doc=xml(await text(path)),rows=[];
  for(const row of doc.getElementsByTagName('row')){const o={};for(const c of row.getElementsByTagName('c')){const type=c.getAttribute('t'),v=c.getElementsByTagName('v')[0]?.textContent;let val=type==='s'?strings[+v]||'':type==='inlineStr'?[...c.getElementsByTagName('t')].map(n=>n.textContent).join(''):v||'';if(val)o[c.getAttribute('r')]=val}if(Object.keys(o).length)rows.push(o)}
  sheets.push({name:sh.getAttribute('name'),rows});
 }
 const source=sheets.some(s=>s.name==='土建')?'建築':sheets.some(s=>s.name==='機電')?'機電':null;
 if(!source)throw Error('找不到「土建」或「機電」工作表，請使用原始管理表。');
 const header=Object.values(sheets.find(s=>['土建','機電'].includes(s.name)).rows[0]||{});
 if(!header.includes('主旨')||!header.includes('項次'))throw Error('管理表欄位不符，請保留原始表頭。');
 return {source,name:file.name,sheets,importedAt:new Date().toISOString()};
}
