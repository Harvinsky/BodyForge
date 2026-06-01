"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-mono text-lg uppercase tracking-widest text-[#e8d5a3]">
        {APP_NAME}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Niečo sa pokazilo pri načítaní. Skús obnoviť stránku — pri vývoji pomôže
        aj reštart servera (<code className="text-xs">npm run dev:clean</code>).
      </p>
      <Button type="button" onClick={() => reset()}>
        Skúsiť znova
      </Button>
    </div>
  );
}
