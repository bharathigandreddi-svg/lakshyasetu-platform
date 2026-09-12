/* LakshyaSetu multilingual translation persistence fix — additive only. */
(function(){
  const inflight={};
  function testId(){const p=new URLSearchParams(location.search);return Number(p.get('test')||p.get('test_id')||0)}
  function selected(){return window.LSLanguage?.get?.()||localStorage.getItem('ls_test_language')||'en'}
  async function getRows(lang){const id=testId();if(!id||lang==='en')return [];try{const r=await getLakshyaSetuDb().from('ls_test_question_translations').select('test_question_id,question,option_a,option_b,option_c,option_d,explanation,statements').eq('language',lang);return r.error?[]:(r.data||[])}catch{return []}}
  async function ensure(lang){
    const id=testId();if(!id||!['te','hi'].includes(lang))return false;
    const key=id+':'+lang;
    if(inflight[key])return inflight[key];
    inflight[key]=(async()=>{
      const db=getLakshyaSetuDb();
      let existing=await getRows(lang);
      let questions=[];
      try{const r=await db.from('ls_test_questions').select('id').eq('test_id',id).order('display_order',{ascending:true});questions=r.data||[]}catch{}
      if(questions.length&&existing.length>=questions.length)return true;
      try{
        if(typeof db.functions?.invoke!=='function')throw new Error('Supabase Functions client unavailable.');
        const {data,error}=await db.functions.invoke('translate-test',{body:{test_id:id,language:lang}});
        if(error)throw error;
        if(!data?.ok)throw new Error(data?.error||'Translation failed.');
        existing=await getRows(lang);
        return existing.length>=questions.length;
      }catch(e){console.warn('LakshyaSetu translation service:',e);return false}
      finally{delete inflight[key]}
    })();
    return inflight[key];
  }
  async function apply(){
    const lang=selected();if(lang==='en')return;
    const id=testId();if(!id)return;
    const qs=window.__LS_TRANSLATION_QS||[];
    const existing=await getRows(lang);
    if(qs.length&&existing.length<qs.length){
      const ok=await ensure(lang);if(!ok)return;
      window.__LS_TRANSLATION_QS=qs;
    }
    window.dispatchEvent(new Event('ls-translation-ready'));
  }
  function boot(){
    window.addEventListener('ls-language-change',()=>setTimeout(apply,80));
    window.addEventListener('ls-translation-ready',()=>{
      const qbox=document.getElementById('question');
      if(qbox&&typeof window.LSLanguage?.get==='function')window.__LS_TRANSLATION_FORCE_APPLY=Date.now();
    });
    if(selected()!=='en')setTimeout(apply,400);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
