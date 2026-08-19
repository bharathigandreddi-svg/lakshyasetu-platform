window.LAKSHYASETU_CONFIG = {
  supabaseUrl: "https://byounbmdyuytoqqyhgos.supabase.co",
  supabasePublishableKey: "sb_publishable_tCvBH8eh95-nXOChd2_sLQ__iDZIfNa"
};

/* Make the Supabase client available to the lesson upload code. */
if (window.supabase && !window.db) {
  window.db = window.supabase.createClient(
    window.LAKSHYASETU_CONFIG.supabaseUrl,
    window.LAKSHYASETU_CONFIG.supabasePublishableKey
  );
}

/* LakshyaSetu: direct Video + PDF upload for Lesson Management */
window.addEventListener('load', function () {
  try {
    const videoUrl = document.getElementById('lessonVideo');
    const pdfUrl = document.getElementById('lessonPdf');
    if (!videoUrl || !pdfUrl) return;

    /* VIDEO FILE UPLOAD */
    const videoWrapper = videoUrl.parentElement;
    const videoFile = document.createElement('input');
    videoFile.type = 'file';
    videoFile.id = 'lessonVideoFile';
    videoFile.accept = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
    videoFile.style.marginTop = '6px';

    const videoHelp = document.createElement('div');
    videoHelp.id = 'lessonVideoHelp';
    videoHelp.style.cssText = 'font-size:12px;color:#64748b;margin-top:5px';
    videoHelp.textContent = 'Or choose a video file. When you click Save, the file will be uploaded and its URL saved automatically.';

    const videoCurrent = document.createElement('div');
    videoCurrent.id = 'lessonVideoCurrent';
    videoCurrent.style.cssText = 'font-size:12px;color:#166534;margin-top:5px;word-break:break-all';

    const videoLabel = videoWrapper.querySelector('label');
    if (videoLabel) videoLabel.textContent = 'Video URL';
    videoWrapper.appendChild(videoFile);
    videoWrapper.appendChild(videoHelp);
    videoWrapper.appendChild(videoCurrent);

    /* PDF FILE UPLOAD */
    const pdfWrapper = pdfUrl.parentElement;
    const pdfFile = document.createElement('input');
    pdfFile.type = 'file';
    pdfFile.id = 'lessonPdfFile';
    pdfFile.accept = 'application/pdf,.pdf';
    pdfFile.style.marginTop = '6px';

    const pdfHelp = document.createElement('div');
    pdfHelp.id = 'lessonPdfHelp';
    pdfHelp.style.cssText = 'font-size:12px;color:#64748b;margin-top:5px';
    pdfHelp.textContent = 'Or choose a PDF file. When you click Save, the PDF will be uploaded and its URL saved automatically.';

    const pdfCurrent = document.createElement('div');
    pdfCurrent.id = 'lessonPdfCurrent';
    pdfCurrent.style.cssText = 'font-size:12px;color:#166534;margin-top:5px;word-break:break-all';

    /* Keep PDF URL available for database compatibility, but hide the manual URL field. */
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
        const topicId = document.getElementById('lessonTopic').value || 'general';

        /* Upload video if a file was selected. File takes priority over Video URL. */
        if (selectedVideo) {
          const allowedVideo = ['video/mp4','video/webm','video/quicktime'];
          const videoName = selectedVideo.name.toLowerCase();
          const validVideo = allowedVideo.includes(selectedVideo.type) || /\.(mp4|webm|mov)$/.test(videoName);
          if (!validVideo) throw new Error('Please select an MP4, WebM or MOV video file.');
          if (selectedVideo.size > 100 * 1024 * 1024) {
            throw new Error('Video must be 100 MB or smaller.');
          }

          const safeName = videoName.replace(/[^a-z0-9._-]+/g, '-');
          const path = topicId + '/' + Date.now() + '-' + safeName;

          notice('Uploading video...');
          const { error: uploadError } = await window.db.storage
            .from('lesson-videos')
            .upload(path, selectedVideo, {
              cacheControl: '3600',
              upsert: false,
              contentType: selectedVideo.type || 'video/mp4'
            });

          if (uploadError) throw uploadError;

          const { data } = window.db.storage.from('lesson-videos').getPublicUrl(path);
          if (!data?.publicUrl) throw new Error('Video uploaded but public URL could not be created.');

          document.getElementById('lessonVideo').value = data.publicUrl;
          videoCurrent.textContent = 'Video uploaded successfully. Its URL has been filled automatically.';
        }

        /* Upload PDF if a file was selected. */
        if (selectedPdf) {
          if (selectedPdf.type !== 'application/pdf' && !selectedPdf.name.toLowerCase().endsWith('.pdf')) {
            throw new Error('Please select a PDF file only.');
          }
          if (selectedPdf.size > 25 * 1024 * 1024) {
            throw new Error('PDF must be 25 MB or smaller.');
          }

          const safeName = selectedPdf.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
          const path = topicId + '/' + Date.now() + '-' + safeName;

          notice('Uploading PDF...');
          const { error: uploadError } = await window.db.storage
            .from('lesson-pdfs')
            .upload(path, selectedPdf, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'application/pdf'
            });

          if (uploadError) throw uploadError;

          const { data } = window.db.storage.from('lesson-pdfs').getPublicUrl(path);
          if (!data?.publicUrl) throw new Error('PDF uploaded but public URL could not be created.');

          document.getElementById('lessonPdf').value = data.publicUrl;
          pdfCurrent.textContent = 'PDF uploaded successfully. Its URL has been attached automatically.';
        }

        await originalSaveLesson();
        document.getElementById('lessonVideoFile').value = '';
        document.getElementById('lessonPdfFile').value = '';
      } catch (e) {
        if (window.notice) notice(e.message || 'File upload failed.', true);
        else alert(e.message || 'File upload failed.');
      }
    };

    window.editLesson = function (id) {
      originalEditLesson(id);
      const v = document.getElementById('lessonVideo').value;
      const p = document.getElementById('lessonPdf').value;
      videoCurrent.textContent = v ? 'Current video is already attached. Select a new file to replace it.' : '';
      pdfCurrent.textContent = p ? 'Current PDF is already attached. Select a new file to replace it.' : '';
      document.getElementById('lessonVideoFile').value = '';
      document.getElementById('lessonPdfFile').value = '';
    };

    window.clearLesson = function () {
      originalClearLesson();
      document.getElementById('lessonVideoFile').value = '';
      document.getElementById('lessonPdfFile').value = '';
      videoCurrent.textContent = '';
      pdfCurrent.textContent = '';
    };
  } catch (e) {
    console.error('Lesson file upload setup failed:', e);
  }
});
