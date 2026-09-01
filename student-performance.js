/* LakshyaSetu student test review + performance dashboard */
(function(){
  if(window.__LS_STUDENT_PERFORMANCE_V1)return;
  window.__LS_STUDENT_PERFORMANCE_V1=true;
  const css=`
  .ls-perf{margin-top:18px}.ls-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:14px 0}.ls-kpi{background:#f7f9fd;border:1px solid #dfe5ee;border-radius:12px;padding:13px}.ls-kpi b{display:block;font-size:20px;color:#10233f}.ls-kpi span{font-size:12px;color:#667085}.ls-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:16px}.ls-panel{background:#fff;border:1px solid #dfe5ee;border-radius:14px;padding:16px}.ls-panel h3{margin:0 0 10px;color:#10233f}.ls-barrow{margin:11px 0}.ls-barhead{display:flex;justify-content:space-between;font-size:12px;color:#475467;margin-bottom:5px}.ls-track{height:9px;background:#edf1f7;border-radius:99px;overflow:hidden}.ls-fill{height:100%;border-radius:99px}.ls-pie{width:180px;height:180px;border-radius:50%;margin:12px auto;background:conic-gradient(#2457a6 0 var(--c),#e36b6b var(--c) var(--cw),#d9dee8 var(--cw) 100%);display:grid;place-items:center}.ls-pie:after{content:'';width:105px;height:105px;background:#fff;border-radius:50%}.ls-legend{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;font-size:12px;color:#667085}.ls-review{margin-top:18px}.ls-q{border:1px solid #dfe5ee;border-radius:13px;padding:15px;margin:10px 0;background:#fff}.ls-q.correct{border-left:5px solid #2e8b57}.ls-q.wrong{border-left:5px solid #d9534f}.ls-q.unanswered{border-left:5px solid #98a2b3}.ls-qhead{display:flex;justify-content:space-between;gap:10px;font-weight:700;color:#10233f}.ls-qtext{margin:9px 0;line-height:1.6;white-space:pre-line}.ls-explain{background:#f7f9fd;border-radius:9px;padding:11px;font-size:13px;color:#475467;line-height:1.55}.ls-badge{font-size:11px;padding:5px 8px;border-radius:999px;background:#eef4ff;color:#2457a6;white-space:nowrap}.ls-muted{color:#667085;font-size:13px}
  `;
  function addCss(){if(document.getElementById('ls-perf-css'))return;const s=document.createElement('style');s.id='ls-perf-css';s.textContent=css;document.head.appendChild(s)}
  function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]))}
  function pct(n,d){return d?Math.round((n/d)*100):0}
  function parseTestId(){const id=Number(new URLSearchParams(location.search).get('test'));return Number.isFinite(id)&&id>0?id:null}
  function findRunner(){return document.getElementById('runner')}
  function isResult(){const r=findRunner();return !!r&&/Test Submitted Successfully/i.test(r.innerText||'')}
  async function getData(){
    const sb=window.getLakshyaSetuDb&&window.getLakshyaSetuDb();if(!sb)return null;
    const testId=parseTestId();if(!testId)return null;
    const s=(await sb.auth.getSession()).data.session;if(!s)return null;
    const a=await sb.from('ls_test_attempts').select('*').eq('test_id',testId).eq('user_id',s.user.id).order('created_at',{ascending:false}).limit(1);
    if(a.error||!a.data?.length)return null;
    const attempt=a.data[0];
    const [qs,ans]=await Promise.all([
      sb.from('ls_test_questions').select('id,display_order,question,option_a,option_b,option_c,option_d,correct_option,explanation,marks,negative_marks').eq('test_id',testId).order('display_order').order('id'),
      sb.from('ls_test_answers').select('test_question_id,selected_option,is_correct,marks_awarded').eq('attempt_id',attempt.id).order('id')
    ]);
    if(qs.error||ans.error)return null;
    return {attempt,questions:qs.data||[],answers:ans.data||[],testId,sb,userId:s.user.id}
  }
  async function getRank(sb,testId){
    try{const r=await sb.functions.invoke('test-performance',{body:{test_id:testId}});if(r.error||!r.data?.success||!r.data.rank)return null;return {rank:Number(r.data.rank),total:Number(r.data.total||0),percentile:Number(r.data.percentile||0)}}catch(_){return null}
  }
  function render(data,rank){
    if(document.getElementById('ls-performance'))return;
    const {attempt,questions,answers}=data;const byId=new Map(answers.map(a=>[String(a.test_question_id),a]));
    const correct=Number(attempt.correct_count||0),wrong=Number(attempt.wrong_count||0),un=Number(attempt.unanswered_count||0),attempted=correct+wrong,total=questions.length||Number(attempt.total_marks||0),accuracy=pct(correct,attempted);
    const score=Number(attempt.score||0),totalMarks=Number(attempt.total_marks||total||0),percentage=Number(attempt.percentage||pct(score,totalMarks));
    const rankHtml=rank?`<div class="ls-kpi"><b>#${rank.rank}</b><span>Rank of ${rank.total}</span></div><div class="ls-kpi"><b>${rank.percentile}%</b><span>Percentile</span></div>`:'';
    const reviewed=questions.map((q,i)=>{const a=byId.get(String(q.id));const state=!a?'unanswered':a.is_correct?'correct':'wrong';const selected=a?.selected_option?String(a.selected_option).toUpperCase():'—';const correctOpt=String(q.correct_option||'').toUpperCase();return `<article class="ls-q ${state}"><div class="ls-qhead"><span>Q${i+1}</span><span class="ls-badge">${state==='correct'?'Correct':state==='wrong'?'Wrong':'Unanswered'}</span></div><div class="ls-qtext">${esc(q.question||'')}</div><div class="ls-muted">Your answer: <b>${esc(selected)}</b> · Correct answer: <b>${esc(correctOpt)}</b></div>${q.explanation?`<div class="ls-explain"><b>Explanation:</b> ${esc(q.explanation)}</div>`:''}</article>`}).join('');
    const root=document.createElement('section');root.id='ls-performance';root.className='ls-perf';
    root.innerHTML=`<div class="ls-panel"><h2>Performance Analysis</h2><p class="ls-muted">Detailed analysis of this attempt.</p><div class="ls-kpis"><div class="ls-kpi"><b>${score} / ${totalMarks}</b><span>Score</span></div><div class="ls-kpi"><b>${percentage}%</b><span>Percentage</span></div><div class="ls-kpi"><b>${attempted} / ${total}</b><span>Attempted</span></div><div class="ls-kpi"><b>${accuracy}%</b><span>Accuracy</span></div>${rankHtml}</div></div>
      <div class="ls-grid"><div class="ls-panel"><h3>Answer Distribution</h3><div class="ls-pie" style="--c:${pct(correct,total)}%;--cw:${pct(correct+wrong,total)}%"></div><div class="ls-legend"><span>Correct ${correct}</span><span>Wrong ${wrong}</span><span>Unanswered ${un}</span></div></div><div class="ls-panel"><h3>Strength & Weakness</h3><div class="ls-barrow"><div class="ls-barhead"><span>Concept clarity</span><b>${accuracy}%</b></div><div class="ls-track"><div class="ls-fill" style="width:${accuracy}%"></div></div></div><div class="ls-barrow"><div class="ls-barhead"><span>Attempt rate</span><b>${pct(attempted,total)}%</b></div><div class="ls-track"><div class="ls-fill" style="width:${pct(attempted,total)}%"></div></div></div><p class="ls-muted">Strength: ${accuracy>=75?'strong accuracy':'improving accuracy'}. Weakness: ${wrong+un>correct?'accuracy/attempt coverage needs work':'minor gaps in selected questions'}.</p></div></div>
      <div class="ls-panel ls-review"><h3>Question-wise Review & Explanations</h3><p class="ls-muted">Every question is shown with the correct answer and explanation when available.</p>${reviewed}</div>`;
    const old=findRunner();if(old)old.appendChild(root)
  }
  function enhanceQuestionLayout(){const r=findRunner();if(!r||isResult())return;r.querySelectorAll('h3').forEach(h=>{if(/Consider the following/i.test(h.textContent||'')){h.style.whiteSpace='pre-line';h.style.lineHeight='1.55'}})}
  let done=false,busy=false;
  async function tick(){addCss();enhanceQuestionLayout();if(done||busy||!isResult())return;busy=true;const d=await getData();if(d){const rank=await getRank(d.sb,d.testId);render(d,rank);done=true}busy=false}
  function start(){setInterval(tick,700);setTimeout(tick,400)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
