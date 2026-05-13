import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketingSection } from '@/components/marketing/section';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sundae Leads — Verified emails for any LinkedIn URL',
  description:
    'An agent in the sundae_bar portfolio. Paste a LinkedIn URL, get verified emails. Refunds on misses. Available via dashboard, chat, or MCP.',
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
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="flex flex-col gap-6">
          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            An agent in the sundae_bar portfolio
          </span>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Verified emails for any LinkedIn profile,{' '}
            <span className="text-muted-foreground">paid by the agent.</span>
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            Paste a LinkedIn URL, get back a deliverability-graded email across four
            providers. We refund the credit automatically when nothing is found —
            you only pay for hits.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/app">Open the app →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 002 — How it works */}
      <MarketingSection
        number="002"
        title="Paste a URL. Get an email."
        description="No CSV uploads, no manual provider switching. The waterfall picks the cheapest hit first; falls through automatically when one provider misses."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs text-muted-foreground">step 1</span>
            <p className="text-base font-medium">Paste a LinkedIn profile URL.</p>
            <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
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

      {/* 003 — Three ways to call it */}
      <MarketingSection
        number="003"
        title="Three surfaces. One workspace."
        description="Whether you're a human, a chat agent, or an autonomous worker on the402.ai marketplace, you talk to the same backend."
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

      {/* 004 — Why it's different */}
      <MarketingSection
        number="004"
        title="Built for agents, not for spreadsheets."
        description="Most enrichment tools charge for misses, lock you into one provider, and don't speak agent-native. We do the opposite on all three."
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

      {/* 005 — Pricing */}
      <MarketingSection
        number="005"
        title="Pricing that bills the way agents work."
        description="Per credit, per cycle. Credits auto-rebill when you run dry; never wait until next month for a deal to clear."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription className="font-mono text-xs uppercase">Free</CardDescription>
              <CardTitle className="text-3xl">$0</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm">
                <span className="font-medium text-foreground">10</span> credits, no card.
              </p>
              <p className="text-xs text-muted-foreground">
                For kicking the tyres. All providers, no rate caps.
              </p>
              <Button asChild variant="outline">
                <Link href="/signup">Start free</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-foreground/40">
            <CardHeader>
              <CardDescription className="font-mono text-xs uppercase">Growth</CardDescription>
              <CardTitle className="text-3xl">
                $49<span className="text-base font-normal text-muted-foreground"> /mo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm">
                <span className="font-medium text-foreground">4,000</span> credits per cycle.
              </p>
              <p className="text-xs text-muted-foreground">
                Auto-rebill, 14-day trial, all team-member seats.
              </p>
              <Button asChild>
                <Link href="/signup?plan=growth">Choose Growth</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription className="font-mono text-xs uppercase">Business</CardDescription>
              <CardTitle className="text-3xl">
                $299<span className="text-base font-normal text-muted-foreground"> /mo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm">
                <span className="font-medium text-foreground">30,000</span> credits per cycle.
              </p>
              <p className="text-xs text-muted-foreground">
                Priority providers, dedicated support, custom waterfall.
              </p>
              <Button asChild variant="outline">
                <Link href="/signup?plan=business">Choose Business</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MarketingSection>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="flex flex-col items-start gap-4 rounded-lg border bg-muted/20 p-10">
          <span className="font-mono text-xs text-muted-foreground">006/</span>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Ten free credits. No card. Start finding emails in 60 seconds.
          </h2>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
