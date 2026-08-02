import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("sonner", () => {
  const error = vi.fn();
  return { toast: { error }, __error: error };
});
vi.mock("./reporting", () => ({
  reportError: vi.fn(),
  setReportingUser: vi.fn(),
  initReporting: vi.fn(),
}));

import { toast } from "sonner";
import { reportError } from "./reporting";
import {
  describeNfcError,
  toastNfcError,
  isTransient,
  withRetry,
  formatError,
} from "./errors";

const mkDom = (name: string, message = name) => {
  // DOMException may be missing in some node envs — synthesize compatible shape.
  try {
    return new DOMException(message, name);
  } catch {
    const e = new Error(message) as Error & { name: string };
    e.name = name;
    return e;
  }
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("describeNfcError", () => {
  const cases: Array<[string, RegExp]> = [
    ["NotAllowedError", /إذن NFC/],
    ["NotSupportedError", /غير مدعوم/],
    ["NotReadableError", /البطاقة/],
    ["NetworkError", /انقطع/],
    ["AbortError", /إلغاء/],
    ["InvalidStateError", /غير مفعّلة/],
    ["SecurityError", /HTTPS|رفض/],
    ["TimeoutError", /مهلة/],
  ];
  it.each(cases)("maps %s to Arabic guidance", (name, re) => {
    const info = describeNfcError(mkDom(name), "write");
    expect(info.code).toBe(name);
    expect(info.title.length).toBeGreaterThan(0);
    expect(info.hint.length).toBeGreaterThan(0);
    expect(`${info.title} ${info.hint}`).toMatch(re);
  });

  it("tailors TypeError hint per op", () => {
    expect(describeNfcError(mkDom("TypeError"), "write").hint).toMatch(/vCard|URL/);
    expect(describeNfcError(mkDom("TypeError"), "read").hint).toMatch(/المتصفح/);
  });

  it("falls back for unknown errors", () => {
    const info = describeNfcError(new Error("boom"), "scan");
    expect(info.code).toBe("Error");
    expect(info.hint).toMatch(/NFC/);
  });
});

describe("toastNfcError", () => {
  it("emits a titled toast and reports with nfc tags", () => {
    toastNfcError(mkDom("NotAllowedError"), undefined, "write");
    expect(toast.error).toHaveBeenCalledTimes(1);
    const [title, opts] = (toast.error as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(String(title)).toMatch(/NFC/);
    expect((opts as { description: string }).description.length).toBeGreaterThan(0);
    expect(reportError).toHaveBeenCalledTimes(1);
    const ctx = (reportError as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as {
      tags: Record<string, string>;
      op: string;
    };
    expect(ctx.tags.nfc_code).toBe("NotAllowedError");
    expect(ctx.tags.nfc_op).toBe("write");
    expect(ctx.op).toBe("nfc.write");
  });

  it("accepts an ErrorContext object with extra tags", () => {
    toastNfcError(mkDom("TimeoutError"), undefined, {
      op: "scan",
      tags: { card_uid: "ABCD" },
    });
    const ctx = (reportError as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as {
      tags: Record<string, string>;
    };
    expect(ctx.tags.card_uid).toBe("ABCD");
    expect(ctx.tags.nfc_code).toBe("TimeoutError");
  });
});

describe("isTransient", () => {
  it("treats network / 5xx / 429 / 408 as transient", () => {
    expect(isTransient(new TypeError("Failed to fetch"))).toBe(true);
    expect(isTransient({ status: 500 })).toBe(true);
    expect(isTransient({ status: 503 })).toBe(true);
    expect(isTransient({ status: 429 })).toBe(true);
    expect(isTransient({ status: 408 })).toBe(true);
  });
  it("treats 4xx client errors as non-transient", () => {
    expect(isTransient({ status: 400 })).toBe(false);
    expect(isTransient({ status: 401 })).toBe(false);
    expect(isTransient({ status: 404 })).toBe(false);
  });
});

describe("withRetry", () => {
  it("retries transient failures then succeeds", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n++;
      if (n < 3) throw new TypeError("Failed to fetch");
      return "ok";
    });
    const res = await withRetry(fn, { attempts: 3, baseMs: 1, maxDelayMs: 2 });
    expect(res).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-transient errors", async () => {
    const fn = vi.fn(async () => {
      const e = Object.assign(new Error("bad"), { status: 400 });
      throw e;
    });
    await expect(
      withRetry(fn, { attempts: 3, baseMs: 1, maxDelayMs: 2 }),
    ).rejects.toThrow("bad");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("formatError", () => {
  it("returns fallback for null/undefined", () => {
    expect(formatError(null, "fb")).toBe("fb");
    expect(formatError(undefined, "fb")).toBe("fb");
  });
});