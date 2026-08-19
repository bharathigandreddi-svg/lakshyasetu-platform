window.LAKSHYASETU_CONFIG = {
  supabaseUrl: "https://byounbmdyuytoqqyhgos.supabase.co",
  supabasePublishableKey: "sb_publishable_tCvBH8eh95-nXOChd2_sLQ__iDZIfNa"
};

/* LakshyaSetu: direct PDF upload for Lesson Management */
window.addEventListener('load', function () {
  try {
    const pdfUrl = document.getElementById('lessonPdf');
    if (!pdfUrl) return;

    const wrapper = pdfUrl.parentElement;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'lessonPdfFile';
    fileInput.accept = 'application/pdf,.pdf';

    const help = document.createElement('div');
    help.id = 'lessonPdfHelp';
    help.style.cssText = 'font-size:12px;color:#64748b;margin-top:5px';
    help.textContent = 'Select a PDF from your computer. It will be uploaded automatically when you click Save.';

    const current = document.createElement('div');
    current.id = 'lessonPdfCurrent';
    current.style.cssText = 'font-size:12px;color:#166534;margin-top:5px;word-break:break-all';
    
    pdfUrl.type = 'hidden';
    pdfUrl.setAttribute('aria-hidden', 'true');
    const label = wrapper.querySelector('label');
    if (label) label.textContent = 'PDF File';
    wrapper.appendChild(fileInput);
    wrapper.appendChild(help);
    wrapper.appendChild(current);

    const originalSaveLesson = window.saveLesson;

    window.saveLesson = async function () {
      const file = document.getElementById('lessonPdfFile')?.files?.[0];

      try {
        if (file) {
          if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            throw new Error('Please select a PDF file only.');
          }
          if (file.size > 25 * 1024 * 1024) {
            throw new Error('PDF must be 25 MB or smaller.');
          }

          const topicId = document.getElementById('lessonTopic').value || 'general';
          const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
          const path = topicId + '/' + Date.now() + '-' + safeName;

          if (window.notice) notice('Uploading PDF...');

          const { error: uploadError } = await window.db.storage
            .from('lesson-pdfs')
            .upload(path, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'application/pdf'
            });

          if (uploadError) throw uploadError;

          const { data } = window.db.storage.from('lesson-pdfs').getPublicUrl(path);
          if (!data?.publicUrl) throw new Error('PDF uploaded but public URL could not be created.');

          document.getElementById('lessonPdf').value = data.publicUrl;
          current.textContent = 'PDF uploaded successfully.';
        }

        await originalSaveLesson();
        document.getElementById('lessonPdfFile').value = '';
      } catch (e) {
        if (window.notice) notice(e.message || 'PDF upload failed.', true);
        else alert(e.message || 'PDF upload failed.');
      }
    };

    const originalEditLesson = window.editLesson;
    window.editLesson = function (id) {
      originalEditLesson(id);
      const url = document.getElementById('lessonPdf').value;
      current.textContent = url ? 'Current PDF is already attached. Select a new PDF to replace it.' : '';
      document.getElementById('lessonPdfFile').value = '';
    };

    const originalClearLesson = window.clearLesson;
    window.clearLesson = function () {
      originalClearLesson();
      document.getElementById('lessonPdfFile').value = '';
      current.textContent = '';
    };
  } catch (e) {
    console.error('PDF upload setup failed:', e);
  }
});
