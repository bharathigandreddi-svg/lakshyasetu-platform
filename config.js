window.LAKSHYASETU_CONFIG={
  supabaseUrl:'https://byounbmdyuytoqqyhgos.supabase.co',
  supabasePublishableKey:'sb_publishable_tCvBH8eh95-nXOChd2_sLQ__iDZIfNa'
};
window.getLakshyaSetuDb=function(){
  if(window.__LS_DB)return window.__LS_DB;
  if(!window.supabase||!window.supabase.createClient)throw new Error('Supabase library is not available.');
  window.__LS_DB=window.supabase.createClient(
    window.LAKSHYASETU_CONFIG.supabaseUrl,
    window.LAKSHYASETU_CONFIG.supabasePublishableKey
  );
  return window.__LS_DB;
};

// Results-page QA fix: make Attempted Rate explicit without changing the DB schema.
if(location.pathname.endsWith('/student-results.html')||location.pathname.endsWith('student-results.html')){
  const addAttemptedRate=()=>{
    const detail=document.getElementById('detail');
    if(!detail||detail.dataset.attemptedRateFixed)return;
    const stat=[...detail.querySelectorAll('.stat')].find(el=>el.querySelector('b')?.textContent.trim()==='Attempted');
    if(!stat)return;
    const m=stat.querySelector('strong')?.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    if(!m)return;
    const attempted=Number(m[1]),total=Number(m[2]);
    const rate=total?attempted/total*100:0;
    const rateStat=document.createElement('div');
    rateStat.className='stat';
    rateStat.innerHTML='<b>Attempted Rate</b><strong>'+rate.toFixed(1)+'%</strong>';
    const grid=stat.parentElement;
    grid.appendChild(rateStat);
    detail.dataset.attemptedRateFixed='1';
  };
  const boot=()=>{
    addAttemptedRate();
    const detail=document.getElementById('detail');
    if(detail)new MutationObserver(addAttemptedRate).observe(detail,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}

// Homepage CA structure: keep Current Affairs monthly practice in the main Test Series area.
if(location.pathname.endsWith('/home.html')||location.pathname==='/'||location.pathname.endsWith('/')){
  const arrangeHomepageCA=()=>{
    const cards=document.getElementById('seriesCards');
    if(!cards)return;
    const card=[...cards.querySelectorAll('.card')].find(el=>/current\s*affairs/i.test(el.querySelector('h3')?.textContent||''));
    if(card&&!card.dataset.caMonthly){
      card.innerHTML='<div class="meta"><span>Current Affairs</span><span>Year → Month → 6 Tests</span><span>50 MCQs each</span></div><h3>Current Affairs Test Series</h3><p>Monthly current affairs practice — 6 tests per month. Individual Test ₹2 · Month ₹10 · Year ₹100.</p><div class="actions"><span class="price">Monthly Practice</span><a class="btn primary" href="current-affairs-tests.html">Practice CA Tests →</a></div>';
      card.dataset.caMonthly='1';
    }
    const lower=[...document.querySelectorAll('a')].find(a=>a.textContent.trim()==='Practice CA Tests'&&a.closest('.ca-card'));
    if(lower)lower.remove();
  };
  const bootCA=()=>{
    arrangeHomepageCA();
    const target=document.getElementById('seriesCards');
    if(target)new MutationObserver(arrangeHomepageCA).observe(target,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootCA,{once:true});else bootCA();
}

// Test Series page CA structure: Current Affairs is monthly, not static subject/topic based.
if(location.pathname.endsWith('/test-series.html')){
  const arrangeCASeries=()=>{
    const params=new URLSearchParams(location.search);
    const seriesId=Number(params.get('series')||0);
    if(!seriesId)return;
    const title=document.getElementById('title');
    const content=document.getElementById('content');
    if(!content||!title)return;
    const isCA=seriesId===4||/current\s*affairs/i.test(title.textContent||'');
    if(!isCA||content.dataset.caMonthly)return;
    title.textContent='Current Affairs Test Series';
    const sub=document.getElementById('sub');
    if(sub)sub.textContent='Year → Month → 6 Tests';
    const crumb=document.getElementById('crumb');
    if(crumb)crumb.innerHTML='<a class="back" href="test-series.html">← All Test Series</a>';
    content.innerHTML='<div class="card"><div class="row"><div><h2>Current Affairs Test Series</h2><p class="meta">Monthly current-affairs MCQs: six 50-question tests per month · ₹2 per test · ₹10 monthly · ₹100 yearly.</p></div><button class="btnx buy" type="button" onclick="window.LSBuy?window.LSBuy({product_type:\'current_affairs_year\',product_key:\'2026\'},\'LakshyaSetu - Current Affairs 2026 — Year Package\'):alert(\'Payment module is loading. Please try again\')">Buy Year ₹100</button></div><div class="actions"><a class="btnx" href="current-affairs-tests.html">Open Monthly Current Affairs Tests →</a></div></div>';
    content.dataset.caMonthly='1';
  };
  const bootCASeries=()=>{
    arrangeCASeries();
    const content=document.getElementById('content');
    if(content)new MutationObserver(arrangeCASeries).observe(content,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootCASeries,{once:true});else bootCASeries();
}
