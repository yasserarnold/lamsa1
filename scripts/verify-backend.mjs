#!/usr/bin/env node
/**
 * خطة اختبار الباك إند (Auth + CRUD + RLS) — تعمل على أي Supabase:
 * Lovable Cloud الحالي أو نسخة self-hosted بعد التعطيل.
 *
 * التشغيل:
 *   SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/verify-backend.mjs
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !PUB || !SRV) {
  console.error("متغيرات ناقصة: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

// مفاتيح sb_* غير JWT: نرسل apikey فقط.
const shim = (key) => (input, init) => {
  const h = new Headers(init?.headers);
  if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
  h.set("apikey", key);
  return fetch(input, { ...init, headers: h });
};
const mk = (key) =>
  createClient(URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: shim(key) },
  });

const admin = mk(SRV);
const anon = mk(PUB);
const user = mk(PUB);

const results = [];
let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    results.push(["PASS", name, ""]);
  } catch (e) {
    failures++;
    results.push(["FAIL", name, e?.message ?? String(e)]);
  }
}
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const ok = ({ error }, msg) => must(!error, `${msg}: ${error?.message}`);
const denied = ({ error, data }, msg) =>
  must(error || !data || data.length === 0, `${msg}: لم يُمنع الوصول`);

const stamp = Date.now();
const email = `qa+${stamp}@lamsa.test`;
const password = `Qa!${stamp}aA1`;
let uid = null;
let linkId = null;
let tapId = null;
let cardUid = String(stamp).padStart(12, "0").slice(-12).toUpperCase().replace(/[^0-9A-F]/g, "A");

console.log(`▶ اختبار الباك إند على ${URL}\n`);

// ── 1) الاتصال والمصادقة ────────────────────────────────────────────────
await check("الاتصال بالـ REST API", async () => {
  const r = await fetch(`${URL}/rest/v1/app_settings?select=id&limit=1`, { headers: { apikey: PUB } });
  must(r.ok, `HTTP ${r.status}`);
});

await check("إنشاء مستخدم (Admin API)", async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  ok({ error }, "createUser");
  uid = data.user.id;
});

await check("تسجيل الدخول بكلمة المرور", async () => {
  const { data, error } = await user.auth.signInWithPassword({ email, password });
  ok({ error }, "signInWithPassword");
  must(data.session?.access_token, "لا يوجد access_token");
});

await check("getUser يعيد نفس المستخدم", async () => {
  const { data, error } = await user.auth.getUser();
  ok({ error }, "getUser");
  must(data.user?.id === uid, "معرّف المستخدم غير مطابق");
});

// ── 2) profiles ─────────────────────────────────────────────────────────
await check("profiles: إنشاء بروفايل المالك", async () => {
  ok(
    await user.from("profiles").insert({ id: uid, full_name: "QA User", username: `qa${stamp}` }),
    "insert",
  );
});
await check("profiles: قراءة المالك", async () => {
  const { data, error } = await user.from("profiles").select("*").eq("id", uid).single();
  ok({ error }, "select");
  must(data.full_name === "QA User", "قيمة غير متوقعة");
});
await check("profiles: تعديل المالك", async () =>
  ok(await user.from("profiles").update({ title: "QA Title", is_published: true }).eq("id", uid), "update"),
);
await check("profiles: منع قراءة بروفايل مستخدم آخر", async () =>
  denied(await user.from("profiles").select("id").neq("id", uid).limit(1), "cross-user read"),
);

// ── 3) profile_links / media / themes ───────────────────────────────────
await check("profile_links: CRUD", async () => {
  const { data, error } = await user
    .from("profile_links")
    .insert({ profile_id: uid, type: "website", label: "Site", value: "https://lamsa.live" })
    .select()
    .single();
  ok({ error }, "insert");
  linkId = data.id;
  ok(await user.from("profile_links").update({ label: "Site 2" }).eq("id", linkId), "update");
  const sel = await user.from("profile_links").select("label").eq("id", linkId).single();
  ok(sel, "select");
  must(sel.data.label === "Site 2", "التعديل لم يُحفظ");
});

await check("profile_media: CRUD", async () => {
  const { data, error } = await user
    .from("profile_media")
    .insert({ profile_id: uid, type: "image", storage_path: `${uid}/qa.png`, title: "QA" })
    .select()
    .single();
  ok({ error }, "insert");
  ok(await user.from("profile_media").update({ title: "QA2" }).eq("id", data.id), "update");
  ok(await user.from("profile_media").delete().eq("id", data.id), "delete");
});

await check("profile_themes: upsert وقراءة", async () => {
  ok(await user.from("profile_themes").upsert({ profile_id: uid, preset: "emerald" }), "upsert");
  const sel = await user.from("profile_themes").select("preset").eq("profile_id", uid).single();
  ok(sel, "select");
});

// ── 4) البطاقات ─────────────────────────────────────────────────────────
await check("nfc_cards: إنشاء بواسطة الخدمة وربطها", async () => {
  ok(
    await admin.from("nfc_cards").insert({ card_uid: cardUid, profile_id: uid, status: "active", is_official: true }),
    "admin insert",
  );
  const sel = await user.from("nfc_cards").select("card_uid").eq("profile_id", uid);
  ok(sel, "owner select");
  must(sel.data.length === 1, "المالك لا يرى بطاقته");
});
await check("nfc_cards: منع الإنشاء من مستخدم عادي", async () => {
  const { error } = await user.from("nfc_cards").insert({ card_uid: "BBBBBBBBBBBB" });
  must(error, "تم السماح بإنشاء بطاقة لمستخدم عادي");
});
await check("card_events: إدراج وقراءة للمالك", async () => {
  ok(
    await user.from("card_events").insert({ profile_id: uid, card_uid: cardUid, event_type: "registered" }),
    "insert",
  );
  const sel = await user.from("card_events").select("id").eq("profile_id", uid);
  ok(sel, "select");
  must(sel.data.length >= 1, "لا توجد أحداث");
});

// ── 5) الزوّار (anon) على بروفايل منشور ─────────────────────────────────
await check("anon: قراءة بروفايل منشور", async () => {
  const { data, error } = await anon.from("profiles").select("id, full_name").eq("id", uid);
  ok({ error }, "select");
  must(data.length === 1, "الزائر لا يرى البروفايل المنشور");
});
await check("anon: قراءة روابط ظاهرة", async () => {
  const { data, error } = await anon.from("profile_links").select("id").eq("profile_id", uid);
  ok({ error }, "select");
  must(data.length >= 1, "الروابط غير ظاهرة للزائر");
});
await check("anon: تسجيل زيارة (taps + tap_events)", async () => {
  // الزائر يُدرج بدون RETURNING (لا يملك صلاحية قراءة) — نفس سلوك التطبيق.
  ok(await anon.from("taps").insert({ profile_id: uid, device: "qa" }), "taps insert");
  const row = await admin.from("taps").select("id").eq("profile_id", uid).limit(1).single();
  ok(row, "admin read tap");
  tapId = row.data.id;
  ok(await anon.from("tap_events").insert({ profile_id: uid, tap_id: tapId, event_type: "view" }), "tap_events insert");
});
await check("anon: منع قراءة التحليلات", async () =>
  denied(await anon.from("taps").select("id").eq("profile_id", uid), "anon taps read"),
);
await check("owner: قراءة التحليلات", async () => {
  const t = await user.from("taps").select("id").eq("profile_id", uid);
  ok(t, "taps select");
  must(t.data.length >= 1, "لا توجد زيارات");
  const e = await user.from("tap_events").select("id").eq("profile_id", uid);
  ok(e, "tap_events select");
});
await check("leads: إدراج من زائر + قراءة/حذف للمالك", async () => {
  ok(
    await anon.from("leads").insert({ profile_id: uid, name: "عميل تجريبي", mobile: "+201000000000" }),
    "anon insert",
  );
  const sel = await user.from("leads").select("id").eq("profile_id", uid);
  ok(sel, "owner select");
  must(sel.data.length >= 1, "المالك لا يرى العملاء");
  ok(await user.from("leads").delete().eq("id", sel.data[0].id), "owner delete");
});
await check("anon: منع قراءة leads", async () =>
  denied(await anon.from("leads").select("id").eq("profile_id", uid), "anon leads read"),
);

// ── 6) الأدوار والإعدادات والسجلات ──────────────────────────────────────
await check("user_roles: قراءة الدور الخاص فقط", async () => {
  ok(await admin.from("user_roles").insert({ user_id: uid, role: "user" }), "seed role");
  const sel = await user.from("user_roles").select("role").eq("user_id", uid);
  ok(sel, "select own");
  must(sel.data.length === 1, "الدور غير مقروء");
  denied(await user.from("user_roles").select("id").neq("user_id", uid).limit(1), "cross-user roles");
});
await check("user_roles: منع الترقية الذاتية", async () => {
  const { error } = await user.from("user_roles").insert({ user_id: uid, role: "admin" });
  must(error, "تمت الترقية الذاتية إلى admin!");
});
await check("app_settings: قراءة عامة + منع التعديل لغير المسؤول", async () => {
  const sel = await anon.from("app_settings").select("site_title").limit(1);
  ok(sel, "anon read");
  const { error } = await user.from("app_settings").update({ site_title: "hacked" }).eq("id", true);
  const after = await admin.from("app_settings").select("site_title").limit(1).single();
  must(error || after.data.site_title !== "hacked", "غير المسؤول عدّل الإعدادات");
});
await check("admin_actions: منع القراءة لغير المسؤول", async () =>
  denied(await user.from("admin_actions").select("id").limit(1), "admin_actions read"),
);
await check("security_events: إدراج مسموح + قراءة ممنوعة", async () => {
  ok(
    await user.from("security_events").insert({ severity: "info", category: "qa", action: "smoke_test", actor_id: uid }),
    "insert",
  );
  denied(await user.from("security_events").select("id").limit(1), "select");
});
await check("rate_limits: لا وصول مباشر", async () =>
  denied(await user.from("rate_limits").select("*").limit(1), "rate_limits"),
);

// ── 7) دوال قاعدة البيانات ──────────────────────────────────────────────
await check("RPC has_role يعمل للمستخدم", async () => {
  const { error } = await user.rpc("has_role", { _user_id: uid, _role: "user" });
  ok({ error }, "has_role");
});
await check("RPC claim_official_card يعمل", async () => {
  const { error } = await user.rpc("claim_official_card", { _uid: cardUid });
  ok({ error }, "claim_official_card");
});

// ── 8) التخزين ──────────────────────────────────────────────────────────
for (const bucket of ["avatars", "covers", "media"]) {
  await check(`storage/${bucket}: رفع وحذف للمالك`, async () => {
    const path = `${uid}/qa-${stamp}.txt`;
    const up = await user.storage.from(bucket).upload(path, new Blob(["qa"]), { contentType: "text/plain" });
    ok(up, "upload");
    ok(await user.storage.from(bucket).remove([path]), "remove");
  });
}

// ── 9) تنظيف ────────────────────────────────────────────────────────────
await check("تنظيف بيانات الاختبار", async () => {
  await admin.from("nfc_cards").delete().eq("card_uid", cardUid);
  await admin.from("security_events").delete().eq("actor_id", uid);
  const { error } = await admin.auth.admin.deleteUser(uid);
  ok({ error }, "deleteUser");
});

// ── تقرير ───────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("النتيجة", 8) + "الاختبار");
console.log("-".repeat(72));
for (const [st, name, msg] of results) {
  console.log(`${st === "PASS" ? "✅ " : "❌ "}${pad(st, 6)}${name}${msg ? ` — ${msg}` : ""}`);
}
console.log("-".repeat(72));
console.log(`${results.length - failures}/${results.length} نجح — ${failures} فشل`);
process.exit(failures ? 1 : 0);
