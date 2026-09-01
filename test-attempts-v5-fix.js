(function(){
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function run(){
    for(let i=0;i<120;i++){
      const sb=window.getLakshyaSetuDb&&window.getLakshyaSetuDb();
      const host=document.getElementById('runner');
      const testId=Number(new URLSearchParams(location.search).get('test')||0);
      if(sb&&host&&testId){
        try{
          const r=await sb.functions.invoke('test-performance',{body:{test_id:testId}});
          if(!r.error&&r.data?.success){
            const d=r.data;
            let box=document.getElementById('lsOfficialRank');
            if(!box){
              box=document.createElement('section');
              box.id='lsOfficialRank';
              box.style.cssText='margin-top:14px;background:#fff;border:1px solid #dfe5ee;border-radius:16px;padding:18px';
              host.appendChild(box);
            }
            const lb=(d.leaderboard||[]).map(x=>'<tr'+(x.user_id===d.user_id?' class="you"':'')+'><td style="padding:8px;border-bottom:1px solid #e5eaf1">#'+x.rank+'</td><td style="padding:8px;border-bottom:1px solid #e5eaf1">'+(x.user_id===d.user_id?'You':'Student')+'</td><td style="padding:8px;border-bottom:1px solid #e5eaf1">'+Number(x.score||0).toFixed(2)+'</td></tr>').join('');
            box.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><h3 style="margin:0;color:#10233f">Official Ranking</h3><div style="color:#667085;font-size:12px;margin-top:5px">Rank is based only on each student’s first submitted attempt.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><span style="padding:7px 10px;border-radius:8px;background:#eef4ff;color:#2457a6;font-weight:800;font-size:13px">Rank: '+(d.rank?'#'+d.rank+' / '+d.total:'—')+'</span><span style="padding:7px 10px;border-radius:8px;background:#eef4ff;color:#2457a6;font-weight:800;font-size:13px">Percentile: '+(d.percentile==null?'—':d.percentile+'%')+'</span></div></div><table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #e5eaf1">Rank</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e5eaf1">Student</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e5eaf1">Score</th></tr></thead><tbody>'+lb+'</tbody></table>';
            box.style.display=/Question Navigator|Question No\./i.test(host.innerText||'')?'none':'block';
            return;
          }
        }catch(_){}
      }
      await sleep(500);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
