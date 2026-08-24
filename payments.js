/* LakshyaSetu payment compatibility loader. The active implementation is payments-v2.js. */
(function(){
  if(window.__LS_PAYMENT_V2_LOADER)return;
  window.__LS_PAYMENT_V2_LOADER=true;
  function load(){
    if(window.__LS_PAYMENT_MODULE_LOADED)return;
    if(document.querySelector('script[data-lakshyasetu-payment-v2]'))return;
    const s=document.createElement('script');
    s.src='payments-v2.js?v=20260824-final';
    s.defer=true;
    s.setAttribute('data-lakshyasetu-payment-v2','true');
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();
