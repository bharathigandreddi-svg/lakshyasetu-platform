/* LakshyaSetu Razorpay payment client v9 */
(function(){
  if(window.__LS_PAYMENT_V9_ACTIVE)return;
  window.__LS_PAYMENT_V9_ACTIVE=true;
  window.__LS_PAYMENT_MODULE_LOADED=true;

  function db(){return window.getLakshyaSetuDb();}
  async function session(){
    const c=db();
    const r=await c.auth.getSession();
    return r.data?.session||null;
  }
  async function loadRazorpay(){
    if(window.Razorpay)return;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://checkout.razorpay.com/v1/checkout.js';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Payment gateway failed to load.'));
      document.head.appendChild(s);
    });
  }
  async function invoke(name,body){
    const c=db();
    let s=await session();
    if(!s)throw new Error('Please login before purchasing.');
    const url=window.LAKSHYASETU_CONFIG.supabaseUrl+'/functions/v1/'+name;
    const send=token=>fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,apikey:window.LAKSHYASETU_CONFIG.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
    let r=await send(s.access_token);
    if(r.status===401){
      const refreshed=await c.auth.refreshSession();
      s=refreshed.data?.session||null;
      if(!s)throw new Error('Your login session has expired. Please login again.');
      r=await send(s.access_token);
    }
    const text=await r.text();
    let data=null;
    try{data=text?JSON.parse(text):null}catch(_e){}
    if(!r.ok)throw new Error(data?.error||data?.message||('Payment service returned HTTP '+r.status+'.'));
    if(!data?.success)throw new Error(data?.error||'Payment service failed.');
    return data;
  }
  async function buy(product,label,knownSession){
    try{
      const s=knownSession||await session();
      if(!s){location.href='login.html?next='+encodeURIComponent(location.href);return;}
      await loadRazorpay();
      const orderData=await invoke('create-razorpay-order',product);
      const user=s.user||{},meta=user.user_metadata||{};
      const rzp=new Razorpay({
        key:orderData.key_id,
        amount:orderData.order.amount,
        currency:orderData.order.currency||'INR',
        name:'LakshyaSetu',
        description:label||product.product_type,
        order_id:orderData.order.id,
        prefill:{name:String(meta.full_name||meta.name||''),email:String(user.email||''),contact:String(meta.phone||meta.mobile||'')},
        retry:{enabled:true,max_count:3},
        timeout:600,
        handler:async response=>{
          try{
            await invoke('verify-razorpay-payment',{...product,amount:orderData.amount,razorpay_order_id:response.razorpay_order_id,razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature});
            alert('Payment successful. Access activated.');
            location.reload();
          }catch(e){alert(e.message||'Payment verification failed.');}
        },
        modal:{ondismiss:()=>console.info('Razorpay checkout dismissed.')}
      });
      rzp.on('payment.failed',response=>alert('Payment failed: '+(response?.error?.description||'Please retry.')));
      rzp.open();
    }catch(e){alert(e.message||'Payment failed.');}
  }

  window.LSBuy=buy;
  window.LSGetSession=session;

  /* Safety cleanup for older cached catalog scripts that may append a second
     BUY / VIEW SUBJECT button. The current catalog owns exactly one package
     button and one topic button per subject card. */
  function cleanCatalogButtons(){
    document.querySelectorAll('.subject-card .action-row').forEach(row=>{
      const legacy=[...row.querySelectorAll('a,button')].filter(el=>/BUY\s*\/\s*VIEW\s*SUBJECT/i.test((el.textContent||'').trim()));
      legacy.forEach(el=>el.remove());
      const topic=[...row.querySelectorAll('.topic-btn')];
      topic.slice(1).forEach(el=>el.remove());
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',cleanCatalogButtons,{once:true});
  }else cleanCatalogButtons();
  new MutationObserver(cleanCatalogButtons).observe(document.documentElement,{childList:true,subtree:true});
})();
