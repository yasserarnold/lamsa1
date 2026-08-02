import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { getMyProfile, updateMyProfile, uploadProfileImage } from "@/lib/profile.functions";
import { claimCard, registerCard, listMyCards } from "@/lib/cards.functions";
import { amIAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { toastError, toastNfcError } from "@/lib/errors";
import { Loader2, ArrowLeft, ArrowRight, ImageUp, Nfc, Check, SkipForward } from "lucide-react";
import { qk } from "@/lib/query-keys";
import { fileToBase64 } from "@/lib/file-utils";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "ابدأ الآن — لمسة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

type NDEFReaderCtor = new () => {
  scan: () => Promise<void>;
  write: (msg: unknown) => Promise<void>;
  onreading: ((ev: { serialNumber: string }) => void) | null;
  onreadingerror: (() => void) | null;
};

function OnboardingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getProfile = useServerFn(getMyProfile);
  const updateProfile = useServerFn(updateMyProfile);
  const uploadImage = useServerFn(uploadProfileImage);
  const claim = useServerFn(claimCard);
  const register = useServerFn(registerCard);
  const listCards = useServerFn(listMyCards);
  const adminFn = useServerFn(amIAdmin);
  const adminQ = useQuery({ queryKey: qk.amIAdmin(), queryFn: () => adminFn() });
  const isAdmin = adminQ.data?.isAdmin ?? false;

  const profileQuery = useQuery({ queryKey: qk.profile.me(), queryFn: () => getProfile() });
  const profile = profileQuery.data?.profile;
  const avatarUrl = profileQuery.data?.avatar_signed_url;
  const coverUrl = profileQuery.data?.cover_signed_url;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ username: "", full_name: "", title: "", bio: "" });
  const [savedStep1, setSavedStep1] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        username: profile.username ?? "",
        full_name: profile.full_name ?? "",
        title: profile.title ?? "",
        bio: profile.bio ?? "",
      });
      if (profile.username) setSavedStep1(true);
    }
  }, [profile]);

  const saveBasics = useMutation({
    mutationFn: (data: typeof form) =>
      updateProfile({
        data: {
          username: data.username.trim().toLowerCase(),
          full_name: data.full_name.trim() || null,
          title: data.title.trim() || null,
          bio: data.bio.trim() || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.profile.me() });
      setSavedStep1(true);
      setStep(2);
      toast.success(t("dash.onboarding.toastSaved"));
    },
    onError: (e) => toastError(e),
  });

  // Step 2: image upload
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const uploading = useMutation({
    mutationFn: async ({ kind, file }: { kind: "avatar" | "cover"; file: File }) => {
      if (file.size > 5 * 1024 * 1024) throw new Error(t("dash.onboarding.errMaxSize"));
      const base64 = await fileToBase64(file);
      return uploadImage({ data: { kind, filename: file.name, mime: file.type, base64 } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.profile.me() });
      toast.success(t("dash.onboarding.toastImageUploaded"));
    },
    onError: (e) => toastError(e),
  });

  // Step 3: NFC
  const [uid, setUid] = useState("");
  const [scanning, setScanning] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(true);
  useEffect(() => {
    setNfcSupported(typeof window !== "undefined" && "NDEFReader" in window);
  }, []);

  async function scan() {
    try {
      const Reader = (window as unknown as { NDEFReader?: NDEFReaderCtor }).NDEFReader;
      if (!Reader) throw new Error(t("dash.onboarding.errNoWebNfc"));
      const reader = new Reader();
      setScanning(true);
      await reader.scan();
      reader.onreading = (ev) => {
        setUid(ev.serialNumber.replace(/[^0-9A-Fa-f]/g, "").toUpperCase());
        setScanning(false);
        toast.success(t("dash.onboarding.toastUidRead"));
      };
      reader.onreadingerror = () => {
        setScanning(false);
        toast.error(t("dash.onboarding.errScanFailed"));
      };
    } catch (e) {
      setScanning(false);
      toastNfcError(e);
    }
  }

  const claimMutation = useMutation({
    mutationFn: () => claim({ data: { uid } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cards.mine() });
      toast.success(t("dash.onboarding.toastCardLinked"));
      finishOnboarding();
    },
    onError: (e) => toastError(e),
  });
  const registerMutation = useMutation({
    mutationFn: () => register({ data: { uid } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cards.mine() });
      toast.success(t("dash.onboarding.toastCardRegistered"));
      finishOnboarding();
    },
    onError: (e) => toastError(e),
  });

  async function finishOnboarding() {
    // publish profile if not already
    if (profile && !profile.is_published) {
      try {
        await updateProfile({ data: { is_published: true } });
      } catch {}
    }
    navigate({ to: "/dashboard" });
  }

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{t("dash.onboarding.welcome")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dash.onboarding.stepsIntro")} {step} {t("dash.onboarding.of3")}
          </p>
          <Progress value={progress} className="mt-4" />
        </div>

        {profileQuery.isPending ? (
          <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin" /></div>
        ) : step === 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("dash.onboarding.basicsTitle")}</CardTitle>
              <CardDescription>{t("dash.onboarding.basicsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t("dash.onboarding.username")}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground" dir="ltr">/u/</span>
                  <Input
                    id="username"
                    dir="ltr"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="my-name"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("dash.onboarding.usernameHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">{t("dash.onboarding.fullName")}</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">{t("dash.onboarding.title")}</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("dash.onboarding.titlePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">{t("dash.onboarding.bio")}</Label>
                <Textarea id="bio" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => saveBasics.mutate(form)}
                  disabled={!form.username || saveBasics.isPending}
                  className="gap-2"
                >
                  {saveBasics.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />}
                  {t("dash.onboarding.next")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : step === 2 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("dash.onboarding.imagesTitle")}</CardTitle>
              <CardDescription>{t("dash.onboarding.imagesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative h-40 rounded-xl overflow-hidden bg-muted">
                {coverUrl ? <img src={coverUrl} alt={t("dash.onboarding.coverAlt")} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : <div className="grid h-full place-items-center text-sm text-muted-foreground">{t("dash.onboarding.noCover")}</div>}
                <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploading.mutate({ kind: "cover", file: f }); }} />
                <Button size="sm" variant="secondary" className="absolute bottom-2 left-2 gap-2" onClick={() => coverInput.current?.click()} disabled={uploading.isPending}>
                  <ImageUp className="size-4" /> {t("dash.onboarding.cover")}
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback>{form.full_name?.[0] ?? "؟"}</AvatarFallback>
                </Avatar>
                <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploading.mutate({ kind: "avatar", file: f }); }} />
                <Button variant="outline" onClick={() => avatarInput.current?.click()} disabled={uploading.isPending} className="gap-2">
                  <ImageUp className="size-4" />
                  {uploading.isPending ? t("dash.onboarding.uploading") : t("dash.onboarding.avatar")}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                  <ArrowRight className="size-4" /> {t("dash.onboarding.back")}
                </Button>
                <Button onClick={() => setStep(3)} className="gap-2">
                  <ArrowLeft className="size-4" /> {t("dash.onboarding.next")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("dash.onboarding.nfcTitle")}</CardTitle>
              <CardDescription>{t("dash.onboarding.nfcDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!nfcSupported && (
                <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs">
                  {t("dash.onboarding.nfcUnsupported")}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="uid">{t("dash.onboarding.uidLabel")}</Label>
                <div className="flex gap-2">
                  <Input id="uid" dir="ltr" value={uid} onChange={(e) => setUid(e.target.value.toUpperCase())} placeholder="04A1B2C3D4E5F6" className="font-mono" />
                  <Button variant="outline" onClick={scan} disabled={scanning || !nfcSupported} className="gap-2 shrink-0">
                    {scanning ? <Loader2 className="size-4 animate-spin" /> : <Nfc className="size-4" />}
                    {t("dash.onboarding.scan")}
                  </Button>
                </div>
              </div>

              <div className={`grid gap-2 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
                <Button onClick={() => claimMutation.mutate()} disabled={!uid || claimMutation.isPending} className="gap-2">
                  {claimMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {t("dash.onboarding.activateOfficial")}
                </Button>
                {isAdmin && (
                  <Button variant="outline" onClick={() => registerMutation.mutate()} disabled={!uid || registerMutation.isPending} className="gap-2">
                    {registerMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Nfc className="size-4" />}
                    {t("dash.onboarding.registerOwn")}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
                  <ArrowRight className="size-4" /> {t("dash.onboarding.back")}
                </Button>
                <Button variant="ghost" onClick={finishOnboarding} className="gap-2 text-muted-foreground">
                  <SkipForward className="size-4" /> {t("dash.onboarding.skipFinish")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:underline">
            {t("dash.onboarding.backToDashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}