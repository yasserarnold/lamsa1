import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listMyLinks,
  createMyLink,
  updateMyLink,
  deleteMyLink,
} from "@/lib/links.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { Loader2, Phone, Mail, Globe, Save, Trash2 } from "lucide-react";
import { qk } from "@/lib/query-keys";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard/quick-links")({
  head: () => ({
    meta: [
      { title: "إعدادات الروابط السريعة — لمسة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuickLinksPage,
});

type QuickType = "phone" | "email" | "website";
type QuickDef = { type: QuickType; icon: typeof Phone; titleKey: string; hintKey: string; placeholder: string; dir?: "ltr" | "rtl" };
const QUICK: QuickDef[] = [
  { type: "phone", icon: Phone, titleKey: "dash.quickLinks.phoneTitle", hintKey: "dash.quickLinks.phoneHint", placeholder: "+9665xxxxxxxx", dir: "ltr" },
  { type: "email", icon: Mail, titleKey: "dash.quickLinks.emailTitle", hintKey: "dash.quickLinks.emailHint", placeholder: "name@example.com", dir: "ltr" },
  { type: "website", icon: Globe, titleKey: "dash.quickLinks.websiteTitle", hintKey: "dash.quickLinks.websiteHint", placeholder: "https://example.com", dir: "ltr" },
];

type LinkRow = { id: string; type: string; label: string; value: string; is_visible: boolean; position: number };

function QuickLinksPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyLinks);
  const createFn = useServerFn(createMyLink);
  const updateFn = useServerFn(updateMyLink);
  const deleteFn = useServerFn(deleteMyLink);

  const q = useQuery({ queryKey: qk.links.mine(), queryFn: () => listFn() });
  const rows = (q.data ?? []) as LinkRow[];

  const [form, setForm] = useState<Record<QuickType, { label: string; value: string }>>({
    phone: { label: "", value: "" },
    email: { label: "", value: "" },
    website: { label: "", value: "" },
  });

  useEffect(() => {
    const next = { ...form };
    for (const { type } of QUICK) {
      const existing = rows.find((r) => r.type === type);
      next[type] = { label: existing?.label ?? "", value: existing?.value ?? "" };
    }
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.dataUpdatedAt]);

  function validate(qt: QuickType, v: string): string | null {
    if (!v) return null; // empty = delete, allowed
    if (qt === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : t("dash.quickLinks.errEmail");
    }
    if (qt === "phone") {
      const digits = v.replace(/[\s\-()]/g, "");
      return /^\+?[0-9]{6,20}$/.test(digits) ? null : t("dash.quickLinks.errPhone");
    }
    // website
    try {
      const url = new URL(v.startsWith("http") ? v : `https://${v}`);
      if (!/^https?:$/.test(url.protocol)) return t("dash.quickLinks.errUrlScheme");
      if (!url.hostname.includes(".")) return t("dash.quickLinks.errUrlFormat");
      return null;
    } catch {
      return t("dash.quickLinks.errUrlFormat");
    }
  }

  const saveMut = useMutation({
    mutationFn: async (qt: QuickType) => {
      const existing = rows.find((r) => r.type === qt);
      const { label, value } = form[qt];
      const v = value.trim();
      const err = validate(qt, v);
      if (err) throw new Error(err);
      if (!v) {
        if (existing) await deleteFn({ data: { id: existing.id } });
        return { deleted: true };
      }
      if (existing) {
        await updateFn({ data: { id: existing.id, label: label.trim() || t(QUICK.find((x) => x.type === qt)!.titleKey as never), value: v } });
      } else {
        await createFn({ data: { type: qt, label: label.trim(), value: v, is_visible: true } });
      }
      return { deleted: false };
    },
    onSuccess: (res) => {
      toast.success(res.deleted ? t("dash.quickLinks.toastDeleted") : t("dash.quickLinks.toastSaved"));
      qc.invalidateQueries({ queryKey: qk.links.mine() });
    },
    onError: (e) => toastError(e, t("dash.quickLinks.toastSaveFailed")),
  });

  const clearMut = useMutation({
    mutationFn: async (qt: QuickType) => {
      const existing = rows.find((r) => r.type === qt);
      if (existing) await deleteFn({ data: { id: existing.id } });
    },
    onSuccess: (_, qt) => {
      setForm((f) => ({ ...f, [qt]: { label: "", value: "" } }));
      toast.success(t("dash.quickLinks.toastDeleted"));
      qc.invalidateQueries({ queryKey: qk.links.mine() });
    },
    onError: (e) => toastError(e, t("dash.quickLinks.toastDeleteFailed")),
  });

  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("dash.quickLinks.title")}</h1>
          <p className="text-muted-foreground">
            {t("dash.quickLinks.subtitle")}
          </p>
        </div>

        {q.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          QUICK.map(({ type, icon: Icon, titleKey, hintKey, placeholder, dir }) => {
            const existing = rows.find((r) => r.type === type);
            const state = form[type];
            const busy = saveMut.isPending && saveMut.variables === type;
            const clearing = clearMut.isPending && clearMut.variables === type;
            const title = t(titleKey as never);
            const hint = t(hintKey as never);
            return (
              <Card key={type}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <CardTitle>{title}</CardTitle>
                      <CardDescription>{hint}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>{t("dash.quickLinks.labelOptional")}</Label>
                    <Input
                      placeholder={title}
                      value={state.label}
                      maxLength={80}
                      onChange={(e) => setForm((f) => ({ ...f, [type]: { ...f[type], label: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>{t("dash.quickLinks.value")}</Label>
                    <Input
                      dir={dir}
                      placeholder={placeholder}
                      value={state.value}
                      maxLength={500}
                      aria-invalid={!!validate(type, state.value.trim())}
                      onChange={(e) => setForm((f) => ({ ...f, [type]: { ...f[type], value: e.target.value } }))}
                    />
                    {(() => {
                      const err = validate(type, state.value.trim());
                      return err ? <p className="mt-1 text-xs text-destructive">{err}</p> : null;
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => saveMut.mutate(type)}
                      disabled={busy || !!validate(type, state.value.trim())}
                      className="gap-2"
                    >
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {t("dash.quickLinks.save")}
                    </Button>
                    {existing && (
                      <Button
                        variant="outline"
                        onClick={() => clearMut.mutate(type)}
                        disabled={clearing}
                        className="gap-2"
                      >
                        {clearing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        {t("dash.quickLinks.delete")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardShell>
  );
}
