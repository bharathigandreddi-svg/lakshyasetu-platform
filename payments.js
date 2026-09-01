/* LakshyaSetu payment loader — always load the current payment client. */
(function(){
  if(window.__LS_PAYMENT_V4_LOADER)return;
  window.__LS_PAYMENT_V4_LOADER=true;
  function load(){
    if(window.__LS_PAYMENT_V4_ACTIVE||window.__LS_PAYMENT_MODULE_LOADED)return;
    if(document.querySelector('script[data-lakshyasetu-payment-v4]'))return;
    const s=document.createElement('script');
    s.src='payments-v2.js?v=20260830-0945';
    s.defer=true;
    s.setAttribute('data-lakshyasetu-payment-v4','true');
    document.head.appendChild(s);
    if(location.pathname.endsWith('/student-v2.html')||location.pathname.endsWith('student-v2.html')){
      const q=document.createElement('script');
      q.src='student-question-enhancer.js?v=20260901-1';
      q.defer=true;
      q.setAttribute('data-lakshyasetu-question-enhancer','true');
      document.head.appendChild(q);
      const p=document.createElement('script');
      p.src='student-performance.js?v=20260901-2';
      p.defer=true;
      p.setAttribute('data-lakshyasetu-student-performance','true');
      document.head.appendChild(p);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
