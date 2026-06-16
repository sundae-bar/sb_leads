import Image from 'next/image';
import Link from 'next/link';

import { SCOOP_LOGO_SRC } from '@/lib/brand';

import { MarketingButton } from './marketing-button';

export function MarketingTopNav() {
  return (
    <header className="sticky top-0 z-20 w-full bg-background">
      <div className="flex items-center justify-between px-5 py-4 md:px-20 md:py-5">
        <Link href="/" aria-label="scoop home" className="focus-ring rounded-[8px]">
          <Image src={SCOOP_LOGO_SRC} alt="scoop" width={107} height={40} priority />
        </Link>
        <nav className="flex items-center gap-2">
          <MarketingButton asChild variant="ghost">
            <Link href="/login">Log In</Link>
          </MarketingButton>
          <MarketingButton asChild variant="primary">
            <Link href="/signup">Get Started</Link>
          </MarketingButton>
        </nav>
      </div>
    </header>
  );
}
