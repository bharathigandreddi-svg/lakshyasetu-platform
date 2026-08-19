(function () {
  'use strict';

  function esc(v) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(v);
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  async function waitForBase() {
    for (let i = 0; i < 80; i++) {
      if (window.getLakshyaSetuDb && window.testsArea && typeof window.testsArea.innerHTML !== 'undefined') return;
      await new Promise(r => setTimeout(r, 250));
    }
    throw new Error('Test module could not initialize.');
  }

  async function getAccess(client, test) {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session) return { session: null, access: false };
    const uid = sessionData.session.user.id;
    if (Number(test.price || 0) === 0) return { session: sessionData.session, access: true };

    const checks = [
      ['test', { test_id: Number(test.id) }],
      ['test_series', { test_series_id: Number(test.test_series_id) }]
    ];
    if (test.package_id != null) checks.push(['test_package', { test_package_id: Number(test.package_id) }]);

    for (const [product_type, extra] of checks) {
      let q = client.from('ls_purchases').select('id').eq('user_id', uid).eq('status','ACTIVE').eq('product_type',product_type);
      for (const [k,v] of Object.entries(extra)) q = q.eq(k,v);
      const { data } = await q.limit(1);
      if (data?.length) return { session: sessionData.session, access: true };
    }
    return { session: sessionData.session, access: false };
  }

  async function start(testId) {
    await waitForBase();
    const client = window.getLakshyaSetuDb();
    const { data: test, error: testError } = await client.from('ls_tests').select('*').eq('id', testId).eq('published',true).eq('archived',false).single();
    if (testError) throw testError;

    const access = await getAccess(client, test);
    if (!access.session) { alert('Please login first.'); location.href='login.html'; return; }
    if (!access.access) {
      window.testsArea.innerHTML = '<div class="card"><h3>'+esc(test.title)+'</h3><p>This test is locked.</p><div class="learning-box"><strong>Buy this test for ₹'+Number(test.price||5)+'</strong><br><button class="action-btn" id="runnerBuy">Buy Test</button></div></div>';
      const b=document.getElementById('runnerBuy');
      b.onclick=function(){ if(window.LS_BUY_TEST) window.LS_BUY_TEST(Number(testId)); else alert('Please use the Buy Test button on the test card.'); };
      return;
    }

    const { data: questions, error: qError } = await client.from('ls_test_questions').select('*').eq('test_id',test.id).order('display_order',{ascending:true});
    if (qError) throw qError;
    if (!questions?.length) throw new Error('Questions are not available yet.');

    const { data: attempt, error: attemptError } = await client.from('ls_test_attempts').insert({ test_id:Number(test.id), user_id:access.session.user.id, total_marks:questions.reduce((s,q)=>s+Number(q.marks||1),0) }).select().single();
    if (attemptError) throw attemptError;

    const duration = Number(test.duration_minutes || 0);
    const started = Date.now();
    let timer = null;
    const timeText = duration ? '<span class="meta-label" id="runnerTimer">'+duration+':00</span>' : '';

    window.testsArea.innerHTML = '<div class="card"><h3>'+esc(test.title)+'</h3><div class="test-meta">'+timeText+'<span class="meta-label">'+questions.length+' Questions</span></div><form id="liveTestForm">'+questions.map((q,i)=>'<div class="learning-box"><h3>'+(i+1)+'. '+esc(q.question)+'</h3><label><input type="radio" name="q-'+q.id+'" value="A"> A. '+esc(q.option_a)+'</label><br><label><input type="radio" name="q-'+q.id+'" value="B"> B. '+esc(q.option_b)+'</label><br><label><input type="radio" name="q-'+q.id+'" value="C"> C. '+esc(q.option_c)+'</label><br><label><input type="radio" name="q-'+q.id+'" value="D"> D. '+esc(q.option_d)+'</label></div>').join('')+'<button class="action-btn" type="submit">Submit Test</button></form></div>';

    const form=document.getElementById('liveTestForm');
    async function submitTest(auto) {
      if (!form || form.dataset.submitted === '1') return;
      form.dataset.submitted='1';
      if (timer) clearInterval(timer);
      const answers=[];
      let score=0, correct=0, wrong=0, unanswered=0;
      for (const q of questions) {
        const selected=form.querySelector('input[name="q-'+q.id+'"]:checked')?.value || null;
        const isCorrect=selected != null && String(selected).toUpperCase()===String(q.correct_option||'').toUpperCase();
        const marks=Number(q.marks||1), negative=Number(q.negative_marks||0);
        let awarded=0;
        if (!selected) unanswered++;
        else if (isCorrect) { correct++; awarded=marks; }
        else { wrong++; awarded=-negative; }
        score += awarded;
        answers.push({attempt_id:Number(attempt.id),test_question_id:Number(q.id),selected_option:selected,is_correct:selected?isCorrect:null,marks_awarded:awarded});
      }
      const totalMarks=questions.reduce((s,q)=>s+Number(q.marks||1),0);
      const percentage=totalMarks ? Math.max(0,(score/totalMarks)*100) : 0;
      const { error: answerError } = await client.from('ls_test_answers').insert(answers);
      if (answerError) { form.dataset.submitted='0'; throw answerError; }
      const { error: updateError } = await client.from('ls_test_attempts').update({submitted_at:new Date().toISOString(),score,total_marks:totalMarks,correct_count:correct,wrong_count:wrong,unanswered_count:unanswered,percentage:Number(percentage.toFixed(2))}).eq('id',attempt.id).eq('user_id',access.session.user.id);
      if (updateError) { form.dataset.submitted='0'; throw updateError; }
      window.testsArea.innerHTML='<div class="card"><h3>'+esc(test.title)+'</h3><div class="learning-box"><strong>Test Submitted Successfully</strong><div class="test-meta"><span class="meta-label">Score: '+score+' / '+totalMarks+'</span><span class="meta-label">Percentage: '+Number(percentage.toFixed(2))+'%</span><span class="meta-label">Correct: '+correct+'</span><span class="meta-label">Wrong: '+wrong+'</span><span class="meta-label">Unanswered: '+unanswered+'</span></div></div></div>';
      window.scrollTo({top:0,behavior:'smooth'});
    }
    form.addEventListener('submit',async e=>{e.preventDefault(); if(!confirm('Submit this test now?')) return; try{await submitTest(false);}catch(err){form.dataset.submitted='0';alert(err.message||'Unable to submit test.');}});
    if (duration) {
      timer=setInterval(()=>{const left=Math.max(0,duration*60000-(Date.now()-started));const el=document.getElementById('runnerTimer');if(el){const sec=Math.ceil(left/1000),m=Math.floor(sec/60),s=sec%60;el.textContent=m+':'+String(s).padStart(2,'0');}if(left<=0){clearInterval(timer);submitTest(true).catch(err=>alert(err.message||'Unable to submit test.'));}},1000);
    }
  }

  function install() {
    const previous=window.openTest;
    if (typeof previous !== 'function') return false;
    window.openTest=function(testId){ start(Number(testId)).catch(err=>{console.error(err); if(window.testsArea) window.testsArea.innerHTML='<div class="error">Unable to start test: '+esc(err.message||err)+'</div>';}); };
    return true;
  }

  (async function(){
    try { await waitForBase(); for(let i=0;i<40;i++){ if(install()) return; await new Promise(r=>setTimeout(r,250)); } console.error('Live test runner could not attach.'); }
    catch(e){console.error('Live test runner initialization failed:',e);}
  })();
})();
