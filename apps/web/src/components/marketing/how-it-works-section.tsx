import Image from 'next/image';

import { FadeIn } from './fade-in';

export function HowItWorksSection() {
  return (
    <section className="mt-[80px] bg-[#e5effd]">
      <div className="mx-auto w-full max-w-[90rem] px-[80px] pb-[120px] pt-[120px]">
        <FadeIn>
          <h2 className="font-ss text-[40px] font-medium leading-[48px] tracking-[-0.4px] text-foreground">
            Paste a URL. Get an email.
          </h2>
          <p className="font-ss mt-4 max-w-[848px] text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-[#8c8c8c]">
            No CSV uploads, no manual provider switching. The waterfall picks the cheapest provider first; and checks the next automatically if there is no result.
          </p>
        </FadeIn>

        <div className="mt-14 flex gap-[16px]">

          <FadeIn delay={0} className="flex-1">
            <div className="relative h-[360px] overflow-hidden rounded-[16px] bg-white">
              <div className="absolute left-[24px] top-[16px] flex items-center gap-[12px]">
                <span className="font-ss text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-[#8c8c8c]">1</span>
                <span className="font-ss text-[20px] font-semibold leading-[28px] tracking-[-0.2px] text-foreground">Paste a LinkedIn profile URL.</span>
              </div>
              <div className="absolute left-[8px] top-[64px] h-[288px] w-[400px] overflow-hidden rounded-[8px] bg-[#f2fcf7]">
                <Image src="/Frame 1261.png" alt="" fill sizes="400px" className="object-cover" unoptimized />
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={80} className="flex-1">
            <div className="relative h-[360px] overflow-hidden rounded-[16px] bg-white">
              <div className="absolute left-[24px] top-[16px] flex items-center gap-[12px]">
                <span className="font-ss text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-[#8c8c8c]">2</span>
                <span className="font-ss text-[20px] font-semibold leading-[28px] tracking-[-0.2px] text-foreground">Providers run in order.</span>
              </div>
              <div className="absolute left-[8px] top-[64px] h-[288px] w-[400px] overflow-hidden rounded-[8px]">
                <Image src="/Frame 1260.png" alt="" fill sizes="400px" className="object-cover" unoptimized />
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={160} className="flex-1">
            <div className="relative h-[360px] overflow-hidden rounded-[16px] bg-white">
              <div className="absolute left-[24px] top-[16px] flex items-center gap-[12px]">
                <span className="font-ss text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-[#8c8c8c]">3</span>
                <div className="flex items-center gap-[8px]">
                  <span className="font-ss text-[20px] font-semibold leading-[28px] tracking-[-0.2px] text-foreground">Add Hunter.io verification.</span>
                  <span className="font-ss text-[14px] font-normal leading-[24px] tracking-[-0.14px] text-[#8c8c8c]">(Optional)</span>
                </div>
              </div>
              <div className="absolute left-[8px] top-[64px] h-[288px] w-[400px] overflow-hidden rounded-[8px] bg-[#f9f9f9]">
                <Image src="/Frame 1261-1.png" alt="" fill sizes="400px" className="object-cover" unoptimized />
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </section>
  );
}
