// Current Affairs Bulk Builder UI fix: reliable test selection, metadata refresh, and draft publishing.
(function(){
  if(!/admin-test-builder\.html$/i.test(location.pathname)) return;
  const CA_SERIES=4;
  function start(){
    const test=document.getElementById('test');
    const meta=document.getElementById('meta');
    const verify=document.getElementById('verify');
    if(!test) return;
    test.addEventListener('change',function(){
      if(typeof meta==='function') meta();
      else if(meta){
        const opt=test.options[test.selectedIndex];
        meta.textContent=opt&&opt.value?'Selected: '+opt.textContent:'';
      }
      if(verify) verify.classList.add('hidden');
      if(typeof parsed!=='undefined') parsed=[];
    });
    const addPublish=()=>{
      if(!verify||document.getElementById('publishTest')) return;
      const b=document.createElement('button');
      b.id='publishTest'; b.className='btn'; b.style.marginLeft='8px'; b.textContent='Publish Test';
      b.onclick=async function(){
        try{
          const id=Number(test.value);
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
          await load();
          test.value=String(id); if(typeof meta==='function') meta();
        }catch(e){show(e.message||String(e),true)}finally{b.disabled=false}
      };
      const save=document.getElementById('save');
      if(save&&save.parentNode) save.parentNode.insertBefore(b,save.nextSibling);
    };
    new MutationObserver(addPublish).observe(verify,{childList:true,subtree:true});
    addPublish();
    const ensureSelection=()=>{
      if(!test.options.length) return;
      const ca=[...test.options].filter(o=>o.value && /Current Affairs/i.test(o.textContent));
      if(ca.length){
        ca.forEach(o=>o.hidden=false);
      }
      if(test.value===''){
        const first=ca.find(o=>/Test 2\b/i.test(o.textContent))||ca.find(o=>/Test 1\b/i.test(o.textContent));
        if(first){test.value=first.value;test.dispatchEvent(new Event('change',{bubbles:true}))}
      }
    };
    setTimeout(ensureSelection,300);
    setTimeout(ensureSelection,1000);
    setTimeout(ensureSelection,2000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
