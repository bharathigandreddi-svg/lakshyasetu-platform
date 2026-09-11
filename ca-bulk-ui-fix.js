// Current Affairs Bulk Builder UI fix: reliable test selection, metadata refresh, and draft publishing.
(function(){
  if(!/admin-test-builder\.html$/i.test(location.pathname)) return;
  function start(){
    const test=document.getElementById('test');
    const metaEl=document.getElementById('meta');
    const verify=document.getElementById('verify');
    if(!test) return;
    let selectedId=test.value||'';

    const getTest=()=>{
      const list=(typeof tests!=='undefined'&&Array.isArray(tests))?tests:[];
      return list.find(x=>Number(x.id)===Number(test.value||selectedId))||null;
    };
    const refreshMeta=()=>{
      const t=getTest();
      if(metaEl) metaEl.textContent=t?`Current questions: ${t.question_count??0} | Expected: ${t.expected_question_count??'-'} | Status: ${t.published?'Published':'Draft'}`:'';
      return t;
    };
    const publishButton=()=>document.getElementById('publishTest');
    const updatePublishState=()=>{
      const b=publishButton(); if(!b) return;
      const t=refreshMeta();
      const id=Number(test.value||selectedId);
      const ready=!!t&&!!id&&!t.published&&Number(t.question_count||0)===Number(t.expected_question_count||50);
      b.disabled=!ready;
      b.title=ready?'Publish this verified draft test':'Publishing requires a selected Draft with the expected number of saved MCQs.';
    };

    const remember=()=>{
      if(test.value) selectedId=String(test.value);
      if(selectedId) test.dataset.selectedId=selectedId;
    };
    const restore=()=>{
      const wanted=selectedId||test.dataset.selectedId||'';
      if(!wanted||!test.options.length) return;
      const exists=[...test.options].some(o=>String(o.value)===String(wanted));
      if(exists && test.value!==String(wanted)){
        test.value=String(wanted);
        test.dispatchEvent(new Event('change',{bubbles:true}));
      }else updatePublishState();
    };

    test.addEventListener('change',function(){
      remember();
      refreshMeta();
      if(verify) verify.classList.add('hidden');
      if(typeof parsed!=='undefined') parsed=[];
      updatePublishState();
    },true);

    // Wrap the page's existing load() so any later refresh cannot throw away the user's choice.
    if(typeof window.load==='function' && !window.load.__lsChooserWrapped){
      const originalLoad=window.load;
      const wrapped=async function(){
        const keep=selectedId||test.value||test.dataset.selectedId||'';
        const result=await originalLoad.apply(this,arguments);
        if(keep){selectedId=String(keep);test.dataset.selectedId=String(keep);}
        restore();
        return result;
      };
      wrapped.__lsChooserWrapped=true;
      window.load=wrapped;
    }

    const addPublish=()=>{
      if(publishButton()){updatePublishState();return;}
      const b=document.createElement('button');
      b.id='publishTest'; b.className='btn'; b.style.marginLeft='8px'; b.textContent='Publish Test';
      b.onclick=async function(){
        try{
          remember();
          const id=Number(test.value||selectedId);
          if(!id) throw Error('Select a test first.');
          const fresh=await db.from('ls_tests').select('id,title,expected_question_count,question_count,published,archived').eq('id',id).maybeSingle();
          if(fresh.error) throw fresh.error;
          const t=fresh.data;
          if(!t) throw Error('Selected test could not be found.');
          if(t.archived) throw Error('This test is archived.');
          if(t.published){show('This test is already Published.');return;}
          const expected=Number(t.expected_question_count||50), count=Number(t.question_count||0);
          if(count!==expected) throw Error('Publish requires '+expected+' saved MCQs. Current count: '+count+'.');
          if(!confirm('Publish '+t.title+'? This will make it visible to students.')) return;
          b.disabled=true;
          const r=await db.from('ls_tests').update({published:true}).eq('id',id).eq('published',false);
          if(r.error) throw r.error;
          show('Test published successfully.');
          selectedId=String(id);
          test.dataset.selectedId=String(id);
          if(typeof load==='function') await load();
          restore(); refreshMeta(); updatePublishState();
        }catch(e){show(e.message||String(e),true)}finally{updatePublishState();}
      };
      const field=test.closest('.field'), card=test.closest('.card');
      if(field) field.appendChild(b); else if(card) card.appendChild(b); else test.parentNode.appendChild(b);
      updatePublishState();
    };

    addPublish();
    const app=document.getElementById('app');
    if(app) new MutationObserver(()=>setTimeout(addPublish,0)).observe(app,{childList:true,subtree:true});
    new MutationObserver(()=>setTimeout(restore,0)).observe(test,{childList:true,subtree:true});
    setTimeout(restore,300); setTimeout(restore,1000); setTimeout(restore,2000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
