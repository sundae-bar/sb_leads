import Image from 'next/image';

import { cn } from '@/lib/utils';

import { CornerMarks } from './corner-marks';
import { FadeIn } from './fade-in';
import { SectionHeader } from './section-header';

const CARDS = [
  {
    title: 'No result found.\nNo charge.',
    description:
      'If every provider whiffs, the credit is restored automatically, no support ticket, no per-month cap on retries.',
    bg: 'bg-white',
    corners: false,
    image: '/no-charge.png',
  },
  {
    title: 'First-class Model Context Protocol.',
    description:
      'Streamable HTTP transport, Bearer auth, the same surface our own chat agent uses. Drop your API key into any MCP-compatible client.',
    bg: 'bg-flavor-blue-bg',
    corners: true,
    image: '/bearer-auth.png',
  },
  {
    title: 'Listed on the agent marketplace.',
    description:
      'Customer-zero is your customer-base of one. Anonymous AI agents discover and pay for the skill via the402.ai, we just fulfil.',
    bg: 'bg-white',
    corners: false,
    image: '/agent-link.png',
  },
];

export function WhyDifferentSection() {
  return (
    <section className="bg-surface-muted py-12 md:py-[120px]">
      <div className="marketing-container">
        <SectionHeader
          title="Built for agents, not spreadsheets."
          lede="Most enrichment tools charge for misses, lock you into one provider, and don't speak agent-native. We do the opposite."
          ledeClassName="max-w-[632px] text-marketing-text"
        />

        <div className="mt-10 flex flex-col gap-4 md:mt-[80px] md:gap-[16px]">
          {CARDS.map((card, i) => (
            <FadeIn key={card.title} delay={i * 80}>
              <div className={cn('relative overflow-hidden rounded-[16px]', card.bg)}>
                {card.corners && (
                  <CornerMarks
                    markClassName="size-[8px] bg-marketing-decoration"
                    insetClassName="[--corner:8px] md:[--corner:24px]"
                  />
                )}

                {/* Mobile layout — stacked */}
                <div className="flex flex-col gap-4 p-6 md:hidden">
                  <p className="font-ss whitespace-pre-wrap text-[24px] font-medium leading-[30px] tracking-[-0.24px] text-foreground">
                    {card.title}
                  </p>
                  <p className="font-ss text-base font-normal leading-[26px] tracking-[-0.2px] text-foreground">
                    {card.description}
                  </p>
                  <Image
                    src={card.image}
                    alt=""
                    width={560}
                    height={416}
                    sizes="(max-width: 768px) calc(100vw - 88px), 280px"
                    className="w-full rounded-[16px]"
                  />
                </div>

                {/* Desktop layout — side by side */}
                <div className="hidden h-[240px] items-center gap-[24px] px-[64px] md:flex">
                  <p className="font-ss w-[320px] shrink-0 whitespace-pre-wrap text-[32px] font-medium leading-[40px] tracking-[-0.32px] text-foreground">
                    {card.title}
                  </p>
                  <p className="font-ss w-[460px] shrink-0 text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-foreground">
                    {card.description}
                  </p>
                  <div className="relative ml-auto h-[208px] w-[280px] shrink-0 overflow-hidden rounded-[16px]">
                    <Image src={card.image} alt="" fill sizes="280px" className="object-cover" />
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
