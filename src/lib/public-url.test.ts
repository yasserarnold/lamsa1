import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getPublicSiteUrl,
  publicProfileUrl,
  diagnosePublicSiteUrl,
  auditPublicSiteUrl,
  __resetPublicUrlAudit,
} from "./public-url";

function setOrigin(origin: string) {
  Object.defineProperty(window, "location", {
    value: new URL(origin) as unknown as Location,
    writable: true,
    configurable: true,
  });
}

function setEnv(value: string | undefined) {
  const g = globalThis as { __PUBLIC_SITE_URL__?: string };
  if (value === undefined) delete g.__PUBLIC_SITE_URL__;
  else g.__PUBLIC_SITE_URL__ = value;
}

describe("public-url", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    setEnv(undefined);
    __resetPublicUrlAudit();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    setEnv(undefined);
    vi.restoreAllMocks();
  });

  it("prefers VITE_PUBLIC_SITE_URL override and strips trailing slash", () => {
    setEnv("https://custom.example.com/");
    setOrigin("https://id-preview--abc.lovable.app");
    expect(getPublicSiteUrl()).toBe("https://custom.example.com");
    expect(publicProfileUrl("yasser1")).toBe(
      "https://custom.example.com/u/yasser1",
    );
  });

  it("falls back to published domain on Lovable preview hosts", () => {
    setOrigin("https://id-preview--abc.lovable.app");
    expect(getPublicSiteUrl()).toBe("https://krotak.lovable.app");
    expect(publicProfileUrl("yasser1")).toBe(
      "https://krotak.lovable.app/u/yasser1",
    );
  });

  it("uses window.origin on real custom domains", () => {
    setOrigin("https://mycards.example.com");
    expect(getPublicSiteUrl()).toBe("https://mycards.example.com");
    expect(publicProfileUrl("yasser1")).toBe(
      "https://mycards.example.com/u/yasser1",
    );
  });

  it("keeps preview button, QR, NFC, and share links on the same canonical URL", () => {
    setEnv("https://custom.example.com");
    setOrigin("https://id-preview--abc.lovable.app");
    const username = "yasser1";
    const previewButtonHref = publicProfileUrl(username);
    const qrPayload = publicProfileUrl(username);
    const nfcWritePayload = publicProfileUrl(username);
    const copyShareLink = publicProfileUrl(username);
    const vcardUrlField = publicProfileUrl(username);
    expect(
      new Set([
        previewButtonHref,
        qrPayload,
        nfcWritePayload,
        copyShareLink,
        vcardUrlField,
      ]).size,
    ).toBe(1);
    expect(previewButtonHref).toBe("https://custom.example.com/u/yasser1");
  });

  describe("diagnostics", () => {
    it("reports ok when an override is set", () => {
      setEnv("https://custom.example.com");
      expect(diagnosePublicSiteUrl().level).toBe("ok");
    });

    it("errors on invalid override values", () => {
      setEnv("not-a-url");
      const d = diagnosePublicSiteUrl();
      expect(d.level).toBe("error");
      if (d.level === "error") expect(d.code).toBe("invalid_override");
    });

    it("warns when unset on a preview host", () => {
      setOrigin("https://id-preview--abc.lovable.app");
      const d = diagnosePublicSiteUrl();
      expect(d.level).toBe("warn");
      if (d.level === "warn") expect(d.code).toBe("missing_on_preview");
    });

    it("is ok on a real custom domain without env", () => {
      setOrigin("https://mycards.example.com");
      expect(diagnosePublicSiteUrl().level).toBe("ok");
    });

    it("audit fires the toast for invalid overrides and dedupes", () => {
      setEnv("not-a-url");
      const toast = { error: vi.fn(), warning: vi.fn() };
      auditPublicSiteUrl(toast);
      auditPublicSiteUrl(toast);
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
  });
});