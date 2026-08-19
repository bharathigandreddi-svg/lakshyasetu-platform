import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "POST required" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    if (!supabaseUrl || !serviceKey || !keySecret) return json({ success: false, error: "Payment verification secrets are not configured." }, 500);

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ success: false, error: "Login required." }, 401);
    const admin = createClient(supabaseUrl, serviceKey);
    const token = auth.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ success: false, error: "Invalid login session." }, 401);

    const body = await req.json();
    const orderId = String(body?.razorpay_order_id || "");
    const paymentId = String(body?.razorpay_payment_id || "");
    const signature = String(body?.razorpay_signature || "");
    if (!orderId || !paymentId || !signature) return json({ success: false, error: "Incomplete Razorpay response." }, 400);

    const expected = await hmacSha256(keySecret, `${orderId}|${paymentId}`);
    if (expected !== signature) return json({ success: false, error: "Invalid payment signature." }, 400);

    const productType = String(body?.product_type || "");
    const allowed = new Set(["course", "subject", "topic", "test", "test_series", "test_package"]);
    if (!allowed.has(productType)) return json({ success: false, error: "Invalid product type." }, 400);

    const purchase: Record<string, unknown> = {
      user_id: userData.user.id,
      product_type: productType,
      status: "ACTIVE",
      amount: Number(body?.amount || 0),
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    };
    for (const key of ["course_id", "course_subject_id", "topic_id", "test_id", "test_series_id", "test_package_id"]) {
      if (body?.[key] != null) purchase[key] = Number(body[key]);
    }

    const { error } = await admin.from("ls_purchases").insert(purchase);
    if (error) return json({ success: false, error: error.message }, 500);

    return json({ success: true, message: "Payment verified and access activated." });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
