// Current Affairs Bulk Builder UI fix: reliable test selection, metadata refresh, and draft publishing.
(function(){
  if(!/admin-test-builder\.html$/i.test(location.pathname)) return;
  function start(){
    const test=document.getElementById('test');
    const verify=document.getElementById('verify');
    if(!test) return;

    let selectedId=test.value||'';
    test.addEventListener('change',function(){
      selectedId=test.value||'';
      const t=(typeof tests!=='undefined')?tests.find(x=>Number(x.id)===Number(selectedId)):null;
      const metaEl=document.getElementById('meta');
      if(metaEl) metaEl.textContent=t?`Current questions: ${t.question_count??0} | Expected: ${t.expected_question_count??'-'} | Status: ${t.published?'Published':'Draft'}`:'';
      if(verify) verify.classList.add('hidden');
      if(typeof parsed!=='undefined') parsed=[];
    });

    const addPublish=()=>{
      if(!verify||document.getElementById('publishTest')) return;
      const b=document.createElement('button');
      b.id='publishTest'; b.className='btn'; b.style.marginLeft='8px'; b.textContent='Publish Test';
      b.onclick=async function(){
        try{
          const id=Number(test.value||selectedId);
          const t=(typeof tests!=='undefined')?tests.find(x=>Number(x.id)===id):null;
          if(!id||!t) throw Error('Select a test first.');
          if(t.published){show('This test is already Published.');return;}
          const expected=Number(t.expected_question_count||50);
          const count=Number(t.question_count||0);
          if(count!==expected) throw Error('Publish requires '+expected+' verified MCQs. Current count: '+count+'.');
          if(!confirm('Publish '+t.title+'? This will make it visible to students.')) return;
          b.disabled=true;
          const r=await db.from('ls_tests').update({published:true}).eq('id',id);
          if(r.error) throw r.error;
          show('Test published successfully.');
          selectedId=String(id);
          await load();
          test.value=String(id);
          const metaEl=document.getElementById('meta');
          if(metaEl) metaEl.textContent=`Current questions: ${expected} | Expected: ${expected} | Status: Published`;
        }catch(e){show(e.message||String(e),true)}finally{b.disabled=false}
      };
      const save=document.getElementById('save');
      if(save&&save.parentNode) save.parentNode.insertBefore(b,save.nextSibling);
    };

    addPublish();
    if(verify) new MutationObserver(addPublish).observe(verify,{childList:true,subtree:true});

    // Preserve the user's selection if the original page rebuilds the <select>.
    const restore=()=>{
      if(!selectedId || !test.options.length) return;
      if([...test.options].some(o=>String(o.value)===String(selectedId)) && test.value!==String(selectedId)){
        test.value=String(selectedId);
        test.dispatchEvent(new Event('change',{bubbles:true}));
      }
    };
    new MutationObserver(()=>setTimeout(restore,0)).observe(test,{childList:true,subtree:true});
    setTimeout(restore,300);
    setTimeout(restore,1000);
    setTimeout(restore,2000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
