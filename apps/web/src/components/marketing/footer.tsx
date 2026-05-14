import Link from 'next/link';
import { Wordmark } from './wordmark';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wordmark className="text-lg" />
          <span className="font-mono text-xs text-muted-foreground">
            · Agent skill: email lead generation · Trained by SN121
          </span>
        </div>
        <nav className="flex items-center gap-5 text-xs text-muted-foreground">
          <Link href="/terms" className="transition hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="transition hover:text-foreground">
            Privacy
          </Link>
          <Link
            href="https://sundaebar.ai"
            target="_blank"
            rel="noopener"
            className="transition hover:text-foreground"
          >
            sundaebar.ai →
          </Link>
        </nav>
      </div>
    </footer>
  );
}
