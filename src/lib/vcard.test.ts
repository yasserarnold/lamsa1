import { describe, it, expect } from "vitest";
import { buildVCard, validateVCard, type VCardInput } from "./vcard";

const base: VCardInput = {
  fullName: "أحمد محمد",
  title: "مؤسس",
  url: "https://kroty.lovable.app/u/ahmed",
  links: [
    { type: "phone", label: "هاتف", value: "+201234567890" },
    { type: "email", label: "بريد", value: "ahmed@example.com" },
  ],
};

describe("buildVCard", () => {
  it("produces a well-formed vCard 3.0 with required fields", () => {
    const out = buildVCard(base);
    expect(out.startsWith("BEGIN:VCARD\r\nVERSION:3.0")).toBe(true);
    expect(out.endsWith("END:VCARD")).toBe(true);
    expect(out).toContain("FN;CHARSET=UTF-8:أحمد محمد");
    expect(out).toContain("TEL;TYPE=CELL:+201234567890");
    expect(out).toContain("EMAIL;TYPE=INTERNET:ahmed@example.com");
    expect(out).toContain("URL;TYPE=WORK:https://kroty.lovable.app/u/ahmed");
  });

  it("escapes commas, semicolons, backslashes and newlines", () => {
    const out = buildVCard({
      ...base,
      fullName: "A,B;C\\D\nE",
      links: [],
    });
    expect(out).toContain("FN;CHARSET=UTF-8:A\\,B\\;C\\\\D\\nE");
  });

  it("includes PHOTO when base64 + mime are provided", () => {
    const out = buildVCard({ ...base, photoBase64: "AAAA", photoMime: "image/png" });
    expect(out).toContain("PHOTO;ENCODING=b;TYPE=PNG:AAAA");
  });

  it("emits WhatsApp as TEL + URL wa.me", () => {
    const out = buildVCard({
      ...base,
      links: [{ type: "whatsapp", label: "واتساب", value: "+20 123 456 7890" }],
    });
    expect(out).toContain("TEL;TYPE=CELL,VOICE:+20 123 456 7890");
    expect(out).toContain("URL;TYPE=WhatsApp:https://wa.me/20123456789");
  });
});

describe("validateVCard", () => {
  it("returns no errors for a valid input", () => {
    const errs = validateVCard(base).filter((i) => i.severity === "error");
    expect(errs).toEqual([]);
  });

  it("errors when FN is missing or too short", () => {
    const errs = validateVCard({ ...base, fullName: "" }).filter((i) => i.field === "fullName");
    expect(errs).toHaveLength(1);
    expect(errs[0].severity).toBe("error");
  });

  it("errors when no phone and no email are present", () => {
    const errs = validateVCard({ ...base, links: [] }).filter((i) => i.field === "links");
    expect(errs.some((e) => e.severity === "error")).toBe(true);
  });

  it("flags invalid email format with suggestion", () => {
    const errs = validateVCard({
      ...base,
      links: [
        { type: "email", label: "e", value: "not-an-email" },
        { type: "phone", label: "p", value: "+201234567890" },
      ],
    });
    const e = errs.find((i) => i.field.startsWith("links") && i.message.includes("البريد"));
    expect(e?.severity).toBe("error");
    expect(e?.suggestion).toMatch(/name@domain/);
  });

  it("flags invalid phone number", () => {
    const errs = validateVCard({
      ...base,
      links: [
        { type: "phone", label: "p", value: "abc" },
        { type: "email", label: "e", value: "a@b.co" },
      ],
    });
    const e = errs.find((i) => i.message.includes("رقم غير صالح"));
    expect(e?.severity).toBe("error");
  });

  it("flags empty link value", () => {
    const errs = validateVCard({
      ...base,
      links: [
        { type: "email", label: "e", value: "  " },
        { type: "phone", label: "p", value: "+201234567890" },
      ],
    });
    expect(errs.some((e) => e.message.includes("فارغ"))).toBe(true);
  });

  it("warns on http(s)-less url/social links", () => {
    const issues = validateVCard({
      ...base,
      links: [
        ...base.links,
        { type: "url", label: "site", value: "example.com" },
      ],
    });
    const w = issues.find((i) => i.message.includes("https://"));
    expect(w?.severity).toBe("warning");
  });
});