(function(){
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function run(){
    for(let i=0;i<240;i++){
      const sb=window.getLakshyaSetuDb&&window.getLakshyaSetuDb();
      const host=document.getElementById('runner');
      const testId=Number(new URLSearchParams(location.search).get('test')||0);
      if(sb&&host&&testId){
        const running=/Question Navigator|Question No\./i.test(host.innerText||'');
        if(!running){
          try{
            const r=await sb.functions.invoke('test-performance',{body:{test_id:testId}});
            if(!r.error&&r.data?.success){
              const d=r.data;
              // Correct the visible official rank/percentile cards produced by the client UI.
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
              return;
            }
          }catch(_){}
        }
      }
      await sleep(700);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
