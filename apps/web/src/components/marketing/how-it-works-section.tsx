import Image from 'next/image';

import { FadeIn } from './fade-in';

export function HowItWorksSection() {
  return (
    <section className="mt-10 bg-[#e5effd] md:mt-[80px]">
      <div className="mx-auto w-full max-w-[90rem] px-5 pb-16 pt-16 md:px-[80px] md:pb-[120px] md:pt-[120px]">
        <FadeIn>
          <h2 className="font-ss text-[28px] font-medium leading-[34px] tracking-[-0.3px] text-foreground md:text-[40px] md:leading-[48px] md:tracking-[-0.4px]">
            Paste a URL. Get an email.
          </h2>
          <p className="font-ss mt-4 max-w-[848px] text-base font-normal leading-[28px] tracking-[-0.2px] text-[#8c8c8c] md:text-[20px] md:leading-[32px]">
            No CSV uploads, no manual provider switching. The waterfall picks the cheapest provider first; and checks the next automatically if there is no result.
          </p>
        </FadeIn>

        <div className="mt-10 flex flex-col gap-4 md:mt-14 md:flex-row md:gap-[16px]">

          <FadeIn delay={0} className="flex-1">
            <div className="relative h-[280px] overflow-hidden rounded-[16px] bg-white md:h-[360px]">
              <div className="absolute left-[24px] top-[16px] flex items-center gap-[12px]">
                <span className="font-ss text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-[#8c8c8c]">1</span>
                <span className="font-ss text-base font-semibold leading-[28px] tracking-[-0.2px] text-foreground md:text-[20px]">Paste a LinkedIn profile URL.</span>
              </div>
              <div className="absolute left-[8px] top-[64px] h-[208px] w-[calc(100%-16px)] overflow-hidden rounded-[8px] bg-[#f2fcf7] md:h-[288px] md:w-[400px]">
                <Image src="/linkedin-search.png" alt="" fill sizes="(max-width: 768px) calc(100vw - 42px), 400px" className="object-cover" unoptimized />
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={80} className="flex-1">
            <div className="relative h-[280px] overflow-hidden rounded-[16px] bg-white md:h-[360px]">
              <div className="absolute left-[24px] top-[16px] flex items-center gap-[12px]">
                <span className="font-ss text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-[#8c8c8c]">2</span>
                <span className="font-ss text-base font-semibold leading-[28px] tracking-[-0.2px] text-foreground md:text-[20px]">Providers run in order.</span>
              </div>
              <div className="absolute left-[8px] top-[64px] h-[208px] w-[calc(100%-16px)] overflow-hidden rounded-[8px] md:h-[288px] md:w-[400px]">
                <Image src="/sb-waterfall.png" alt="" fill sizes="(max-width: 768px) calc(100vw - 42px), 400px" className="object-cover" unoptimized />
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={160} className="flex-1">
            <div className="relative h-[280px] overflow-hidden rounded-[16px] bg-white md:h-[360px]">
              <div className="absolute left-[24px] top-[16px] flex items-center gap-[12px]">
                <span className="font-ss text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-[#8c8c8c]">3</span>
                <div className="flex flex-wrap items-center gap-[8px]">
                  <span className="font-ss text-base font-semibold leading-[28px] tracking-[-0.2px] text-foreground md:text-[20px]">Add Hunter.io verification.</span>
                  <span className="font-ss text-[14px] font-normal leading-[24px] tracking-[-0.14px] text-[#8c8c8c]">(Optional)</span>
                </div>
              </div>
              <div className="absolute left-[8px] top-[64px] h-[208px] w-[calc(100%-16px)] overflow-hidden rounded-[8px] bg-[#f9f9f9] md:h-[288px] md:w-[400px]">
                <Image src="/sb-hunter-verify.png" alt="" fill sizes="(max-width: 768px) calc(100vw - 42px), 400px" className="object-cover" unoptimized />
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </section>
  );
}
