/* LakshyaSetu Razorpay payment client v5 */
(function(){
  if(window.__LS_PAYMENT_V5_ACTIVE)return;
  window.__LS_PAYMENT_V5_ACTIVE=true; window.__LS_PAYMENT_MODULE_LOADED=true;
  function db(){return window.getLakshyaSetuDb();}
  async function session(){const c=db();const r=await c.auth.getSession();return r.data?.session||null;}
  async function loadRazorpay(){if(window.Razorpay)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=resolve;s.onerror=()=>reject(new Error('Payment gateway failed to load.'));document.head.appendChild(s);});}
  async function invoke(name,body){const c=db();let s=await session();if(!s)throw new Error('Please login before purchasing.');const url=window.LAKSHYASETU_CONFIG.supabaseUrl+'/functions/v1/'+name;const send=token=>fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,apikey:window.LAKSHYASETU_CONFIG.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});let r=await send(s.access_token);if(r.status===401){const refreshed=await c.auth.refreshSession();s=refreshed.data?.session||null;if(!s)throw new Error('Your login session has expired. Please login again.');r=await send(s.access_token);}const text=await r.text();let data=null;try{data=text?JSON.parse(text):null;}catch(_e){}if(!r.ok)throw new Error(data?.error||data?.message||('Payment service returned HTTP '+r.status+'.'));if(!data?.success)throw new Error(data?.error||'Payment service failed.');return data;}
  async function buy(product,label,knownSession){try{const s=knownSession||await session();if(!s){location.href='login.html?next='+encodeURIComponent(location.href);return;}await loadRazorpay();const orderData=await invoke('create-razorpay-order',product);const user=s.user||{},meta=user.user_metadata||{};const rzp=new Razorpay({key:orderData.key_id,amount:orderData.order.amount,currency:orderData.order.currency||'INR',name:'LakshyaSetu',description:label||product.product_type,order_id:orderData.order.id,prefill:{name:String(meta.full_name||meta.name||''),email:String(user.email||''),contact:String(meta.phone||meta.mobile||'')},retry:{enabled:true,max_count:3},timeout:600,handler:async response=>{try{await invoke('verify-razorpay-payment',{...product,amount:orderData.amount,razorpay_order_id:response.razorpay_order_id,razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature});alert('Payment successful. Access activated.');location.reload();}catch(e){alert(e.message||'Payment verification failed.');}},modal:{ondismiss:()=>console.info('Razorpay checkout dismissed.')}});rzp.on('payment.failed',response=>alert('Payment failed: '+(response?.error?.description||'Please retry.')));rzp.open();}catch(e){alert(e.message||'Payment failed.');}}
  window.LSBuy=buy;window.LSGetSession=session;
  function enhanceSubjectCatalog(){
    if(!/\/test-series\.html$/i.test(location.pathname))return;
    document.querySelectorAll('.subject-card .action-row').forEach(row=>{
      if(row.dataset.subjectEnhanced==='1')return;
      const original=row.querySelector('a[href*="subject="]');if(!original)return;
      const href=original.getAttribute('href')||'';const match=href.match(/[?&]subject=(\d+)/);if(!match)return;const subjectId=Number(match[1]);if(!subjectId)return;
      const viewTopic=document.createElement('a');viewTopic.className='buy-btn secondary';viewTopic.href=href;viewTopic.textContent='VIEW TOPIC →';
      const buyButton=document.createElement('button');buyButton.type='button';buyButton.className='buy-btn subject-package-buy';buyButton.textContent='BUY ₹99 PACKAGE';buyButton.addEventListener('click',()=>buy({product_type:'subject',course_subject_id:subjectId},'LakshyaSetu Subject Package · ₹99'));
      row.innerHTML='';row.append(buyButton,viewTopic);row.dataset.subjectEnhanced='1';
    });
  }
  function startCatalogEnhancer(){const run=()=>enhanceSubjectCatalog();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});run();window.addEventListener('load',run,{once:true});const target=document.getElementById('content');if(target)new MutationObserver(run).observe(target,{childList:true,subtree:true});else setTimeout(startCatalogEnhancer,250);}
  startCatalogEnhancer();
})();
