/* LakshyaSetu multilingual test layer — stable server-backed translation. */
(function(){
  'use strict';
  if(window.__LS_MULTILINGUAL_TEST_V1_LOADED)return;
  window.__LS_MULTILINGUAL_TEST_V1_LOADED=true;
  const KEY='ls_test_language';
  const labels={en:'English',te:'తెలుగు',hi:'हिन्दी'};
  const getLang=()=>localStorage.getItem(KEY)||'en';
  const setLang=l=>{if(!labels[l])l='en';localStorage.setItem(KEY,l);window.dispatchEvent(new CustomEvent('ls-language-change',{detail:l}));};
  window.LSLanguage={get:getLang,set:setLang,labels};
  const config=window.LAKSHYASETU_CONFIG||{};
  let client=null;
  function db(){
    if(client)return client;
    if(window.supabase?.createClient){
      client=window.supabase.createClient(config.supabaseUrl||'https://byounbmdyuytoqqyhgos.supabase.co',config.supabasePublishableKey||'sb_publishable_tCvBH8eh95-nXOChd2_sLQ__iDZIfNa',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      return client;
    }
    return typeof getLakshyaSetuDb==='function'?getLakshyaSetuDb():null;
  }
  const testId=()=>{const p=new URLSearchParams(location.search);return Number(p.get('test')||p.get('test_id')||0)};
  async function loadQuestions(){const id=testId(),c=db();if(!id||!c)return [];try{const r=await c.from('ls_test_questions').select('id,question,option_a,option_b,option_c,option_d,explanation,statements').eq('test_id',id).order('display_order',{ascending:true});return r.error?[]:(r.data||[])}catch{return []}}
  async function loadStored(lang,qs){const c=db(),ids=qs.map(q=>q.id).filter(Boolean);if(!c||!ids.length||lang==='en')return [];try{const r=await c.from('ls_test_question_translations').select('test_question_id,question,option_a,option_b,option_c,option_d,explanation,statements').eq('language',lang).in('test_question_id',ids);return r.error?[]:(r.data||[])}catch{return []}}
  async function ensureStored(lang,qs){
    if(lang==='en'||!qs.length)return [];
    const c=db();
    try{
      if(c?.functions?.invoke){
        const r=await c.functions.invoke('translate-test',{body:{test_id:testId(),language:lang}});
        if(!r.error&&r.data?.ok)return await loadStored(lang,qs);
      }
    }catch(e){console.warn('LakshyaSetu translation service:',e)}
    return [];
  }
  async function translate(text,target){
    text=String(text||'');if(!text||target==='en')return text;
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
    try{
      const url='https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl='+encodeURIComponent(target)+'&dt=t&q='+encodeURIComponent(text);
      const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);
      const d=await r.json();return Array.isArray(d?.[0])?d[0].map(x=>x?.[0]||'').join('').trim()||text:text;
    }catch{return text}finally{clearTimeout(timer)}
  }
  window.LSTranslate={translate};
  function buttons(){return '<div style="display:grid;gap:10px;margin-top:18px"><button type="button" data-lang="en" style="padding:14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;text-align:left;font-weight:800;cursor:pointer">English</button><button type="button" data-lang="te" style="padding:14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;text-align:left;font-weight:800;cursor:pointer">తెలుగు</button><button type="button" data-lang="hi" style="padding:14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;text-align:left;font-weight:800;cursor:pointer">हिन्दी</button></div>'}
  function languageGate(){
    if(document.getElementById('lsLanguageGate'))return;
    const gate=document.createElement('div');gate.id='lsLanguageGate';gate.style.cssText='position:fixed;inset:0;background:rgba(15,35,63,.58);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
    gate.innerHTML='<div style="background:#fff;border:1px solid #dbe4ee;border-radius:16px;padding:28px;max-width:560px;width:100%;box-shadow:0 18px 50px rgba(15,35,63,.22)"><div style="font-size:11px;font-weight:900;color:#2457a6">LAKSHYASETU · TEST LANGUAGE</div><h1 style="margin:8px 0;color:#173b67">Select Test Language</h1><p style="color:#526174;line-height:1.5">Choose the language for the questions and options. Telugu and Hindi translations are generated from the English master questions.</p>'+buttons()+'<p id="lsLangMsg" style="font-size:12px;color:#64748b;margin:14px 0 0"></p></div>';
    document.body.appendChild(gate);
    gate.querySelectorAll('[data-lang]').forEach(b=>b.onclick=async()=>{
      setLang(b.dataset.lang);
      const msg=document.getElementById('lsLangMsg');
      if(msg)msg.textContent=b.dataset.lang==='en'?'Loading test…':'Preparing '+labels[b.dataset.lang]+' translation…';
      if(b.dataset.lang==='en'){gate.remove();return;}
      await apply();
      gate.remove();
    });
  }
  function status(text){const el=document.getElementById('lsLangMsg');if(el)el.textContent=text}
  function questionIndex(box,qs){
    const marker=[...box.querySelectorAll('p,.qnum')].map(x=>x.textContent||'').find(t=>/Question\s+\d+\s+of\s+\d+/i.test(t))||'';
    const m=marker.match(/Question\s+(\d+)\s+of\s+\d+/i);if(m)return Number(m[1])-1;
    const current=box.querySelector('.question')?.textContent?.trim()||box.querySelector('h2')?.textContent?.trim()||'';
    return qs.findIndex(q=>String(q.question||'').trim()===current);
  }
  async function applyBox(box,qs,map,lang){
    const i=questionIndex(box,qs);if(!box||i<0)return;
    const q=qs[i],tr=map[q.id]||{},fields=['question','option_a','option_b','option_c','option_d','statements','explanation'],values={};
    await Promise.all(fields.map(async n=>{if(q[n])values[n]=String(tr[n]||'').trim()||await translate(q[n],lang)}));
    const h=box.querySelector('.question')||box.querySelector('h2');if(h&&values.question)h.textContent=values.question;
    const opts=[...box.querySelectorAll('.option,.opt')];
    for(let j=0;j<4;j++){const k=['a','b','c','d'][j],b=opts[j];if(!b||!values['option_'+k])continue;const text=values['option_'+k];if(b.classList.contains('option')){const letter=b.querySelector('.letter')?.textContent?.trim()||k.toUpperCase()+'.';b.innerHTML='<span class="letter">'+letter+'</span><span>'+text+'</span>'}else b.innerHTML='<b>'+k.toUpperCase()+'.</b> '+text}
    const st=box.querySelector('.statement');if(st&&values.statements)st.innerHTML='<b>Statements / Data</b><br>'+values.statements;
    const ex=box.querySelector('.explanation');if(ex&&values.explanation)ex.textContent=values.explanation;
    box.dataset.lsTranslated=lang+':'+q.id;
  }
  let running=false;
  async function apply(){
    if(running)return;
    const lang=getLang();if(lang==='en')return;
    const qs=await loadQuestions();if(!qs.length)return;
    running=true;
    try{
      status('Preparing '+labels[lang]+' translation…');
      let rows=await loadStored(lang,qs);
      if(rows.length<qs.length){const generated=await ensureStored(lang,qs);if(generated.length)rows=generated}
      const map={};rows.forEach(x=>map[x.test_question_id]=x);
      const boxes=[];
      const qbox=document.getElementById('question');if(qbox)boxes.push(qbox);
      const admin=document.querySelector('#app .qcard');if(admin&&!boxes.includes(admin))boxes.push(admin);
      for(const box of boxes)await applyBox(box,qs,map,lang);
      status('Language selected: '+labels[lang]);
    }finally{running=false}
  }
  window.LSApplyTestLanguage=apply;
  function install(){
    const path=location.pathname.toLowerCase();
    const waitFor=(selector,cb)=>{
      if(document.querySelector(selector)){cb();return}
      const mo=new MutationObserver(()=>{if(document.querySelector(selector)){mo.disconnect();cb()}});
      mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),15000);
    };
    if(path.endsWith('/student-test.html')){
      waitFor('#question',()=>{
        if(document.getElementById('lsLanguageGate'))return;
        languageGate();
        const q=document.getElementById('question');
        window.addEventListener('ls-language-change',()=>setTimeout(apply,100));
        new MutationObserver(()=>{if(getLang()!=='en'&&!running)setTimeout(apply,250)}).observe(q,{childList:true,subtree:true});
      });
    }
    if(path.endsWith('/admin-test-preview.html')){
      waitFor('#app',()=>{
        if(document.getElementById('lsAdminLanguageGate'))return;
        const app=document.getElementById('app');
        const gate=document.createElement('div');gate.id='lsAdminLanguageGate';gate.style.cssText='position:fixed;inset:0;background:rgba(15,35,63,.58);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
        gate.innerHTML='<div style="background:#fff;border:1px solid #dbe4ee;border-radius:16px;padding:28px;max-width:560px;width:100%"><div style="font-size:11px;font-weight:900;color:#2457a6">LAKSHYASETU · TEST LANGUAGE</div><h1 style="margin:8px 0;color:#173b67">Select Test Language</h1><p style="color:#526174">Choose the language before beginning this test.</p>'+buttons()+'<p id="lsLangMsg" style="font-size:12px;color:#64748b;margin:14px 0 0"></p></div>';
        document.body.appendChild(gate);
        gate.querySelectorAll('[data-lang]').forEach(b=>b.onclick=async()=>{setLang(b.dataset.lang);if(b.dataset.lang!=='en')status('Preparing '+labels[b.dataset.lang]+' translation…');await apply();gate.remove();setTimeout(apply,350)});
        window.addEventListener('ls-language-change',()=>setTimeout(apply,100));
        new MutationObserver(()=>{if(getLang()!=='en'&&!running)setTimeout(apply,250)}).observe(app,{childList:true,subtree:true});
      });
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();