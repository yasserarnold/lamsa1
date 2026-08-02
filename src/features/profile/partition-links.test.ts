import { describe, it, expect } from "vitest";
import { partitionProfileLinks, QUICK_LINK_TYPES } from "./partition-links";

const mk = (
  type: string,
  value = "x",
  overrides: Partial<{ id: string; label: string; position: number }> = {},
) => ({
  id: overrides.id ?? `${type}-${value}`,
  type,
  label: overrides.label ?? type,
  value,
  position: overrides.position ?? 0,
});

describe("partitionProfileLinks", () => {
  it("puts phone/email/website only in quick, never in rest", () => {
    const links = [
      mk("phone", "0100"),
      mk("email", "a@b.co"),
      mk("website", "https://x.y"),
      mk("whatsapp", "0100"),
      mk("facebook", "https://fb"),
    ];
    const { quick, rest } = partitionProfileLinks(links);

    expect(quick.map((l) => l.type)).toEqual(["phone", "email", "website"]);

    for (const t of QUICK_LINK_TYPES) {
      const inRest = rest.filter((l) => l.type === t);
      expect(inRest, `${t} must not appear in the grid`).toHaveLength(0);
    }
    // and the non-quick links are all preserved in rest
    expect(rest.map((l) => l.type).sort()).toEqual(["facebook", "whatsapp"]);
  });

  it("drops quick-type links with empty/whitespace values from both lists", () => {
    const links = [
      mk("phone", ""),
      mk("email", "   "),
      mk("website", "https://x.y"),
      mk("instagram", "https://ig"),
    ];
    const { quick, rest } = partitionProfileLinks(links);

    expect(quick.map((l) => l.type)).toEqual(["website"]);
    expect(rest.map((l) => l.type)).toEqual(["instagram"]);
    for (const t of QUICK_LINK_TYPES) {
      expect(rest.some((l) => l.type === t)).toBe(false);
    }
  });

  it("keeps at most one entry per quick type and never duplicates ids", () => {
    const links = [
      mk("phone", "1", { id: "p1" }),
      mk("phone", "2", { id: "p2" }),
      mk("email", "a@b", { id: "e1" }),
      mk("website", "https://x", { id: "w1" }),
      mk("tiktok", "https://tt", { id: "t1" }),
    ];
    const { quick, rest } = partitionProfileLinks(links);
    // one circle per quick type
    expect(quick.map((l) => l.type)).toEqual(["phone", "email", "website"]);
    // no id appears in both lists
    const restIds = new Set(rest.map((l) => l.id));
    for (const q of quick) {
      expect(restIds.has(q.id), `${q.id} must not appear twice`).toBe(false);
    }
  });
});
