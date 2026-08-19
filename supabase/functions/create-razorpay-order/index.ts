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

function pickAmount(row: Record<string, unknown>, fallback = 0) {
  for (const key of ["course_fee", "subject_fee", "topic_fee", "price", "current_fee", "fee"]) {
    const n = Number(row?.[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "POST required" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    if (!supabaseUrl || !serviceKey || !keyId || !keySecret) {
      return json({ success: false, error: "Payment gateway secrets are not configured." }, 500);
    }

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ success: false, error: "Login required." }, 401);
    const admin = createClient(supabaseUrl, serviceKey);
    const token = auth.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ success: false, error: "Invalid login session." }, 401);

    const product = await req.json();
    const type = String(product?.product_type || "");
    const tableMap: Record<string, [string, string]> = {
      course: ["courses", "course_id"],
      subject: ["course_subjects", "course_subject_id"],
      topic: ["course_topics", "topic_id"],
      test: ["ls_tests", "test_id"],
      test_series: ["ls_test_series", "test_series_id"],
      test_package: ["ls_test_packages", "test_package_id"]
    };
    const mapping = tableMap[type];
    if (!mapping) return json({ success: false, error: "Invalid product." }, 400);

    const id = Number(product?.[mapping[1]]);
    if (!id) return json({ success: false, error: "Product ID is required." }, 400);

    const { data: row, error: rowError } = await admin.from(mapping[0]).select("*").eq("id", id).single();
    if (rowError || !row) return json({ success: false, error: "Product not found." }, 404);

    const amountRupees = pickAmount(row, type === "test" ? 5 : 0);
    if (amountRupees <= 0) return json({ success: false, error: "This product has no active price." }, 400);
    const amount = Math.round(amountRupees * 100);

    const razor = btoa(`${keyId}:${keySecret}`);
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Authorization": `Basic ${razor}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency: "INR", receipt: `ls_${type}_${id}_${Date.now()}`, notes: { user_id: userData.user.id, product_type: type, product_id: String(id) } })
    });
    const order = await r.json();
    if (!r.ok) return json({ success: false, error: order?.error?.description || "Razorpay order creation failed." }, 502);

    return json({ success: true, key_id: keyId, amount: amountRupees, order });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
