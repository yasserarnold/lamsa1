import { throwSupabase } from "@/lib/server-errors";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        q: z.string().trim().max(120).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.number().int().min(1).max(1000).optional(),
        pageSize: z.number().int().min(5).max(100).optional(),
        sort: z.enum(["created_desc", "created_asc", "name_asc", "name_desc"]).optional(),
      })
      .optional()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const page = data?.page ?? 1;
    const pageSize = data?.pageSize ?? 20;
    const sort = data?.sort ?? "created_desc";
    const orderCol = sort.startsWith("name") ? "name" : "created_at";
    const asc = sort.endsWith("_asc");

    let query = supabase
      .from("leads")
      .select("id, name, mobile, interest, source_card_uid, created_at", { count: "exact" })
      .eq("profile_id", userId)
      .order(orderCol, { ascending: asc })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (data?.q) {
      const q = data.q.replace(/[%,]/g, "");
      query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,interest.ilike.%${q}%`);
    }
    if (data?.from) query = query.gte("created_at", data.from);
    if (data?.to) query = query.lte("created_at", data.to);
    const { data: rows, error, count } = await query;
    if (error) throwSupabase(error, "leads");
    return { rows: rows ?? [], total: count ?? 0, page, pageSize };
  });