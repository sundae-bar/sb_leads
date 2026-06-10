import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketingSection } from '@/components/marketing/section';
import { HeroSection } from '@/components/marketing/hero-section';
import { HowItWorksSection } from '@/components/marketing/how-it-works-section';
import { WorksEverywhereSection } from '@/components/marketing/works-everywhere-section';
import { WhyDifferentSection } from '@/components/marketing/why-different-section';
import type { Metadata } from 'next';
import hero from './scoop-hero.module.css';

export const metadata: Metadata = {
  title: 'scoop · Email lead-gen for AI agents',
  description:
    'Verified emails for any LinkedIn profile, billed per result. Refunded automatically when nothing is found. An agent skill in the sundae_bar portfolio.',
};


export default function MarketingPage() {
  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[90rem]">
        <HeroSection />

      </div>

      <HowItWorksSection />

      <WorksEverywhereSection />

      <WhyDifferentSection />

      {/* 005 — Pricing · credit packs, not contracts. */}
      <MarketingSection
        title="Credits, not contracts."
        description="1 credit = $0.01. Pay for what you actually use — no monthly minimum, no renewal cliff. New workspaces get 50 free credits to try the waterfall."
        className="bg-[#e5effd]"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {[
            { usd: 10, credits: 1_000 },
            { usd: 25, credits: 2_500 },
            { usd: 50, credits: 5_000, popular: true },
            { usd: 100, credits: 10_000 },
            { usd: 250, credits: 25_000 },
          ].map((pack) => (
            <Card
              key={pack.usd}
              className={pack.popular ? 'border-foreground/40' : undefined}
            >
              <CardHeader className="pb-2">
                <CardDescription className="font-mono text-xs uppercase">
                  ${pack.usd}
                  {pack.popular && (
                    <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] text-background">
                      popular
                    </span>
                  )}
                </CardDescription>
                <CardTitle className="text-2xl">
                  {pack.credits.toLocaleString()}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    credits
                  </span>
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
        <p className="mt-4 text-center text-xs text-muted-foreground">
          One credit covers a single find_email, verify_email, or intent
          lookup. Failed lookups (no email found) are auto-refunded. Top up
          any time from your workspace — credits never expire.
        </p>
      </MarketingSection>

      {/* CTA — full-bleed dark section with saturated blob, mirrors the hero
          treatment so the page ends with brand energy instead of a boxed card. */}
      <section className="relative isolate overflow-hidden bg-[#1A1B26] py-28 text-white sm:py-32">
        <Image
          src="/brand/scoop-blob-G.jpg"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 z-0 object-cover object-center"
        />
        {/* Vignette to keep type readable */}
        <div
          aria-hidden
          className="absolute inset-0 z-[1]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(26,27,38,0.30) 0%, rgba(26,27,38,0.70) 60%, rgba(26,27,38,0.92) 100%)',
          }}
        />
        {/* Grain — same SVG as the hero */}
        <div className={hero.grain} />

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/55">
            006 / Get started
          </span>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Ten free credits. No card.
            <br />
            Start finding emails in 60 seconds.
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="h-12 bg-white px-7 text-base text-foreground hover:bg-white/90"
            >
              <Link href="/signup">Get started</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-white/30 bg-white/10 px-7 text-base text-white backdrop-blur hover:bg-white/20 hover:text-white"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
