/**
 * Integration security tests — run against the live Supabase project using
 * the publishable (anon) key. They verify that after tightening:
 *  - anon cannot list or download from storage buckets directly
 *  - anon cannot read moderation columns from `profiles`
 *  - `profiles_public` never exposes moderation columns
 *  - admin RPCs are not callable by anon
 *
 * Skipped automatically when SUPABASE credentials are not available
 * (e.g. CI without secrets).
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;

const runIf = URL && KEY ? describe : describe.skip;

runIf("security posture (anon)", () => {
  const anon = createClient(URL!, KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it("anon cannot list objects in private buckets", async () => {
    for (const bucket of ["avatars", "covers", "media"]) {
      const { data, error } = await anon.storage.from(bucket).list("", { limit: 5 });
      // Either RLS returns empty, or an explicit error — anything but a
      // populated list is acceptable.
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    }
  });

  it("anon cannot read moderation columns from profiles", async () => {
    const { error } = await anon
      .from("profiles")
      .select("id, is_banned, banned_at, ban_reason")
      .limit(1);
    // Column-level GRANT means selecting these columns returns a permission error.
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/permission|denied|not.*allowed|column/i);
  });

  it("profiles_public view never exposes moderation columns", async () => {
    const { data, error } = await anon
      .from("profiles_public" as never)
      .select("*")
      .limit(1);
    expect(error).toBeNull();
    const row = (data as Array<Record<string, unknown>> | null)?.[0];
    if (row) {
      expect(row).not.toHaveProperty("is_banned");
      expect(row).not.toHaveProperty("banned_at");
      expect(row).not.toHaveProperty("ban_reason");
    }
  });

  it("anon cannot execute admin RPCs", async () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["admin_ban_user", { _user_id: "00000000-0000-0000-0000-000000000000", _ban: true, _reason: null }],
      ["admin_set_user_role", { _user_id: "00000000-0000-0000-0000-000000000000", _role: "admin", _grant: true }],
      ["claim_official_card", { _uid: "ABCDEF01" }],
    ];
    for (const [name, args] of cases) {
      const { error } = await anon.rpc(name as never, args as never);
      expect(error, `${name} should be blocked for anon`).not.toBeNull();
    }
  });

  it("anon cannot read privileged tables", async () => {
    for (const table of ["leads", "user_roles", "admin_actions"] as const) {
      const { data } = await anon.from(table).select("*").limit(1);
      expect(data ?? []).toEqual([]);
    }
  });

  it("anon cannot insert into profiles / leads / nfc_cards", async () => {
    const attempts = [
      anon.from("profiles").insert({ id: "00000000-0000-0000-0000-000000000000" } as never),
      anon.from("leads").insert({
        profile_id: "00000000-0000-0000-0000-000000000000",
        name: "x",
        mobile: "x",
      } as never),
      anon.from("nfc_cards").insert({ card_uid: "AAAAAAAA" } as never),
    ];
    for (const p of attempts) {
      const { error } = await p;
      expect(error).not.toBeNull();
    }
  });

  // ---- SECURITY DEFINER function exposure ----

  it("anon cannot execute privileged SECURITY DEFINER helpers", async () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["has_role", { _user_id: "00000000-0000-0000-0000-000000000000", _role: "admin" }],
    ];
    for (const [name, args] of cases) {
      const { error } = await anon.rpc(name as never, args as never);
      expect(error, `${name} should be blocked for anon`).not.toBeNull();
      expect(error?.message ?? "").toMatch(/permission|denied|not.*allowed|does not exist/i);
    }
  });

  it("public SECURITY DEFINER helpers (rate limit + security log) are callable but write-only", async () => {
    // check_rate_limit is intentionally public — verify it runs and returns a boolean.
    const rl = await anon.rpc("check_rate_limit" as never, {
      _bucket: `test:${Math.random().toString(36).slice(2)}`,
      _max: 5,
      _window_secs: 60,
    } as never);
    expect(rl.error).toBeNull();
    expect(typeof rl.data).toBe("boolean");

    // log_security_event should accept a valid write and NOT return data.
    const ev = await anon.rpc("log_security_event" as never, {
      _severity: "info",
      _category: "test",
      _action: "integration_test_ping",
    } as never);
    expect(ev.error).toBeNull();
    // void return
    expect(ev.data ?? null).toBeNull();

    // And anon must NOT be able to read what it wrote back.
    const read = await anon.from("security_events").select("*").limit(1);
    expect(read.data ?? []).toEqual([]);

    // Rate-limit table itself must be unreadable/unwritable directly.
    const rlRead = await anon.from("rate_limits" as never).select("*").limit(1);
    expect(rlRead.data ?? []).toEqual([]);
  });

  it("security_events INSERT policy rejects malformed events", async () => {
    // Invalid severity — the WITH CHECK constraint should reject the row.
    const bad = await anon.from("security_events").insert({
      severity: "bogus",
      category: "test",
      action: "bad_severity",
    } as never);
    expect(bad.error).not.toBeNull();

    // Missing category — also rejected.
    const missing = await anon.from("security_events").insert({
      severity: "info",
      action: "no_category",
    } as never);
    expect(missing.error).not.toBeNull();
  });
});