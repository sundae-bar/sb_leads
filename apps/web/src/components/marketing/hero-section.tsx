'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Coins, ArrowRight } from 'lucide-react';
import { motion, type Transition } from 'motion/react';

import { CornerMarks } from './corner-marks';
import { LogoCloud } from './logo-cloud';
import { MarketingButton } from './marketing-button';

const REVEAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const REVEAL_TRANSITION: Transition = { duration: 1.1, ease: REVEAL_EASE };
const FADE_TRANSITION: Transition = { duration: 0.7, ease: 'easeOut', delay: 0.9 };

const SLIDE_UP = { initial: { y: '110%' }, animate: { y: 0 } };
const FADE_IN = { initial: { opacity: 0 }, animate: { opacity: 1 } };

export function HeroSection() {
  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <section className="relative mx-4 overflow-hidden rounded-[24px] border border-border md:mx-[40px]">
        <CornerMarks />

        <div className="flex flex-col items-center pt-16 md:pt-[111px]">
          {/* Badge */}
          <motion.div
            {...FADE_IN}
            transition={FADE_TRANSITION}
            className="flex items-center gap-1 rounded-full border border-flavor-orange-fg bg-flavor-orange-bg px-2 py-1"
          >
            <Coins className="size-3 text-marketing-accent-text" />
            <span className="font-ss whitespace-nowrap text-[12px] font-medium leading-[16px] tracking-[-0.12px] text-marketing-accent-text">
              GET 10 CREDITS FREE
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="font-ss mt-6 px-4 text-center text-[40px] font-medium leading-[44px] tracking-[-0.4px] text-foreground md:px-0 md:text-[80px] md:leading-[80px] md:tracking-[-0.8px]">
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                variants={SLIDE_UP}
                initial="initial"
                animate="animate"
                transition={REVEAL_TRANSITION}
              >
                Find the email.
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                variants={SLIDE_UP}
                initial="initial"
                animate="animate"
                transition={{ ...REVEAL_TRANSITION, delay: 0.12 }}
              >
                Skip the spreadsheet.
              </motion.span>
            </span>
          </h1>

          {/* Subheading */}
          <motion.p
            {...FADE_IN}
            transition={FADE_TRANSITION}
            className="font-ss mt-6 max-w-[726px] px-6 text-center text-base leading-[28px] tracking-[-0.2px] text-marketing-text-muted md:px-0 md:text-[20px] md:leading-[32px]"
          >
            Paste a LinkedIn URL. Scoop checks multiple providers to return verified emails. You
            only pay when it works.
          </motion.p>

          {/* CTAs */}
          <motion.div
            {...FADE_IN}
            transition={FADE_TRANSITION}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <MarketingButton asChild variant="primary">
              <Link href="/signup">Get Started</Link>
            </MarketingButton>
            <MarketingButton asChild variant="outline">
              <Link href="/app">
                Open in App
                <ArrowRight className="size-4" />
              </Link>
            </MarketingButton>
          </motion.div>

          <div className="mt-8 w-full">
            <LogoCloud />
          </div>

          {/* App screenshot (LCP) */}
          <div className="mx-4 mb-8 mt-10 w-[calc(100%-32px)] overflow-hidden rounded-[16px] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.1)] md:mx-[39px] md:mb-[48px] md:mt-[65px] md:w-[calc(100%-78px)] md:rounded-[24px]">
            <div className="relative aspect-video">
              <Image
                src="/scoop-demo.png"
                alt="scoop dashboard"
                fill
                priority
                sizes="(max-width: 768px) calc(100vw - 32px), (max-width: 1440px) calc(100vw - 80px), 1360px"
                className="object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
