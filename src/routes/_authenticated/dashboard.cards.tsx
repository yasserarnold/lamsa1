import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { getMyProfile } from "@/lib/profile.functions";
import { listMyLinks } from "@/lib/links.functions";
import { buildVCard, validateVCard, type VCardInput } from "@/lib/vcard";
import { amIAdmin } from "@/lib/admin.functions";
import {
  listMyCards,
  claimCard,
  registerCard,
  markCardWritten,
  deleteMyCard,
  toggleCardStatus,
  listMyCardEvents,
} from "@/lib/cards.functions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { toastError, toastNfcError } from "@/lib/errors";
import { CreditCard, History, Nfc, ShieldCheck } from "lucide-react";
import { qk } from "@/lib/query-keys";
import { publicProfileUrl } from "@/lib/public-url";
import { CardListItem } from "@/features/dashboard/cards/CardListItem";
import { CardEventList } from "@/features/dashboard/cards/CardEventList";
const WritePreviewDialog = lazy(() =>
  import("@/features/dashboard/cards/WritePreviewDialog").then((m) => ({ default: m.WritePreviewDialog })),
);
import { useLanguage } from "@/lib/i18n";
import { UidInputForm } from "@/features/dashboard/cards/UidInputForm";
import { WriteModeSelector } from "@/features/dashboard/cards/WriteModeSelector";
import { isNfcSupported, getNDEFReader, scanUidOnce } from "@/features/dashboard/cards/web-nfc";
import { MarkWriteInput, WriteMode, type CardRow, type CardEventRow } from "@/features/dashboard/cards/types";

