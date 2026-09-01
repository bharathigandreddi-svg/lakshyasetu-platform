(function(){'use strict';
function load(src){if(document.querySelector('script[src*="'+src+'"]'))return;const s=document.createElement('script');s.src=src+'?v=20260901-1600';s.defer=true;document.head.appendChild(s)}
window.addEventListener('load',function(){load('site-experience-v2.js');if(/\/admin\.html$/i.test(location.pathname))load('exam-experience-v8.js')});
})();