import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Zap, UserRound, Contact2, Sparkles, ChevronDown, LogOut, Settings, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import lamsaLogo from "@/assets/lamsa-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "لمسة — بطاقة أعمالك الرقمية بلمسة NFC" },
      {
        name: "description",
        content:
          "منصة لمسة تحوّل التعارف إلى تجربة رقمية: بطاقة NFC ذكية تفتح بروفايلك الاحترافي فورًا وتحوّل كل لقاء إلى عميل محتمل.",
      },
      { property: "og:title", content: "لمسة — بطاقة أعمالك الرقمية بلمسة NFC" },
      {
        property: "og:description",
        content: "منصة لمسة تحوّل التعارف إلى تجربة رقمية: بطاقة NFC ذكية تفتح بروفايلك الاحترافي فورًا وتحوّل كل لقاء إلى عميل محتمل.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { t, lang } = useLanguage();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src={lamsaLogo} alt={lang === "ar" ? "لمسة" : "Lamsa"} width={36} height={36} className="size-9 object-contain" />
            <span className="font-brand text-2xl">{t("pub.brand.name")}</span>
          </div>
          <nav className="flex items-center gap-3">
            <AuthNav />
          </nav>
        </div>
      </header>

      <main>
      {/* Hero */}
      <section className="bg-hero-gradient text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs">
              <Sparkles className="size-3.5 text-accent" />
              {t("pub.landing.hero.badge")}
            </span>
            <h1 className="mt-6 text-4xl leading-tight font-extrabold md:text-6xl">
              {t("pub.landing.hero.title1")}
              <br />
              <span className="text-accent">{t("pub.landing.hero.title2")}</span> {t("pub.landing.hero.title3")}
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/70">
              {t("pub.landing.hero.desc")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth">{t("pub.landing.hero.cta")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-white/5 text-white hover:bg-white/10">
                <Link to="/u/$username" params={{ username: "demo" }}>
                  {t("pub.landing.hero.demo")}
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            {/* Card mockup */}
            <div className="mx-auto aspect-[1.6/1] max-w-md rotate-3 rounded-3xl bg-gradient-to-br from-accent to-amber-300 p-8 shadow-2xl">
              <div className="flex h-full flex-col justify-between text-primary">
                <div className="flex items-center justify-between">
                  <span className="font-brand text-2xl">{t("pub.brand.name")}</span>
                  <img src={lamsaLogo} alt="" width={48} height={48} className="size-12 object-contain opacity-90" />
                </div>
                <div>
                  <p className="text-sm opacity-70">{t("pub.landing.card.name")}</p>
                  <p className="text-xl font-bold">{t("pub.landing.card.title")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Zap, title: t("pub.landing.feature1.title"), desc: t("pub.landing.feature1.desc") },
            { icon: UserRound, title: t("pub.landing.feature2.title"), desc: t("pub.landing.feature2.desc") },
            { icon: Contact2, title: t("pub.landing.feature3.title"), desc: t("pub.landing.feature3.desc") },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="size-6" />
              </div>
              <h2 className="mt-5 text-xl font-bold">{title}</h2>
              <p className="mt-2 text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      </main>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {t("pub.brand.name")} — {t("pub.landing.footer")}</p>
      </footer>
    </div>
  );
}

function AuthNav() {
  const router = useRouter();
  const { t } = useLanguage();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "out" }
    | { status: "expired" }
    | { status: "in"; label: string; email: string | null }
  >({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    async function resolveLabel(userId: string, fallback: string, email: string | null) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", userId)
        .maybeSingle();
      const label =
        data?.full_name?.trim() ||
        (data?.username ? `@${data.username}` : "") ||
        fallback;
      if (mounted) setState({ status: "in", label, email });
    }

    function applySession(session: import("@supabase/supabase-js").Session | null) {
      if (!mounted) return;
      if (!session) {
        setState({ status: "out" });
        return;
      }
      // Detect expired access token (session in storage but no longer valid).
      if (session.expires_at && session.expires_at * 1000 < Date.now()) {
        setState({ status: "expired" });
        return;
      }
      const meta = session.user.user_metadata as { full_name?: string; name?: string } | null;
      const fallback = meta?.full_name || meta?.name || session.user.email || t("pub.authnav.myAccountFallback");
      setState({
        status: "in",
        label: fallback,
        email: session.user.email ?? null,
      });
      resolveLabel(session.user.id, fallback, session.user.email ?? null);
    }

    // Safety timeout: fallback to 'out' if getSession hangs longer than 2s
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setState((prev) => (prev.status === "loading" ? { status: "out" } : prev));
      }
    }, 2000);

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: import("@supabase/supabase-js").Session | null } }) => {
        clearTimeout(timeoutId);
        applySession(data.session);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        if (mounted) setState({ status: "out" });
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event: string, session: import("@supabase/supabase-js").Session | null) => {
      if (!mounted) return;
      clearTimeout(timeoutId);
      if (event === "TOKEN_REFRESHED" && !session) {
        setState({ status: "expired" });
        return;
      }
      applySession(session);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, [t]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setState({ status: "out" });
    router.invalidate();
  }

  if (state.status === "loading") {
    return (
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        <span className="hidden sm:inline">{t("pub.authnav.checking")}</span>
      </div>
    );
  }

  if (state.status === "expired") {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1 text-xs text-amber-600 sm:inline-flex dark:text-amber-400">
          <AlertTriangle className="size-3.5" aria-hidden />
          {t("pub.authnav.sessionExpired")}
        </span>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link to="/auth">{t("pub.authnav.reSignin")}</Link>
        </Button>
      </div>
    );
  }

  if (state.status === "in") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-2 rounded-full">
            <UserRound className="size-4" aria-hidden />
            <span className="hidden max-w-[140px] truncate sm:inline">{state.label}</span>
            <span className="sm:hidden">{t("pub.authnav.myAccountShort")}</span>
            <ChevronDown className="size-3.5 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{state.label}</span>
            {state.email && state.email !== state.label ? (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {state.email}
              </span>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="size-4" aria-hidden />
              {t("pub.authnav.dashboard")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <UserRound className="size-4" aria-hidden />
              {t("pub.authnav.profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Settings className="size-4" aria-hidden />
              {t("pub.authnav.manageAccount")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleSignOut();
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" aria-hidden />
            {t("pub.authnav.signout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
        {t("pub.authnav.signin")}
      </Link>
      <Button asChild size="sm" className="rounded-full">
        <Link to="/auth">{t("pub.authnav.getStarted")}</Link>
      </Button>
    </>
  );
}
