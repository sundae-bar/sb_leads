import Image from 'next/image';
import Link from 'next/link';

export function MarketingTopNav() {
  return (
    <header className="sticky top-0 z-20 w-full bg-background">
      <div className="flex items-center justify-between px-5 py-4 md:px-20 md:py-5">
        <Link href="/" aria-label="scoop home">
          <Image
            src="/brand/scoop-logo_black_transparent%202.svg"
            alt="scoop"
            width={107}
            height={40}
            priority
            unoptimized
          />
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="font-ss rounded-full px-6 py-2 text-base font-medium text-foreground tracking-[-0.01em] transition hover:bg-foreground/5"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="font-ss rounded-[8px] bg-primary px-6 py-2 text-base font-medium text-primary-foreground tracking-[-0.01em] transition hover:bg-primary/90"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
