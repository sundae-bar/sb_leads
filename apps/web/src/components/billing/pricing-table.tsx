'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PLANS, type Feature, type PlanId } from '@/types';
import { useCheckout } from '@/hooks/useBilling';
import { toast } from 'sonner';

const FEATURE_LABELS: Record<Feature, string> = {
  api_keys: 'API',
  team_unlimited: 'Unlimited users',
};

export function PricingTable({ currentPlanId }: { currentPlanId: PlanId }) {
  const checkout = useCheckout();

  const handleSelect = async (planId: PlanId) => {
    if (planId === 'free') return;
    try {
      await checkout.mutateAsync(planId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Object.values(PLANS).map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const isFree = plan.id === 'free';
        return (
          <Card key={plan.id} className={`flex flex-col${isCurrent ? ' border-primary' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                {isCurrent && <span className="text-xs font-normal text-primary">Current</span>}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-semibold">${plan.priceMonthlyUsd}</span>
                <span className="text-sm text-muted-foreground"> /mo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {plan.creditsPerCycle.toLocaleString()} credits per cycle
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 flex-1">
              <ul className="flex flex-col gap-1.5 text-sm flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    <span>{FEATURE_LABELS[f] ?? f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSelect(plan.id)}
                disabled={isCurrent || isFree || checkout.isPending}
                variant={isCurrent ? 'outline' : 'default'}
              >
                {isCurrent ? 'Current plan' : isFree ? 'Free' : `Switch to ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
