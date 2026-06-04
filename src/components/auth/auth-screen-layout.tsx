"use client";

import { DeerLogo } from "@/components/dashboard/deer-logo";
import { APP_NAME } from "@/lib/brand";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

function SubtitleLines({ text }: { text: string }) {
  const [line1, line2] = text.split(/\s*—\s*|\s*–\s*/);
  if (!line2) {
    return (
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground sm:max-w-sm sm:text-[0.9375rem]">
        {text}
      </p>
    );
  }
  return (
    <div className="mt-3 space-y-1 text-center">
      <p className="text-sm font-medium text-[#e8d5a3]/80 sm:text-[0.9375rem]">
        {line1}
      </p>
      <p className="text-xs text-muted-foreground sm:text-sm">
        {line2}
      </p>
    </div>
  );
}

interface AuthScreenLayoutProps {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export function AuthScreenLayout({
  children,
  subtitle,
  className,
}: AuthScreenLayoutProps) {
  const { t } = useI18n();
  const resolvedSubtitle = subtitle ?? t("brand.loginSubtitle");

  return (
    <div
      className={cn(
        "app-shell relative flex min-h-[100dvh] w-full flex-col items-center justify-start overflow-y-auto px-4 py-6 sm:justify-center sm:px-6 sm:py-10",
        className
      )}
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,162,39,0.08)_0%,transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-[1] flex w-full max-w-md flex-col items-center">
        <header className="mb-5 flex w-full flex-col items-center text-center sm:mb-8">
          {/* Logo — smaller on mobile to save vertical space */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-card/60 shadow-[0_0_40px_rgba(201,162,39,0.12)] sm:h-24 sm:w-24">
            <DeerLogo className="h-10 w-10 sm:h-16 sm:w-16" />
          </div>
          <h1 className="mt-3 font-mono text-xl font-semibold uppercase tracking-[0.22em] text-[#e8d5a3] sm:mt-5 sm:text-3xl sm:tracking-[0.26em]">
            {APP_NAME}
          </h1>
          <SubtitleLines text={resolvedSubtitle} />
        </header>

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
