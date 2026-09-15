(function(){'use strict';
  if(!/\/home\.html$/i.test(location.pathname))return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>Number(v||0).toLocaleString('en-IN');
  const cfg=window.LAKSHYASETU_CONFIG||{};
  const base=(cfg.supabaseUrl||'')+'/rest/v1/';
  const hdr={apikey:cfg.supabasePublishableKey||'',Authorization:'Bearer '+(cfg.supabasePublishableKey||'')};
  const get=async path=>{const r=await Promise.race([fetch(base+path,{headers:hdr}),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),7000))]);if(!r.ok)throw new Error('Supabase request failed: '+r.status);return r.json()};
  const exam=c=>({UPSC:'UPSC Civil Services',APPSC_GROUP_1:'APPSC Group 1',APPSC_GROUP_2:'APPSC Group 2',APPSC_GROUP_4:'APPSC Group 4'}[String(c?.exam_code||'').toUpperCase()]||c?.title||'Examination');
  const fallbackSeries=[
    {id:1,course_id:1,title:'UPSC Prelims Test Series 2027',description:'Comprehensive UPSC Civil Services Preliminary Examination test series.',price:999},
    {id:2,course_id:2,title:'APPSC Group 1 Test Series 2027',description:'APPSC Group 1 Preliminary Examination Test Series 2027.',price:799},
    {id:3,course_id:3,title:'APPSC Group 2',description:'APPSC Group 2 preliminary examination practice.',price:599},
    {id:4,course_id:2,title:'Current Affairs Test Series',description:'Monthly current-affairs MCQs: six 50-question tests per month; ₹2 per test, ₹10 monthly and ₹100 yearly.',price:100}
  ];
  function render(series,courses,tests){
    const cm=new Map((courses||[]).map(c=>[Number(c.id),c]));
    const sm=new Map(series.map(s=>[Number(s.id),s]));
    const counts=new Map(),mcq=(tests||[]).reduce((n,t)=>n+Number(t.question_count||0),0);
    (tests||[]).forEach(t=>{const id=Number(t.test_series_id);counts.set(id,(counts.get(id)||0)+1)});
    const tc=document.getElementById('testCount'),mc=document.getElementById('mcqCount'),scn=document.getElementById('seriesCount');
    if(tc)tc.textContent=(tests||[]).length||6;if(mc)mc.textContent=money(mcq||300);if(scn)scn.textContent=series.length;
    const cards=document.getElementById('seriesCards');
    if(cards)cards.innerHTML=series.map(s=>{const c=cm.get(Number(s.course_id)),n=counts.get(Number(s.id))||0;return `<article class="card"><div class="meta"><span>${esc(exam(c))}</span><span>${n} published tests</span></div><h3>${esc(s.title)}</h3><p>${esc(s.description||'Structured MCQ test series for focused preparation.')}</p><div class="actions"><span class="price">${Number(s.price)>0?'₹'+money(s.price):'Free'}</span>${Number(s.price)>0?`<button class="mini-btn buy" onclick="window.LSBuy&&window.LSBuy({product_type:'test_series',test_series_id:${Number(s.id)}},'LakshyaSetu - Test Series')">Buy Series</button>`:''}<a class="btn primary" href="test-series.html?exam=${encodeURIComponent(c?.id||'')}&series=${encodeURIComponent(s.id)}">View Series</a></div></article>`}).join('');
    const pub=document.getElementById('testCards');
    if(pub){pub.innerHTML=(tests||[]).slice(0,9).map(t=>{const s=sm.get(Number(t.test_series_id));return `<article class="card"><div class="meta"><span>${esc(s?.title||'Published Test')}</span><span>${Number(t.question_count||0)} MCQs</span></div><h3>${esc(t.title||'Published Test')}</h3><p>${esc(t.description||'Practice this published test.')}</p><div class="actions"><span class="price">${Number(t.price||0)>0?'₹'+money(t.price):'Free'}</span><a class="btn primary" href="student-test.html?test=${Number(t.id)}">Open Test</a></div></div></article>`}).join('')||'<div class="empty">No published tests yet.</div>'}
  }
  async function run(){
    const cards=document.getElementById('seriesCards');if(!cards)return;
    try{
      const [series,courses,tests]=await Promise.all([
        get('ls_test_series?select=id,course_id,title,description,price&published=eq.true&archived=eq.false&order=id.asc'),
        get('ls_courses?select=id,title,exam_code&published=eq.true&archived=eq.false&order=id.asc'),
        get('ls_tests?select=id,test_series_id,title,description,price,question_count&published=eq.true&archived=eq.false&order=id.desc')
      ]);
      render(series||[],courses||[],tests||[]);
    }catch(e){
      render(fallbackSeries,[{id:1,title:'UPSC Civil Services',exam_code:'UPSC'},{id:2,title:'APPSC Group 1',exam_code:'APPSC_GROUP_1'},{id:3,title:'APPSC Group 2',exam_code:'APPSC_GROUP_2'}],[]);
      console.warn('LakshyaSetu home data recovery:',e);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,150),{once:true});else setTimeout(run,150);
})();
