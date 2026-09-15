// LakshyaSetu admin preview bootstrap — additive, preview page only.
(function(){
  'use strict';
  if(!/\/admin-test-preview\.html$/i.test(location.pathname)) return;
  function boot(){
    if(typeof window.init!=='function') return;
    try{ window.init(); }catch(e){ console.error('Admin preview init failed:',e); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else setTimeout(boot,0);
  window.addEventListener('load',boot,{once:true});
})();
