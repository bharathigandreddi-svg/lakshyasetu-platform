// Current Affairs builder fix: keep the existing Current Affairs mapping selected in Test Builder.
(function(){
  if(!/test-builder-v2\.html$/i.test(location.pathname)) return;
  const CA_SERIES='4', CA_SUBJECT='19', CA_TOPIC='54';
  function fix(){
    const series=document.getElementById('series');
    const subject=document.getElementById('subject');
    const topic=document.getElementById('topic');
    if(!series||!subject||!topic||String(series.value)!==CA_SERIES) return;
    const so=[...subject.options].find(o=>String(o.value)===CA_SUBJECT);
    if(!so) return;
    const was=subject.value;
    if(was!==CA_SUBJECT){
      subject.value=CA_SUBJECT;
      subject.dispatchEvent(new Event('change',{bubbles:true}));
      return;
    }
    const to=[...topic.options].find(o=>String(o.value)===CA_TOPIC);
    if(to && topic.value!==CA_TOPIC){
      topic.value=CA_TOPIC;
      topic.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  const start=()=>{
    fix();
    const obs=new MutationObserver(fix);
    const s=document.getElementById('subject'), t=document.getElementById('topic');
    if(s) obs.observe(s,{childList:true,subtree:true});
    if(t) obs.observe(t,{childList:true,subtree:true});
    setInterval(fix,500);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
