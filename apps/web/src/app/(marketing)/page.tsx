import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketingSection } from '@/components/marketing/section';
import { LogoCloud } from '@/components/marketing/logo-cloud';
import type { Metadata } from 'next';
import hero from './scoop-hero.module.css';

export const metadata: Metadata = {
  title: 'scoop · Email lead-gen for AI agents',
  description:
    'Verified emails for any LinkedIn profile, billed per result. Refunded automatically when nothing is found. An agent skill in the sundae_bar portfolio.',
};

const PROVIDER_CHAIN = ['Aleads', 'Apollo', 'Nymeria', 'ContactOut'] as const;

const JSON_SNIPPET = `{
  "linkedin_url": "https://linkedin.com/in/satyanadella",
  "emails": [
    { "address": "satyan@microsoft.com", "type": "work", "verified": true }
  ],
  "credits_used": 1
}`;

const CURL_SNIPPET = `curl https://leads.sundaebar.ai/find-email \\
  -H "Authorization: Bearer sk-..." \\
  -d '{"linkedin_url":"https://linkedin.com/in/<handle>"}'`;

const CHAT_SNIPPET = `> Find a business email for https://linkedin.com/in/<handle>
✓ satyan@microsoft.com (work, verified)  1 credit used`;

export default function MarketingPage() {
  return (
    <div className="w-full">
      {/* Hero — scoop launch asset. Dark, saturated blob backdrop, vignette,
          film grain. Centre stack: eyebrow, big scoop wordmark, tagline.
          Top-left "· NEW" tag, bottom-right "TRAINED BY SN121" watermark. */}
      <section className={hero.card}>
        <Image
          src="/brand/scoop-blob-D.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className={hero.bg}
        />
        <div className={hero.grain} />

        <div className={hero.tagRow}>
          <span className={hero.tag}>New</span>
        </div>

        <div className={hero.stack}>
          <div className={hero.eyebrow}>
            <span className={hero.bar} />
            <span>sundae_bar</span>
            <span className={hero.bar} />
          </div>

          <h1 className={hero.wordmark}>
            scoop<sup className={hero.sbMark}>s_</sup>
          </h1>

          <p className={hero.tagline}>
            Agent Skill:&nbsp; <em>Email Lead Generation</em>
          </p>
        </div>

        <div className={hero.ctaRow}>
          <Button asChild size="lg" className="h-11 px-6">
            <Link href="/signup">Get started</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 border-white/30 bg-white/10 px-6 text-white backdrop-blur hover:bg-white/20 hover:text-white"
          >
            <Link href="/app">Open in app →</Link>
          </Button>
        </div>

        <div className={hero.watermark}>
          <span className={hero.trainedBy}>Trained by SN121</span>
        </div>
      </section>

      {/* Provider logo cloud — sits between the hero and the first
          numbered section. Anchors credibility without taking a full slot. */}
      <section className="border-y border-border/40 bg-background">
        <div className="mx-auto w-full max-w-6xl px-6">
          <LogoCloud />
        </div>
      </section>

      {/* 002 — How it works · soft off-white (gray-100) */}
      <MarketingSection
        number="002"
        title="Paste a URL. Get an email."
        description="No CSV uploads, no manual provider switching. The waterfall picks the cheapest hit first; falls through automatically when one provider misses."
        className="bg-muted"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs text-muted-foreground">step 1</span>
            <p className="text-base font-medium">Paste a LinkedIn profile URL.</p>
            <pre className="overflow-x-auto rounded-md border bg-background p-3 font-mono text-xs">
              https://linkedin.com/in/<span className="text-muted-foreground">&lt;handle&gt;</span>
            </pre>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs text-muted-foreground">step 2</span>
            <p className="text-base font-medium">Four providers run in order.</p>
            <div className="flex flex-wrap gap-1.5">
              {PROVIDER_CHAIN.map((p, i) => (
                <span key={p} className="inline-flex items-center gap-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    {p}
                  </Badge>
                  {i < PROVIDER_CHAIN.length - 1 && (
                    <span className="text-xs text-muted-foreground">→</span>
                  )}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Hot-swappable order. Disable any provider per call.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs text-muted-foreground">step 3</span>
            <p className="text-base font-medium">Optional Hunter.io verification.</p>
            <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {JSON_SNIPPET}
            </pre>
          </div>
        </div>
      </MarketingSection>

      {/* 003 — Three surfaces · pure white for clean breath */}
      <MarketingSection
        number="003"
        title="Three surfaces. One workspace."
        description="Whether you're a human, a chat agent, or an autonomous worker on the402.ai marketplace, you talk to the same backend."
        className="bg-background"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dashboard</CardTitle>
              <CardDescription>
                Point-and-click. Saved contacts, per-cell provider top-up, credit balance live.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/app"
                className="font-mono text-xs text-foreground underline underline-offset-4 hover:no-underline"
              >
                open /app →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chat</CardTitle>
              <CardDescription>
                Natural language. The agent calls the right tool, persists results, and respects your credit budget.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] leading-relaxed">
                {CHAT_SNIPPET}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">MCP / API</CardTitle>
              <CardDescription>
                Bearer-token HTTP. Same path our own chat agent dogfoods. Plug straight into Claude, GPT, or a custom agent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] leading-relaxed">
                {CURL_SNIPPET}
              </pre>
            </CardContent>
          </Card>
        </div>
      </MarketingSection>

      {/* 004 — Why it's different · brand-blue flavour tint */}
      <MarketingSection
        number="004"
        title="Built for agents, not for spreadsheets."
        description="Most enrichment tools charge for misses, lock you into one provider, and don't speak agent-native. We do the opposite on all three."
        className="[background:var(--flavor-blue-bg)]"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-md border p-5">
            <span className="font-mono text-xs text-muted-foreground">refund-on-empty</span>
            <p className="text-base font-medium">You never pay for a miss.</p>
            <p className="text-sm text-muted-foreground">
              If every provider whiffs, the credit is restored automatically — no support ticket, no per-month cap on retries.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-md border p-5">
            <span className="font-mono text-xs text-muted-foreground">waterfall</span>
            <p className="text-base font-medium">Four providers, in your chosen order.</p>
            <p className="text-sm text-muted-foreground">
              Tune the chain to your cost profile. Top up a single provider for an existing lead without re-running the others.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-md border p-5">
            <span className="font-mono text-xs text-muted-foreground">mcp-native</span>
            <p className="text-base font-medium">First-class Model Context Protocol.</p>
            <p className="text-sm text-muted-foreground">
              Streamable HTTP transport, Bearer auth, the same surface our own chat agent uses. Drop your API key into any MCP-compatible client.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-md border p-5">
            <span className="font-mono text-xs text-muted-foreground">the402.ai</span>
            <p className="text-base font-medium">Listed on the agent marketplace.</p>
            <p className="text-sm text-muted-foreground">
              Customer-zero is your customer-base of one. Anonymous AI agents discover and pay for the skill via the402.ai — we just fulfil.
            </p>
          </div>
        </div>
      </MarketingSection>

      {/* 005 — Pricing · credit packs, not contracts. */}
      <MarketingSection
        number="005"
        title="Credits, not contracts."
        description="1 credit = $0.01. Pay for what you actually use — no monthly minimum, no renewal cliff. New workspaces get 50 free credits to try the waterfall."
        className="bg-muted"
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
