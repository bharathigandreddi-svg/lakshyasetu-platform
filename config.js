window.LAKSHYASETU_CONFIG={
  supabaseUrl:'https://byounbmdyuytoqqyhgos.supabase.co',
  supabasePublishableKey:'sb_publishable_tCvBH8eh95-nXOChd2_sLQ__iDZIfNa'
};
window.getLakshyaSetuDb=function(){
  if(window.__LS_DB)return window.__LS_DB;
  if(!window.supabase||!window.supabase.createClient)throw new Error('Supabase library is not available.');
  window.__LS_DB=window.supabase.createClient(
    window.LAKSHYASETU_CONFIG.supabaseUrl,
    window.LAKSHYASETU_CONFIG.supabasePublishableKey
  );
  return window.__LS_DB;
};