/* LakshyaSetu multilingual test layer — additive only.
   English remains the source. Telugu/Hindi translations live separately in
   ls_test_question_translations, so existing questions are never rewritten. */
(function(){
  const KEY='ls_test_language';
  const labels={en:'English',te:'తెలుగు',hi:'हिन्दी'};
  const getLang=()=>localStorage.getItem(KEY)||'en';
  const setLang=l=>{localStorage.setItem(KEY,l);window.dispatchEvent(new CustomEvent('ls-language-change',{detail:l}));};
  window.LSLanguage={get:getLang,set:setLang,labels};
  function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));}
  function selector(host){
    if(!host||host.dataset.lsLangReady)return;
    host.dataset.lsLangReady='1';
    const box=document.createElement('div');box.style.cssText='display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:10px 0';
    const lab=document.createElement('span');lab.textContent='Language';lab.style.cssText='font-size:12px;font-weight:800;color:#64748b';box.appendChild(lab);
    const select=document.createElement('select');select.id='lsLanguage';select.style.cssText='padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font-weight:700';
    Object.entries(labels).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v;select.appendChild(o)});
    select.value=getLang();select.onchange=()=>setLang(select.value);box.appendChild(select);host.prepend(box);
  }
  async function loadTranslations(testId){
    if(!testId||!window.getLakshyaSetuDb)return {};
    try{const db=getLakshyaSetuDb();const r=await db.from('ls_test_question_translations').select('test_question_id,language,question,option_a,option_b,option_c,option_d,explanation,statements').eq('language',getLang());if(r.error)throw r.error;const out={};(r.data||[]).forEach(x=>out[x.test_question_id]=x);return out}catch(e){console.warn('Translation layer unavailable; English fallback active.',e);return {}}
  }
  function installStudent(){
    const app=document.getElementById('app');const qbox=document.getElementById('question');if(!app||!qbox)return;
    selector(document.querySelector('.bar')||app);
    let cache={};
    const apply=async()=>{
      const lang=getLang();
      const qs=window.__LS_QS__;
      if(!Array.isArray(qs)||!qs.length)return;
      if(lang==='en'){if(window.__LS_RENDER_NATIVE__)window.__LS_RENDER_NATIVE__();return;}
      if(!Object.keys(cache).length)cache=await loadTranslations(Number(new URLSearchParams(location.search).get('test')||new URLSearchParams(location.search).get('test_id')));
      const q=qs[window.__LS_CUR__];const tr=q&&cache[q.id];
      if(!tr){if(window.__LS_RENDER_NATIVE__)window.__LS_RENDER_NATIVE__();return;}
      const escq=esc(tr.question||q.question),opts=['a','b','c','d'].map(k=>'<button class="opt '+((window.__LS_ANS__||{})[window.__LS_CUR__]===k?'sel':'')+'" data-k="'+k+'"><b>'+k.toUpperCase()+'.</b> '+esc(tr['option_'+k]||q['option_'+k])+'</button>').join('');
      qbox.querySelector('h2')?.replaceChildren(document.createTextNode(escq));
      const h=qbox.querySelector('h2');if(h)h.innerHTML=escq.replace(/<button[\s\S]*$/,'');
    };
    window.addEventListener('ls-language-change',()=>{cache={};if(window.__LS_RENDER_NATIVE__)window.__LS_RENDER_NATIVE__();setTimeout(apply,0)});
    const mo=new MutationObserver(()=>{if(window.__LS_QS__)setTimeout(apply,0)});mo.observe(qbox,{childList:true,subtree:true});
  }
  function installHome(){
    const nav=document.querySelector('.nav');if(!nav||nav.dataset.lsLangHome)return;nav.dataset.lsLangHome='1';
    const box=document.createElement('label');box.style.cssText='display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#52677d';box.innerHTML='<span>Language</span>';
    const s=document.createElement('select');s.style.cssText='padding:7px 8px;border:1px solid #cfd9e5;border-radius:8px;background:#fff;color:#173b67;font-weight:700';Object.entries(labels).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v;s.appendChild(o)});s.value=getLang();s.onchange=()=>setLang(s.value);box.appendChild(s);nav.appendChild(box);
  }
  function installAdmin(){
    const app=document.getElementById('app');if(!app||app.dataset.lsLangAdmin)return;app.dataset.lsLangAdmin='1';
    const card=document.createElement('div');card.className='card';card.style.marginTop='15px';card.innerHTML='<h2>Translation Setup</h2><p class="muted">English is the master MCQ. Telugu and Hindi versions are stored separately for new tests, so existing questions and the current payment/test workflow are not changed.</p><div class="msg">Next-test workflow: save the English MCQs first; translations can then be attached to the same question IDs. Students choose English / తెలుగు / हिन्दी without changing the correct answer or scoring.</div>';
    app.appendChild(card);
  }
  function boot(){
    if(location.pathname.endsWith('/home.html')||location.pathname==='/'||location.pathname.endsWith('/'))installHome();
    if(location.pathname.endsWith('/admin-test-builder.html'))installAdmin();
    if(location.pathname.endsWith('/student-test.html'))installStudent();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
