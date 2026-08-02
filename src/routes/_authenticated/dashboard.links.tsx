import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listMyLinks,
  createMyLink,
  updateMyLink,
  deleteMyLink,
  reorderMyLinks,
} from "@/lib/links.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { buildVCard } from "@/lib/vcard";
import { validateVCard, type VCardIssue } from "@/lib/vcard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { Plus, Trash2, Loader2, GripVertical, Download, ContactRound, AlertTriangle, AlertCircle, CheckCircle2, Search, FileDown, Lightbulb } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LINK_KINDS, LINK_PLACEHOLDERS, type LinkKind } from "@/lib/link-types";
import { socialIcon, labelForKind } from "@/lib/social";
import { useLanguage } from "@/lib/i18n";
import { qk } from "@/lib/query-keys";
import { publicProfileUrl } from "@/lib/public-url";

export const Route = createFileRoute("/_authenticated/dashboard/links")({
  head: () => ({ meta: [{ title: "الروابط — لمسة" }, { name: "robots", content: "noindex" }] }),
  component: LinksPage,
});

type LinkColKey = "type" | "label" | "value" | "visible" | "position";

function escCsvL(v: string | null | undefined) {
  const s = (v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

type LinkType = LinkKind;

type LinkRow = {
  id: string;
  type: LinkType;
  label: string;
  value: string;
  is_visible: boolean;
  position: number;
};

function LinksPage() {
  const { lang, t } = useLanguage();
  const LINK_COLS: { key: LinkColKey; label: string }[] = useMemo(() => [
    { key: "type", label: t("dash.links.type") },
    { key: "label", label: t("dash.links.label") },
    { key: "value", label: t("dash.links.value") },
    { key: "visible", label: t("dash.links.visibility") },
    { key: "position", label: t("dash.links.position") },
  ], [t]);
  const typeOptions = useMemo(
    () => LINK_KINDS.map((k) => ({ value: k, label: labelForKind(k, lang), placeholder: LINK_PLACEHOLDERS[k] })),
    [lang],
  );
  const qc = useQueryClient();
  const listFn = useServerFn(listMyLinks);
  const createFn = useServerFn(createMyLink);
  const updateFn = useServerFn(updateMyLink);
  const deleteFn = useServerFn(deleteMyLink);
  const reorderFn = useServerFn(reorderMyLinks);
  const profileFn = useServerFn(getMyProfile);

  const q = useQuery({ queryKey: qk.links.mine(), queryFn: () => listFn() });
  const profileQ = useQuery({ queryKey: qk.profile.me(), queryFn: () => profileFn() });
  const serverLinks = (q.data ?? []) as LinkRow[];

  // Optimistic local order for DnD
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  useEffect(() => {
    setLocalOrder(null);
  }, [q.dataUpdatedAt]);
  const links = useMemo(() => {
    if (!localOrder) return serverLinks;
    const map = new Map(serverLinks.map((l) => [l.id, l]));
    return localOrder.map((id) => map.get(id)).filter(Boolean) as LinkRow[];
  }, [serverLinks, localOrder]);

  const [form, setForm] = useState<{ type: LinkType; label: string; value: string }>({
    type: "url",
    label: "",
    value: "",
  });

  // Search + type filter + column selection for CSV export
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<LinkType | "all">("all");
  const [visFilter, setVisFilter] = useState<"all" | "visible" | "hidden">("all");
  const [csvCols, setCsvCols] = useState<Set<LinkColKey>>(new Set(LINK_COLS.map((c) => c.key)));

  const filteredLinks = useMemo(() => {
    const s = search.trim().toLowerCase();
    return links.filter((l) => {
      if (typeFilter !== "all" && l.type !== typeFilter) return false;
      if (visFilter === "visible" && !l.is_visible) return false;
      if (visFilter === "hidden" && l.is_visible) return false;
      if (s && !`${l.label} ${l.value}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [links, search, typeFilter, visFilter]);

  function exportLinksCsv() {
    if (csvCols.size === 0) { toast.error(t("dash.links.toastPickColumn")); return; }
    const active = LINK_COLS.filter((c) => csvCols.has(c.key));
    const header = active.map((c) => c.label);
    const rows = filteredLinks.map((l) =>
      active.map((c) => {
        switch (c.key) {
          case "type": return escCsvL(labelForKind(l.type, lang));
          case "label": return escCsvL(l.label);
          case "value": return escCsvL(l.value);
          case "visible": return escCsvL(l.is_visible ? t("dash.links.visible") : t("dash.links.hidden"));
          case "position": return String(l.position);
        }
      }).join(","),
    );
    const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `links-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const createMut = useMutation({
    mutationFn: () => createFn({ data: { ...form, is_visible: true } }),
    onSuccess: () => {
      toast.success(t("dash.links.toastAdded"));
      setForm({ type: "url", label: "", value: "" });
      qc.invalidateQueries({ queryKey: qk.links.mine() });
    },
    onError: (e) => toastError(e, t("dash.links.toastAddFailed")),
  });

  const updateMut = useMutation({
    mutationFn: (v: { id: string; is_visible?: boolean; label?: string; value?: string }) =>
      updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.links.mine() }),
    onError: (e) => toastError(e, t("dash.links.toastUpdateFailed")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success(t("dash.links.toastDeleted"));
      qc.invalidateQueries({ queryKey: qk.links.mine() });
    },
    onError: (e) => toastError(e, t("dash.links.toastDeleteFailed")),
  });

  const reorderMut = useMutation({
    mutationFn: (ids: string[]) => reorderFn({ data: { ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.links.mine() }),
    onError: (e) => {
      toastError(e, t("dash.links.toastReorderFailed"));
      setLocalOrder(null); // rollback to server order
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = links.map((l) => l.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(ids, from, to);
    setLocalOrder(next);
    reorderMut.mutate(next);
  }

  const selectedOpt = typeOptions.find((o) => o.value === form.type)!;
  const isCustom = form.type === "custom";

  // Build vCard preview from current profile + visible links
  const profile = profileQ.data?.profile;
  const vcardInput = useMemo(() => {
    if (!profile) return null;
    return {
      fullName: profile.full_name || profile.username || "",
      title: profile.title,
      bio: profile.bio,
      url:
        profile.username ? publicProfileUrl(profile.username) : null,
      links: links
        .filter((l) => l.is_visible)
        .map((l) => ({ type: l.type, label: l.label, value: l.value })),
    };
  }, [profile, links]);
  const vcardText = useMemo(() => (vcardInput ? buildVCard(vcardInput) : ""), [vcardInput]);
  const issues: VCardIssue[] = useMemo(
    () => (vcardInput ? validateVCard(vcardInput) : []),
    [vcardInput],
  );
  const hasErrors = issues.some((i) => i.severity === "error");

  function downloadVcf() {
    if (!vcardText) return;
    if (hasErrors) {
      toast.error(t("dash.links.toastDownloadBlocked"));
      return;
    }
    const blob = new Blob([vcardText], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile?.username || "contact"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("dash.links.title")}</h1>
          <p className="text-muted-foreground">{t("dash.links.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("dash.links.addTitle")}</CardTitle>
            <CardDescription>{t("dash.links.addSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_auto]">
              <div>
                <Label>{t("dash.links.type")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as LinkType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  {isCustom ? t("dash.links.customLabel") : t("dash.links.label")}
                  {!isCustom && (
                    <span className="ms-1 text-xs font-normal text-muted-foreground">
                      {t("dash.links.optional")}
                    </span>
                  )}
                </Label>
                <Input
                  placeholder={isCustom
                    ? t("dash.links.customPlaceholder")
                    : t("dash.links.labelPlaceholder")}
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t("dash.links.value")}</Label>
                <Input
                  dir="ltr"
                  placeholder={selectedOpt.placeholder}
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                />
                {isCustom && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("dash.links.customHint")}
                  </p>
                )}
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full gap-2"
                  disabled={!form.value || (isCustom && !form.label) || createMut.isPending}
                  onClick={() => createMut.mutate()}
                >
                  {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  {t("dash.links.add")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{t("dash.links.currentLinks")} ({filteredLinks.length}/{links.length})</CardTitle>
                <CardDescription>{t("dash.links.currentLinksHint")}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      {t("dash.links.columns")} ({csvCols.size})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-52">
                    <p className="mb-2 text-sm font-semibold">{t("dash.links.csvColumns")}</p>
                    <div className="space-y-2">
                      {LINK_COLS.map((c) => (
                        <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={csvCols.has(c.key)}
                            onCheckedChange={(v) => {
                              setCsvCols((prev) => {
                                const n = new Set(prev);
                                if (v) n.add(c.key); else n.delete(c.key);
                                return n;
                              });
                            }}
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  size="sm"
                  onClick={exportLinksCsv}
                  disabled={filteredLinks.length === 0}
                  className="gap-1.5"
                >
                  <FileDown className="size-4" />
                  {t("dash.links.exportCsv")} ({filteredLinks.length})
                </Button>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_160px_160px]">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="ps-9"
                  placeholder={t("dash.links.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as LinkType | "all")}>
                <SelectTrigger><SelectValue placeholder={t("dash.links.type")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dash.links.allTypes")}</SelectItem>
                  {typeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={visFilter} onValueChange={(v) => setVisFilter(v as "all" | "visible" | "hidden")}>
                <SelectTrigger><SelectValue placeholder={t("dash.links.visibility")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dash.links.all")}</SelectItem>
                  <SelectItem value="visible">{t("dash.links.visibleOnly")}</SelectItem>
                  <SelectItem value="hidden">{t("dash.links.hiddenOnly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : filteredLinks.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{t("dash.links.empty")}</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={filteredLinks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {filteredLinks.map((l) => (
                      <SortableLinkRow
                        key={l.id}
                        link={l}
                        lang={lang}
                        onUpdate={(v) => updateMut.mutate({ id: l.id, ...v })}
                        onDelete={() => deleteMut.mutate(l.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ContactRound className="size-5 text-primary" />
                  {t("dash.links.vcardPreviewTitle")}
                </CardTitle>
                <CardDescription>{t("dash.links.vcardPreviewSubtitle")}</CardDescription>
              </div>
              <Button onClick={downloadVcf} disabled={!vcardText} className="gap-2">
                <Download className="size-4" />
                {t("dash.links.downloadVcf")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {profileQ.isLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="space-y-3">
                {vcardInput && (
                  <div
                    className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                      hasErrors
                        ? "border-destructive/40 bg-destructive/5 text-destructive"
                        : issues.length > 0
                        ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                        : "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {hasErrors ? (
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    ) : issues.length > 0 ? (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">
                        {hasErrors
                          ? `${issues.filter((i) => i.severity === "error").length} ${t("dash.links.errorsBlock")}`
                          : issues.length > 0
                          ? `${issues.length} ${t("dash.links.warningsCount")}`
                          : t("dash.links.vcardReady")}
                      </p>
                      {issues.length > 0 && (
                        <ul className="mt-2 space-y-1.5 text-xs">
                          {issues.map((it, i) => (
                            <li key={i} className="rounded-md border border-current/20 bg-background/60 p-2">
                              <div className="flex items-start gap-1.5">
                                <span className="font-semibold">•</span>
                                <span>{it.message}</span>
                              </div>
                              {it.suggestion && (
                                <div className="mt-1 flex items-start gap-1.5 ps-3 text-muted-foreground">
                                  <Lightbulb className="mt-0.5 size-3 shrink-0" />
                                  <span>{it.suggestion}</span>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
                <pre
                  dir="ltr"
                  className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed"
                >
                  {vcardText || t("dash.links.vcardPlaceholder")}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function SortableLinkRow({
  link,
  lang,
  onUpdate,
  onDelete,
}: {
  link: LinkRow;
  lang: "ar" | "en";
  onUpdate: (v: { is_visible?: boolean; label?: string; value?: string }) => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: link.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors ${
        isOver && !isDragging
          ? "border-primary ring-2 ring-primary/30 shadow-lg"
          : isDragging
          ? "border-primary/60"
          : "border-border"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={t("dash.links.dragHandle")}
      >
        <GripVertical className="size-5" />
      </button>
      <div className="grid flex-1 gap-2 md:grid-cols-[120px_1fr_1fr]">
        <span className="flex items-center justify-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-semibold">
          <span className="grid size-5 place-items-center">{socialIcon(link.type)}</span>
          <span className="line-clamp-1">{labelForKind(link.type, lang)}</span>
        </span>
        <Input
          defaultValue={link.label}
          onBlur={(e) => {
            if (e.target.value !== link.label) onUpdate({ label: e.target.value });
          }}
        />
        <Input
          dir="ltr"
          defaultValue={link.value}
          onBlur={(e) => {
            if (e.target.value !== link.value) onUpdate({ value: e.target.value });
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={link.is_visible}
          onCheckedChange={(v) => onUpdate({ is_visible: v })}
        />
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={t("dash.quickLinks.delete")}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </li>
  );
}