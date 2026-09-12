/* LakshyaSetu multilingual test layer — additive only. */
(function(){
  const KEY='ls_test_language', labels={en:'English',te:'తెలుగు',hi:'हिन्दी'};
  const getLang=()=>localStorage.getItem(KEY)||'en';
  const setLang=l=>{localStorage.setItem(KEY,l);window.dispatchEvent(new CustomEvent('ls-language-change',{detail:l}));};
  window.LSLanguage={get:getLang,set:setLang,labels};
  async function getTranslations(lang,testId){try{const db=getLakshyaSetuDb();let q=db.from('ls_test_question_translations').select('test_question_id,question,option_a,option_b,option_c,option_d,explanation,statements').eq('language',lang);if(testId)q=q.eq('test_id',testId);const r=await q;if(r.error)throw r.error;const out={};(r.data||[]).forEach(x=>out[x.test_question_id]=x);return out}catch(e){console.warn('Multilingual layer: English fallback active.',e);return {}}}
  function studentGate(){
    const app=document.getElementById('app'),status=document.getElementById('status');
    if(!app||!status)return;
    if(document.getElementById('lsLanguageGate'))return;
    app.classList.add('hidden');
    status.className='';
    status.innerHTML='<div id="lsLanguageGate" style="background:#fff;border:1px solid #dbe4ee;border-radius:14px;padding:24px;max-width:680px;margin:10px auto"><h1 style="margin-top:0;color:#173b67">Select Test Language</h1><p style="color:#526174">Choose the language in which you want to attempt this test. Your choice will be used for the questions and options.</p><div style="display:grid;gap:10px;margin-top:18px"><button data-lang="en" style="padding:14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;text-align:left;font-weight:800;cursor:pointer">English</button><button data-lang="te" style="padding:14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;text-align:left;font-weight:800;cursor:pointer">తెలుగు</button><button data-lang="hi" style="padding:14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;text-align:left;font-weight:800;cursor:pointer">हिन्दी</button></div><p id="lsLangMsg" style="font-size:12px;color:#64748b;margin-bottom:0"></p></div>';
    document.querySelectorAll('#lsLanguageGate [data-lang]').forEach(btn=>btn.onclick=()=>{setLang(btn.dataset.lang);status.className='hidden';app.classList.remove('hidden');applyCurrentLanguage()});
  }
  let cache={},lastIndex=-1;
  async function applyCurrentLanguage(){
    const qbox=document.getElementById('question');if(!qbox)return;
    const lang=getLang();if(lang==='en'){cache={};return;}
    const m=(qbox.querySelector('p')?.textContent||'').match(/Question\s+(\d+)\s+of\s+(\d+)/i);if(!m)return;
    const index=Number(m[1])-1;
    const testId=Number(new URLSearchParams(location.search).get('test')||new URLSearchParams(location.search).get('test_id'));
    if(cache.__lang!==lang){cache=await getTranslations(lang,testId);cache.__lang=lang;}
    const qid=window.__LS_CURRENT_QUESTION_ID;
    let tr=qid?cache[qid]:null;
    if(!tr){
      const qs=window.__LS_TRANSLATION_QS||[];const q=qs[index];tr=q&&cache[q.id];
    }
    if(!tr)return;
    const h=qbox.querySelector('h2');if(h)h.textContent=tr.question||h.textContent;
    const opts=[...qbox.querySelectorAll('.opt')];['a','b','c','d'].forEach((k,i)=>{const b=opts[i];if(!b)return;b.innerHTML='<b>'+k.toUpperCase()+'.</b> '+(tr['option_'+k]||'')});
  }
  function installStudent(){
    const app=document.getElementById('app'),qbox=document.getElementById('question');if(!app||!qbox)return;
    studentGate();
    const testId=Number(new URLSearchParams(location.search).get('test')||new URLSearchParams(location.search).get('test_id'));
    const loadQs=async()=>{try{const r=await getLakshyaSetuDb().from('ls_test_questions').select('id,question,option_a,option_b,option_c,option_d').eq('test_id',testId).order('display_order',{ascending:true});if(!r.error)window.__LS_TRANSLATION_QS=r.data||[]}catch(e){}};
    loadQs();
    window.addEventListener('ls-language-change',()=>{cache={};setTimeout(applyCurrentLanguage,100)});
    new MutationObserver(()=>setTimeout(applyCurrentLanguage,50)).observe(qbox,{childList:true,subtree:true});
  }
  function installStudentHub(){/* Language choice belongs inside a test, not on the home/dashboard. */}
  function installHome(){/* Intentionally no language selector on Home. */}
  function installAdmin(){const app=document.getElementById('app');if(!app||app.dataset.lsLangAdmin)return;app.dataset.lsLangAdmin='1';const card=document.createElement('div');card.className='card';card.style.marginTop='15px';card.innerHTML='<h2>Translation Setup</h2><p class="muted">English remains the master MCQ. Telugu and Hindi translations are stored separately for new tests, so existing questions, scoring, payments and the current workflow stay unchanged.</p><div class="msg">New-test flow: save English MCQs first; translations are attached to the same question IDs. Student chooses English / తెలుగు / हिन्दी when starting a test.</div>';app.appendChild(card)}
  function boot(){if(location.pathname.endsWith('/home.html')||location.pathname==='/'||location.pathname.endsWith('/'))installHome();if(location.pathname.endsWith('/student-test.html'))installStudent();if(location.pathname.endsWith('/student-v2.html'))installStudentHub();if(location.pathname.endsWith('/admin-test-builder.html'))installAdmin()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
