window.LAKSHYASETU_CONFIG = {
  supabaseUrl: "https://byounbmdyuytoqqyhgos.supabase.co",
  supabasePublishableKey: "sb_publishable_tCvBH8eh95-nXOChd2_sLQ__iDZIfNa"
};

/* Create one reliable Supabase client for the whole page. */
function getLakshyaSetuDb() {
  if (window.db && typeof window.db.from === 'function') return window.db;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase client library is not loaded. Please refresh the page and try again.');
  }
  const client = window.supabase.createClient(
    window.LAKSHYASETU_CONFIG.supabaseUrl,
    window.LAKSHYASETU_CONFIG.supabasePublishableKey
  );
  window.db = client;
  window.LAKSHYASETU_DB = client;
  return client;
}
try { getLakshyaSetuDb(); } catch (e) { console.error('Supabase initialization failed:', e); }

/* Direct Video + PDF upload for Lesson Management. */
window.addEventListener('load', function () {
  try {
    const videoUrl = document.getElementById('lessonVideo');
    const pdfUrl = document.getElementById('lessonPdf');
    if (!videoUrl || !pdfUrl) return;
    const videoWrapper = videoUrl.parentElement;
    const videoFile = document.createElement('input');
    videoFile.type = 'file'; videoFile.id = 'lessonVideoFile';
    videoFile.accept = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov'; videoFile.style.marginTop='6px';
    const videoHelp = document.createElement('div'); videoHelp.style.cssText='font-size:12px;color:#64748b;margin-top:5px';
    videoHelp.textContent='Or choose a video file. When you click Save, the file will be uploaded and its URL saved automatically.';
    const videoCurrent = document.createElement('div'); videoCurrent.style.cssText='font-size:12px;color:#166534;margin-top:5px;word-break:break-all';
    const videoLabel=videoWrapper.querySelector('label'); if(videoLabel)videoLabel.textContent='Video URL';
    videoWrapper.append(videoFile,videoHelp,videoCurrent);
    const pdfWrapper=pdfUrl.parentElement;
    const pdfFile=document.createElement('input'); pdfFile.type='file'; pdfFile.id='lessonPdfFile'; pdfFile.accept='application/pdf,.pdf'; pdfFile.style.marginTop='6px';
    const pdfHelp=document.createElement('div'); pdfHelp.style.cssText='font-size:12px;color:#64748b;margin-top:5px'; pdfHelp.textContent='Or choose a PDF file. When you click Save, the file will be uploaded and its URL saved automatically.';
    const pdfCurrent=document.createElement('div'); pdfCurrent.style.cssText='font-size:12px;color:#166534;margin-top:5px;word-break:break-all';
    pdfUrl.type='hidden'; pdfUrl.setAttribute('aria-hidden','true'); const pdfLabel=pdfWrapper.querySelector('label'); if(pdfLabel)pdfLabel.textContent='PDF File'; pdfWrapper.append(pdfFile,pdfHelp,pdfCurrent);
    const originalSaveLesson=window.saveLesson, originalEditLesson=window.editLesson, originalClearLesson=window.clearLesson;
    window.saveLesson=async function(){
      const selectedVideo=document.getElementById('lessonVideoFile')?.files?.[0], selectedPdf=document.getElementById('lessonPdfFile')?.files?.[0];
      try{
        const client=getLakshyaSetuDb(), topicId=document.getElementById('lessonTopic').value||'general';
        if(selectedVideo){const n=selectedVideo.name.toLowerCase(); if(!['video/mp4','video/webm','video/quicktime'].includes(selectedVideo.type)&&!(/\.(mp4|webm|mov)$/.test(n)))throw new Error('Please select an MP4, WebM or MOV video file.'); if(selectedVideo.size>100*1024*1024)throw new Error('Video must be 100 MB or smaller.'); const path=topicId+'/'+Date.now()+'-'+n.replace(/[^a-z0-9._-]+/g,'-'); notice('Uploading video...'); const {error}=await client.storage.from('lesson-videos').upload(path,selectedVideo,{cacheControl:'3600',upsert:false,contentType:selectedVideo.type||'video/mp4'}); if(error)throw error; const u=client.storage.from('lesson-videos').getPublicUrl(path); if(!u?.data?.publicUrl)throw new Error('Video uploaded but public URL could not be created.'); document.getElementById('lessonVideo').value=u.data.publicUrl; videoCurrent.textContent='Video uploaded successfully. Its URL has been filled automatically.';}
        if(selectedPdf){if(selectedPdf.type!=='application/pdf'&&!selectedPdf.name.toLowerCase().endsWith('.pdf'))throw new Error('Please select a PDF file only.'); if(selectedPdf.size>25*1024*1024)throw new Error('PDF must be 25 MB or smaller.'); const n=selectedPdf.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-'); const path=topicId+'/'+Date.now()+'-'+n; notice('Uploading PDF...'); const {error}=await client.storage.from('lesson-pdfs').upload(path,selectedPdf,{cacheControl:'3600',upsert:false,contentType:'application/pdf'}); if(error)throw error; const u=client.storage.from('lesson-pdfs').getPublicUrl(path); if(!u?.data?.publicUrl)throw new Error('PDF uploaded but public URL could not be created.'); document.getElementById('lessonPdf').value=u.data.publicUrl; pdfCurrent.textContent='PDF uploaded successfully. Its URL has been attached automatically.';}
        await originalSaveLesson(); videoFile.value=''; pdfFile.value='';
      }catch(e){if(window.notice)notice(e.message||'File upload failed.',true);else alert(e.message||'File upload failed.');}
    };
    window.editLesson=function(id){originalEditLesson(id); videoCurrent.textContent=document.getElementById('lessonVideo').value?'Current video is already attached. Select a new file to replace it.':''; pdfCurrent.textContent=document.getElementById('lessonPdf').value?'Current PDF is already attached. Select a new file to replace it.':''; videoFile.value=''; pdfFile.value='';};
    window.clearLesson=function(){originalClearLesson();videoFile.value='';pdfFile.value='';videoCurrent.textContent='';pdfCurrent.textContent='';};
  }catch(e){console.error('Lesson file upload setup failed:',e);}
});

/* Load the current student payment/access module with a cache-busting version. */
window.addEventListener('load', function () {
  /* Some pages still include an older non-cache-busted payments.js tag.
     Clear its module guard so the current cache-busted module below becomes authoritative. */
  window.__LS_PAYMENT_MODULE_LOADED=false;
  const s=document.createElement('script'); s.src='payments.js?v=20260824-razorpay-session-handoff-1'; s.defer=true; document.head.appendChild(s);
});
window.addEventListener('load', function () {
  const s=document.createElement('script'); s.src='test-runner.js?v=20260822-2'; s.defer=true; document.head.appendChild(s);
});

/* Main Admin: expose Current Affairs as a dedicated management section. */
(function addCurrentAffairsAdminTab(){
  function mount(){
    if (!/\/admin\.html$/i.test(location.pathname)) return;
    const nav = document.querySelector('.nav');
    if (!nav || nav.querySelector('[data-current-affairs-tab]')) return;
    const pricing = nav.querySelector('[data-t="pricing"]');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Current Affairs';
    btn.setAttribute('data-current-affairs-tab', 'true');
    btn.title = 'Manage Daily, Weekly, Monthly, Quarterly, Half-Yearly and Annual Current Affairs';
    btn.onclick = function(){ location.href = 'current-affairs-admin.html'; };
    if (pricing) nav.insertBefore(btn, pricing); else nav.appendChild(btn);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once:true});
    window.addEventListener('load', mount, {once:true});
  } else {
    mount();
  }
})();