import { describe, it, expect } from "vitest";
import { translateSupabaseError } from "./server-errors";

describe("translateSupabaseError", () => {
  it("maps known Postgres codes to Arabic", () => {
    expect(translateSupabaseError({ code: "23505", message: "dup" })).toMatch(/مستخدمة/);
    expect(translateSupabaseError({ code: "42501", message: "denied" })).toMatch(/صلاحية/);
    expect(translateSupabaseError({ code: "PGRST116" })).toMatch(/العثور/);
  });
  it("classifies message patterns without codes", () => {
    expect(translateSupabaseError({ message: "new row violates row-level security" })).toMatch(/صلاحية/);
    expect(translateSupabaseError({ message: "JWT expired" })).toMatch(/الجلسة/);
    expect(translateSupabaseError({ message: "duplicate key value" })).toMatch(/مستخدمة/);
    expect(translateSupabaseError({ message: "fetch failed" })).toMatch(/الإنترنت/);
  });
  it("falls back for unknown", () => {
    expect(translateSupabaseError(null, "fb")).toBe("fb");
    expect(translateSupabaseError({ message: "" }, "fb")).toBe("fb");
  });
});