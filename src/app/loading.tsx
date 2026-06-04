import { AppLoadingMessage } from "@/components/app-loading-message";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#121212] text-foreground">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-[#e8d5a3]/40 border-t-[#e8d5a3]"
        aria-hidden
      />
      <AppLoadingMessage />
    </div>
  );
}
