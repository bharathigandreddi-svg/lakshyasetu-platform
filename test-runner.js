(function(){
  'use strict';
  const area=()=>document.getElementById('runner')||document.getElementById('testsArea');
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function start(testId,fallbackOpen){
    const client=window.getLakshyaSetuDb();
    const {data:test,error:te}=await client.from('ls_tests').select('*').eq('id',testId).eq('published',true).eq('archived',false).single();
    if(te)throw te;
    const {data:sd}=await client.auth.getSession();
    if(!sd?.session){alert('Please login first.');location.href='login.html';return;}
    const uid=sd.session.user.id;
    let access=Number(test.price||0)===0;
    if(!access){
      const checks=[['test','test_id',test.id],['test_series','test_series_id',test.test_series_id]];
      if(test.package_id!=null)checks.push(['test_package','test_package_id',test.package_id]);
      for(const [type,key,val] of checks){
        const q=await client.from('ls_purchases').select('id').eq('user_id',uid).eq('status','ACTIVE').eq(key,val).or('access_expiry_at.is.null,access_expiry_at.gte.'+new Date().toISOString()).limit(1);
        if(q.error)throw q.error;
        if(q.data?.length){access=true;break;}
      }
    }
    if(!access){if(typeof fallbackOpen==='function')return fallbackOpen(testId);throw new Error('Purchase required for this test.');}
    const {data:questions,error:qe}=await client.from('ls_test_questions').select('*').eq('test_id',test.id).order('display_order',{ascending:true}).order('id');
    if(qe)throw qe;
    if(!questions?.length)throw new Error('Questions are not available for this test yet.');
    const host=area();
    if(!host)throw new Error('Test runner container is missing.');
    const totalMarks=questions.reduce((s,q)=>s+Number(q.marks||1),0);
    const {data:attempt,error:ae}=await client.from('ls_test_attempts').insert({test_id:Number(test.id),user_id:uid,total_marks:totalMarks}).select().single();
    if(ae)throw ae;
    const duration=Number(test.duration_minutes||0),started=Date.now();
    host.innerHTML='<article class="card" style="max-width:900px;margin:0 auto"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><h2 style="margin:0">'+esc(test.title)+'</h2><div class="meta">'+(duration?'<span class="tag" id="runnerTimer">'+duration+':00</span>':'')+'<span class="tag">'+questions.length+' Questions</span><span class="tag">'+esc(money(test.price))+'</span></div></div><form id="liveTestForm" style="margin-top:20px">'+questions.map((q,i)=>'<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin:14px 0"><h3 style="margin:0 0 14px">'+(i+1)+'. '+esc(q.question)+'</h3><label style="display:block;padding:9px 0"><input type="radio" name="q'+q.id+'" value="A"> A. '+esc(q.option_a)+'</label><label style="display:block;padding:9px 0"><input type="radio" name="q'+q.id+'" value="B"> B. '+esc(q.option_b)+'</label><label style="display:block;padding:9px 0"><input type="radio" name="q'+q.id+'" value="C"> C. '+esc(q.option_c)+'</label><label style="display:block;padding:9px 0"><input type="radio" name="q'+q.id+'" value="D"> D. '+esc(q.option_d)+'</label></div>').join('')+'<button class="action" type="submit">Submit Test</button></form></article>';
    const form=document.getElementById('liveTestForm');let timer=null;
    async function submit(){
      if(form.dataset.submitted==='1')return;form.dataset.submitted='1';if(timer)clearInterval(timer);
      const answers=[];let score=0,correct=0,wrong=0,unanswered=0;
      for(const q of questions){const selected=form.querySelector('input[name="q'+q.id+'"]:checked')?.value||null;const ok=selected&&String(selected).toUpperCase()===String(q.correct_option||'').toUpperCase();const marks=Number(q.marks||1),neg=Number(q.negative_marks||0);let awarded=0;if(!selected)unanswered++;else if(ok){correct++;awarded=marks}else{wrong++;awarded=-neg}score+=awarded;answers.push({attempt_id:Number(attempt.id),test_question_id:Number(q.id),selected_option:selected,is_correct:selected?!!ok:null,marks_awarded:awarded});}
      const pct=totalMarks?Math.max(0,score/totalMarks*100):0;
      const ar=await client.from('ls_test_answers').insert(answers);if(ar.error)throw ar.error;
      const ur=await client.from('ls_test_attempts').update({submitted_at:new Date().toISOString(),score,total_marks:totalMarks,correct_count:correct,wrong_count:wrong,unanswered_count:unanswered,percentage:Number(pct.toFixed(2))}).eq('id',attempt.id).eq('user_id',uid);if(ur.error)throw ur.error;
      host.innerHTML='<article class="card" style="max-width:900px;margin:0 auto"><h2>'+esc(test.title)+'</h2><div class="status">Test Submitted Successfully</div><div class="meta" style="margin-top:18px"><span class="tag">Score: '+score+' / '+totalMarks+'</span><span class="tag">Percentage: '+Number(pct.toFixed(2))+'%</span><span class="tag">Correct: '+correct+'</span><span class="tag">Wrong: '+wrong+'</span><span class="tag">Unanswered: '+unanswered+'</span></div></article>';
    }
    form.addEventListener('submit',e=>{e.preventDefault();if(confirm('Submit this test now?'))submit().catch(err=>{form.dataset.submitted='0';alert(err.message||'Unable to submit test.')})});
    if(duration)timer=setInterval(()=>{const left=Math.max(0,duration*60000-(Date.now()-started));const el=document.getElementById('runnerTimer');if(el){const sec=Math.ceil(left/1000);el.textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}if(left<=0)submit().catch(e=>console.error(e))},1000);
  }
  (async()=>{
    for(let i=0;i<60;i++){
      if(window.getLakshyaSetuDb&&typeof window.openTest==='function'){
        if(window.__LS_TEST_RUNNER_PATCHED)return;
        window.__LS_TEST_RUNNER_PATCHED=true;
        const original=window.openTest;
        window.openTest=function(id){start(Number(id),original).catch(e=>{console.error(e);const h=area();if(h)h.innerHTML='<div class="error">Unable to start test: '+esc(e.message||e)+'</div>'})};
        const testId=new URLSearchParams(location.search).get('test');
        if(testId)start(Number(testId),original).catch(e=>{console.error(e);const h=area();if(h)h.innerHTML='<div class="error">Unable to start test: '+esc(e.message||e)+'</div>'});
        return;
      }
      await sleep(250);
    }
  })();
})();
