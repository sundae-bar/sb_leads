import Image from 'next/image';

import { FadeIn } from './fade-in';
import { SectionHeader } from './section-header';

interface Step {
  n: number;
  label: string;
  optional?: boolean;
  image: string;
  /** Optional tint behind the screenshot. */
  imageBg?: string;
}

const STEPS: Step[] = [
  {
    n: 1,
    label: 'Paste a LinkedIn profile URL.',
    image: '/linkedin-search.png',
    imageBg: 'bg-[#f2fcf7]',
  },
  { n: 2, label: 'Providers run in order.', image: '/sb-waterfall.png' },
  {
    n: 3,
    label: 'Add Hunter.io verification.',
    optional: true,
    image: '/sb-hunter-verify.png',
    imageBg: 'bg-surface-muted',
  },
];

export function HowItWorksSection() {
  return (
    <section className="mt-10 bg-flavor-blue-bg md:mt-[80px]">
      <div className="marketing-container pb-16 pt-16 md:pb-[120px] md:pt-[120px]">
        <SectionHeader
          title="Paste a URL. Get an email."
          lede="No CSV uploads, no manual provider switching. The waterfall picks the cheapest provider first; and checks the next automatically if there is no result."
          ledeClassName="max-w-[848px]"
        />

        <div className="mt-10 flex flex-col gap-4 md:mt-14 md:flex-row md:gap-[16px]">
          {STEPS.map((step, i) => (
            <FadeIn key={step.n} delay={i * 80} className="flex-1">
              <div className="relative h-[280px] overflow-hidden rounded-[16px] bg-white md:h-[360px]">
                <div className="absolute left-[24px] top-[16px] flex items-center gap-[12px]">
                  <span className="font-ss text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-marketing-text-muted">
                    {step.n}
                  </span>
                  <div className="flex flex-wrap items-center gap-[8px]">
                    <span className="font-ss text-base font-semibold leading-[28px] tracking-[-0.2px] text-foreground md:text-[20px]">
                      {step.label}
                    </span>
                    {step.optional && (
                      <span className="font-ss text-[14px] font-normal leading-[24px] tracking-[-0.14px] text-marketing-text-muted">
                        (Optional)
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`absolute left-[8px] top-[64px] h-[208px] w-[calc(100%-16px)] overflow-hidden rounded-[8px] md:h-[288px] md:w-[400px] ${step.imageBg ?? ''}`}
                >
                  <Image
                    src={step.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) calc(100vw - 42px), 400px"
                    className="object-cover"
                  />
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
