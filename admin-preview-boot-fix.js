(function(){'use strict';
  if(!/\/admin-test-preview\.html$/i.test(location.pathname)) return;
  let started=false;
  const timeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
  const status=document.getElementById('status');
  function fail(msg){if(status){status.className='card error';status.textContent=msg;}}
  function token(){try{const raw=localStorage.getItem('sb-byounbmdyuytoqqyhgos-auth-token');if(!raw)return '';const x=JSON.parse(raw);return x.access_token||''}catch(e){return ''}}
  async function authUser(t){const r=await timeout(fetch((window.LAKSHYASETU_CONFIG?.supabaseUrl||'')+'/auth/v1/user',{headers:{apikey:window.LAKSHYASETU_CONFIG?.supabasePublishableKey||'',Authorization:'Bearer '+t}}),7000);if(!r.ok)throw new Error('Auth request failed: '+r.status);return r.json()}
  async function rest(path,t){const r=await timeout(fetch((window.LAKSHYASETU_CONFIG?.supabaseUrl||'')+'/rest/v1/'+path,{headers:{apikey:window.LAKSHYASETU_CONFIG?.supabasePublishableKey||'',Authorization:'Bearer '+t}}),7000);if(!r.ok)throw new Error('Request failed: '+r.status);return r.json()}
  async function boot(){
    if(started||!status||!/Checking admin session/i.test(status.textContent||''))return;
    started=true;
    try{
      const t=token();
      if(!t){location.href='login.html?next='+encodeURIComponent(location.href);return;}
      const u=await authUser(t);
      const p=await rest('profiles?select=role&id=eq.'+encodeURIComponent(u.id)+'&limit=1',t);
      if(p?.[0]?.role!=='admin'){fail('Admin access required.');return;}
      status.innerHTML='<b>Admin preview active.</b> Simulated student mode — no payment, real attempt, rank or publication is affected.';
      const params=new URLSearchParams(location.search),id=Number(params.get('test')||params.get('test_id')||0);
      if(id&&typeof window.loadTest==='function')await timeout(window.loadTest(id),10000);
    }catch(e){console.error('Admin preview boot fix:',e);fail('Admin preview could not verify your session. Please refresh once (Ctrl + Shift + R).');}
  }
  setTimeout(boot,250);
  window.addEventListener('load',boot,{once:true});
})();
