'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import {
  Search,
  Users,
  RefreshCw,
  Activity,
  Link,
  Bot,
  Save,
  Wallet,
  Key,
  Plug,
  MailCheck,
  CircleCheck,
} from 'lucide-react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';

import { cn } from '@/lib/utils';

import { SectionHeader } from './section-header';

interface Tab {
  label: string;
  heading: string;
  bullets: string[];
  icons: React.ElementType[];
  image: string;
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

const REVEAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Scroll height per tab while the card is pinned (xl). */
const VH_PER_TAB = 100;
/** Scroll-driven side-by-side runs at xl+; below that it's click-driven. */
const DESKTOP_MIN_WIDTH = 1280;

const tabId = (prefix: string, i: number) => `${prefix}-we-tab-${i}`;
const panelId = (prefix: string, i: number) => `${prefix}-we-panel-${i}`;

function TabButton({
  index,
  active,
  prefix,
  onActivate,
  onKeyNav,
  className,
}: {
  index: number;
  active: boolean;
  prefix: string;
  onActivate: (i: number) => void;
  onKeyNav: (e: React.KeyboardEvent, prefix: string, i: number) => void;
  className?: string;
}) {
  return (
    <button
      role="tab"
      id={tabId(prefix, index)}
      aria-selected={active}
      aria-controls={panelId(prefix, index)}
      tabIndex={active ? 0 : -1}
      onClick={() => onActivate(index)}
      onKeyDown={(e) => onKeyNav(e, prefix, index)}
      className={cn(
        'font-ss focus-ring transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'border border-border text-foreground hover:bg-foreground/5',
        className,
      )}
    >
      {TABS[index].label}
    </button>
  );
}

function Bullets({ tab, variant }: { tab: Tab; variant: 'mobile' | 'desktop' }) {
  const mobile = variant === 'mobile';
  return (
    <div className={cn('flex flex-col', mobile ? 'mt-4 gap-3' : 'gap-[12px]')}>
      {tab.bullets.map((bullet, j) => {
        const Icon = tab.icons[j];
        return (
          <div
            key={bullet}
            className={cn('flex gap-[16px]', mobile ? 'items-start gap-3' : 'items-center')}
          >
            <Icon
              className={cn('shrink-0 text-primary', mobile ? 'mt-0.5 size-[18px]' : 'size-[20px]')}
            />
            <p
              className={cn(
                'font-ss font-normal tracking-[-0.2px] text-foreground',
                mobile ? 'text-base leading-[26px]' : 'text-[20px] leading-[32px]',
              )}
            >
              {bullet}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function WorksEverywhereSection() {
  const [activeTab, setActiveTab] = useState(0);
  // Tabs shown at least once — keeps the cross-fade smooth, defers the rest off the initial load.
  const [visited, setVisited] = useState<number[]>([0]);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });

  useEffect(() => {
    setVisited((prev) => (prev.includes(activeTab) ? prev : [...prev, activeTab]));
  }, [activeTab]);

  // Desktop: active tab follows scroll progress.
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (window.innerWidth < DESKTOP_MIN_WIDTH) return;
    const i = Math.min(TABS.length - 1, Math.max(0, Math.floor(p * TABS.length)));
    setActiveTab((prev) => (prev === i ? prev : i));
  });

  const activateTab = useCallback((i: number) => {
    setActiveTab(i);
    const section = sectionRef.current;
    if (!section || window.innerWidth < DESKTOP_MIN_WIDTH) return;
    // Scroll to the middle of this tab's slice of the pinned region.
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    window.scrollTo({
      top: sectionTop + ((i + 0.5) / TABS.length) * scrollable,
      behavior: 'smooth',
    });
  }, []);

  const onTabKeyNav = useCallback(
    (e: React.KeyboardEvent, prefix: string, index: number) => {
      let next: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % TABS.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        next = (index - 1 + TABS.length) % TABS.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = TABS.length - 1;
      if (next === null) return;
      e.preventDefault();
      activateTab(next);
      document.getElementById(tabId(prefix, next))?.focus();
    },
    [activateTab],
  );

  const tab = TABS[activeTab];

  return (
    <section
      ref={sectionRef}
      style={{ '--we-height': `${TABS.length * VH_PER_TAB}vh` } as React.CSSProperties}
      className="relative mt-10 md:mt-[80px] xl:h-[var(--we-height)]"
    >
      <div className="mx-auto h-full w-full max-w-[90rem]">
        <SectionHeader
          className="px-5 pt-12 md:px-[80px] md:pt-20"
          title="Works everywhere you do."
          lede="Whether you're a human, a chat agent, or an autonomous worker on the402.ai marketplace, you talk to the same backend."
          ledeClassName="max-w-[740px]"
        />

        {/* ── STACKED (mobile) → SIDE-BY-SIDE (lg–xl) — click-driven ── */}
        <div className="mb-10 mt-6 px-5 md:mb-[80px] md:px-[80px] xl:hidden">
          <div role="tablist" aria-label="scoop surfaces" className="flex gap-2">
            {TABS.map((t, i) => (
              <TabButton
                key={t.label}
                index={i}
                active={i === activeTab}
                prefix="m"
                onActivate={activateTab}
                onKeyNav={onTabKeyNav}
                className="flex-1 rounded-[8px] px-3 py-2 text-sm font-medium"
              />
            ))}
          </div>

          <div
            role="tabpanel"
            id={panelId('m', activeTab)}
            aria-labelledby={tabId('m', activeTab)}
            className="mt-5 flex flex-col overflow-hidden rounded-[16px] border border-border bg-surface-muted lg:flex-row lg:items-center"
          >
            {/* Text — below the screenshot when stacked, left column at lg+ */}
            <div className="p-5 lg:w-2/5 lg:p-8">
              <p className="font-ss text-[24px] font-medium leading-[30px] tracking-[-0.24px] text-foreground lg:text-[32px] lg:leading-[40px] lg:tracking-[-0.32px]">
                {tab.heading.replace(/\n/g, ' ')}
              </p>
              <Bullets tab={tab} variant="mobile" />
            </div>
            {/* Screenshot — on top when stacked, right column at lg+ */}
            <div className="relative order-first aspect-[1264/1152] w-full overflow-hidden lg:order-none lg:w-3/5">
              <Image
                src={tab.image}
                alt={`scoop ${tab.label} interface`}
                fill
                sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 60vw, 1px"
                className="object-cover object-center"
              />
            </div>
          </div>
        </div>

        {/* ── SIDE-BY-SIDE layout (xl+) — sticky scroll-driven ── */}
        <div className="hidden xl:sticky xl:top-[80px] xl:mx-[40px] xl:mb-[80px] xl:mt-9 xl:block">
          <div
            className="relative overflow-hidden rounded-[24px] border border-border bg-surface-muted"
            style={{ height: 'calc(100vh - 160px)' }}
          >
            <div
              role="tablist"
              aria-label="scoop surfaces"
              className="absolute left-[24px] right-[24px] top-[23px] z-10 flex gap-[16px]"
            >
              {TABS.map((t, i) => (
                <TabButton
                  key={t.label}
                  index={i}
                  active={i === activeTab}
                  prefix="d"
                  onActivate={activateTab}
                  onKeyNav={onTabKeyNav}
                  className="flex-1 rounded-[8px] px-[24px] py-[8px] text-base font-medium leading-[24px] tracking-[-0.16px]"
                />
              ))}
            </div>

            {TABS.map((t, i) => (
              <div
                key={t.label}
                role="tabpanel"
                id={panelId('d', i)}
                aria-labelledby={tabId('d', i)}
                aria-hidden={i !== activeTab}
                className={cn(
                  'absolute inset-0 transition-opacity duration-500',
                  i === activeTab ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                <div className="absolute bottom-[80px] left-[39px] top-[143px] flex w-[584px] flex-col justify-between">
                  <p
                    key={i === activeTab ? activeTab : `idle-${i}`}
                    className="font-ss text-[48px] font-medium leading-[52px] tracking-[-0.48px] text-foreground"
                  >
                    {t.heading.split('\n').map((line, li) => (
                      <span key={li} className="block overflow-hidden">
                        <motion.span
                          className="block"
                          initial={{ y: '110%' }}
                          animate={{ y: 0 }}
                          transition={{ duration: 1.1, ease: REVEAL_EASE, delay: li * 0.12 }}
                        >
                          {line}
                        </motion.span>
                      </span>
                    ))}
                  </p>
                  <Bullets tab={t} variant="desktop" />
                </div>

                {/* right-[39px] + object-contain keeps the whole screenshot visible at any window size */}
                <div className="absolute bottom-[40px] left-[687px] right-[39px] top-[103px]">
                  {visited.includes(i) && (
                    <Image
                      src={t.image}
                      alt={`scoop ${t.label} interface`}
                      fill
                      sizes="(min-width: 1024px) 640px, 1px"
                      className="rounded-[16px] object-contain object-center"
                    />
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
