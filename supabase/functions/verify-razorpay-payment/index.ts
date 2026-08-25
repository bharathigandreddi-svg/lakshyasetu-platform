import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
function hex(bytes:ArrayBuffer){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function hmacSha256(secret:string,message:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message)));}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({success:false,error:"POST required"},405);
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    const keyId=Deno.env.get("RAZORPAY_KEY_ID")||"",keySecret=Deno.env.get("RAZORPAY_KEY_SECRET")||"";
    if(!supabaseUrl||!serviceKey||!keyId||!keySecret)return json({success:false,error:"Payment verification configuration is incomplete."},500);

    const auth=req.headers.get("Authorization")||"";
    if(!auth.startsWith("Bearer "))return json({success:false,error:"Login required."},401);
    const token=auth.slice(7).trim();
    if(!token)return json({success:false,error:"Login required."},401);
    // Validate the browser's Supabase user token through the service-role
    // Auth client, matching the order-creation function's authentication path.
    const authClient=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:userError}=await authClient.auth.getUser(token);
    if(userError||!userData.user){console.error("verify payment auth failed",userError);return json({success:false,error:"Invalid login session. Please login again."},401);}

    const admin=createClient(supabaseUrl,serviceKey);
    const userId=userData.user.id;
    const body=await req.json(),callbackOrderId=String(body?.razorpay_order_id||""),paymentId=String(body?.razorpay_payment_id||""),signature=String(body?.razorpay_signature||"");
    if(!callbackOrderId||!paymentId||!signature)return json({success:false,error:"Incomplete Razorpay response."},400);

    const {data:purchase,error:purchaseError}=await admin.from("ls_purchases").select("*").eq("razorpay_order_id",callbackOrderId).eq("user_id",userId).maybeSingle();
    if(purchaseError)return json({success:false,error:"Unable to locate the pending purchase."},500);
    if(!purchase)return json({success:false,error:"Payment order is not recognised."},400);
    if(purchase.payment_status==="paid"||purchase.status==="ACTIVE")return json({success:true,message:"Payment already verified and access is active."});

    const expected=await hmacSha256(keySecret,`${callbackOrderId}|${paymentId}`);if(!safeEqual(expected,signature))return json({success:false,error:"Invalid payment signature."},400);
    const basic=btoa(`${keyId}:${keySecret}`);
    const paymentResponse=await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,{headers:{Authorization:`Basic ${basic}`}});const payment=await paymentResponse.json();
    if(!paymentResponse.ok)return json({success:false,error:"Unable to confirm payment with Razorpay."},502);
    if(String(payment?.order_id||"")!==callbackOrderId)return json({success:false,error:"Payment does not belong to this order."},400);
    if(!["captured","authorized"].includes(String(payment?.status||"")))return json({success:false,error:"Razorpay payment is not successful yet."},400);

    const orderResponse=await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(callbackOrderId)}`,{headers:{Authorization:`Basic ${basic}`}});const order=await orderResponse.json();
    if(!orderResponse.ok)return json({success:false,error:"Unable to confirm Razorpay order."},502);
    if(Number(payment?.amount||0)!==Number(order?.amount||0))return json({success:false,error:"Payment amount does not match the Razorpay order."},400);
    const expectedType=String(purchase.product_type||""),callbackType=String(body?.product_type||expectedType);if(callbackType!==expectedType)return json({success:false,error:"Payment product mismatch."},400);
    const orderNotes=order?.notes||{};if(String(orderNotes.user_id||"")!==userId)return json({success:false,error:"Payment account mismatch."},403);if(String(orderNotes.product_type||"")!==expectedType)return json({success:false,error:"Payment product mismatch."},400);
    for(const key of ["course_id","course_subject_id","topic_id","lesson_id","test_id","test_series_id","test_package_id"]){const stored=purchase[key],note=orderNotes.product_id;if(stored!=null&&note!=null&&String(stored)!==String(note))return json({success:false,error:"Payment product ID mismatch."},400);}

    const type=String(purchase.product_type||""),map:any={course:["ls_courses","course_id"],subject:["ls_course_subjects","course_subject_id"],topic:["ls_topics","topic_id"],lesson:["ls_lessons","lesson_id"],test:["ls_tests","test_id"],test_series:["ls_test_series","test_series_id"],test_package:["ls_test_packages","test_package_id"]};
    let validityDays=null;const m=map[type];if(m&&purchase[m[1]]!=null){const {data:v}=await admin.from(m[0]).select("validity_days").eq("id",purchase[m[1]]).maybeSingle();if(v?.validity_days!=null&&Number(v.validity_days)>0)validityDays=Number(v.validity_days);}
    const expiry=validityDays?new Date(Date.now()+validityDays*24*60*60*1000).toISOString():null;
    const {error:updateError}=await admin.from("ls_purchases").update({status:"ACTIVE",payment_status:"paid",amount:Number(payment?.amount||order?.amount||0)/100,razorpay_payment_id:paymentId,razorpay_signature:signature,access_start_at:new Date().toISOString(),access_expiry_at:expiry}).eq("id",purchase.id);
    if(updateError)return json({success:false,error:"Payment verified but access activation failed. Please contact support."},500);
    return json({success:true,message:"Payment verified and access activated."});
  }catch(e){console.error("verify-razorpay-payment unexpected error",e);return json({success:false,error:e instanceof Error?e.message:"Unexpected error."},500);}
});