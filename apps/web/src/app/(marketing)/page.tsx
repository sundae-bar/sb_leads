import type { Metadata } from 'next';

import { HeroSection } from '@/components/marketing/hero-section';
import { HowItWorksSection } from '@/components/marketing/how-it-works-section';
import { WorksEverywhereSection } from '@/components/marketing/works-everywhere-section';
import { WhyDifferentSection } from '@/components/marketing/why-different-section';
import { PricingSection } from '@/components/marketing/pricing-section';
import { CtaSection } from '@/components/marketing/cta-section';

export const metadata: Metadata = {
  title: 'scoop · Email lead-gen for AI agents',
  description:
    'Verified emails for any LinkedIn profile, billed per result. Refunded automatically when nothing is found. An agent skill in the sundae_bar portfolio.',
};

export default function MarketingPage() {
  return (
    <div className="w-full">
      <HeroSection />
      <HowItWorksSection />
      <WorksEverywhereSection />
      <WhyDifferentSection />
      <PricingSection />
      <CtaSection />
    </div>
  );
}
