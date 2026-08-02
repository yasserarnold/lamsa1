import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { adminAssignCardToUser, listAllUsers } from "@/lib/admin.functions";
import { qk } from "@/lib/query-keys";
import { useLanguage } from "@/lib/i18n";

type UsersFn = ReturnType<typeof useServerFn<typeof listAllUsers>>;
type AssignFn = ReturnType<typeof useServerFn<typeof adminAssignCardToUser>>;

export default function AssignCardDialog({
  uid,
  onClose,
  onDone,
  assignFn,
  usersFn,
}: {
  uid: string | null;
  onClose: () => void;
  onDone: () => void;
  assignFn: AssignFn;
  usersFn: UsersFn;
}) {
  const { t } = useLanguage();
  const open = !!uid;
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const [isOfficial, setIsOfficial] = useState(true);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch(""); setPicked(null); setIsOfficial(true); setConfirm(false);
    }
  }, [open]);

  const usersQuery = useQuery({
    queryKey: qk.admin.usersPicker(search),
    queryFn: () => usersFn({ data: { q: search || undefined, page: 1, pageSize: 10 } }),
    enabled: open && search.length >= 2,
  });

  const assignMut = useMutation({
    mutationFn: (args: { uid: string; user_id: string; is_official: boolean }) =>
      assignFn({ data: args }),
    onSuccess: () => {
      toast.success(t("admin.assignDialog.success"));
      onDone();
    },
    onError: (e) => toastError(e),
  });

  const results = useMemo(() => usersQuery.data?.rows ?? [], [usersQuery.data]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.assignDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.assignDialog.desc").split("{uid}")[0]}<span dir="ltr" className="font-mono">{uid}</span>{t("admin.assignDialog.desc").split("{uid}")[1]}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="pick-user">{t("admin.assignDialog.searchLabel")}</Label>
            <Input
              id="pick-user"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPicked(null); setConfirm(false); }}
              placeholder={t("admin.assignDialog.searchPlaceholder")}
            />
          </div>
          <div className="max-h-60 overflow-auto rounded-md border border-border">
            {search.length < 2 ? (
              <p className="p-3 text-xs text-muted-foreground">{t("admin.assignDialog.typeToSearch")}</p>
            ) : usersQuery.isPending ? (
              <div className="grid place-items-center py-4"><Loader2 className="size-4 animate-spin" /></div>
            ) : results.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">{t("admin.assignDialog.noResults")}</p>
            ) : (
              <ul>
                {results.map((u) => {
                  const label = u.full_name || u.username || u.email || u.id;
                  const active = picked?.id === u.id;
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => { setPicked({ id: u.id, label }); setConfirm(false); }}
                        className={`w-full text-right p-2 text-sm hover:bg-muted ${active ? "bg-muted" : ""}`}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {u.username ? `@${u.username}` : ""}{u.email ? ` • ${u.email}` : ""}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="is-official"
              type="checkbox"
              checked={isOfficial}
              onChange={(e) => setIsOfficial(e.target.checked)}
              className="size-4"
            />
            <Label htmlFor="is-official" className="cursor-pointer">{t("admin.assignDialog.official")}</Label>
          </div>
          {picked && (
            <div className="flex items-center gap-2 text-sm">
              <input
                id="confirm-assign"
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                className="size-4"
              />
              <Label htmlFor="confirm-assign" className="cursor-pointer">
                {t("admin.assignDialog.confirmPrefix")} <span className="font-semibold">{picked.label}</span>
              </Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("admin.assignDialog.cancel")}</Button>
          <Button
            disabled={!picked || !confirm || !uid || assignMut.isPending}
            onClick={() => uid && picked && assignMut.mutate({ uid, user_id: picked.id, is_official: isOfficial })}
            className="gap-2"
          >
            {assignMut.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("admin.assignDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}