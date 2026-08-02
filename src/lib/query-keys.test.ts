import { describe, it, expect } from "vitest";
import { qk } from "./query-keys";

describe("query keys", () => {
  it("returns stable readonly tuples per namespace", () => {
    expect(qk.cards.mine()).toEqual(["cards", "mine"]);
    expect(qk.links.mine()).toEqual(["links", "mine"]);
    expect(qk.profile.byUsername("demo")).toEqual(["profile", "u", "demo"]);
  });
  it("namespaces don't collide across features", () => {
    const seen = new Set<string>();
    const add = (k: readonly unknown[]) => seen.add(JSON.stringify(k));
    add(qk.cards.mine());
    add(qk.links.mine());
    add(qk.leads.mine());
    add(qk.profile.me());
    add(qk.admin.overview());
    add(qk.admin.users());
    expect(seen.size).toBe(6);
  });
  it("includes filters in the key so different filter sets are separate", () => {
    const a = qk.admin.users({ q: "a" });
    const b = qk.admin.users({ q: "b" });
    expect(a).not.toEqual(b);
  });
});
