'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerLabel: string | null;
  creditsRemaining: number;
  isPending: boolean;
  onConfirm: () => void;
}

export function TopUpDialog({
  open,
  onOpenChange,
  providerLabel,
  creditsRemaining,
  isPending,
  onConfirm,
}: Props) {
  const noCredits = creditsRemaining <= 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Find emails on {providerLabel ?? 'this provider'}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-1 text-sm">
              <p>
                We&apos;ll query <span className="font-medium text-foreground">{providerLabel}</span>{' '}
                for this lead. Uses <span className="font-medium text-foreground">1 credit</span>{' '}
                — no charge if nothing is found.
              </p>
              <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-3 py-2 text-xs">
                <Zap className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Balance:{' '}
                  <span className="font-medium text-foreground">
                    {creditsRemaining.toLocaleString()}
                  </span>{' '}
                  → after spend:{' '}
                  <span className="font-medium text-foreground">
                    {Math.max(0, creditsRemaining - 1).toLocaleString()}
                  </span>
                </span>
              </div>
              {noCredits && (
                <p className="text-xs font-medium text-destructive">
                  You have no credits remaining. Upgrade to continue.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || noCredits}
            onClick={(e) => {
              // Prevent the dialog from auto-closing — we close it on mutation success.
              e.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Finding…
              </>
            ) : (
              'Find emails'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
