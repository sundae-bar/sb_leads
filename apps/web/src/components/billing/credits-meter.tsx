'use client';

import Link from 'next/link';
import { Coins, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useBilling';
import { cn } from '@/lib/utils';

/**
 * Sidebar credits widget. With the ledger model there's no "cycle total" to
 * compute a percentage against — the balance is just what the tenant has
 * available. We render the raw count plus a "Top up" CTA when it's getting
 * low (<= 10) or a sparkle when there's plenty.
 */
export function CreditsMeter({ className }: { className?: string }) {
  const { data, isLoading } = useSubscription();
  if (isLoading || !data) return null;

  const balance = data.balance;
  const low = balance <= 10;
  const empty = balance <= 0;

  return (
    <Link
      href="/app/settings?tab=billing"
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors',
        empty
          ? 'bg-destructive/10 text-destructive hover:bg-destructive/15'
          : low
            ? 'text-muted-foreground hover:bg-accent'
            : 'text-muted-foreground hover:bg-accent',
        className,
      )}
      title={empty ? 'No credits — top up' : 'View billing'}
    >
      {empty ? <Coins className="size-3.5" /> : <Sparkles className="size-3.5" />}
      <span className="flex-1 truncate">
        {empty ? (
          'Out of credits — top up'
        ) : (
          <>
            <span className="font-medium tabular-nums">
              {balance.toLocaleString()}
            </span>{' '}
            credits
          </>
        )}
      </span>
      {low && !empty && (
        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700">
          Low
        </span>
      )}
    </Link>
  );
}
