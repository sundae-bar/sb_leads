import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Wordmark } from './wordmark';

export function MarketingTopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" aria-label="scoop home" className="flex items-center">
          <Wordmark className="text-xl" />
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Sign in
          </Link>
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
