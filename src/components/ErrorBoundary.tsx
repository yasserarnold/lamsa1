import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/reporting";
import { formatError } from "@/lib/errors";

type Props = {
  children: ReactNode;
  /** Custom fallback renderer; receives error + reset. */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
  /** Logical area name for reporting context. */
  boundaryName?: string;
};

type State = { error: Error | null };

/**
 * App-wide React Error Boundary.
 *
 * Catches render-time errors from descendants, reports them with context,
 * and shows a friendly Arabic recovery screen instead of a blank page.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, {
      op: `react.boundary${this.props.boundaryName ? `:${this.props.boundaryName}` : ""}`,
      extra: { componentStack: info.componentStack },
    });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback({ error, reset: this.reset });
    return <DefaultFallback error={error} reset={this.reset} />;
  }
}

// Note: this fallback can render outside <LanguageProvider> (e.g. very early
// boot errors), so it can't safely call useLanguage(). We show both Arabic
// and English text together instead of crashing on a missing context.
function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  const message = formatError(error, "حدث خطأ غير متوقع / Something went wrong");
  return (
    <div
      role="alert"
      dir="rtl"
      className="flex min-h-[60vh] items-center justify-center bg-background px-4 py-12"
    >
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive text-2xl">
          !
        </div>
        <h2 className="text-xl font-bold text-foreground">حدث خطأ غير متوقع / Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground/80">
          تم تسجيل الخطأ تلقائيًا. حاول مرة أخرى أو ارجع للصفحة الرئيسية.
          <br />
          The error was logged automatically. Try again or go back home.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <button
            onClick={() => {
              reset();
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            إعادة المحاولة / Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            الصفحة الرئيسية / Home page
          </a>
        </div>
      </div>
    </div>
  );
}