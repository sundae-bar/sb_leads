'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

import { Search, Users, RefreshCw, Activity, Link, Bot, Save, Wallet, Key, Plug, MailCheck, CircleCheck } from 'lucide-react';
import { motion } from 'motion/react';

import { cn } from '@/lib/utils';

import { FadeIn } from './fade-in';

interface Tab {
  label: string;
  heading: string;
  bullets: string[];
  icons: React.ElementType[];
  image: string | null;
}

const TABS: Tab[] = [
  {
    label: 'Dashboard',
    heading: 'See everything, do anything, no code.',
    bullets: [
      'Look up emails by pasting a LinkedIn URL',
      'Browse and manage saved contacts',
      'Top up providers without re-running the waterfall',
      'Credit balance updates in real time',
    ],
    icons: [Search, Users, RefreshCw, Activity],
    image: '/scoop-dashboard.png',
  },
  {
    label: 'Chat',
    heading: 'Ask in chat.\nGet great results.',
    bullets: [
      "Paste a URL or describe who you're looking for",
      'The agent picks the right tool and runs the waterfall',
      'Results saved to your workspace automatically',
      'Respects your credit budget without being asked',
    ],
    icons: [Link, Bot, Save, Wallet],
    image: '/scoop-ask.png',
  },
  {
    label: 'MCP / API',
    heading: 'A lookup your agent can call directly.',
    bullets: [
      'Bearer-token HTTP with streamable MCP transport',
      'Use Scoop API keys in Claude, GPT, or any MCP client',
      'Find and verify emails autonomously, no human in the loop',
      'Tested against real outreach workflows, not just benchmarks',
    ],
    icons: [Key, Plug, MailCheck, CircleCheck],
    image: '/scoop-mcp.png',
  },
];

