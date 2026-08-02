import { memo } from "react";
import { useLanguage } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, Nfc, ShieldCheck, Trash2 } from "lucide-react";
import type { CardRow } from "./types";

export type { CardRow };

type Props = {
  card: CardRow;
  nfcSupported: boolean;
  writing: boolean;
  toggling: boolean;
  onToggle: (enabled: boolean) => void;
  onPreview: () => void;
  onDelete: () => void;
};

function CardListItemImpl({
  card: c,
  nfcSupported,
  writing,
  toggling,
  onToggle,
  onPreview,
  onDelete,
}: Props) {
  const { t, locale } = useLanguage();
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
        <Nfc className="size-6" />
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm" dir="ltr">
            {c.card_uid}
          </code>
          {c.is_official && (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3" />
              {t("cards.official")}
            </Badge>
          )}
          <Badge variant={c.status === "active" ? "default" : "outline"}>
            {c.status === "active"
              ? t("cards.status.active")
              : c.status === "disabled"
                ? t("cards.status.disabled")
                : t("cards.status.unassigned")}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>
            {`${t("cards.activatedAt")}: `}
            {c.activated_at
              ? new Date(c.activated_at).toLocaleString(locale)
              : t("cards.notActivated")}
          </span>
          <span>
            {`${t("cards.lastWritten")}: `}
            {c.last_written_at
              ? new Date(c.last_written_at).toLocaleString(locale)
              : t("cards.notWritten")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={c.status === "active"}
          disabled={c.status === "unassigned" || toggling}
          onCheckedChange={onToggle}
          aria-label={c.status === "active" ? t("dash.cardsPage.disable") : t("dash.cardsPage.enable")}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={onPreview}
          disabled={writing || !nfcSupported}
          className="gap-2"
        >
          <Eye className="size-4" />
          {t("dash.cardsPage.previewWrite")}
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={t("dash.cardsPage.delete")}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </li>
  );
}

export const CardListItem = memo(CardListItemImpl);