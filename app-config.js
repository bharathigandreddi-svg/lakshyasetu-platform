window.LAKSHYASETU_CONFIG={supabaseUrl:'https://byounbmdyuytoqqyhgos.supabase.co',supabasePublishableKey:'sb_publishable_tCvBH8eh95-nXOChd2_sLQ__iDZIfNa'};
window.getLakshyaSetuDb=function(){
  if(window.db) return window.db;
  if(!window.supabase||!window.supabase.createClient) throw new Error('Supabase library not loaded');
  window.db=window.supabase.createClient(window.LAKSHYASETU_CONFIG.supabaseUrl,window.LAKSHYASETU_CONFIG.supabasePublishableKey);
  return window.db;
};
