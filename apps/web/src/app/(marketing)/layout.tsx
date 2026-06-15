import { MarketingTopNav } from '@/components/marketing/top-nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { MarketingMotionProvider } from '@/components/marketing/motion-provider';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingMotionProvider>
      <div className="flex min-h-svh flex-col bg-background text-foreground">
        <MarketingTopNav />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </MarketingMotionProvider>
  );
}
