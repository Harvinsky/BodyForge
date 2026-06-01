import { cn } from "@/lib/utils";

export function PanelSkeleton({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-primary/10"
          style={{ width: `${88 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
