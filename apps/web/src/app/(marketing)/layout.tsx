import { MarketingTopNav } from '@/components/marketing/top-nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { MarketingMotionProvider } from '@/components/marketing/motion-provider';

// The marketing pages are designed light-only. `force-light` pins light tokens
// and opts the subtree out of the `dark:` variant (see globals.css), so a dark
// system preference or the app's theme toggle can't break the landing.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingMotionProvider>
      <div className="force-light flex min-h-svh flex-col bg-background text-foreground">
        <MarketingTopNav />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </MarketingMotionProvider>
  );
}
