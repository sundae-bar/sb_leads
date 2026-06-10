import { cn } from '@/lib/utils';

import { FadeIn } from './fade-in';

const CARDS = [
  {
    title: 'No result found.\nNo charge.',
    description: 'If every provider whiffs, the credit is restored automatically, no support ticket, no per-month cap on retries.',
    bg: 'bg-white',
    corners: false,
  },
  {
    title: 'First-class Model Context Protocol.',
    description: 'Streamable HTTP transport, Bearer auth, the same surface our own chat agent uses. Drop your API key into any MCP-compatible client.',
    bg: 'bg-[#e5effd]',
    corners: true,
  },
  {
    title: 'Listed on the agent marketplace.',
    description: "Customer-zero is your customer-base of one. Anonymous AI agents discover and pay for the skill via the402.ai, we just fulfil.",
    bg: 'bg-white',
    corners: false,
  },
];

export function WhyDifferentSection() {
  return (
    <section className="bg-[#f9f9f9] px-[80px] py-[80px]">
      <FadeIn>
        <h2 className="font-ss text-[40px] font-medium leading-[48px] tracking-[-0.4px] text-foreground">
          Built for agents, not spreadsheets.
        </h2>
        <p className="font-ss mt-4 max-w-[632px] text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-[#585858]">
          Most enrichment tools charge for misses, lock you into one provider, and don&apos;t speak agent-native. We do the opposite.
        </p>
      </FadeIn>

      <div className="mt-[80px] flex flex-col gap-[16px]">
        {CARDS.map((card, i) => (
          <FadeIn key={card.title} delay={i * 80}>
            <div className={cn('relative h-[240px] overflow-hidden rounded-[16px]', card.bg)}>
              {card.corners && (
                <>
                  <div className="absolute left-[24px] top-[24px] size-[8px] bg-[#c4c4c4]" />
                  <div className="absolute right-[24px] top-[24px] size-[8px] bg-[#c4c4c4]" />
                  <div className="absolute bottom-[24px] left-[24px] size-[8px] bg-[#c4c4c4]" />
                  <div className="absolute bottom-[24px] right-[24px] size-[8px] bg-[#c4c4c4]" />
                </>
              )}
              <div className="flex h-full items-center gap-[24px] px-[64px]">
                <p className="font-ss w-[320px] shrink-0 whitespace-pre-wrap text-[32px] font-medium leading-[40px] tracking-[-0.32px] text-foreground">
                  {card.title}
                </p>
                <p className="font-ss w-[460px] shrink-0 text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-foreground">
                  {card.description}
                </p>
                <div className="ml-auto h-[208px] w-[240px] shrink-0 rounded-[8px] bg-muted" />
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
