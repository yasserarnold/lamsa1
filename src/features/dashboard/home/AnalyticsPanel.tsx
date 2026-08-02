import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyTapAnalytics } from "@/lib/profile.functions";
import { qk } from "@/lib/query-keys";
import { Eye, QrCode, Share2, Contact } from "lucide-react";
import { useLanguage, type TKey } from "@/lib/i18n";

const items: { key: "views" | "qr" | "shares" | "vcards"; labelKey: TKey; icon: typeof Eye }[] = [
  { key: "views", labelKey: "dash.analytics.views", icon: Eye },
  { key: "qr", labelKey: "dash.analytics.qr", icon: QrCode },
  { key: "shares", labelKey: "dash.analytics.shares", icon: Share2 },
  { key: "vcards", labelKey: "dash.analytics.vcards", icon: Contact },
];

export function AnalyticsPanel() {
  const { t } = useLanguage();
  const fn = useServerFn(getMyTapAnalytics);
  const q = useQuery({
    queryKey: qk.profile.analytics(),
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  const data = q.data;
  const max = Math.max(1, ...(data?.days ?? []).map((d) => d.views));

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">{t("dash.analytics.title")}</CardTitle>
        <CardDescription>{t("dash.analytics.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {q.isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map(({ key, labelKey, icon: Icon }) => (
                <div key={key} className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <Icon className="size-4 text-[var(--gold)]" />
                  <p className="mt-2 text-2xl font-bold tabular-nums">{data?.[key] ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{t(labelKey)}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">{t("dash.analytics.last14Days")}</p>
              <div className="flex h-20 items-end gap-1">
                {(data?.days ?? []).map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.views}`}
                    className="flex-1 rounded-t bg-[var(--gold)]/70"
                    style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
