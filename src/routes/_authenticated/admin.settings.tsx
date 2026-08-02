import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useLanguage } from "@/lib/i18n";
import { amIAdmin } from "@/lib/admin.functions";
import { getAppSettings, updateAppSettings, exportBackup, type AppSettings } from "@/lib/settings.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Settings2, Download } from "lucide-react";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "لوحة المسؤول — إعدادات التطبيق" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettingsPage,
});

const DEFAULTS: AppSettings = {
  site_title: "",
  site_description: "",
  default_language: "ar",
  footer_note: "",
  maintenance_mode: false,
  show_public_profiles: true,
  enable_leads_form: true,
  show_qr_code: true,
  updated_at: "",
};

function AdminSettingsPage() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const loadSettings = useServerFn(getAppSettings);
  const saveSettings = useServerFn(updateAppSettings);
  const runExport = useServerFn(exportBackup);

  const adminQuery = useQuery({ queryKey: qk.amIAdmin(), queryFn: () => checkAdmin() });
  const isAdmin = adminQuery.data?.isAdmin ?? false;

  useEffect(() => {
    if (adminQuery.data && !adminQuery.data.isAdmin) {
      toast.error(t("admin.common.adminOnly"));
      navigate({ to: "/dashboard", replace: true });
    }
  }, [adminQuery.data, navigate]);

  const settingsQuery = useQuery({
    queryKey: qk.admin.settings(),
    queryFn: () => loadSettings(),
    enabled: isAdmin,
  });

  const [form, setForm] = useState<AppSettings>(DEFAULTS);

  useEffect(() => {
    if (settingsQuery.data?.settings) setForm({ ...DEFAULTS, ...settingsQuery.data.settings });
  }, [settingsQuery.data]);

  const backupMutation = useMutation({
    mutationFn: () => runExport(),
    onSuccess: (snapshot) => {
      const blob = new Blob([snapshot.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t("admin.settings.backupDone"));
    },
    onError: () => toast.error(t("admin.settings.backupFailed")),
  });

  const mutation = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          site_title: form.site_title,
          site_description: form.site_description,
          default_language: form.default_language === "en" ? "en" : "ar",
          footer_note: form.footer_note,
          maintenance_mode: form.maintenance_mode,
          show_public_profiles: form.show_public_profiles,
          enable_leads_form: form.enable_leads_form,
          show_qr_code: form.show_qr_code,
        },
      }),
    onSuccess: (res) => {
      toast.success(t("admin.settings.saved"));
      qc.setQueryData(qk.admin.settings(), res);
    },
    onError: () => toast.error(t("admin.settings.saveFailed")),
  });

  if (adminQuery.isPending || (isAdmin && settingsQuery.isPending)) {
    return (
      <AdminShell>
        <div className="grid place-items-center py-24">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </AdminShell>
    );
  }
  if (!isAdmin) return null;

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]">
            <Settings2 className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{t("admin.settings.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("admin.settings.desc")}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.settings.section.general")}</CardTitle>
            <CardDescription>
              {form.updated_at
                ? `${t("admin.settings.updatedAt")}: ${new Date(form.updated_at).toLocaleString(locale === "en" ? "en-US" : "ar-EG")}`
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_title">{t("admin.settings.siteTitle")}</Label>
              <Input
                id="site_title"
                value={form.site_title}
                maxLength={120}
                onChange={(e) => set("site_title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_description">{t("admin.settings.siteDescription")}</Label>
              <Textarea
                id="site_description"
                rows={3}
                maxLength={300}
                value={form.site_description}
                onChange={(e) => set("site_description", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer_note">{t("admin.settings.footerNote")}</Label>
              <Input
                id="footer_note"
                maxLength={300}
                value={form.footer_note}
                onChange={(e) => set("footer_note", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_language">{t("admin.settings.defaultLanguage")}</Label>
              <select
                id="default_language"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.default_language}
                onChange={(e) => set("default_language", e.target.value)}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.settings.section.display")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {([
              ["maintenance_mode", "admin.settings.maintenanceMode", "admin.settings.maintenanceModeHint"],
              ["show_public_profiles", "admin.settings.showPublicProfiles", "admin.settings.showPublicProfilesHint"],
              ["enable_leads_form", "admin.settings.enableLeadsForm", "admin.settings.enableLeadsFormHint"],
              ["show_qr_code", "admin.settings.showQrCode", "admin.settings.showQrCodeHint"],
            ] as const).map(([key, labelKey, hintKey], i, arr) => (
              <div key={key}>
                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t(labelKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(hintKey)}</p>
                  </div>
                  <Switch
                    checked={form[key]}
                    onCheckedChange={(v) => set(key, v)}
                    aria-label={t(labelKey)}
                  />
                </div>
                {i < arr.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.settings.section.backup")}</CardTitle>
            <CardDescription>{t("admin.settings.backupDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
            >
              {backupMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {t("admin.settings.backupBtn")}
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.site_title.trim()}
            className="gap-2"
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t("admin.settings.save")}
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}
