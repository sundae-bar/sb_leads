import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function MarketingTopNav() {
  return (
    <header className="border-b border-border/40">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-medium tracking-tight">
          <span className="text-foreground">sundae_bar</span>
          <span className="text-muted-foreground">/leads</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
