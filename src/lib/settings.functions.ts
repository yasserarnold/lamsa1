import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/server-guards";
import { throwSupabase } from "@/lib/server-errors";
import type { Json } from "@/integrations/supabase/types";

export type AppSettings = {
  site_title: string;
  site_description: string;
  default_language: string;
  footer_note: string;
  maintenance_mode: boolean;
  show_public_profiles: boolean;
  enable_leads_form: boolean;
  show_qr_code: boolean;
  updated_at: string;
};

const SELECT =
  "site_title, site_description, default_language, footer_note, maintenance_mode, show_public_profiles, enable_leads_form, show_qr_code, updated_at";

/** Read global app settings (admin console). */
export const getAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    await assertAdmin(context);
    const { data, error } = await supabase
      .from("app_settings")
      .select(SELECT)
      .eq("id", true)
      .maybeSingle();
    if (error) throwSupabase(error, "settings");
    return { settings: (data ?? null) as AppSettings | null };
  });

const settingsSchema = z.object({
  site_title: z.string().trim().min(1).max(120),
  site_description: z.string().trim().max(300),
  default_language: z.enum(["ar", "en"]),
  footer_note: z.string().trim().max(300),
  maintenance_mode: z.boolean(),
  show_public_profiles: z.boolean(),
  enable_leads_form: z.boolean(),
  show_qr_code: z.boolean(),
});

/** Update global app settings (admin only). */
export const updateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertAdmin(context);
    const { data: row, error } = await supabase
      .from("app_settings")
      .upsert({ id: true, ...data }, { onConflict: "id" })
      .select(SELECT)
      .single();
    if (error) throwSupabase(error, "settings");
    return { settings: row as AppSettings };
  });

/** Full data export / backup (admin only). Returns a JSON snapshot. */
export const exportBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tables = [
      "profiles",
      "profile_links",
      "profile_media",
      "profile_themes",
      "nfc_cards",
      "card_events",
      "leads",
      "user_roles",
      "admin_actions",
      "taps",
      "tap_events",
      "app_settings",
    ] as const;

    const data: Record<string, Json[]> = {};
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const { data: rows, error } = await supabaseAdmin
        .from(table)
        .select("*")
        .limit(20000);
      if (error) throwSupabase(error, "backup");
      data[table] = (rows ?? []) as Json[];
      counts[table] = rows?.length ?? 0;
    }

    return {
      exported_at: new Date().toISOString(),
      version: 1,
      counts,
      json: JSON.stringify({ exported_at: new Date().toISOString(), counts, data }, null, 2),
    };
  });
