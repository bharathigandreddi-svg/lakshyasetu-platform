window.LAKSHYASETU_CONFIG={supabaseUrl:"https://byounbmdyuytoqqyhgos.supabase.co",supabasePublishableKey:"sb_publishable_tCvBH8eh95-nXOChd2_sLQ__iDZIfNa"};
function createRestFallback(){const base=window.LAKSHYASETU_CONFIG.supabaseUrl+'/rest/v1/';const key=window.LAKSHYASETU_CONFIG.supabasePublishableKey;function from(table){let params=[];let selectFields='*';let orderBy='';let orderAsc=true;const api={select(fields){selectFields=fields||'*';return api},eq(field,value){params.push(encodeURIComponent(field)+'=eq.'+encodeURIComponent(value));return api},order(field,opts){orderBy=field;orderAsc=!(opts&&opts.ascending===false);return api},limit(n){params.push('limit='+encodeURIComponent(n));return api},then(resolve,reject){let u=base+encodeURIComponent(table)+'?select='+encodeURIComponent(selectFields);if(params.length)u+='&'+params.join('&');if(orderBy)u+='&order='+encodeURIComponent(orderBy)+(orderAsc?'.asc':'.desc');fetch(u,{headers:{apikey:key,Authorization:'Bearer '+key}}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.message||data.error||('Supabase request failed: '+r.status));return {data,error:null}}).then(resolve,reject)}};return api}return {from};}
function getLakshyaSetuDb(){if(window.db&&typeof window.db.from==='function')return window.db;if(window.supabase&&typeof window.supabase.createClient==='function'){const client=window.supabase.createClient(window.LAKSHYASETU_CONFIG.supabaseUrl,window.LAKSHYASETU_CONFIG.supabasePublishableKey);window.db=client;window.LAKSHYASETU_DB=client;return client}const fallback=createRestFallback();window.db=fallback;window.LAKSHYASETU_DB=fallback;return fallback}
try{getLakshyaSetuDb()}catch(e){console.error("Supabase initialization failed:",e)}
window.addEventListener("load",function(){try{const videoUrl=document.getElementById("lessonVideo"),pdfUrl=document.getElementById("lessonPdf");if(!videoUrl||!pdfUrl)return;const vw=videoUrl.parentElement,pw=pdfUrl.parentElement,vf=document.createElement("input"),pf=document.createElement("input");vf.type="file";vf.id="lessonVideoFile";vf.accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";pf.type="file";pf.id="lessonPdfFile";pf.accept="application/pdf,.pdf";const vh=document.createElement("div"),ph=document.createElement("div"),vc=document.createElement("div"),pc=document.createElement("div");vh.textContent="Or choose a video file; Save uploads it automatically.";ph.textContent="Or choose a PDF file; Save uploads it automatically.";[vh,ph,vc,pc].forEach(x=>x.style.cssText="font-size:12px;color:#64748b;margin-top:5px;word-break:break-all");const vl=vw.querySelector("label"),pl=pw.querySelector("label");if(vl)vl.textContent="Video URL";if(pl)pl.textContent="PDF File";vw.append(vf,vh,vc);pdfUrl.type="hidden";pw.append(pf,ph,pc);const os=window.saveLesson,oe=window.editLesson,oc=window.clearLesson;window.saveLesson=async function(){try{const c=getLakshyaSetuDb(),topicId=document.getElementById("lessonTopic").value||"general",v=vf.files?.[0],p=pf.files?.[0];if(v){if(v.size>100*1024*1024)throw new Error("Video must be 100 MB or smaller.");const path=topicId+"/"+Date.now()+"-"+v.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-"),r=await c.storage.from("lesson-videos").upload(path,v,{cacheControl:"3600",upsert:false,contentType:v.type||"video/mp4"});if(r.error)throw r.error;document.getElementById("lessonVideo").value=c.storage.from("lesson-videos").getPublicUrl(path).data.publicUrl;vc.textContent="Video uploaded successfully."}if(p){if(p.size>25*1024*1024)throw new Error("PDF must be 25 MB or smaller.");const path=topicId+"/"+Date.now()+"-"+p.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-"),r=await c.storage.from("lesson-pdfs").upload(path,p,{cacheControl:"3600",upsert:false,contentType:"application/pdf"});if(r.error)throw r.error;document.getElementById("lessonPdf").value=c.storage.from("lesson-pdfs").getPublicUrl(path).data.publicUrl;pc.textContent="PDF uploaded successfully."}await os();vf.value="";pf.value=""}catch(e){if(window.notice)notice(e.message||"File upload failed.",true);else alert(e.message||"File upload failed.")}};window.editLesson=function(id){oe(id);vc.textContent=document.getElementById("lessonVideo").value?"Current video attached. Select a new file to replace it.":"";pc.textContent=document.getElementById("lessonPdf").value?"Current PDF attached. Select a new file to replace it.":"";vf.value="";pf.value=""};window.clearLesson=function(){oc();vf.value="";pf.value="";vc.textContent="";pc.textContent=""}}catch(e){console.error("Lesson file upload setup failed:",e)}});
window.addEventListener("load",function(){if(!window.__LS_PAYMENT_V6_ACTIVE){const s=document.createElement("script");s.src="payments-v2.js?v=20260901-2115";s.defer=true;document.head.appendChild(s)}});
window.addEventListener("load",function(){const s=document.createElement("script");s.src="test-attempts-v6.js?v=20260903-1600";s.defer=true;document.head.appendChild(s)});
window.addEventListener("load",function(){const s=document.createElement("script");s.src="exam-experience-v8.js?v=20260903-1600";s.defer=true;document.head.appendChild(s)});
window.addEventListener("load",function(){const s=document.createElement("script");s.src="exam-polish-v1.js?v=20260903-1600";s.defer=true;document.head.appendChild(s)});
window.addEventListener("load",function(){const s=document.createElement("script");s.src="student-dashboard.js?v=20260903-1600";s.defer=true;document.head.appendChild(s)});

// Results-page QA fix: Attempted Rate = Attempted / Total x 100.
if(location.pathname.endsWith('/student-results.html')||location.pathname.endsWith('student-results.html')){
  const addAttemptedRate=()=>{
    const detail=document.getElementById('detail');
    if(!detail||detail.dataset.attemptedRateFixed)return;
    const stat=[...detail.querySelectorAll('.stat')].find(el=>el.querySelector('b')?.textContent.trim()==='Attempted');
    if(!stat)return;
    const m=stat.querySelector('strong')?.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    if(!m)return;
    const attempted=Number(m[1]),total=Number(m[2]);
    const rateStat=document.createElement('div');rateStat.className='stat';rateStat.innerHTML='<b>Attempted Rate</b><strong>'+(total?((attempted/total)*100).toFixed(1):'0.0')+'%</strong>';
    stat.parentElement.appendChild(rateStat);detail.dataset.attemptedRateFixed='1';
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addAttemptedRate,{once:true});else addAttemptedRate();
}

// Homepage: the individual Published Tests block is intentionally removed; tests remain inside Test Series.
if(location.pathname.endsWith('/home.html')||location.pathname==='/'||location.pathname.endsWith('/')){
  const hidePublishedTests=()=>{
    const heading=[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='Published Tests');
    if(heading?.closest('section'))heading.closest('section').style.display='none';
  };
  const arrangeHomepageCA=()=>{
    const cards=document.getElementById('seriesCards');if(!cards)return;
    const card=[...cards.querySelectorAll('.card')].find(el=>/current\s*affairs/i.test(el.querySelector('h3')?.textContent||''));
    if(card&&!card.dataset.caMonthly){card.innerHTML='<div class="meta"><span>Current Affairs</span><span>Year → Month → 6 Tests</span><span>50 MCQs each</span></div><h3>Current Affairs Test Series</h3><p>Monthly current affairs practice — 6 tests per month. Individual Test ₹2 · Month ₹10 · Year ₹100.</p><div class="actions"><span class="price">Monthly Practice</span><a class="btn primary" href="current-affairs-tests.html">Practice CA Tests →</a></div>';card.dataset.caMonthly='1';}
    const lower=[...document.querySelectorAll('a')].find(a=>a.textContent.trim()==='Practice CA Tests'&&a.closest('.ca-card'));if(lower)lower.remove();
  };
  const boot=()=>{hidePublishedTests();arrangeHomepageCA();const target=document.getElementById('seriesCards');if(target)new MutationObserver(()=>{hidePublishedTests();arrangeHomepageCA()}).observe(target,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}

// Current Affairs Test Series uses Year → Month → 6 Tests presentation.
if(location.pathname.endsWith('/test-series.html')){
  const arrangeCASeries=()=>{
    const params=new URLSearchParams(location.search),seriesId=Number(params.get('series')||0),title=document.getElementById('title'),content=document.getElementById('content');
    if(!seriesId||!content||!title)return;
    const isCA=seriesId===4||/current\s*affairs/i.test(title.textContent||'');if(!isCA||content.dataset.caMonthly)return;
    title.textContent='Current Affairs Test Series';const sub=document.getElementById('sub');if(sub)sub.textContent='Year → Month → 6 Tests';const crumb=document.getElementById('crumb');if(crumb)crumb.innerHTML='<a class="back" href="test-series.html">← All Test Series</a>';
    content.innerHTML='<div class="card"><div class="row"><div><h2>Current Affairs Test Series</h2><p class="meta">Monthly current-affairs MCQs: six 50-question tests per month · ₹2 per test · ₹10 monthly · ₹100 yearly.</p></div><button class="btnx buy" type="button" onclick="window.LSBuy?window.LSBuy({product_type:\'current_affairs_year\',product_key:\'2026\'},\'LakshyaSetu - Current Affairs 2026 — Year Package\'):alert(\'Payment module is loading. Please try again\')">Buy Year ₹100</button></div><div class="actions"><a class="btnx" href="current-affairs-tests.html">Open Monthly Current Affairs Tests →</a></div></div>';content.dataset.caMonthly='1';
  };
  const boot=()=>{arrangeCASeries();const c=document.getElementById('content');if(c)new MutationObserver(arrangeCASeries).observe(c,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
