import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, RefreshCw, Activity } from "lucide-react";
import { useLanguage, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "حالة الخدمة — لمسة" },
      { name: "description", content: "صفحة حالة لمسة: آخر فحص Health لخدمة التطبيق وآخر مرة كانت تعمل." },
      { property: "og:title", content: "حالة الخدمة — لمسة" },
      { property: "og:description", content: "آخر فحص Health لخدمة التطبيق وآخر وقت كانت فيه تعمل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatusPage,
});

const LAST_OK_KEY = "lamsa:health:last-ok";

type Check = {
  ok: boolean;
  code: number;
  at: string;
  latencyMs: number;
  uptime: number | null;
};

function fmt(iso: string | null, locale: string, dash: string) {
  if (!iso) return dash;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function since(iso: string | null, t: (k: TKey) => string, dash: string) {
  if (!iso) return dash;
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return t("pub.status.secondsAgo").replace("{n}", String(s));
  if (s < 3600) return t("pub.status.minutesAgo").replace("{n}", String(Math.floor(s / 60)));
  if (s < 86400) return t("pub.status.hoursAgo").replace("{n}", String(Math.floor(s / 3600)));
  return t("pub.status.daysAgo").replace("{n}", String(Math.floor(s / 86400)));
}

function fmtUptime(seconds: number | null, t: (k: TKey) => string, dash: string) {
  if (seconds == null) return dash;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [
    d ? `${d} ${t("pub.status.day")}` : null,
    h ? `${h} ${t("pub.status.hour")}` : null,
    `${m} ${t("pub.status.minute")}`,
  ].filter(Boolean).join(" ");
}

function StatusPage() {
  const { t, dir, locale } = useLanguage();
  const dash = t("pub.status.dash");
  const [check, setCheck] = useState<Check | null>(null);
  const [lastOk, setLastOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Check[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    const started = performance.now();
    let next: Check;
    try {
      const res = await fetch("/api/public/health", { cache: "no-store" });
      let uptime: number | null = null;
      try {
        const body = (await res.json()) as { uptime?: number | null };
        uptime = typeof body?.uptime === "number" ? body.uptime : null;
      } catch {
        uptime = null;
      }
      next = {
        ok: res.ok,
        code: res.status,
        at: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        uptime,
      };
    } catch {
      next = { ok: false, code: 0, at: new Date().toISOString(), latencyMs: Math.round(performance.now() - started), uptime: null };
    }
    setCheck(next);
    setHistory((h) => [next, ...h].slice(0, 10));
    if (next.ok) {
      setLastOk(next.at);
      try {
        localStorage.setItem(LAST_OK_KEY, next.at);
      } catch {
        /* ignore */
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    try {
      setLastOk(localStorage.getItem(LAST_OK_KEY));
    } catch {
      /* ignore */
    }
    void run();
    timer.current = setInterval(() => void run(), 30_000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [run]);

  const ok = check?.ok ?? false;

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-brand text-3xl">{t("pub.status.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("pub.status.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void run()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            {t("pub.status.refresh")}
          </Button>
        </div>

        <Card className={ok ? "border-primary/40" : "border-destructive/50"}>
          <CardHeader className="flex flex-row items-center gap-3">
            {ok ? <CheckCircle2 className="text-primary" /> : <XCircle className="text-destructive" />}
            <CardTitle className="text-xl">{check == null ? t("pub.status.checking") : ok ? t("pub.status.up") : t("pub.status.down")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t("pub.status.lastCheck")} value={fmt(check?.at ?? null, locale, dash)} hint={since(check?.at ?? null, t, dash)} />
            <Field label={t("pub.status.responseCode")} value={check ? (check.code || t("pub.status.noConnection")) : dash} hint={check ? `${check.latencyMs}ms` : undefined} />
            <Field label={t("pub.status.lastUp")} value={fmt(lastOk, locale, dash)} hint={since(lastOk, t, dash)} />
            <Field label={t("pub.status.serverUptime")} value={fmtUptime(check?.uptime ?? null, t, dash)} />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center gap-2">
            <Activity className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">{t("pub.status.recentChecks")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 && <p className="text-sm text-muted-foreground">{t("pub.status.noChecksYet")}</p>}
            {history.map((h) => (
              <div key={h.at} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  {h.ok ? <CheckCircle2 className="size-4 text-primary" /> : <XCircle className="size-4 text-destructive" />}
                  {h.ok ? t("pub.status.ok") : t("pub.status.failed")}
                </span>
                <span className="text-muted-foreground">{fmt(h.at, locale, dash)}</span>
                <span className="text-muted-foreground">{h.code || dash} · {h.latencyMs}ms</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-muted-foreground">
          {t("pub.status.footer")}
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
