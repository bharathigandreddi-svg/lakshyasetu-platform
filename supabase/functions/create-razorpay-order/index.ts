import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
function pickAmount(row:Record<string,unknown>,fallback=0){for(const key of ["course_fee","subject_fee","topic_fee","video_fee","price","current_fee","fee"]){const n=Number(row?.[key]);if(Number.isFinite(n)&&n>0)return n;}return fallback;}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({success:false,error:"POST required"},405);
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    const publishableKey=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY")||"";
    const keyId=Deno.env.get("RAZORPAY_KEY_ID")||"",keySecret=Deno.env.get("RAZORPAY_KEY_SECRET")||"";
    if(!supabaseUrl||!serviceKey||!publishableKey||!keyId||!keySecret)return json({success:false,error:"Payment gateway configuration is incomplete."},500);

    const auth=req.headers.get("Authorization")||"";
    if(!auth.startsWith("Bearer "))return json({success:false,error:"Login required."},401);
    const token=auth.slice(7).trim();
    if(!token)return json({success:false,error:"Login required."},401);

    // Deliberately validate the user JWT through Supabase Auth rather than the
    // Edge Function platform JWT gate. This is robust with the project's
    // current asymmetric/publishable-key setup while keeping the endpoint
    // protected by a real Supabase user session.
    const authClient=createClient(supabaseUrl,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:userError}=await authClient.auth.getUser(token);
    if(userError||!userData.user){console.error("create order auth failed",userError);return json({success:false,error:"Invalid login session. Please login again."},401);}

    const origin=req.headers.get("origin")||"";
    let isGithubPages=false;try{isGithubPages=origin?new URL(origin).hostname.toLowerCase().endsWith(".github.io"):false;}catch(_e){}
    const razorpayMode=keyId.startsWith("rzp_test_")?"test":keyId.startsWith("rzp_live_")?"live":"unknown";
    if(isGithubPages&&razorpayMode!=="test")return json({success:false,error:"Razorpay is using a Live/invalid API key on the Test website. Set the Supabase Razorpay secrets to the Test Mode key pair (rzp_test_...).",razorpay_mode:razorpayMode},500);

    const admin=createClient(supabaseUrl,serviceKey);
    const product=await req.json(),type=String(product?.product_type||"");
    const tableMap:Record<string,[string,string]>={course:["ls_courses","course_id"],subject:["ls_course_subjects","course_subject_id"],topic:["ls_topics","topic_id"],lesson:["ls_lessons","lesson_id"],test:["ls_tests","test_id"],test_series:["ls_test_series","test_series_id"],test_package:["ls_test_packages","test_package_id"]};
    const mapping=tableMap[type];if(!mapping)return json({success:false,error:"Invalid product."},400);
    const id=Number(product?.[mapping[1]]);if(!id)return json({success:false,error:"Product ID is required."},400);
    const {data:row,error:rowError}=await admin.from(mapping[0]).select("*").eq("id",id).single();if(rowError||!row)return json({success:false,error:"Product not found."},404);
    const amountRupees=pickAmount(row,type==="test"?5:0);if(!Number.isFinite(amountRupees)||amountRupees<=0)return json({success:false,error:"This product has no active price."},400);
    const amount=Math.round(amountRupees*100);if(amount<100)return json({success:false,error:"Minimum payment amount is ₹1."},400);

    const razor=btoa(`${keyId}:${keySecret}`);
    const r=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:`Basic ${razor}`,"Content-Type":"application/json"},body:JSON.stringify({amount,currency:"INR",receipt:`ls_${type}_${id}_${Date.now()}`,notes:{user_id:userData.user.id,product_type:type,product_id:String(id)},payment_capture:1})});
    const order=await r.json();
    if(!r.ok){const description=order?.error?.description||"Razorpay order creation failed.";console.error("Razorpay create order failed",{status:r.status,code:order?.error?.code,description,razorpayMode});return json({success:false,error:description,razorpay_code:order?.error?.code||null},r.status===401?401:502);}

    const purchase:Record<string,unknown>={user_id:userData.user.id,product_type:type,amount:amountRupees,status:"PENDING",payment_status:"pending",razorpay_order_id:order.id};purchase[mapping[1]]=id;
    const {error:purchaseError}=await admin.from("ls_purchases").insert(purchase);if(purchaseError){console.error("Pending purchase insert failed",purchaseError);return json({success:false,error:"Unable to initialise the purchase. Please try again."},500);}
    return json({success:true,key_id:keyId,razorpay_mode:razorpayMode,amount:amountRupees,order});
  }catch(e){console.error("create-razorpay-order unexpected error",e);return json({success:false,error:e instanceof Error?e.message:"Unexpected error."},500);}
});