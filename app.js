import {THEMES,STATUS,normalize,daysWaiting,dateValue} from './data-model.js';
import {IslandCity} from './city.js';
import {readXlsx} from './excel-reader.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'&&['drive.google.com','docs.google.com','notebook.google.com'].includes(u.hostname)?u.href:'#'}catch{return '#'}};
const fmt=d=>d?d.replaceAll('-','.'):'未填寫';
const themeName=id=>THEMES.find(t=>t.id===id)?.name||'全部主題';
const state={kind:'rfi',category:'all',source:'all',status:'all',search:'',sort:'latest'};
let records=[],baseData,bundles=[],resources={files:[]},city,filtered=[],previousFocus,currentDetail;
let stars=new Set();try{stars=new Set(JSON.parse(localStorage.getItem('cpc-rfi-stars')||'[]'))}catch{}
let speechEnabled=true;try{speechEnabled=JSON.parse(localStorage.getItem('cpc-rfi-speech')??'true')!==false}catch{}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
let toastTimer;function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200)}
function counts(){
 const rs=records.filter(r=>r.kind==='rfi'),p=rs.filter(r=>r.status==='pending').length,a=rs.filter(r=>r.status==='replied').length,v=rs.filter(r=>r.status==='verify').length,rate=rs.length?Math.round(a/rs.length*100):0;
 $('#statTotal').textContent=rs.length;$('#statPending').textContent=p;$('#statReplied').textContent=a;$('#navCount').textContent=rs.length;$('#rate').textContent=rate+'%';$('#rateBar').style.width=rate+'%';$('#verifyNote').textContent=v?`另有 ${v} 筆回覆資料待核對`:'依回覆日期及概要統計';
 const recent=rs.filter(r=>r.status==='pending').sort((a,b)=>(b.received||'').localeCompare(a.received||'')||a.code.localeCompare(b.code)).slice(0,3);
 $('#recentItems').innerHTML=recent.map(r=>`<button class="recent-item" data-key="${esc(r.key)}"><strong>${esc(r.code)}<span>${fmt(r.received)}</span></strong><p>${esc(r.title)}</p></button>`).join('')||'<span class="subtle">目前沒有待回覆事項</span>';
 const imported=bundles.filter(b=>b.importedAt);$('#sourceLabel').textContent=imported.length?'本機匯入 · '+new Date(imported.sort((a,b)=>b.importedAt.localeCompare(a.importedAt))[0].importedAt).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei',month:'2-digit',day:'2-digit'}):'資料版本 2026.10.27';
 city?.updateCounts(records);
}
function filterRecords(){return records.filter(r=>r.kind===state.kind&&(state.category==='all'||r.theme===state.category)&&(state.source==='all'||r.source===state.source)&&(state.status==='all'||state.status==='changed'&&r.change||state.status==='starred'&&stars.has(r.key)||r.status===state.status)&&(!state.search||[r.code,r.title,r.reply,r.professional,r.drawings,r.raw.K,r.changeStage].join(' ').toLowerCase().includes(state.search.toLowerCase()))).sort((a,b)=>state.sort==='code'?a.code.localeCompare(b.code,'zh-Hant',{numeric:true}):state.sort==='oldest'?(a.received||'9999').localeCompare(b.received||'9999'):(b.received||'').localeCompare(a.received||''))}
function card(r){const days=daysWaiting(r),waiting=r.status==='pending'&&days!==null?`等待 ${days} 天`:fmt(r.received),isStar=stars.has(r.key);return `<article class="rfi-card" tabindex="0" role="button" aria-label="${esc(r.code+' '+r.title+' '+STATUS[r.status])}" data-key="${esc(r.key)}"><div class="card-top"><span class="card-code">${esc(r.code)}</span><span class="badge ${r.status}">${STATUS[r.status]}</span></div><h3>${esc(r.title)}</h3><div class="card-bottom"><span>${themeName(r.theme)}</span><span>${r.source}表</span>${r.change?'<span>↻ 變更</span>':''}<span>${waiting}</span><button class="star-button ${isStar?'starred':''}" data-star="${esc(r.key)}" aria-label="${isStar?'取消關注':'關注'} ${esc(r.code)}" aria-pressed="${isStar}">${isStar?'★':'☆'}</button></div></article>`}
function renderList(){
 filtered=filterRecords();$('#resultCount').textContent=`${filtered.length} 筆${state.kind==='rfi'?' RFI 釋疑':'變更明細'}${state.category!=='all'?' · '+themeName(state.category):''}`;
 $('#resultList').innerHTML=filtered.length?filtered.map(card).join(''):'<div class="empty">這裡暫時沒有符合條件的事項。<br>試試其他關鍵字或篩選條件。<br><button id="clearFilters">清除篩選</button></div>';
 $('#drawerTitle').textContent=state.category==='all'?'釋疑總覽':themeName(state.category)+'島';
 $('#categoryFilter').value=state.category;$('#sourceFilter').value=state.source;$('#search').value=state.search;$('#sortFilter').value=state.sort;
 document.querySelectorAll('[data-status]').forEach(b=>b.classList.toggle('selected',b.dataset.status===state.status));document.querySelectorAll('[data-kind]').forEach(b=>b.classList.toggle('selected',b.dataset.kind===state.kind));
}
function openDrawer(panel='list'){
 previousFocus=document.activeElement;$('#drawer').hidden=false;$('#drawerOverlay').hidden=false;document.body.style.overflow='hidden';
 $('.header').inert=true;$('#main').inert=true;
 syncSpeechSuspension();
 $('#listPanel').hidden=panel!=='list';$('#resourcePanel').hidden=panel!=='resource';$('#sourcePanel').hidden=panel!=='source';
 if(panel==='list'){renderList();$('#drawerEyebrow').textContent='RFI EXPLORER'}
 if(panel==='resource'){renderResources();$('#drawerTitle').textContent='圖說資料庫';$('#drawerEyebrow').textContent='DRAWINGS & KNOWLEDGE'}
 if(panel==='source'){renderSources();$('#drawerTitle').textContent='資料與更新';$('#drawerEyebrow').textContent='DATA SOURCES'}
 $('#closeDrawer').focus();document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.id===(panel==='resource'?'resourceView':panel==='list'?'listView':'cityView')));
}
function closeDrawer(){
 $('#drawer').hidden=true;$('#drawerOverlay').hidden=true;document.body.style.overflow='';$('.header').inert=false;$('#main').inert=false;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.id==='cityView'));previousFocus?.focus();
 syncSpeechSuspension();
}
function explore(theme='all',status='all'){state.kind='rfi';state.category=theme==='center'?'all':theme;state.status=status;state.search='';state.source='all';city?.select(theme==='all'?null:theme);openDrawer('list')}
function toggleStar(key){stars.has(key)?stars.delete(key):stars.add(key);if(!store('cpc-rfi-stars',[...stars]))toast('瀏覽器未允許儲存，關注僅保留至本次瀏覽。');renderList();if(currentDetail===key&&$('#detailDialog').open)renderDetail(key)}
function renderDetail(key){
 const r=records.find(r=>r.key===key);if(!r)return;currentDetail=key;const days=daysWaiting(r),logs=[...r.logs].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,12),related=records.filter(v=>v.key!==key&&v.code.replace(/-\d$/,'')===r.code.replace(/-\d$/,''));
 $('#detailContent').innerHTML=`<div class="detail-head"><div class="detail-top"><span class="card-code">${esc(r.code)}</span><button id="closeDetail" class="icon-button" aria-label="關閉釋疑詳情">✕</button></div><h2 id="detailTitle">${esc(r.title)}</h2><div class="detail-tags"><span class="badge ${r.status}">${STATUS[r.status]}</span><span>${themeName(r.theme)}</span><span>·</span><span>${r.source}管理表</span>${r.change?`<span class="badge change">${esc(r.changeStage)}</span>`:''}</div></div>
 <div class="detail-body"><dl class="meta-grid"><div><dt>來文日期（原表）</dt><dd>${esc(r.raw.B||'未填寫')}${r.received?`<br><small class="subtle">${fmt(r.received)}</small>`:''}</dd></div><div><dt>九典回覆日期（原表）</dt><dd>${esc(r.raw.C||'未填寫')}</dd></div><div><dt>原表專業／備註</dt><dd>${esc(r.professional)}</dd></div><div><dt>涉及圖號／契約變更欄</dt><dd>${esc(r.drawings||'未填寫')}</dd></div><div><dt>設計圖修改</dt><dd>${esc(r.raw.J||'未勾選')}</dd></div><div><dt>預算數量變更</dt><dd>${esc(r.raw.K||'未勾選')}</dd></div></dl>
 ${r.status==='pending'?`<div class="reply-text" style="color:#ae8553">管理表尚未記錄回覆。${days!==null?`自來文日起等待 ${days} 天。`:''}<br><small>未設定契約回覆期限；等待天數不等於逾期。</small></div>`:''}
 <h3>回覆概要</h3><div class="reply-text">${esc(r.reply||'原表尚未填寫回覆概要。')}</div>
 ${r.status==='verify'?'<p class="detail-note">本筆回覆日期或回覆概要尚有缺漏，列為待核對。請確認原表後補齊。</p>':''}
 ${(r.raw.L||r.raw.M||r.raw.N||r.raw.O)?`<h3>專業協作紀錄</h3><dl class="meta-grid">${[['M','機電收到RFI日期'],['L','寶翔回覆日期'],['N','水利技師回覆日期'],['O','空調技師回覆日期']].filter(([c])=>r.raw[c]).map(([c,n])=>`<div><dt>${n}</dt><dd>${esc(r.raw[c])}</dd></div>`).join('')}</dl>`:''}
 <h3>用印回覆與來源附件 <small>(${r.files.length})</small></h3>${r.files.length?r.files.map(f=>`<a class="file-link" href="${esc(safeUrl(f.url))}" target="_blank" rel="noopener noreferrer"><span>${esc(f.name)}</span><span>↗</span></a>`).join(''):'<p class="detail-note">寄信紀錄中沒有可連結的附件；可至原始管理表或圖說資料庫查找。</p>'}
 ${logs.length?`<h3>寄信紀錄</h3><div class="record-history">${logs.map(l=>`<div><b>${fmt(l.date)} · 原表記載：${esc(l.result||'未填寫')}</b>${esc(l.title||r.code)}</div>`).join('')}</div><p class="detail-note">顯示最近 ${logs.length} 筆寄信紀錄。寄信成功不代表已結案。</p>`:''}
 ${related.length?`<h3>同編號續辦事項</h3>${related.map(v=>`<button class="file-link" style="width:100%;text-align:left" data-related="${esc(v.key)}"><span>${esc(v.code)} · ${esc(v.title)}</span><span>↗</span></button>`).join('')}`:''}
 <p class="detail-note">資料來源：${esc(bundles.find(b=>b.source===r.source)?.name||r.source)}<br>工作表「${esc(r.sheet)}」第 ${r.row} 列。導覽主題依文字整理，原始分類保留於上方。已回覆不代表已結案。</p>
 <div class="detail-actions"><button data-star="${esc(r.key)}">${stars.has(r.key)?'★ 已關注':'☆ 關注這項釋疑'}</button><button id="copyCode">複製編號</button></div></div>`;
}
function showDetail(key){renderDetail(key);if(!$('#detailDialog').open)$('#detailDialog').showModal();$('#detailDialog').scrollTop=0;$('#closeDetail').focus();syncSpeechSuspension()}
function renderResources(){
 $('#resourcePanel').innerHTML=`<p class="resource-count">核定文件目錄 · ${resources.files.length} 份檔案／資料夾<br>目錄擷取於 2026.10.27，原檔權限由 Google Drive 管理。</p><label class="search-box"><span>⌕</span><input id="resourceSearch" type="search" aria-label="搜尋圖說" placeholder="搜尋建築、電力、給水、消防…"></label><div class="source-card"><h3>專案知識庫</h3><p>前往 NotebookLM 查找專案資料。此平台尚未讀取或同步筆記本內容。</p><a href="https://notebook.google.com/notebook/6d7fb7e9-3d79-4e4d-8bae-bd8c0d9904a3" target="_blank" rel="noopener noreferrer">開啟 NotebookLM ↗</a></div><div id="resourceList"></div><div class="source-card"><a href="${esc(safeUrl(resources.folderUrl))}" target="_blank" rel="noopener noreferrer">開啟完整核定文件資料夾 ↗</a></div>`;
 renderResourceList('');
}
function renderResourceList(q){const files=resources.files.filter(f=>f.title.toLowerCase().includes(q.toLowerCase()));$('#resourceList').innerHTML=files.map(f=>`<a class="resource-card" href="${esc(safeUrl(f.url))}" target="_blank" rel="noopener noreferrer"><h3>${esc(f.title)} ↗</h3><p><span>${f.type.includes('folder')?'資料夾':'PDF · '+(Number(f.size)/1048576).toFixed(1)+' MB'}</span><span>${f.modified?'更新 '+fmt(f.modified.slice(0,10)):''}</span></p></a>`).join('')||'<div class="empty">沒有符合的圖說。</div>'}
function renderSources(){
 if(!$('#sourcePanel').hidden)$('#drawerTitle').textContent='資料與更新';
 $('#sourcePanel').innerHTML=`<div class="source-card"><h3>目前資料狀態</h3><span class="badge pending">雲端自動同步尚未啟用</span><p>已發布的初始版本使用你提供的兩份 Excel 管理表。匯入更新版後，城市統計與釋疑清單會立即更新。更新僅保存在此瀏覽器，不會寫入原表或其他人的畫面。</p><button id="importExcel">匯入更新版 Excel ↗</button><button id="resetData">還原已發布資料</button></div>
 ${bundles.map(b=>`<div class="source-card"><h3>${b.source}釋疑管理表</h3><p>${esc(b.name)}</p><small>${b.importedAt?'本機匯入：'+new Date(b.importedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'隨網站發布 · 2026.10.27'}<br>${records.filter(r=>r.source===b.source&&r.kind==='rfi').length} 筆 RFI · ${records.filter(r=>r.source===b.source&&r.kind==='change').length} 筆審查／需求變更明細</small></div>`).join('')}
 <div class="source-card"><h3>統計與分類原則</h3><p>① RFI 依編號計數，寄信紀錄及審查變更明細分開呈現。<br>② 同時有回覆日期與概要才列「已回覆」；缺一則待核對；兩者皆無則待回覆。<br>③ 無主旨的空白列與「-」占位列不納入。<br>④ 變更依原表 I 欄記載；未勾選不代表已確認無變更。<br>⑤ 民國日期轉西元；缺日日期保留到月份，不猜測日期。<br>⑥ 九個島嶼是導覽分類；原表專業與原文完整保留。<br>⑦ 已回覆不代表已結案。</p></div><div class="source-card"><h3>關於這座城市</h3><p>以「政策島」的六角城市探索、清單導覽與議題關聯為互動靈感，重新製作工程釋疑的微縮模型城市。可拖曳旋轉、縮放，或直接以文字清單操作。</p><a href="https://puma.taipei/heart-island" target="_blank" rel="noopener noreferrer">互動靈感：政策島 ↗</a></div>`;
}
function exportCsv(){
 const headers=['項次','主旨','來源管理表','工作表','來源列號','主題','原表專業','狀態','來文日期(原表)','回覆日期(原表)','回覆概要','變更階段','設計圖修改','預算數量變更','圖號或契約變更'];
 const values=filtered.map(r=>[r.code,r.title,r.source,r.sheet,r.row,themeName(r.theme),r.professional,STATUS[r.status],r.raw.B||'',r.raw.C||'',r.reply,r.changeStage,r.raw.J||'',r.raw.K||'',r.drawings]);
 const cell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
 const text='\uFEFF'+[headers,...values].map(row=>row.map(cell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='CPC_RFI_'+new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'})+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast(`已匯出 ${filtered.length} 筆篩選結果`);
}
function bind(){
 $('#categoryFilter').insertAdjacentHTML('beforeend',THEMES.map(t=>`<option value="${t.id}">${t.name}</option>`).join(''));
 $('#cityView').onclick=()=>{closeDrawer();city?.reset()};$('#listView').onclick=()=>explore();$('#mobileMenu').onclick=()=>explore();$('#resourceView').onclick=()=>openDrawer('resource');$('#sourceView').onclick=()=>openDrawer('source');$('#aboutView').onclick=()=>openDrawer('source');$('#closeDrawer').onclick=closeDrawer;$('#drawerOverlay').onclick=closeDrawer;
 $('#pendingView').onclick=()=>explore('all','pending');$('#allRecent').onclick=()=>explore('all','pending');document.querySelectorAll('[data-stat]').forEach(b=>b.onclick=()=>explore('all',b.dataset.stat));
 $('#search').addEventListener('input',e=>{state.search=e.target.value;renderList();$('#search').focus()});$('#categoryFilter').onchange=e=>{state.category=e.target.value;city?.select(state.category);renderList()};$('#sourceFilter').onchange=e=>{state.source=e.target.value;renderList()};$('#sortFilter').onchange=e=>{state.sort=e.target.value;renderList()};
 $('#kindFilter').onclick=e=>{const b=e.target.closest('[data-kind]');if(b){state.kind=b.dataset.kind;state.status='all';renderList()}};$('#statusFilters').onclick=e=>{const b=e.target.closest('[data-status]');if(b){state.status=b.dataset.status;renderList()}};
 $('#exportCsv').onclick=exportCsv;$('#rotateLeft').onclick=()=>city?.rotate();$('#resetView').onclick=()=>city?.reset();$('#zoomOut').onclick=()=>city?.zoomBy(-.12);$('#zoomIn').onclick=()=>city?.zoomBy(.12);
 $('#pauseAnimation').onclick=()=>{if(city){city.toggleAnimation();syncAnimationButton()}};
 $('#toggleSpeech').onclick=()=>{speechEnabled=!speechEnabled;store('cpc-rfi-speech',speechEnabled);city?.speech.setEnabled(speechEnabled);syncSpeechButton()};
 $('#helpView').onclick=()=>{$('#helpDialog').showModal();syncSpeechSuspension()};$('#closeHelp').onclick=()=>$('#helpDialog').close();$('#beginExplore').onclick=()=>$('#helpDialog').close();
 for(const dialog of [$('#detailDialog'),$('#helpDialog')])dialog.addEventListener('close',syncSpeechSuspension);
 document.addEventListener('click',e=>{
  const star=e.target.closest('[data-star]');if(star){e.stopPropagation();toggleStar(star.dataset.star);return}
  const related=e.target.closest('[data-related]');if(related){showDetail(related.dataset.related);return}
  const row=e.target.closest('[data-key]');if(row){showDetail(row.dataset.key);return}
  if(e.target.closest('#closeDetail')){$('#detailDialog').close();currentDetail=null}
  if(e.target.closest('#clearFilters')){Object.assign(state,{category:'all',source:'all',status:'all',search:''});renderList()}
  if(e.target.closest('#importExcel'))$('#excelInput').click();
  if(e.target.closest('#resetData')){bundles=structuredClone(baseData.bundles);store('cpc-rfi-imports',[]);records=normalize(bundles);counts();renderSources();toast('已還原網站發布時的資料版本。')}
  if(e.target.closest('#copyCode')){const code=records.find(r=>r.key===currentDetail)?.code;navigator.clipboard?.writeText(code).then(()=>toast('已複製 '+code)).catch(()=>toast('請選取上方編號複製。'))}
 });
 document.addEventListener('input',e=>{if(e.target.id==='resourceSearch')renderResourceList(e.target.value)});
 document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.classList.contains('rfi-card'))showDetail(e.target.dataset.key);
  if(e.key==='Escape'&&!$('#drawer').hidden&&!$('#detailDialog').open&&!$('#helpDialog').open)closeDrawer();
  if(e.key==='Tab'&&!$('#drawer').hidden&&!$('#detailDialog').open&&!$('#helpDialog').open){const f=[...$('#drawer').querySelectorAll('button,input,select,a,[tabindex="0"]')].filter(el=>el.offsetParent!==null),first=f[0],last=f.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 });
 $('#excelInput').onchange=async e=>{
  const files=[...e.target.files];if(!files.length)return;try{toast('正在讀取管理表…');const parsed=await Promise.all(files.map(readXlsx));if(new Set(parsed.map(b=>b.source)).size!==parsed.length)throw Error('同一專業請一次選擇一份管理表。');const updated=bundles.map(b=>parsed.find(n=>n.source===b.source)||b),normalized=normalize(updated);if(!normalized.length)throw Error('管理表沒有可匯入的有效資料。');bundles=updated;records=normalized;const saved=store('cpc-rfi-imports',bundles.filter(b=>b.importedAt));counts();renderList();renderSources();toast(`已更新 ${parsed.map(b=>b.source).join('、')}管理表${saved?'，僅儲存於此瀏覽器。':'；本次瀏覽有效，瀏覽器未允許儲存。'}`)}catch(err){toast(err.message||'匯入失敗，原有資料已保留。')}finally{e.target.value=''}
 };
}
async function init(){
 bind();try{
  const [d,r]=await Promise.all([fetch('data.json').then(r=>{if(!r.ok)throw Error('資料載入失敗');return r.json()}),fetch('resources.json').then(r=>r.json()).catch(()=>({files:[]}))]);baseData=d;bundles=structuredClone(d.bundles);resources=r;
  try{const imported=JSON.parse(localStorage.getItem('cpc-rfi-imports')||'[]');for(const b of imported){if(['建築','機電'].includes(b.source)&&Array.isArray(b.sheets)){const i=bundles.findIndex(s=>s.source===b.source);if(i>=0)bundles[i]=b}}}catch{}
  records=normalize(bundles);try{city=new IslandCity($('#world'),$('#islandLabels'),theme=>explore(theme),key=>showDetail(key));city.speech.setEnabled(speechEnabled)}catch(err){console.error('City rendering:',err);toast('城市渲染暫不可用，仍可從釋疑總覽查詢。')}
  counts();syncAnimationButton();syncSpeechButton();$('#worldLoader').hidden=true;renderList();
 }catch(err){$('#worldLoader').textContent='資料載入失敗，請重新整理。';toast(err.message)}
}
function syncAnimationButton(){const b=$('#pauseAnimation'),label=city?.paused?'播放城市動畫':'暫停城市動畫';b.textContent=city?.paused?'▶':'Ⅱ';b.setAttribute('aria-label',label);b.title=label}
function syncSpeechButton(){const b=$('#toggleSpeech');b.textContent='💬 提問 '+(speechEnabled?'開':'關');b.setAttribute('aria-pressed',String(speechEnabled));b.title='最多同時兩個提問，約顯示 5 秒；點選查看詳情'}
function syncSpeechSuspension(){city?.speech.setSuspended(!$('#drawer').hidden||$('#detailDialog').open||$('#helpDialog').open)}
init();
