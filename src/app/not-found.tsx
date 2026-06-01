import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="font-mono text-lg uppercase tracking-widest text-[#e8d5a3]">
        404
      </h1>
      <p className="text-sm text-muted-foreground">Stránka neexistuje.</p>
      <Button asChild>
        <Link href="/">Späť na dashboard</Link>
      </Button>
    </div>
  );
}
