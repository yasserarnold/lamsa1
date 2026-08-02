import { throwSupabase } from "@/lib/server-errors";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LINK_KINDS } from "@/lib/link-types";

const linkType = z.enum(LINK_KINDS);

export const listMyLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profile_links")
      .select("*")
      .eq("profile_id", userId)
      .order("position", { ascending: true });
    if (error) throwSupabase(error, "links");
    return data ?? [];
  });

export const createMyLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        type: linkType,
        label: z.string().trim().max(80).optional().default(""),
        value: z.string().trim().min(1, "القيمة مطلوبة").max(500),
        is_visible: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: maxRow } = await supabase
      .from("profile_links")
      .select("position")
      .eq("profile_id", userId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (maxRow?.position ?? -1) + 1;
    const { data: created, error } = await supabase
      .from("profile_links")
      .insert({
        profile_id: userId,
        type: data.type,
        label: data.label ?? "",
        value: data.value,
        is_visible: data.is_visible,
        position: nextPos,
      })
      .select()
      .single();
    if (error) throwSupabase(error, "links");
    return created;
  });

export const updateMyLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        type: linkType.optional(),
        label: z.string().trim().min(1).max(80).optional(),
        value: z.string().trim().min(1).max(500).optional(),
        is_visible: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...patch } = data;
    const { error } = await supabase
      .from("profile_links")
      .update(patch)
      .eq("id", id)
      .eq("profile_id", userId);
    if (error) throwSupabase(error, "links");
    return { ok: true as const };
  });

export const deleteMyLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profile_links")
      .delete()
      .eq("id", data.id)
      .eq("profile_id", userId);
    if (error) throwSupabase(error, "links");
    return { ok: true as const };
  });

export const reorderMyLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Update each position sequentially — RLS ensures ownership
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await supabase
        .from("profile_links")
        .update({ position: i })
        .eq("id", data.ids[i])
        .eq("profile_id", userId);
      if (error) throwSupabase(error, "links");
    }
    return { ok: true as const };
  });