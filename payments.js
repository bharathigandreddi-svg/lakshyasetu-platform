/* LakshyaSetu Razorpay + access control */
(function(){
  if(window.__LS_PAYMENT_MODULE_LOADED)return;
  window.__LS_PAYMENT_MODULE_LOADED=true;
  const hasLegacyPage=!!document.getElementById('coursesArea');
  const isStudentV2=!!document.getElementById('pageTitle');
  if(!hasLegacyPage&&!isStudentV2)return;
  function loadRazorpay(){if(window.Razorpay)return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=resolve;s.onerror=()=>reject(new Error('Payment gateway failed to load.'));document.head.appendChild(s);});}
  async function getAuthenticatedSession(client){
    try{
      let session=(await client.auth.getSession())?.data?.session||null;
      if(session){
        const expiresAt=Number(session.expires_at||0),now=Math.floor(Date.now()/1000);
        if(expiresAt&&expiresAt<=now+120){
          const refreshed=await client.auth.refreshSession();
          session=refreshed?.data?.session||null;
        }
      }else{
        const refreshed=await client.auth.refreshSession();
        session=refreshed?.data?.session||null;
      }
      return session;
    }catch(_e){
      try{
        const refreshed=await client.auth.refreshSession();
        return refreshed?.data?.session||null;
      }catch(_e2){return null;}
    }
  }
  async function invokePaymentFunction(client,functionName,body,knownSession=null){
    let session=knownSession||await getAuthenticatedSession(client);
    if(!session)return {data:null,error:{message:'Authentication failed. Please login again.',status:401}};
    const url=`${window.LAKSHYASETU_CONFIG.supabaseUrl}/functions/v1/${functionName}`;
    async function call(s){
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':window.LAKSHYASETU_CONFIG.supabasePublishableKey,'Authorization':`Bearer ${s.access_token}`,'x-client-info':'lakshyasetu-student-payment'},body:JSON.stringify(body)});
      let payload=null;try{payload=await response.json();}catch(_e){}
      if(!response.ok)return {data:null,error:{message:payload?.error||payload?.message||`Payment service returned HTTP ${response.status}.`,status:response.status}};
      return {data:payload,error:null};
    }
    let result=await call(session);
    if(result.error&&result.error.status===401){
      try{
        const refreshed=await client.auth.refreshSession();
        session=refreshed?.data?.session||null;
        if(session)result=await call(session);
      }catch(_e){}
    }
    if(result.error&&result.error.status===401){
      try{await client.auth.signOut();}catch(_e){}
    }
    return result;
  }
  function ensureLoginModal(){if(document.getElementById('lsLoginModal'))return;const style=document.createElement('style');style.textContent='#lsLoginModal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,25,45,.62)}#lsLoginModal.hidden{display:none!important}#lsLoginModal .ls-modal-card{width:min(430px,100%);background:#fff;border-radius:18px;padding:28px;position:relative}#lsLoginModal h2{margin:0 0 7px;color:#10233f}#lsLoginModal label{display:block;margin:12px 0 6px;font-size:13px;font-weight:700}#lsLoginModal input{width:100%;padding:12px;border:1px solid #d0d5dd;border-radius:9px}#lsLoginModal button{cursor:pointer}#lsLoginModal .ls-submit{width:100%;margin-top:18px;border:0;border-radius:9px;padding:12px;background:#2457a6;color:#fff;font-weight:700}#lsLoginModal .ls-close{position:absolute;right:15px;top:12px;border:0;background:transparent;font-size:25px}#lsLoginModal .ls-error{min-height:20px;margin-top:10px;color:#b42318;font-size:13px}';document.head.appendChild(style);const modal=document.createElement('div');modal.id='lsLoginModal';modal.className='hidden';modal.innerHTML='<div class="ls-modal-card"><button class="ls-close" type="button">×</button><h2>Student Login</h2><p>Please login to continue.</p><form id="lsLoginForm"><label>Email</label><input id="lsLoginEmail" type="email" required><label>Password</label><input id="lsLoginPassword" type="password" required><div id="lsLoginError" class="ls-error"></div><button class="ls-submit" type="submit">Login & Continue</button></form><p>New student? <a href="signup.html">Create an account</a></p></div>';document.body.appendChild(modal);modal.querySelector('.ls-close').onclick=()=>modal.classList.add('hidden');}
  function showLoginModal(product,label){ensureLoginModal();const modal=document.getElementById('lsLoginModal'),form=document.getElementById('lsLoginForm'),error=document.getElementById('lsLoginError'),email=document.getElementById('lsLoginEmail');error.textContent='';form.reset();modal.classList.remove('hidden');setTimeout(()=>email.focus(),50);form.onsubmit=async e=>{e.preventDefault();error.textContent='Signing in...';try{const client=getLakshyaSetuDb();const r=await client.auth.signInWithPassword({email:email.value.trim(),password:document.getElementById('lsLoginPassword').value});if(r.error)throw r.error;if(!r.data?.session)throw new Error('Login completed but no active session was created.');modal.classList.add('hidden');await new Promise(resolve=>setTimeout(resolve,100));await buy(product,label,r.data.session);}catch(err){error.textContent=err?.message||'Unable to login.';}};}
  async function buy(product,label,knownSession=null){
    const client=getLakshyaSetuDb();const session=knownSession||await getAuthenticatedSession(client);if(!session){showLoginModal(product,label);return;}
    try{
      await loadRazorpay();
      const {data:orderData,error:orderError}=await invokePaymentFunction(client,'create-razorpay-order',{...product},session);
      if(orderError||!orderData?.success)throw new Error(orderData?.error||orderError?.message||'Unable to create payment order.');
      const user=session.user||{},metadata=user.user_metadata||{};
      const rzp=new Razorpay({key:orderData.key_id,amount:orderData.order.amount,currency:orderData.order.currency||'INR',name:'LakshyaSetu',description:label||product.product_type,order_id:orderData.order.id,prefill:{name:String(metadata.full_name||metadata.name||''),email:String(user.email||''),contact:String(metadata.phone||metadata.mobile||'')},method:{card:true,netbanking:true,upi:true,wallet:true,emi:true,paylater:true},retry:{enabled:true,max_count:3},timeout:600,handler:async response=>{try{const {data,error}=await invokePaymentFunction(client,'verify-razorpay-payment',{...product,amount:orderData.amount,razorpay_order_id:response.razorpay_order_id,razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature},session);if(error||!data?.success)throw new Error(data?.error||error?.message||'Payment verification failed.');alert('Payment successful. Access activated.');location.reload();}catch(e){alert(e.message||'Payment verification failed.');}},modal:{ondismiss:()=>console.info('Razorpay checkout dismissed.')},theme:{color:'#2457a6'}});
      rzp.on('payment.failed',response=>{const err=response?.error||{};const parts=[err.description||'Payment could not be completed.'];if(err.code)parts.push(`Code: ${err.code}`);if(err.reason)parts.push(`Reason: ${err.reason}`);if(err.step)parts.push(`Step: ${err.step}`);if(err.source)parts.push(`Source: ${err.source}`);if(err.metadata?.payment_id)parts.push(`Payment: ${err.metadata.payment_id}`);console.error('Razorpay payment.failed',response);alert('Payment failed: '+parts.join(' | ')+'\n\nYou can retry from the checkout.');});
      rzp.open();
    }catch(e){alert(e.message||'Payment failed.');}
  }
  window.LSBuy=buy;window.LSGetSession=getAuthenticatedSession;window.LSShowLogin=(product,label)=>showLoginModal(product,label);
  function addButton(host,product,label,priceText){if(!host||host.querySelector('.ls-buy-btn'))return;const b=document.createElement('button');b.className='action-btn ls-buy-btn';b.type='button';b.textContent=label+(priceText?' '+priceText:'');b.onclick=e=>{e.preventDefault();e.stopPropagation();buy(product,label);};host.appendChild(b);}
  function enhanceCards(){document.querySelectorAll('.card').forEach(card=>{if(card.querySelector('.ls-buy-btn'))return;const onclick=card.getAttribute('onclick')||'';let product=null,label='Buy',fee='';let m=onclick.match(/openCourse\((\d+)\)/);if(m){product={product_type:'course',course_id:Number(m[1])};label='Buy Course';}m=onclick.match(/openSubject\((\d+)\)/);if(m){product={product_type:'subject',course_subject_id:Number(m[1])};label='Buy Subject';}m=onclick.match(/openTopic\((\d+)\)/);if(m){product={product_type:'topic',topic_id:Number(m[1])};label='Buy Topic';}m=onclick.match(/openTestSeries\((\d+)\)/);if(m){product={product_type:'test_series',test_series_id:Number(m[1])};label='Buy Test Series';}const feeEl=card.querySelector('.fee');if(feeEl)fee=feeEl.textContent.trim();if(product&&fee&&fee!=='Free')addButton(card,product,label,fee);});}
  function init(){loadRazorpay().catch(()=>{});if(hasLegacyPage){setTimeout(enhanceCards,500);const obs=new MutationObserver(()=>setTimeout(enhanceCards,50));obs.observe(document.body,{childList:true,subtree:true});}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();