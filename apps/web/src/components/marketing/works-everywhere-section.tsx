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

  // tab1Start / tab2Start are the scrollY values where each tab activates.
  // Stored in a ref so the scroll handler closure always sees the latest values.
  const thresholdsRef = useRef<{ tab1: number; tab2: number } | null>(null);

  const computeThresholds = () => {
    const section = sectionRef.current;
    const card = cardRef.current;
    if (!section || !card) return;
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

  return (
    <section ref={sectionRef as React.RefObject<HTMLElement>} className="relative mt-[80px]" style={{ height: '450vh' }}>
      <div className="mx-auto h-full w-full max-w-[90rem]">
      {/* Heading + subtitle — scroll normally, not sticky */}
      <FadeIn className="px-[80px] pt-20">
        <h2 className="font-ss text-[40px] font-medium leading-[48px] tracking-[-0.4px] text-foreground">
          Works everywhere you do.
        </h2>
        <p className="font-ss mt-4 max-w-[740px] text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-[#8c8c8c]">
          Whether you&apos;re a human, a chat agent, or an autonomous worker on the402.ai
          marketplace, you talk to the same backend.
        </p>
      </FadeIn>

      {/* Card wrapper — sticky below the 80px header, height fills remaining viewport */}
      <div ref={cardRef} className="sticky top-[80px] mx-[40px] mt-9 mb-[80px]">
        <div
          className="relative overflow-hidden rounded-[24px] border border-border bg-[#F9F9F9]"
          style={{ height: 'calc(100vh - 160px)' }}
        >

            {/* Tab row — top-[23px], left-[24px] right-[24px] */}
            <div className="absolute left-[24px] right-[24px] top-[23px] z-10 flex gap-[16px]">
              {TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  onClick={() => handleTabClick(i)}
                  className={cn(
                    'flex-1 rounded-[8px] px-[24px] py-[8px] text-base font-medium leading-[24px] tracking-[-0.16px] transition-colors font-ss',
                    i === activeTab
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-foreground hover:bg-foreground/5',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab panels — stacked, fade in/out */}
            {TABS.map((tab, i) => (
              <div
                key={tab.label}
                aria-hidden={i !== activeTab}
                className={cn(
                  'absolute inset-0 transition-opacity duration-500',
                  i === activeTab ? 'opacity-100' : 'opacity-0 pointer-events-none',
                )}
              >
                {/* Left content — absolute left-[39px] top-[143px] h-[536px] w-[584px] */}
                <div className="absolute bottom-[80px] left-[39px] top-[143px] flex w-[584px] flex-col justify-between">
                  <p
                    key={revealKeys[i]}
                    className="font-ss text-[48px] font-medium leading-[52px] tracking-[-0.48px] text-foreground"
                  >
                    {tab.heading.split('\n').map((line, li) => (
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
                    {tab.bullets.map((bullet, j) => {
                      const Icon = tab.icons[j];
                      return (
                      <div key={bullet} className="flex items-center gap-[16px]">
                        <Icon className="size-[20px] shrink-0 text-primary" />
                        <p className="font-ss text-[20px] font-normal leading-[32px] tracking-[-0.2px] text-foreground">
                          {bullet}
                        </p>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right image — absolute left-[687px] top-[103px] h-[576px] w-[632px] */}
                <div className="absolute bottom-[40px] left-[687px] top-[103px] w-[632px] overflow-hidden rounded-[16px]">
                  {tab.image ? (
                    <Image
                      src={tab.image}
                      alt=""
                      fill
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
