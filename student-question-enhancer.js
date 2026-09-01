/* Render structured statements stored on test questions. */
(function(){
  if(window.__LS_STUDENT_QUESTION_ENHANCER_V1)return;
  window.__LS_STUDENT_QUESTION_ENHANCER_V1=true;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const id=Number(new URLSearchParams(location.search).get('test'));
  if(!id)return;
  const css=`.ls-statements{margin:10px 0 14px;padding:12px 14px;border:1px solid #dfe5ee;border-radius:10px;background:#f8faff}.ls-statements-title{font-weight:700;color:#10233f;margin-bottom:7px}.ls-statements ol{margin:0;padding-left:24px}.ls-statements li{margin:7px 0;line-height:1.55;color:#344054}`;
  function addCss(){if(document.getElementById('ls-statements-css'))return;const s=document.createElement('style');s.id='ls-statements-css';s.textContent=css;document.head.appendChild(s)}
  function normalize(v){if(Array.isArray(v))return v; if(typeof v==='string'){try{const x=JSON.parse(v);return Array.isArray(x)?x:[]}catch(_){return []}} return []}
  async function load(){
    const sb=window.getLakshyaSetuDb&&window.getLakshyaSetuDb();if(!sb)return;
    const r=await sb.from('ls_test_questions').select('id,display_order,question,statements').eq('test_id',id).order('display_order').order('id');
    if(r.error)return;
    const qs=r.data||[];
    function inject(){
      const heads=[...document.querySelectorAll('#runner h3')];
      qs.forEach((q,i)=>{const st=normalize(q.statements);if(!st.length)return;const h=heads.find(x=>(x.textContent||'').trim()===String(q.question||'').trim())||heads[i];if(!h||h.nextElementSibling?.classList.contains('ls-statements'))return;const box=document.createElement('div');box.className='ls-statements';box.innerHTML='<div class="ls-statements-title">Statements</div><ol>'+st.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>';h.after(box);h.style.whiteSpace='pre-line';h.style.lineHeight='1.55'});
    }
    addCss();inject();setInterval(inject,700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
