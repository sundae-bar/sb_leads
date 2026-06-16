import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { MarketingSection } from './section';

const CREDIT_PACKS = [
  { usd: 10, credits: 1_000 },
  { usd: 25, credits: 2_500 },
  { usd: 50, credits: 5_000, popular: true },
  { usd: 100, credits: 10_000 },
  { usd: 250, credits: 25_000 },
];

export function PricingSection() {
  return (
    <MarketingSection
      title="Credits, not contracts."
      description="1 credit = $0.01. Pay for what you actually use — no monthly minimum, no renewal cliff. New workspaces get 50 free credits to try the waterfall."
      className="bg-flavor-blue-bg"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {CREDIT_PACKS.map((pack) => (
          <Card key={pack.usd} className={pack.popular ? 'border-foreground/40' : undefined}>
            <CardHeader className="pb-2">
              <CardDescription className="font-mono text-xs uppercase text-marketing-text">
                ${pack.usd}
                {pack.popular && (
                  <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] text-background">
                    popular
                  </span>
                )}
              </CardDescription>
              <CardTitle className="text-2xl">
                {pack.credits.toLocaleString()}
                <span className="ml-1 text-sm font-normal text-marketing-text-muted">credits</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant={pack.popular ? 'default' : 'outline'} className="w-full">
                <Link href="/signup">Get started</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-marketing-text-muted">
        One credit covers a single find_email, verify_email, or intent lookup. Failed lookups (no
        email found) are auto-refunded. Top up any time from your workspace — credits never expire.
      </p>
    </MarketingSection>
  );
}
