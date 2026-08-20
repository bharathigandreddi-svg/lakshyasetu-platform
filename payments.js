/* LakshyaSetu Razorpay + access control */
(function(){
  if (!document.getElementById('coursesArea')) return;

  function loadRazorpay(){
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://checkout.razorpay.com/v1/checkout.js';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Payment gateway failed to load.'));
      document.head.appendChild(s);
    });
  }

  async function getAuthenticatedSession(client){
    try{
      const current=await client.auth.getSession();
      let session=current?.data?.session||null;
      if(!session) return null;
      const expiresAt=Number(session.expires_at||0);
      if(expiresAt && expiresAt <= Math.floor(Date.now()/1000)+60){
        const refreshed=await client.auth.refreshSession();
        if(refreshed?.data?.session) session=refreshed.data.session;
        else return null;
      }
      const checked=await client.auth.getUser(session.access_token);
      if(checked?.error || !checked?.data?.user) return null;
      return session;
    }catch(_e){
      return null;
    }
  }

  async function invokePaymentFunction(client,functionName,body){
    const session=await getAuthenticatedSession(client);
    if(!session) return {data:null,error:{message:'Authentication failed. Please login again.'}};
    const result=await client.functions.invoke(functionName,{
      body,
      headers:{Authorization:`Bearer ${session.access_token}`}
    });
    if(result.error){
      let detail=result.error.message||'Payment service request failed.';
      try{
        const ctx=result.error.context;
        if(ctx && typeof ctx.json==='function'){
          const payload=await ctx.json();
          detail=payload?.error||payload?.message||detail;
        }
      }catch(_e){}
      return {data:null,error:{message:detail}};
    }
    return result;
  }

  function ensureLoginModal(){
    if(document.getElementById('lsLoginModal')) return;
    const style=document.createElement('style');
    style.id='lsLoginModalStyles';
    style.textContent=`#lsLoginModal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,25,45,.62)}#lsLoginModal.hidden{display:none!important}#lsLoginModal .ls-modal-card{width:min(430px,100%);background:#fff;border-radius:18px;padding:28px;box-shadow:0 24px 70px rgba(0,0,0,.28);position:relative}#lsLoginModal h2{margin:0 0 7px;color:#10233f;font-size:24px}#lsLoginModal .ls-sub{margin:0 0 20px;color:#667085;font-size:14px;line-height:1.5}#lsLoginModal label{display:block;margin:12px 0 6px;color:#344054;font-size:13px;font-weight:700}#lsLoginModal input{width:100%;padding:12px 13px;border:1px solid #d0d5dd;border-radius:9px;font-size:15px;outline:none}#lsLoginModal input:focus{border-color:#2457a6;box-shadow:0 0 0 3px rgba(36,87,166,.12)}#lsLoginModal .ls-login-submit{width:100%;margin-top:18px;border:0;border-radius:9px;padding:12px 15px;background:#2457a6;color:#fff;font-weight:700;font-size:15px;cursor:pointer}#lsLoginModal .ls-login-submit:disabled{opacity:.65;cursor:not-allowed}#lsLoginModal .ls-close{position:absolute;right:15px;top:12px;width:34px;height:34px;border:0;background:transparent;color:#667085;font-size:25px;cursor:pointer;border-radius:50%}#lsLoginModal .ls-close:hover{background:#f2f4f7}#lsLoginModal .ls-error{min-height:20px;margin-top:10px;color:#b42318;font-size:13px}#lsLoginModal .ls-register{margin:17px 0 0;text-align:center;color:#667085;font-size:13px}#lsLoginModal .ls-register a{color:#2457a6;font-weight:700;text-decoration:none}#lsLoginModal .ls-note{margin-top:14px;padding:10px 12px;border-radius:8px;background:#f7f9fc;color:#667085;font-size:12px;line-height:1.45}`;
    document.head.appendChild(style);
    const modal=document.createElement('div');
    modal.id='lsLoginModal';modal.className='hidden';
    modal.innerHTML=`<div class="ls-modal-card" role="dialog" aria-modal="true" aria-labelledby="lsLoginTitle"><button class="ls-close" type="button" aria-label="Close">×</button><h2 id="lsLoginTitle">Student Login</h2><p class="ls-sub">Please login to your LakshyaSetu student account to continue with this purchase.</p><form id="lsLoginForm"><label for="lsLoginEmail">Email</label><input id="lsLoginEmail" type="email" autocomplete="email" required><label for="lsLoginPassword">Password</label><input id="lsLoginPassword" type="password" autocomplete="current-password" required><div id="lsLoginError" class="ls-error"></div><button id="lsLoginSubmit" class="ls-login-submit" type="submit">Login &amp; Continue</button></form><div class="ls-register">New student? <a id="lsCreateAccount" href="signup.html">Create a student account</a></div><div class="ls-note">Your student account is used to securely save purchases, test attempts, results and learning access.</div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.ls-close').onclick=()=>closeLoginModal();
    modal.addEventListener('click',e=>{if(e.target===modal)closeLoginModal();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hidden'))closeLoginModal();});
  }

  function closeLoginModal(){const modal=document.getElementById('lsLoginModal');if(modal)modal.classList.add('hidden');}

  function showLoginModal(product,label){
    ensureLoginModal();
    const modal=document.getElementById('lsLoginModal');
    const form=document.getElementById('lsLoginForm');
    const email=document.getElementById('lsLoginEmail');
    const password=document.getElementById('lsLoginPassword');
    const error=document.getElementById('lsLoginError');
    const submit=document.getElementById('lsLoginSubmit');
    const create=document.getElementById('lsCreateAccount');
    create.href='signup.html?next='+encodeURIComponent(location.href);
    error.textContent='';form.reset();modal.classList.remove('hidden');setTimeout(()=>email.focus(),50);
    form.onsubmit=async function(e){
      e.preventDefault();error.textContent='';submit.disabled=true;submit.textContent='Signing in...';
      try{
        const client=getLakshyaSetuDb();
        const result=await client.auth.signInWithPassword({email:email.value.trim(),password:password.value});
        if(result.error)throw result.error;
        const verified=await getAuthenticatedSession(client);
        if(!verified)throw new Error('Login succeeded but the session could not be verified. Please try again.');
        closeLoginModal();submit.disabled=false;submit.textContent='Login & Continue';await buy(product,label);
      }catch(err){error.textContent=err?.message||'Unable to login. Please check your email and password.';submit.disabled=false;submit.textContent='Login & Continue';}
    };
  }

  async function buy(product,label){
    try{
      const client=getLakshyaSetuDb();
      const session=await getAuthenticatedSession(client);
      if(!session){showLoginModal(product,label);return;}
      await loadRazorpay();
      const {data:orderData,error:orderError}=await invokePaymentFunction(client,'create-razorpay-order',{...product});
      if(orderError||!orderData?.success)throw new Error(orderData?.error||orderError?.message||'Unable to create payment order.');
      const rzp=new Razorpay({key:orderData.key_id,amount:orderData.order.amount,currency:orderData.order.currency||'INR',name:'LakshyaSetu',description:label||product.product_type,order_id:orderData.order.id,handler:async function(response){
        try{
          const verifySession=await getAuthenticatedSession(client);
          if(!verifySession){showLoginModal(product,label);return;}
          const {data,error}=await invokePaymentFunction(client,'verify-razorpay-payment',{...product,amount:orderData.amount,razorpay_order_id:response.razorpay_order_id,razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature});
          if(error||!data?.success)throw new Error(data?.error||error?.message||'Payment verification failed.');
          alert('Payment successful. Access activated.');location.reload();
        }catch(e){alert(e.message||'Payment verification failed.');}
      },theme:{color:'#2457a6'}});rzp.open();
    }catch(e){alert(e.message||'Payment failed.');}
  }

  function addButton(host,product,label,priceText){if(!host||host.querySelector('.ls-buy-btn'))return;const b=document.createElement('button');b.className='action-btn ls-buy-btn';b.type='button';b.textContent=label+(priceText?' '+priceText:'');b.onclick=(ev)=>{ev.preventDefault();ev.stopPropagation();buy(product,label);};host.appendChild(b);}

  function enhanceCards(){
    document.querySelectorAll('.card').forEach(card=>{if(card.querySelector('.ls-buy-btn'))return;const onclick=card.getAttribute('onclick')||'';let product=null,label='Buy',fee='';let m=onclick.match(/openCourse\((\d+)\)/);if(m){product={product_type:'course',course_id:Number(m[1])};label='Buy Course';}m=onclick.match(/openSubject\((\d+)\)/);if(m){product={product_type:'subject',course_subject_id:Number(m[1])};label='Buy Subject';}m=onclick.match(/openTopic\((\d+)\)/);if(m){product={product_type:'topic',topic_id:Number(m[1])};label='Buy Topic';}m=onclick.match(/openTestSeries\((\d+)\)/);if(m){product={product_type:'test_series',test_series_id:Number(m[1])};label='Buy Test Series';}const feeEl=card.querySelector('.fee');if(feeEl)fee=feeEl.textContent.trim();if(product&&fee&&fee!=='Free')addButton(card,product,label,fee);});
    document.querySelectorAll('.test-item').forEach(item=>{if(item.querySelector('.ls-buy-btn'))return;const open=item.querySelector('[onclick*="openTest("]');if(!open)return;const m=(open.getAttribute('onclick')||'').match(/openTest\((\d+)\)/);if(m){const price=item.querySelector('.fee')?.textContent?.trim()||'';addButton(item,{product_type:'test',test_id:Number(m[1])},'Buy Test',price&&price!=='Free'?price:'');}});
  }

  async function hasLegacyAccess(client,uid,topic){const {data:p1}=await client.from('purchases').select('id,expires_at').eq('user_id',uid).eq('payment_status','paid').eq('purchase_type','topic').eq('topic_id',topic.id).limit(1);const {data:p2}=await client.from('purchases').select('id,expires_at').eq('user_id',uid).eq('payment_status','paid').eq('purchase_type','subject').eq('subject_id',topic.course_subject_id).limit(1);const valid=(rows)=>Array.isArray(rows)&&rows.some(row=>!row.expires_at||new Date(row.expires_at)>new Date());return valid(p1)||valid(p2);}
  async function hasModernAccess(client,uid,test){const checks=[['test','test_id',test.id],['test_series','test_series_id',test.test_series_id],['test_package','test_package_id',test.package_id]];for(const [type,column,id]of checks){if(!id)continue;const {data}=await client.from('ls_purchases').select('id,access_expiry_at').eq('user_id',uid).eq('status','ACTIVE').eq('product_type',type).eq(column,id).limit(1);if(Array.isArray(data)&&data.some(row=>!row.access_expiry_at||new Date(row.access_expiry_at)>new Date()))return true;}return false;}

  function initPaymentModule(){loadRazorpay().catch(()=>{});setTimeout(enhanceCards,500);const obs=new MutationObserver(()=>setTimeout(enhanceCards,50));obs.observe(document.body,{childList:true,subtree:true});const originalOpenTopic=window.openTopic;if(typeof originalOpenTopic==='function')window.openTopic=async function(topicId){const client=getLakshyaSetuDb();const {data:topic}=await client.from('course_topics').select('*').eq('id',topicId).single();if(topic&&!topic.is_trial&&Number(topic.topic_fee||0)>0){const session=await getAuthenticatedSession(client);let access=false;if(session)access=await hasLegacyAccess(client,session.user.id,topic);if(!access){topicsArea.innerHTML='<div class="card"><h3>'+escapeHtml(topic.title)+'</h3><p>This topic is paid content.</p><div class="learning-box"><strong>Unlock this topic for ₹'+Number(topic.topic_fee||49)+'</strong><br><button class="action-btn ls-buy-btn" type="button">Buy Topic</button></div></div>';const b=topicsArea.querySelector('.ls-buy-btn');b.onclick=()=>buy({product_type:'topic',topic_id:Number(topicId)},'Buy Topic');return;}}return originalOpenTopic(topicId);};const originalOpenTest=window.openTest;if(typeof originalOpenTest==='function')window.openTest=async function(testId){const client=getLakshyaSetuDb();const {data:test}=await client.from('ls_tests').select('*').eq('id',testId).single();if(test&&Number(test.price||0)>0){const session=await getAuthenticatedSession(client);let access=false;if(session)access=await hasModernAccess(client,session.user.id,test);if(!access){testsArea.innerHTML='<div class="card"><h3>'+escapeHtml(test.title)+'</h3><p>This test is locked.</p><div class="learning-box"><strong>Buy this test for ₹'+Number(test.price||5)+'</strong><br><button class="action-btn ls-buy-btn" type="button">Buy Test</button></div></div>';const b=testsArea.querySelector('.ls-buy-btn');b.onclick=()=>buy({product_type:'test',test_id:Number(testId)},'Buy Test');return;}}return originalOpenTest(testId);};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPaymentModule);else initPaymentModule();
})();
