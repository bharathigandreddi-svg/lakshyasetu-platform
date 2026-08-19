/* LakshyaSetu Razorpay + access control */
(function(){
  if (!document.getElementById('coursesArea')) return;
  function loadRazorpay(){
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=resolve;s.onerror=()=>reject(new Error('Payment gateway failed to load.'));document.head.appendChild(s);});
  }
  async function buy(product,label){
    try{
      const client=getLakshyaSetuDb();const {data:sessionData}=await client.auth.getSession();
      if(!sessionData?.session){alert('Please login first.');location.href='login.html';return;}
      await loadRazorpay();
      const {data:orderData,error:orderError}=await client.functions.invoke('create-razorpay-order',{body:product});
      if(orderError||!orderData?.success)throw new Error(orderData?.error||orderError?.message||'Unable to create payment order.');
      const rzp=new Razorpay({key:orderData.key_id,amount:orderData.order.amount,currency:orderData.order.currency||'INR',name:'LakshyaSetu',description:label||product.product_type,order_id:orderData.order.id,handler:async function(response){
        const {data,error}=await client.functions.invoke('verify-razorpay-payment',{body:{...product,amount:orderData.amount,razorpay_order_id:response.razorpay_order_id,razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature}});
        if(error||!data?.success)throw new Error(data?.error||error?.message||'Payment verification failed.');alert('Payment successful. Access activated.');location.reload();
      },theme:{color:'#2457a6'}});rzp.open();
    }catch(e){alert(e.message||'Payment failed.');}
  }
  function addButton(host,product,label,priceText){if(!host||host.querySelector('.ls-buy-btn'))return;const b=document.createElement('button');b.className='action-btn ls-buy-btn';b.type='button';b.textContent=label+(priceText?' '+priceText:'');b.onclick=(ev)=>{ev.preventDefault();ev.stopPropagation();buy(product,label);};host.appendChild(b);}
  function enhanceCards(){
    document.querySelectorAll('.card').forEach(card=>{if(card.querySelector('.ls-buy-btn'))return;const onclick=card.getAttribute('onclick')||'';let product=null,label='Buy',fee='';
      let m=onclick.match(/openCourse\((\d+)\)/);if(m){product={product_type:'course',course_id:Number(m[1])};label='Buy Course';}
      m=onclick.match(/openSubject\((\d+)\)/);if(m){product={product_type:'subject',course_subject_id:Number(m[1])};label='Buy Subject';}
      m=onclick.match(/openTopic\((\d+)\)/);if(m){product={product_type:'topic',topic_id:Number(m[1])};label='Buy Topic';}
      m=onclick.match(/openTestSeries\((\d+)\)/);if(m){product={product_type:'test_series',test_series_id:Number(m[1])};label='Buy Test Series';}
      const feeEl=card.querySelector('.fee');if(feeEl)fee=feeEl.textContent.trim();if(product&&fee&&fee!=='Free')addButton(card,product,label,fee);
    });
    document.querySelectorAll('.test-item').forEach(item=>{if(item.querySelector('.ls-buy-btn'))return;const open=item.querySelector('[onclick*="openTest("]');if(!open)return;const m=(open.getAttribute('onclick')||'').match(/openTest\((\d+)\)/);if(m)addButton(item,{product_type:'test',test_id:Number(m[1])},'Buy Test','₹5');});
  }
  function initPaymentModule(){
    loadRazorpay().catch(()=>{});setTimeout(enhanceCards,500);const obs=new MutationObserver(()=>setTimeout(enhanceCards,50));obs.observe(document.body,{childList:true,subtree:true});
    const originalOpenTopic=window.openTopic;
    if(typeof originalOpenTopic==='function')window.openTopic=async function(topicId){
      const client=getLakshyaSetuDb();const {data:topic}=await client.from('course_topics').select('*').eq('id',topicId).single();
      if(topic&&!topic.is_trial&&Number(topic.topic_fee||0)>0){const {data:sess}=await client.auth.getSession();let access=false;if(sess?.session){const uid=sess.session.user.id;const {data:p1}=await client.from('ls_purchases').select('id').eq('user_id',uid).eq('status','ACTIVE').eq('product_type','topic').eq('topic_id',topicId).limit(1);const {data:p2}=await client.from('ls_purchases').select('id').eq('user_id',uid).eq('status','ACTIVE').eq('product_type','subject').eq('course_subject_id',topic.course_subject_id).limit(1);access=!!((p1&&p1.length)||(p2&&p2.length));}
        if(!access){topicsArea.innerHTML='<div class="card"><h3>'+escapeHtml(topic.title)+'</h3><p>This topic is paid content.</p><div class="learning-box"><strong>Unlock this topic for ₹'+Number(topic.topic_fee||49)+'</strong><br><button class="action-btn ls-buy-btn" type="button">Buy Topic</button></div></div>';const b=topicsArea.querySelector('.ls-buy-btn');b.onclick=()=>buy({product_type:'topic',topic_id:Number(topicId)},'Buy Topic');return;}
      }return originalOpenTopic(topicId);
    };
    const originalOpenTest=window.openTest;
    if(typeof originalOpenTest==='function')window.openTest=async function(testId){
      const client=getLakshyaSetuDb();const {data:test}=await client.from('ls_tests').select('*').eq('id',testId).single();
      if(test&&Number(test.price||0)>0){const {data:sess}=await client.auth.getSession();let access=false;if(sess?.session){const uid=sess.session.user.id;const {data:p1}=await client.from('ls_purchases').select('id').eq('user_id',uid).eq('status','ACTIVE').eq('product_type','test').eq('test_id',testId).limit(1);const {data:p2}=await client.from('ls_purchases').select('id').eq('user_id',uid).eq('status','ACTIVE').eq('product_type','test_series').eq('test_series_id',test.test_series_id).limit(1);const {data:p3}=await client.from('ls_purchases').select('id').eq('user_id',uid).eq('status','ACTIVE').eq('product_type','test_package').eq('test_package_id',test.package_id).limit(1);access=!!((p1&&p1.length)||(p2&&p2.length)||(p3&&p3.length));}
        if(!access){testsArea.innerHTML='<div class="card"><h3>'+escapeHtml(test.title)+'</h3><p>This test is locked.</p><div class="learning-box"><strong>Buy this test for ₹'+Number(test.price||5)+'</strong><br><button class="action-btn ls-buy-btn" type="button">Buy Test</button></div></div>';const b=testsArea.querySelector('.ls-buy-btn');b.onclick=()=>buy({product_type:'test',test_id:Number(testId)},'Buy Test');return;}
      }return originalOpenTest(testId);
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPaymentModule);else initPaymentModule();
})();
