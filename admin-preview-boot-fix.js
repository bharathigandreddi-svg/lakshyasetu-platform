(function(){
  'use strict';
  const cfg=window.LAKSHYASETU_CONFIG||{};
  const base=cfg.supabaseUrl+'/rest/v1/';
  const status=document.getElementById('status');
  function fail(msg){if(status){status.className='card error';status.textContent=msg;}}
  function token(){try{const raw=localStorage.getItem('sb-byounbmdyuytoqqyhgos-auth-token');if(!raw)return '';const x=JSON.parse(raw);return x.access_token||''}catch(e){return ''}}
  async function rest(path,t){const r=await Promise.race([fetch(base+path,{headers:{apikey:cfg.supabasePublishableKey,Authorization:'Bearer '+t}}),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),8000))]);if(!r.ok)throw new Error('Request failed: '+r.status);return r.json()}
  async function boot(){if(!status)return;const t=token();if(!t){location.href='login.html?next='+encodeURIComponent(location.href);return}try{const u=await rest('auth/v1/user',t);const p=await rest('profiles?select=role&id=eq.'+encodeURIComponent(u.id)+'&limit=1',t);if(p?.[0]?.role!=='admin'){fail('Admin access required.');return}status.innerHTML='<b>Admin preview active.</b> Simulated student mode — no payment, real attempt, rank or publication is affected.';const id=Number(new URLSearchParams(location.search).get('test')||new URLSearchParams(location.search).get('test_id')||0);if(!id)return;if(typeof window.loadTest==='function')await Promise.race([window.loadTest(id),new Promise((_,rej)=>setTimeout(()=>rej(new Error('test load timeout')),10000))]);}catch(e){fail('Admin preview could not load. Please refresh once.')}}
  window.addEventListener('load',boot,{once:true});
})();
