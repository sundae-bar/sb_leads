import { MarketingTopNav } from '@/components/marketing/top-nav';
import { MarketingFooter } from '@/components/marketing/footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <MarketingTopNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
