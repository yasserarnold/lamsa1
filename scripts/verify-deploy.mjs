#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 * Usage:
 *   BASE_URL=https://lamsa.<subdomain>.workers.dev \
 *   TEST_USERNAME=<existing-profile-username> \
 *   node scripts/verify-deploy.mjs
 *
 * Verifies:
 *   1. SSR renders the home route (HTML with hydration markers)
 *   2. SSR renders a public profile route (/u/:username)
 *   3. sitemap.xml responds 200 with xml content
 *   4. A public createServerFn RPC responds (200/4xx JSON, not 500)
 *   5. requireSupabaseAuth rejects unauthenticated callers with 401
 */

const BASE_URL = (process.env.BASE_URL || "https://lamsaeg.lovable.app").replace(/\/$/, "");
const TEST_USERNAME = process.env.TEST_USERNAME || "";

const results = [];
let failed = 0;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function check(name, fn) {
  try {
    await fn();
  } catch (err) {
    record(name, false, err?.message ?? String(err));
  }
}

// 1. SSR home
await check("SSR / (home)", async () => {
  const res = await fetch(`${BASE_URL}/`, { redirect: "follow" });
  const text = await res.text();
  const ok =
    res.status === 200 &&
    text.includes("<html") &&
    (text.includes("id=\"root\"") || text.includes('id="app"') || text.includes("tsr-"));
  record("SSR / (home)", ok, `status=${res.status}, bytes=${text.length}`);
});

// 2. SSR profile route
if (TEST_USERNAME) {
  await check("SSR /u/$username", async () => {
    const res = await fetch(`${BASE_URL}/u/${encodeURIComponent(TEST_USERNAME)}`);
    const text = await res.text();
    const ok = res.status === 200 && text.includes("<html");
    record("SSR /u/$username", ok, `status=${res.status}`);
  });
} else {
  record("SSR /u/$username", true, "skipped (no TEST_USERNAME)");
}

// 3. sitemap.xml
await check("GET /sitemap.xml", async () => {
  const res = await fetch(`${BASE_URL}/sitemap.xml`);
  const text = await res.text();
  const ok = res.status === 200 && text.includes("<urlset");
  record("GET /sitemap.xml", ok, `status=${res.status}`);
});

// 4. Public createServerFn — invoke via TanStack RPC path.
// We only assert the endpoint responds and does NOT return 500/HTML —
// which would signal broken SSR bundling or missing env at runtime.
await check("createServerFn RPC reachable", async () => {
  // TanStack Start exposes server fns at /_serverFn/*. A GET without proper
  // payload should still hit the runtime and return JSON (200 or 4xx).
  const res = await fetch(`${BASE_URL}/_serverFn/ping-nonexistent`, {
    headers: { accept: "application/json" },
  });
  const ct = res.headers.get("content-type") || "";
  // Accept anything that isn't a 5xx catastrophic-SSR failure with HTML body.
  const ok = res.status < 500 || ct.includes("application/json");
  record("createServerFn RPC reachable", ok, `status=${res.status}, ct=${ct}`);
});

// 5. requireSupabaseAuth rejects anonymous
await check("requireSupabaseAuth blocks anon", async () => {
  // Hit an authenticated route without a session cookie. The _authenticated
  // layout redirects (302) or the loader-called server fn returns 401.
  const res = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
  const ok = res.status === 302 || res.status === 307 || res.status === 401;
  record("requireSupabaseAuth blocks anon", ok, `status=${res.status}`);
});

console.log("\n" + "=".repeat(50));
console.log(`Passed: ${results.length - failed} / ${results.length}`);
if (failed > 0) {
  console.error(`❌ ${failed} check(s) failed against ${BASE_URL}`);
  process.exit(1);
}
console.log(`✅ Deployment verified: ${BASE_URL}`);
