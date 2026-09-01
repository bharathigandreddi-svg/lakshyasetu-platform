window.LAKSHYASETU_CONFIG = {
  supabaseUrl: "https://byounbmdyuytoqqyhgos.supabase.co",
  supabasePublishableKey: "sb_publishable_tCvBH8eh95-nXOChd2_sLQ__iDZIfNa"
};
function getLakshyaSetuDb() {
  if (window.db && typeof window.db.from === 'function') return window.db;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('Supabase client library is not loaded. Please refresh the page and try again.');
  const client = window.supabase.createClient(window.LAKSHYASETU_CONFIG.supabaseUrl,window.LAKSHYASETU_CONFIG.supabasePublishableKey);
  window.db=client;window.LAKSHYASETU_DB=client;return client;
}
try{getLakshyaSetuDb();}catch(e){console.error('Supabase initialization failed:',e);}
window.addEventListener('load',function(){
  try{
    const videoUrl=document.getElementById('lessonVideo'),pdfUrl=document.getElementById('lessonPdf');
    if(!videoUrl||!pdfUrl)return;
    const videoWrapper=videoUrl.parentElement,pdfWrapper=pdfUrl.parentElement;
    const videoFile=document.createElement('input');videoFile.type='file';videoFile.id='lessonVideoFile';videoFile.accept='video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';videoFile.style.marginTop='6px';
    const pdfFile=document.createElement('input');pdfFile.type='file';pdfFile.id='lessonPdfFile';pdfFile.accept='application/pdf,.pdf';pdfFile.style.marginTop='6px';
    const videoHelp=document.createElement('div');videoHelp.style.cssText='font-size:12px;color:#64748b;margin-top:5px';videoHelp.textContent='Or choose a video file. When you click Save, the file will be uploaded and its URL saved automatically.';
    const pdfHelp=document.createElement('div');pdfHelp.style.cssText='font-size:12px;color:#64748b;margin-top:5px';pdfHelp.textContent='Or choose a PDF file. When you click Save, the file will be uploaded and its URL saved automatically.';
    const videoCurrent=document.createElement('div');videoCurrent.style.cssText='font-size:12px;color:#166534;margin-top:5px;word-break:break-all';
    const pdfCurrent=document.createElement('div');pdfCurrent.style.cssText='font-size:12px;color:#166534;margin-top:5px;word-break:break-all';
    const videoLabel=videoWrapper.querySelector('label');if(videoLabel)videoLabel.textContent='Video URL';videoWrapper.append(videoFile,videoHelp,videoCurrent);
    pdfUrl.type='hidden';pdfUrl.setAttribute('aria-hidden','true');const pdfLabel=pdfWrapper.querySelector('label');if(pdfLabel)pdfLabel.textContent='PDF File';pdfWrapper.append(pdfFile,pdfHelp,pdfCurrent);
    const originalSaveLesson=window.saveLesson,originalEditLesson=window.editLesson,originalClearLesson=window.clearLesson;
    window.saveLesson=async function(){const selectedVideo=videoFile.files?.[0],selectedPdf=pdfFile.files?.[0];try{const client=getLakshyaSetuDb(),topicId=document.getElementById('lessonTopic').value||'general';if(selectedVideo){const n=selectedVideo.name.toLowerCase();if(!['video/mp4','video/webm','video/quicktime'].includes(selectedVideo.type)&&!(/\.(mp4|webm|mov)$/.test(n)))throw new Error('Please select an MP4, WebM or MOV video file.');if(selectedVideo.size>100*1024*1024)throw new Error('Video must be 100 MB or smaller.');const path=topicId+'/'+Date.now()+'-'+n.replace(/[^a-z0-9._-]+/g,'-');if(window.notice)notice('Uploading video...');const {error}=await client.storage.from('lesson-videos').upload(path,selectedVideo,{cacheControl:'3600',upsert:false,contentType:selectedVideo.type||'video/mp4'});if(error)throw error;const u=client.storage.from('lesson-videos').getPublicUrl(path);document.getElementById('lessonVideo').value=u.data.publicUrl;videoCurrent.textContent='Video uploaded successfully.';}if(selectedPdf){if(selectedPdf.type!=='application/pdf'&&!selectedPdf.name.toLowerCase().endsWith('.pdf'))throw new Error('Please select a PDF file only.');if(selectedPdf.size>25*1024*1024)throw new Error('PDF must be 25 MB or smaller.');const n=selectedPdf.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');const path=topicId+'/'+Date.now()+'-'+n;if(window.notice)notice('Uploading PDF...');const {error}=await client.storage.from('lesson-pdfs').upload(path,selectedPdf,{cacheControl:'3600',upsert:false,contentType:'application/pdf'});if(error)throw error;const u=client.storage.from('lesson-pdfs').getPublicUrl(path);document.getElementById('lessonPdf').value=u.data.publicUrl;pdfCurrent.textContent='PDF uploaded successfully.';}await originalSaveLesson();videoFile.value='';pdfFile.value='';}catch(e){if(window.notice)notice(e.message||'File upload failed.',true);else alert(e.message||'File upload failed.');}};
    window.editLesson=function(id){originalEditLesson(id);videoCurrent.textContent=document.getElementById('lessonVideo').value?'Current video is already attached. Select a new file to replace it.':'';pdfCurrent.textContent=document.getElementById('lessonPdf').value?'Current PDF is already attached. Select a new file to replace it.':'';videoFile.value='';pdfFile.value='';};
    window.clearLesson=function(){originalClearLesson();videoFile.value='';pdfFile.value='';videoCurrent.textContent='';pdfCurrent.textContent='';};
  }catch(e){console.error('Lesson file upload setup failed:',e);}
});
window.addEventListener('load',function(){
  if(window.__LS_PAYMENT_V4_ACTIVE)return;
  const s=document.createElement('script');s.src='payments-v2.js?v=20260830-0745';s.defer=true;s.setAttribute('data-lakshyasetu-payment-v4','true');document.head.appendChild(s);
});
window.addEventListener('load',function(){const s=document.createElement('script');s.src='test-attempts-v4.js?v=20260901-1200';s.defer=true;document.head.appendChild(s);});
window.addEventListener('load',function(){const s=document.createElement('script');s.src='test-attempts-v6.js?v=20260901-1300';s.defer=true;document.head.appendChild(s);});
window.addEventListener('load',function(){const s=document.createElement('script');s.src='exam-experience-v8.js?v=20260901-1400';s.defer=true;document.head.appendChild(s);});
window.addEventListener('load',function(){const s=document.createElement('script');s.src='exam-polish-v1.js?v=20260901-1500';s.defer=true;document.head.appendChild(s);});
window.addEventListener('load',function(){const s=document.createElement('script');s.src='student-dashboard.js?v=20260901-1600';s.defer=true;document.head.appendChild(s);});
(function addCurrentAffairsAdminTab(){function mount(){if(!/\/admin\.html$/i.test(location.pathname))return;const nav=document.querySelector('.nav');if(!nav||nav.querySelector('[data-current-affairs-tab]'))return;const pricing=nav.querySelector('[data-t="pricing"]');const btn=document.createElement('button');btn.type='button';btn.textContent='Current Affairs';btn.setAttribute('data-current-affairs-tab','true');btn.onclick=function(){location.href='current-affairs-admin.html';};if(pricing)nav.insertBefore(btn,pricing);else nav.appendChild(btn);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();})();
(function addPlannerTab(){function mount(){if(!/\/admin\.html$/i.test(location.pathname))return;const nav=document.querySelector('.nav');if(!nav||nav.querySelector('[data-planner-tab]'))return;const btn=document.createElement('button');btn.type='button';btn.textContent='Test & Pricing Planner';btn.setAttribute('data-planner-tab','true');btn.onclick=function(){location.href='pricing-planner.html';};nav.appendChild(btn);}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',mount,{once:true});window.addEventListener('load',mount,{once:true});}else mount();})();
