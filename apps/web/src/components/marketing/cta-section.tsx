import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { DarkBlobBackdrop } from './dark-blob-backdrop';

export function CtaSection() {
  return (
    <section className="relative isolate overflow-hidden bg-foreground py-16 text-white sm:py-28 md:py-32">
      <DarkBlobBackdrop />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/55">
          Get started
        </span>
        <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl md:text-5xl">
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
  );
}
