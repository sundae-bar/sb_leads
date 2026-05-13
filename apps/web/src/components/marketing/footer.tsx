import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="mt-20 border-t border-border/40 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span>An agent in the</span>
          <Link
            href="https://sundaebar.ai"
            className="text-foreground hover:underline"
            target="_blank"
            rel="noopener"
          >
            sundae_bar
          </Link>
          <span>portfolio.</span>
        </div>
        <nav className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="https://sundaebar.ai" target="_blank" rel="noopener" className="hover:text-foreground">
            sundaebar.ai →
          </Link>
        </nav>
      </div>
    </footer>
  );
}
