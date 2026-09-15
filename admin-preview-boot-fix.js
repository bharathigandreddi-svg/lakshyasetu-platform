(function(){'use strict';
  if(!/\/admin-test-preview\.html$/i.test(location.pathname)) return;
  let started=false;
  const timeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
  const status=document.getElementById('status');
  function fail(msg){if(status){status.className='card error';status.textContent=msg;}}
  async function boot(){
    if(started||!status||!/Checking admin session/i.test(status.textContent||''))return;
    started=true;
    try{
      if(!window.supabase||!window.getLakshyaSetuDb)throw new Error('Supabase client unavailable');
      const db=window.getLakshyaSetuDb();
      const r=await timeout(db.auth.getUser(),8000);
      const u=r?.data?.user;
      if(r?.error)throw r.error;
      if(!u){location.href='login.html?next='+encodeURIComponent(location.href);return;}
      const p=await timeout(db.from('profiles').select('role').eq('id',u.id).maybeSingle(),8000);
      const role=p?.data?.role||u.app_metadata?.role||u.user_metadata?.role||'';
      if(p?.error||role!=='admin'){fail('Admin access required.');return;}
      status.innerHTML='<b>Admin preview active.</b> Simulated student mode — no payment, real attempt, rank or publication is affected.';
      const params=new URLSearchParams(location.search),id=Number(params.get('test')||params.get('test_id')||0);
      if(id&&typeof window.loadTest==='function')await timeout(window.loadTest(id),10000);
    }catch(e){console.error('Admin preview boot fix:',e);fail('Admin preview could not verify your session.');}
  }
  setTimeout(boot,500);
  window.addEventListener('load',boot,{once:true});
})();