export const Route = createFileRoute("/_authenticated/dashboard/cards")({
  head: () => ({
    meta: [
      { title: "البطاقات — لمسة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyCards);
  const claimFn = useServerFn(claimCard);
  const registerFn = useServerFn(registerCard);
  const markFn = useServerFn(markCardWritten);
  const deleteFn = useServerFn(deleteMyCard);
  const toggleFn = useServerFn(toggleCardStatus);
  const eventsFn = useServerFn(listMyCardEvents);
  const profileFn = useServerFn(getMyProfile);
  const adminFn = useServerFn(amIAdmin);
  const linksFn = useServerFn(listMyLinks);

  const cardsQ = useQuery<Array<CardRow>>({ queryKey: qk.cards.mine(), queryFn: async () => (await listFn()) as Array<CardRow> });
  const eventsQ = useQuery<Array<CardEventRow>>({ queryKey: qk.cards.events(), queryFn: async () => (await eventsFn()) as Array<CardEventRow> });
  const profileQ = useQuery<{
    profile: { username?: string | null; full_name?: string | null; title?: string | null; bio?: string | null } | null;
    avatar_signed_url?: string | null;
    cover_signed_url?: string | null;
  }>({ queryKey: qk.profile.me(), queryFn: async () => (await profileFn()) as {
    profile: { username?: string | null; full_name?: string | null; title?: string | null; bio?: string | null } | null;
    avatar_signed_url?: string | null;
    cover_signed_url?: string | null;
  } });
  const linksQ = useQuery<Array<{ type: string; label: string; value: string }>>({ queryKey: qk.links.mine(), queryFn: async () => (await linksFn()) as Array<{ type: string; label: string; value: string }> });
  const adminQ = useQuery<{ isAdmin?: boolean }>({ queryKey: qk.amIAdmin(), queryFn: async () => (await adminFn()) as { isAdmin?: boolean } });
  const isAdmin = adminQ.data?.isAdmin ?? false;
  const profile = profileQ.data?.profile ?? null;
  const username = profile?.username ?? null;

  const [claimUid, setClaimUid] = useState("");
  const [regUid, setRegUid] = useState("");
  const [scanning, setScanning] = useState<null | "claim" | "register">(null);
  const [writingId, setWritingId] = useState<string | null>(null);
  const [writeMode, setWriteMode] = useState<WriteMode>("url");
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);

  const nfcSupported = isNfcSupported();
  // vCard-on-NFC needs Web NFC + binary MIME write. Only Android Chrome/Edge
  // ships full Web NFC today — iOS Safari has no NDEFReader at all.
  const vcardSupported = nfcSupported;

  const invalidateCards = useCallback(() => {
    qc.invalidateQueries({ queryKey: qk.cards.mine() });
    qc.invalidateQueries({ queryKey: qk.cards.events() });
  }, [qc]);

  const claimMut = useMutation({
    mutationFn: (uid: string) => claimFn({ data: { uid } }),
    onSuccess: () => {
      toast.success(t("dash.cardsPage.toastActivated"));
      setClaimUid("");
      invalidateCards();
    },
    onError: (e) => toastError(e, t("dash.cardsPage.toastActivateFailed")),
  });

  const registerMut = useMutation({
    mutationFn: (uid: string) => registerFn({ data: { uid } }),
    onSuccess: () => {
      toast.success(t("dash.cardsPage.toastRegistered"));
      setRegUid("");
      invalidateCards();
    },
    onError: (e) => toastError(e, t("dash.cardsPage.toastRegisterFailed")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (res) => {
      toast.success(res.detached ? t("dash.cardsPage.toastDetached") : t("dash.cardsPage.toastDeleted"));
      invalidateCards();
    },
    onError: (e) => toastError(e, t("dash.cardsPage.toastDeleteFailed")),
  });

  const markMut = useMutation({
    mutationFn: (v: MarkWriteInput) => markFn({ data: v }),
    onSuccess: invalidateCards,
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => toggleFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.enabled ? t("dash.cardsPage.toastEnabled") : t("dash.cardsPage.toastDisabled"));
      invalidateCards();
    },
    onError: (e) => toastError(e, t("dash.cardsPage.toastToggleFailed")),
  });

  const scanUid = useCallback(
    async (target: "claim" | "register") => {
      if (!isNfcSupported()) {
        toast.error(t("dash.cardsPage.errNoWebNfc"));
        return;
      }
      setScanning(target);
      try {
        const uid = await scanUidOnce();
        if (target === "claim") setClaimUid(uid);
        else setRegUid(uid);
        toast.success(t("dash.cardsPage.toastScanned").replace("{uid}", uid));
      } catch (e) {
        toastNfcError(e, t("dash.cardsPage.toastScanFailed"));
      } finally {
        setScanning(null);
      }
    },
    [],
  );

  // Build the current vCard payload once per input change.
  const profileUrl = useMemo(
    () => (username ? publicProfileUrl(username) : ""),
    [username],
  );

  const vcardInput: VCardInput | null = useMemo(() => {
    if (!profile) return null;
    return {
      fullName: profile.full_name || profile.username || "",
      title: profile.title,
      bio: profile.bio,
      url: profileUrl || null,
      links: (linksQ.data ?? []).map((l) => ({
        type: l.type as never,
        label: l.label,
        value: l.value,
      })),
    };
  }, [profile, profileUrl, linksQ.data]);

  const vcardText = useMemo(
    () => (vcardInput ? buildVCard(vcardInput) : ""),
    [vcardInput],
  );
  const vcardIssues = useMemo(
    () => (vcardInput ? validateVCard(vcardInput) : []),
    [vcardInput],
  );
  const vcardErrors = useMemo(
    () => vcardIssues.filter((i) => i.severity === "error"),
    [vcardIssues],
  );
  const previewBytes = useMemo(
    () =>
      writeMode === "vcard"
        ? new TextEncoder().encode(vcardText).length
        : new TextEncoder().encode(profileUrl).length,
    [writeMode, vcardText, profileUrl],
  );
  const previewCard = useMemo(
    () => (cardsQ.data ?? []).find((c) => c.id === previewCardId) ?? null,
    [cardsQ.data, previewCardId],
  );

  const performWrite = useCallback(
    async (cardId: string) => {
      if (!nfcSupported) {
        toast.error(t("dash.cardsPage.errNoWebNfcDevice"));
        return;
      }
      if (writeMode === "url" && !username) {
        toast.error(t("dash.cardsPage.errSetUsernameFirst"));
        return;
      }
      if (writeMode === "vcard" && vcardErrors.length > 0) {
        toast.error(t("dash.cardsPage.errFixVcardErrors"));
        return;
      }
      setPreviewCardId(null);
      setWritingId(cardId);
      const mode = writeMode;
      try {
        const writer = getNDEFReader();
        if (mode === "vcard") {
          const bytes = new TextEncoder().encode(vcardText);
          await writer.write({
            records: [{ recordType: "mime", mediaType: "text/vcard", data: bytes }],
          });
        } else {
          await writer.write({ records: [{ recordType: "url", data: profileUrl }] });
        }
        markMut.mutate({
          id: cardId,
          mode,
          status: "success",
          bytes: previewBytes,
        });
        toast.success(mode === "vcard" ? t("dash.cardsPage.toastVcardWritten") : t("dash.cardsPage.toastUrlWritten"));
      } catch (e) {
        const message =
          e instanceof Error ? e.message : typeof e === "string" ? e : t("dash.cardsPage.errWriteFailed");
        markMut.mutate({
          id: cardId,
          mode,
          status: "failed",
          bytes: previewBytes,
          message: message.slice(0, 500),
        });
        toastNfcError(e, t("dash.cardsPage.toastWriteFailed"));
      } finally {
        setWritingId(null);
      }
    },
    [nfcSupported, writeMode, username, vcardErrors, vcardText, profileUrl, previewBytes, markMut],
  );

  const cards = cardsQ.data ?? [];
  const events = eventsQ.data ?? [];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("dash.cardsPage.title")}</h1>
          <p className="text-muted-foreground">
            {t("dash.cardsPage.subtitle")}
          </p>
        </div>

        {!nfcSupported && (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200"
          >
            {t("dash.cardsPage.noWebNfc")}
          </div>
        )}

        <div className={`grid gap-4 ${isAdmin ? "md:grid-cols-2" : ""}`}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                {t("dash.cardsPage.activateOfficial")}
              </CardTitle>
              <CardDescription>{t("dash.cardsPage.activateOfficialDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <UidInputForm
                value={claimUid}
                onChange={setClaimUid}
                onScan={() => scanUid("claim")}
                onSubmit={() => claimMut.mutate(claimUid)}
                scanning={scanning === "claim"}
                scanDisabled={scanning !== null}
                submitting={claimMut.isPending}
                submitLabel="تفعيل"
              />
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Nfc className="size-5 text-primary" />
                  {t("dash.cardsPage.registerOwn")}
                </CardTitle>
                <CardDescription>
                  {t("dash.cardsPage.registerOwnDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UidInputForm
                  value={regUid}
                  onChange={setRegUid}
                  onScan={() => scanUid("register")}
                  onSubmit={() => registerMut.mutate(regUid)}
                  scanning={scanning === "register"}
                  scanDisabled={scanning !== null}
                  submitting={registerMut.isPending}
                  submitLabel={t("dash.cardsPage.register")}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("dash.cardsPage.myCards")} ({cards.length})</CardTitle>
            <CardDescription>{t("dash.cardsPage.myCardsHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <WriteModeSelector
              writeMode={writeMode}
              onChange={setWriteMode}
              username={username}
              vcardSupported={vcardSupported}
              vcardErrors={vcardErrors}
            />
            {cardsQ.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : cards.length === 0 ? (
              <div className="grid place-items-center py-10 text-center text-muted-foreground">
                <CreditCard className="mb-2 size-8" />
                <p>{t("dash.cardsPage.noCardsYet")}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {cards.map((c) => (
                  <CardListItem
                    key={c.id}
                    card={c}
                    nfcSupported={nfcSupported}
                    writing={writingId === c.id}
                    toggling={toggleMut.isPending}
                    onToggle={(enabled) => toggleMut.mutate({ id: c.id, enabled })}
                    onPreview={() => setPreviewCardId(c.id)}
                    onDelete={() => deleteMut.mutate(c.id)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              {t("dash.cardsPage.eventsTitle")}
            </CardTitle>
            <CardDescription>{t("dash.cardsPage.eventsSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CardEventList events={events} isLoading={eventsQ.isLoading} />
          </CardContent>
        </Card>
      </div>

      {previewCard !== null && (
        <Suspense fallback={null}>
          <WritePreviewDialog
            open
            onOpenChange={(o) => !o && setPreviewCardId(null)}
            writeMode={writeMode}
            cardUid={previewCard?.card_uid ?? null}
            bytes={previewBytes}
            username={username}
            profileUrl={profileUrl}
            vcardText={vcardText}
            vcardIssues={vcardIssues}
            vcardSupported={vcardSupported}
            nfcSupported={nfcSupported}
            isWriting={writingId === previewCard?.id}
            onWrite={() => previewCard && performWrite(previewCard.id)}
          />
        </Suspense>
      )}
    </DashboardShell>
  );
}