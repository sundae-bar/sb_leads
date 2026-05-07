'use client';

import { Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useBilling';
import { cn } from '@/lib/utils';

/** Compact credits display for sidebars. */
export function CreditsMeter({ className }: { className?: string }) {
  const { data, isLoading } = useSubscription();
  if (isLoading || !data) return null;

  const total = data.plan.creditsPerCycle;
  const used = total - data.creditsRemaining;
  const pct = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
  const low = pct >= 90;

  return (
    <div className={cn('flex flex-col gap-1.5 px-2 py-2', className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
        <Sparkles className="size-3" />
        <span>
          {data.creditsRemaining.toLocaleString()} / {total.toLocaleString()} credits
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full transition-all',
            low ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
