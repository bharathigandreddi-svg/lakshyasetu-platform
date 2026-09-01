(function(){
  'use strict';
  if(!document.getElementById('lsSolutionLoader')){const s=document.createElement('script');s.id='lsSolutionLoader';s.src='test-solutions.js?v=20260901';document.head.appendChild(s)}
  if(!document.getElementById('lsExamInstructionsLoader')){const s=document.createElement('script');s.id='lsExamInstructionsLoader';s.src='exam-instructions.js?v=20260901';document.head.appendChild(s)}
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function addLaunchButton(sb,host,testId){
    if(document.getElementById('lsRetakeStart'))return;
    const text=(host.innerText||'');
    if(/Question Navigator|Question No\./i.test(text))return;
    const card=host.querySelector('.card');
    if(!card)return;
    let count=0,max=3;
    try{
      const tr=await sb.from('ls_tests').select('max_attempts').eq('id',testId).single();
      if(!tr.error)max=Math.max(1,Number(tr.data?.max_attempts||3));
      const ss=await sb.auth.getSession();
      if(ss.data?.session){
        const ar=await sb.from('ls_test_attempts').select('id').eq('test_id',testId).eq('user_id',ss.data.session.user.id).not('submitted_at','is',null);
        if(!ar.error)count=(ar.data||[]).length;
      }
    }catch(_){}
    const remaining=Math.max(0,max-count);
    const wrap=document.createElement('div');wrap.id='lsRetakeStart';wrap.style.cssText='margin-top:18px;padding-top:16px;border-top:1px solid #e5eaf1;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap';
    wrap.innerHTML='<div><b style="color:#10233f">'+(count?'Retake available':'Ready to begin')+'</b><div style="font-size:12px;color:#667085;margin-top:4px">Attempts used: '+count+' / '+max+(remaining?' · '+remaining+' remaining':' · No attempts remaining')+'</div></div>'+(remaining?'<button type="button" class="action" id="lsRetakeBtn" style="margin-top:0">'+(count?'Retake Test':'Start Test')+'</button>':'');
    card.appendChild(wrap);
    const btn=wrap.querySelector('#lsRetakeBtn');
    btn?.addEventListener('click',()=>{
      if(typeof window.openTest==='function')window.openTest(testId);
      else location.href='student-v2.html?test='+testId+'&launch='+Date.now();
    });
  }
  async function run(){
    for(let i=0;i<240;i++){
      const sb=window.getLakshyaSetuDb&&window.getLakshyaSetuDb();
      const host=document.getElementById('runner');
      const testId=Number(new URLSearchParams(location.search).get('test')||0);
      if(sb&&host&&testId){
        const running=/Question Navigator|Question No\./i.test(host.innerText||'');
        if(!running)await addLaunchButton(sb,host,testId);
        if(!running){
          try{
            const r=await sb.functions.invoke('test-performance',{body:{test_id:testId}});
            if(!r.error&&r.data?.success){
              const d=r.data;
              host.querySelectorAll('.ls6stat,.ls-stat').forEach(card=>{
                const label=(card.innerText||'').toLowerCase();
                const b=card.querySelector('b');
                if(!b)return;
                if(label.includes('rank')&&label.includes('1st attempt'))b.textContent=d.rank?'#'+d.rank+' / '+d.total:'—';
                if(label.includes('percentile')&&label.includes('1st attempt'))b.textContent=d.percentile==null?'—':d.percentile+'%';
              });
              let box=document.getElementById('lsOfficialRank');
              if(!box){box=document.createElement('section');box.id='lsOfficialRank';box.style.cssText='margin-top:14px;background:#fff;border:1px solid #dfe5ee;border-radius:16px;padding:18px';host.appendChild(box)}
              const lb=(d.leaderboard||[]).map(x=>'<tr'+(x.user_id===d.user_id?' class="you"':'')+'><td style="padding:8px;border-bottom:1px solid #e5eaf1">#'+x.rank+'</td><td style="padding:8px;border-bottom:1px solid #e5eaf1">'+(x.user_id===d.user_id?'You':'Student')+'</td><td style="padding:8px;border-bottom:1px solid #e5eaf1">'+Number(x.score||0).toFixed(2)+'</td></tr>').join('');
              box.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><h3 style="margin:0;color:#10233f">Official Ranking</h3><div style="color:#667085;font-size:12px;margin-top:5px">Only the first submitted attempt determines rank. Retakes never change the official rank.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><span style="padding:7px 10px;border-radius:8px;background:#eef4ff;color:#2457a6;font-weight:800;font-size:13px">Rank: '+(d.rank?'#'+d.rank+' / '+d.total:'—')+'</span><span style="padding:7px 10px;border-radius:8px;background:#eef4ff;color:#2457a6;font-weight:800;font-size:13px">Percentile: '+(d.percentile==null?'—':d.percentile+'%')+'</span></div></div><table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #e5eaf1">Rank</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e5eaf1">Student</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e5eaf1">Score</th></tr></thead><tbody>'+lb+'</tbody></table>';
            }
          }catch(_){}
        }
      }
      await sleep(700);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();