export function WorksEverywhereSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [revealKeys, setRevealKeys] = useState([0, 0, 0]);
  const prevTabRef = useRef(-1);
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const activateTab = useCallback((i: number) => {
    if (prevTabRef.current === i) return;
    prevTabRef.current = i;
    setActiveTab(i);
    setRevealKeys(prev => prev.map((k, idx) => idx === i ? k + 1 : k));
  }, []);

  const thresholdsRef = useRef<{ tab1: number; tab2: number } | null>(null);

  const computeThresholds = () => {
    const section = sectionRef.current;
    const card = cardRef.current;
    if (!section || !card) return;
    if (window.innerWidth < 1024) return;
    const sectionY = section.getBoundingClientRect().top + window.scrollY;
    const cardOffset = card.offsetTop;
    const scrollable = section.offsetHeight - window.innerHeight - cardOffset;
    if (scrollable <= 0) return;
    thresholdsRef.current = {
      tab1: sectionY + cardOffset + scrollable / 3,
      tab2: sectionY + cardOffset + (2 * scrollable) / 3,
    };
  };

  useLayoutEffect(() => {
    computeThresholds();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerWidth < 1024) return;
      const t = thresholdsRef.current;
      if (!t) return;
      const y = window.scrollY;
      activateTab(y < t.tab1 ? 0 : y < t.tab2 ? 1 : 2);
    };

    const onResize = () => {
      computeThresholds();
      onScroll();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activateTab]);

  const handleTabClick = (i: number) => {
    if (window.innerWidth < 1024) { activateTab(i); return; }
    const section = sectionRef.current;
    const card = cardRef.current;
    if (!section || !card) { activateTab(i); return; }
    const sectionY = section.getBoundingClientRect().top + window.scrollY;
    const cardOffset = card.offsetTop;
    const scrollable = section.offsetHeight - window.innerHeight - cardOffset;
    if (scrollable <= 0) { activateTab(i); return; }
    window.scrollTo({
      top: sectionY + cardOffset + ((i + 0.5) / 3) * scrollable,
      behavior: 'smooth',
    });
  };

  const tab = TABS[activeTab];

  return (
    <section ref={sectionRef as React.RefObject<HTMLElement>} className="relative mt-10 md:mt-[80px] lg:h-[450vh]">
      <div className="mx-auto h-full w-full max-w-[90rem]">

        {/* Heading + subtitle */}
        <FadeIn className="px-5 pt-12 md:px-[80px] md:pt-20">
          <h2 className="font-ss text-[28px] font-medium leading-[34px] tracking-[-0.3px] text-foreground md:text-[40px] md:leading-[48px] md:tracking-[-0.4px]">
            Works everywhere you do.
          </h2>
          <p className="font-ss mt-4 max-w-[740px] text-base font-normal leading-[28px] tracking-[-0.2px] text-[#8c8c8c] md:text-[20px] md:leading-[32px]">
            Whether you&apos;re a human, a chat agent, or an autonomous worker on the402.ai
            marketplace, you talk to the same backend.
          </p>
        </FadeIn>

        {/* ── MOBILE layout (below lg) ── */}
        <div className="mt-6 px-5 lg:hidden">
          {/* Tab buttons */}
          <div className="flex gap-2">
            {TABS.map((t, i) => (
              <button
                key={t.label}
                onClick={() => handleTabClick(i)}
                className={cn(
                  'flex-1 rounded-[8px] px-3 py-2 text-sm font-medium font-ss transition-colors',
                  i === activeTab
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Active tab content */}
          <div className="mt-5 overflow-hidden rounded-[16px] border border-border bg-[#F9F9F9]">
            {/* Image */}
            {tab.image && (
              <div className="relative aspect-video w-full overflow-hidden">
                <Image
                  src={tab.image}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 0px"
                  className="object-cover object-center"
                  unoptimized
                />
              </div>
            )}
            {/* Text */}
            <div className="p-5">
              <p className="font-ss text-[24px] font-medium leading-[30px] tracking-[-0.24px] text-foreground">
                {tab.heading.replace('\n', ' ')}
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {tab.bullets.map((bullet, j) => {
                  const Icon = tab.icons[j];
                  return (
                    <div key={bullet} className="flex items-start gap-3">
                      <Icon className="mt-0.5 size-[18px] shrink-0 text-primary" />
                      <p className="font-ss text-base font-normal leading-[26px] tracking-[-0.2px] text-foreground">{bullet}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── DESKTOP layout (lg+) — sticky scroll-driven ── */}
        <div ref={cardRef} className="hidden lg:sticky lg:top-[80px] lg:mx-[40px] lg:mb-[80px] lg:mt-9 lg:block">
          <div
            className="relative overflow-hidden rounded-[24px] border border-border bg-[#F9F9F9]"
            style={{ height: 'calc(100vh - 160px)' }}
          >
            {/* Tab row */}
            <div className="absolute left-[24px] right-[24px] top-[23px] z-10 flex gap-[16px]">
              {TABS.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => handleTabClick(i)}
                  className={cn(
                    'flex-1 rounded-[8px] px-[24px] py-[8px] text-base font-medium leading-[24px] tracking-[-0.16px] transition-colors font-ss',
                    i === activeTab
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-foreground hover:bg-foreground/5',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab panels */}
            {TABS.map((t, i) => (
              <div
                key={t.label}
                aria-hidden={i !== activeTab}
                className={cn(
                  'absolute inset-0 transition-opacity duration-500',
                  i === activeTab ? 'opacity-100' : 'opacity-0 pointer-events-none',
                )}
              >
                <div className="absolute bottom-[80px] left-[39px] top-[143px] flex w-[584px] flex-col justify-between">
                  <p
                    key={revealKeys[i]}
                    className="font-ss text-[48px] font-medium leading-[52px] tracking-[-0.48px] text-foreground"
                  >
                    {t.heading.split('\n').map((line, li) => (
                      <span key={li} className="block overflow-hidden">
                        <motion.span
                          className="block"
                          initial={{ y: '110%' }}
                          animate={{ y: 0 }}
                          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: li * 0.12 }}
                        >
                          {line}
                        </motion.span>
                      </span>
                    ))}
                  </p>
                  <div className="flex flex-col gap-[12px]">
                    {t.bullets.map((bullet, j) => {
                      const Icon = t.icons[j];
                      return (
                        <div key={bullet} className="flex items-center gap-[16px]">
                          <Icon className="size-[20px] shrink-0 text-primary" />
                          <p className="font-ss text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-foreground">{bullet}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="absolute bottom-[40px] left-[687px] top-[103px] w-[632px] overflow-hidden rounded-[16px]">
                  {t.image ? (
                    <Image
                      src={t.image}
                      alt=""
                      fill
                      sizes="632px"
                      className="object-cover object-center"
                      unoptimized
                    />
                  ) : (
                    <div className="size-full bg-muted" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
