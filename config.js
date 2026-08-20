window.LAKSHYASETU_CONFIG = {
  supabaseUrl: "https://byounbmdyuytoqkyhgos.supabase.co",
  supabasePublishableKey: "sb_publishable_tCvBH8eh95-nXOChd2_sLQ__iDZIfNa"
};

/* Create one reliable Supabase client for the whole page. */
function getLakshyaSetuDb() {
  if (window.db && typeof window.db.from === 'function') {
    return window.db;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase client library is not loaded. Please refresh the page and try again.');
  }

  const client = window.supabase.createClient(
    window.LAKSHYASETU_CONFIG.supabaseUrl,
    window.LAKSHYASETU_CONFIG.supabasePublishableKey
  );

  window.db = client;
  window.LAKSHYASETU_DB = client;

  /*
     IMPORTANT: payment Edge Functions require the student's authenticated
     Bearer token. Supabase JS automatically attaches the current session
     to functions.invoke(). Do not override functions.invoke() or
     auth.refreshSession() here; doing so previously removed/broke the
     authentication handoff and caused repeated 401/non-2xx failures.
  */

  return client;
}

try {
  getLakshyaSetuDb();
} catch (e) {
  console.error('Supabase initialization failed:', e);
}

/* Direct Video + PDF upload for Lesson Management. */
window.addEventListener('load', function () {
  try {
    const videoUrl = document.getElementById('lessonVideo');
    const pdfUrl = document.getElementById('lessonPdf');
    if (!videoUrl || !pdfUrl) return;

    const videoWrapper = videoUrl.parentElement;
    const videoFile = document.createElement('input');
    videoFile.type = 'file';
    videoFile.id = 'lessonVideoFile';
    videoFile.accept = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
    videoFile.style.marginTop = '6px';

    const videoHelp = document.createElement('div');
    videoHelp.style.cssText = 'font-size:12px;color:#64748b;margin-top:5px';
    videoHelp.textContent = 'Or choose a video file. When you click Save, the file will be uploaded and its URL saved automatically.';

    const videoCurrent = document.createElement('div');
    videoCurrent.style.cssText = 'font-size:12px;color:#166534;margin-top:5px;word-break:break-all';

    const videoLabel = videoWrapper.querySelector('label');
    if (videoLabel) videoLabel.textContent = 'Video URL';
    videoWrapper.appendChild(videoFile);
    videoWrapper.appendChild(videoHelp);
    videoWrapper.appendChild(videoCurrent);

    const pdfWrapper = pdfUrl.parentElement;
    const pdfFile = document.createElement('input');
    pdfFile.type = 'file';
    pdfFile.id = 'lessonPdfFile';
    pdfFile.accept = 'application/pdf,.pdf';
    pdfFile.style.marginTop = '6px';

    const pdfHelp = document.createElement('div');
    pdfHelp.style.cssText = 'font-size:12px;color:#64748b;margin-top:5px';
    pdfHelp.textContent = 'Or choose a PDF file. When you click Save, the PDF will be uploaded and its URL saved automatically.';

    const pdfCurrent = document.createElement('div');
    pdfCurrent.style.cssText = 'font-size:12px;color:#166534;margin-top:5px;word-break:break-all';

    pdfUrl.type = 'hidden';
    pdfUrl.setAttribute('aria-hidden', 'true');
    const pdfLabel = pdfWrapper.querySelector('label');
    if (pdfLabel) pdfLabel.textContent = 'PDF File';
    pdfWrapper.appendChild(pdfFile);
    pdfWrapper.appendChild(pdfHelp);
    pdfWrapper.appendChild(pdfCurrent);

    const originalSaveLesson = window.saveLesson;
    const originalEditLesson = window.editLesson;
    const originalClearLesson = window.clearLesson;

    window.saveLesson = async function () {
      const selectedVideo = document.getElementById('lessonVideoFile')?.files?.[0];
      const selectedPdf = document.getElementById('lessonPdfFile')?.files?.[0];

      try {
        const client = getLakshyaSetuDb();
        const topicId = document.getElementById('lessonTopic').value || 'general';

        if (selectedVideo) {
          const videoName = selectedVideo.name.toLowerCase();
          const validVideo = ['video/mp4','video/webm','video/quicktime'].includes(selectedVideo.type) || /\.(mp4|webm|mov)$/.test(videoName);
          if (!validVideo) throw new Error('Please select an MP4, WebM or MOV video file.');
          if (selectedVideo.size > 100 * 1024 * 1024) throw new Error('Video must be 100 MB or smaller.');

          const safeName = videoName.replace(/[^a-z0-9._-]+/g, '-');
          const path = topicId + '/' + Date.now() + '-' + safeName;
          notice('Uploading video...');
          const { error } = await client.storage.from('lesson-videos').upload(path, selectedVideo, {
            cacheControl: '3600', upsert: false, contentType: selectedVideo.type || 'video/mp4'
          });
          if (error) throw error;

          const publicResult = client.storage.from('lesson-videos').getPublicUrl(path);
          if (!publicResult?.data?.publicUrl) throw new Error('Video uploaded but public URL could not be created.');
          document.getElementById('lessonVideo').value = publicResult.data.publicUrl;
          videoCurrent.textContent = 'Video uploaded successfully. Its URL has been filled automatically.';
        }

        if (selectedPdf) {
          if (selectedPdf.type !== 'application/pdf' && !selectedPdf.name.toLowerCase().endsWith('.pdf')) throw new Error('Please select a PDF file only.');
          if (selectedPdf.size > 25 * 1024 * 1024) throw new Error('PDF must be 25 MB or smaller.');

          const safeName = selectedPdf.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
          const path = topicId + '/' + Date.now() + '-' + safeName;
          notice('Uploading PDF...');
          const { error } = await client.storage.from('lesson-pdfs').upload(path, selectedPdf, {
            cacheControl: '3600', upsert: false, contentType: 'application/pdf'
          });
          if (error) throw error;

          const publicResult = client.storage.from('lesson-pdfs').getPublicUrl(path);
          if (!publicResult?.data?.publicUrl) throw new Error('PDF uploaded but public URL could not be created.');
          document.getElementById('lessonPdf').value = publicResult.data.publicUrl;
          pdfCurrent.textContent = 'PDF uploaded successfully. Its URL has been attached automatically.';
        }

        await originalSaveLesson();
        videoFile.value = '';
        pdfFile.value = '';
      } catch (e) {
        if (window.notice) notice(e.message || 'File upload failed.', true);
        else alert(e.message || 'File upload failed.');
      }
    };

    window.editLesson = function (id) {
      originalEditLesson(id);
      videoCurrent.textContent = document.getElementById('lessonVideo').value ? 'Current video is already attached. Select a new file to replace it.' : '';
      pdfCurrent.textContent = document.getElementById('lessonPdf').value ? 'Current PDF is already attached. Select a new file to replace it.' : '';
      videoFile.value = '';
      pdfFile.value = '';
    };

    window.clearLesson = function () {
      originalClearLesson();
      videoFile.value = '';
      pdfFile.value = '';
      videoCurrent.textContent = '';
      pdfCurrent.textContent = '';
    };
  } catch (e) {
    console.error('Lesson file upload setup failed:', e);
  }
});

/* Load student payment/access module after the page scripts are ready. */
window.addEventListener('load', function () {
  const s = document.createElement('script');
  s.src = 'payments.js';
  s.defer = true;
  document.head.appendChild(s);
});

/* Load live student test attempt/result flow after the page scripts are ready. */
window.addEventListener('load', function () {
  const s = document.createElement('script');
  s.src = 'test-runner.js';
  s.defer = true;
  document.head.appendChild(s);
});