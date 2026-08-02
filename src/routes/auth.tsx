import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { reportAuthError } from "@/lib/reporting";
import { Loader2 } from "lucide-react";
import lamsaLogo from "@/assets/lamsa-logo.png";
import { useLanguage } from "@/lib/i18n";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

function getSafeRedirectPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}


export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — لمسة" },
      { name: "description", content: "سجّل الدخول أو أنشئ حساب لمسة لبناء بروفايلك الرقمي." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const targetRedirect = getSafeRedirectPath(search.redirect);

  // Client-only session check + OAuth hydration fallback
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: targetRedirect, replace: true });
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: targetRedirect, replace: true });
      else setCheckingSession(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, targetRedirect]);

  if (checkingSession) {
    return <AuthSkeleton />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success(t("pub.auth.toast.signupSuccess"));
        // Session is auto-created if email confirmation is off; otherwise onAuthStateChange handles it.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("pub.auth.toast.signinSuccess"));
      }
      // Fallback nav in case listener races
      setTimeout(() => {
        window.location.assign(targetRedirect);
      }, 400);
    } catch (err) {
      reportAuthError(err, mode === "signup" ? "signup" : "signin");
      toastError(err, t("pub.auth.toast.genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setGoogleBusy(true);
    try {
      const returnUrl = new URL("/auth", window.location.origin);
      returnUrl.searchParams.set("redirect", targetRedirect);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: returnUrl.toString(),
      });
      if (result.error) {
        reportAuthError(result.error, "oauth_google");
        toast.error(result.error.message || t("pub.auth.toast.googleFail"));
        setGoogleBusy(false);
        return;
      }
      if (result.redirected) return; // browser will navigate
      // Session set — the listener will navigate
      toast.success(t("pub.auth.toast.signinSuccess"));
    } catch (err) {
      reportAuthError(err, "oauth_google");
      toastError(err, t("pub.auth.toast.googleError"));
      setGoogleBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-hero-gradient p-6 place-items-center">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-white">
          <img src={lamsaLogo} alt={lang === "ar" ? "لمسة" : "Lamsa"} width={40} height={40} className="size-10 object-contain" />
          <span className="font-brand text-2xl">{t("pub.brand.name")}</span>
        </Link>
        <h1 className="sr-only">{t("pub.auth.title")}</h1>
        <Card className="rounded-2xl border-none shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">{t("pub.auth.welcome")}</CardTitle>
            <CardDescription>{t("pub.auth.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("pub.auth.tab.signin")}</TabsTrigger>
                <TabsTrigger value="signup">{t("pub.auth.tab.signup")}</TabsTrigger>
              </TabsList>

              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full gap-2"
                onClick={onGoogle}
                disabled={googleBusy}
              >
                {googleBusy ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
                {t("pub.auth.google")}
              </Button>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>{t("pub.auth.or")}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <TabsContent value="signin" className="mt-0">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">{t("pub.auth.email")}</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
                  </div>
                  <div>
                    <Label htmlFor="password">{t("pub.auth.password")}</Label>
                    <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="me-2 size-4 animate-spin" />}
                    {t("pub.auth.signin")}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="fn">{t("pub.auth.fullName")}</Label>
                    <Input id="fn" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="email2">{t("pub.auth.email")}</Label>
                    <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
                  </div>
                  <div>
                    <Label htmlFor="password2">{t("pub.auth.password")}</Label>
                    <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                    <p className="mt-1 text-xs text-muted-foreground">{t("pub.auth.passwordHint")}</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="me-2 size-4 animate-spin" />}
                    {t("pub.auth.signup")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-white/60">
          <Link to="/" className="hover:text-white">
            {t("pub.auth.backHome")}
          </Link>
        </p>
      </div>
    </main>
  );
}

function AuthSkeleton() {
  return (
    <main className="grid min-h-screen bg-hero-gradient p-6 place-items-center" aria-busy="true">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Skeleton className="size-10 rounded-full bg-white/20" />
          <Skeleton className="h-6 w-24 bg-white/20" />
        </div>
        <Card className="rounded-2xl border-none shadow-2xl">
          <CardHeader className="space-y-2">
            <Skeleton className="mx-auto h-7 w-40" />
            <Skeleton className="mx-auto h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="space-y-4">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}


function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12S6.7 21.7 12 21.7c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-1.9H12z" />
    </svg>
  );
}
