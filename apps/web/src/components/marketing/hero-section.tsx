'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Coins, ArrowRight } from 'lucide-react';
import { motion, type Transition } from 'motion/react';

import { LogoCloud } from './logo-cloud';

const REVEAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const REVEAL_TRANSITION: Transition = { duration: 1.1, ease: REVEAL_EASE };
const FADE_TRANSITION: Transition = { duration: 0.7, ease: 'easeOut', delay: 0.9 };

const SLIDE_UP = { initial: { y: '110%' }, animate: { y: 0 } };
const FADE_IN = { initial: { opacity: 0 }, animate: { opacity: 1 } };

export function HeroSection() {
  return (
    <section className="relative mx-[40px] overflow-hidden rounded-[24px] border border-border">
      {/* Corner marks */}
      <div className="absolute left-[23px] top-[23px] size-[8px] bg-border" />
      <div className="absolute right-[23px] top-[23px] size-[8px] bg-border" />
      <div className="absolute bottom-[23px] left-[23px] size-[8px] bg-border" />
      <div className="absolute bottom-[23px] right-[23px] size-[8px] bg-border" />

      <div className="flex flex-col items-center pt-[111px]">
        {/* Orange badge */}
        <motion.div
          {...FADE_IN}
          transition={FADE_TRANSITION}
          className="flex items-center gap-1 rounded-full border border-[#fec5a2] bg-[#ffece0] px-2 py-1"
        >
          <Coins className="size-3 text-[#f17d00]" />
          <span className="font-ss whitespace-nowrap text-[12px] font-medium leading-[16px] tracking-[-0.12px] text-[#f17d00]">
            GET 10 CREDITS FREE
          </span>
        </motion.div>

        {/* Headline */}
        <h1 className="font-ss mt-6 text-center text-[80px] font-medium leading-[80px] tracking-[-0.8px] text-foreground">
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
          className="font-ss mt-6 max-w-[726px] text-center text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-[#8c8c8c]"
        >
          Paste a LinkedIn URL. Scoop checks multiple providers to return verified emails. You only pay when it works.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          {...FADE_IN}
          transition={FADE_TRANSITION}
          className="mt-6 flex items-center gap-4"
        >
          <Link
            href="/signup"
            className="font-ss rounded-[8px] bg-primary px-6 py-2 text-base font-medium text-primary-foreground tracking-[-0.01em] transition hover:bg-primary/90"
          >
            Get Started
          </Link>
          <Link
            href="/app"
            className="font-ss flex items-center gap-1 rounded-[8px] border border-border px-6 py-2 text-base font-medium text-foreground tracking-[-0.01em] transition hover:bg-foreground/5"
          >
            Open in App
            <ArrowRight className="size-4" />
          </Link>
        </motion.div>

        {/* Logo cloud */}
        <div className="mt-8 w-full">
          <LogoCloud />
        </div>

        {/* App screenshot */}
        <div className="mx-[39px] mb-[48px] mt-[65px] w-[calc(100%-78px)] overflow-hidden rounded-[24px] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.1)]">
          <div className="relative aspect-video">
            <Image
              src="/Scoop - Demo.png"
              alt="scoop dashboard"
              fill
              sizes="(max-width: 1440px) 100vw, 1440px"
              className="object-cover object-top"
              unoptimized
            />
          </div>
        </div>
      </div>
    </section>
  );
}
