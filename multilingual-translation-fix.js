/* LakshyaSetu persistent multilingual translation — additive fix. */
(function(){
  const inflight={};
  const testId=()=>{const p=new URLSearchParams(location.search);return Number(p.get('test')||p.get('test_id')||0)};
  const lang=()=>window.LSLanguage?.get?.()||localStorage.getItem('ls_test_language')||'en';
  const db=()=>getLakshyaSetuDb();
  async function rows(language){const id=testId();if(!id||language==='en')return [];try{const r=await db().from('ls_test_question_translations').select('test_question_id,question,option_a,option_b,option_c,option_d,explanation,statements').eq('language',language);return r.error?[]:(r.data||[])}catch{return []}}
  async function questions(){const id=testId();if(!id)return [];try{const r=await db().from('ls_test_questions').select('id,question,option_a,option_b,option_c,option_d,explanation,statements').eq('test_id',id).order('display_order',{ascending:true});return r.error?[]:(r.data||[])}catch{return []}}
  async function invokeTranslate(language){
    const id=testId();
    const client=db();
    if(client?.functions?.invoke){
      const {data,error}=await client.functions.invoke('translate-test',{body:{test_id:id,language}});
      if(error)throw new Error(error.message||'Translation service request failed.');
      if(!data?.ok)throw new Error(data?.error||'Translation service failed.');
      return data;
    }
    const url=(window.LAKSHYASETU_CONFIG?.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/translate-test';
    const key=window.LAKSHYASETU_CONFIG?.supabasePublishableKey||'';
    if(!url||!key)throw new Error('Translation service configuration is missing.');
    let auth=key;
    try{const s=await client.auth.getSession();if(s?.data?.session?.access_token)auth=s.data.session.access_token}catch{}
    const r=await fetch(url,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:JSON.stringify({test_id:id,language})});
    let data=null;try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data?.error||('Translation service HTTP '+r.status));
    if(!data?.ok)throw new Error(data?.error||'Translation service failed.');
    return data;
  }
  async function ensure(language,qs){
    const id=testId(),key=id+':'+language;if(!id||!['te','hi'].includes(language))return [];
    const existing=await rows(language);if(existing.length>=qs.length)return existing;
    if(inflight[key])return inflight[key];
    inflight[key]=(async()=>{try{showStatus('Generating '+(language==='te'?'Telugu':'Hindi')+' translation… please wait.');await invokeTranslate(language);return await rows(language)}catch(e){console.warn('LakshyaSetu translation service:',e);showStatus('Translation service error: '+(e.message||'Please try again.'));return []}finally{delete inflight[key]}})();
    return inflight[key];
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));}
  async function applyBox(box,qs,map,language){
    if(!box||!qs.length)return;
    let index=-1;const marker=(box.querySelector('.qnum')||box.querySelector('p'))?.textContent||'';const m=marker.match(/Question\s+(\d+)\s+of\s+(\d+)/i);if(m)index=Number(m[1])-1;
    if(index<0){const current=box.querySelector('.question, h2')?.textContent?.trim()||'';index=qs.findIndex(q=>String(q.question||'').trim()===current)}
    if(index<0)return;const q=qs[index],tr=map[q.id];if(!tr)return;
    const h=box.querySelector('.question')||box.querySelector('h2');if(h&&tr.question)h.textContent=tr.question;
    const opts=[...box.querySelectorAll('.option, .opt')];['a','b','c','d'].forEach((k,i)=>{const b=opts[i],text=tr['option_'+k];if(!b||!text)return;if(b.classList.contains('option')){const letter=b.querySelector('.letter')?.textContent?.trim()||k.toUpperCase()+'.';b.innerHTML='<span class="letter">'+escapeHtml(letter)+'</span><span>'+escapeHtml(text)+'</span>'}else b.innerHTML='<b>'+k.toUpperCase()+'.</b> '+escapeHtml(text)});
    const st=box.querySelector('.statement');if(st&&tr.statements)st.innerHTML='<b>Statements / Data</b><br>'+escapeHtml(tr.statements);
    const ex=box.querySelector('.explanation');if(ex&&tr.explanation)ex.textContent=tr.explanation;
    box.dataset.lsTranslated=language+':'+q.id;
  }
  async function apply(){
    const language=lang();if(language==='en')return;const qs=await questions();if(!qs.length)return;
    let data=await rows(language);if(data.length<qs.length)data=await ensure(language,qs);if(data.length<qs.length)return;
    const map={};data.forEach(x=>map[x.test_question_id]=x);
    const box=document.getElementById('question');if(box)await applyBox(box,qs,map,language);
    const admin=document.querySelector('#app .qcard');if(admin)await applyBox(admin,qs,map,language);
    showStatus('Language selected: '+(language==='te'?'తెలుగు':'हिन्दी'));
  }
  function showStatus(text){const m=document.getElementById('lsLangMsg');if(m)m.textContent=text;}
  async function run(){const l=lang();if(l==='en')return;showStatus('Translating this test… please wait a moment.');await apply()}
  function boot(){window.addEventListener('ls-language-change',()=>setTimeout(run,120));window.addEventListener('ls-translation-ready',run);if(lang()!=='en')setTimeout(run,500);const root=document.getElementById('question')||document.getElementById('app');if(root)new MutationObserver(()=>{if(lang()!=='en')setTimeout(apply,120)}).observe(root,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();