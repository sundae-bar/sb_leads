import { cn } from '@/lib/utils';

import { FadeIn } from './fade-in';

interface SectionHeaderProps {
  title: string;
  lede: string;
  /** Extra utilities for the lede (max-width, colour override). */
  ledeClassName?: string;
  className?: string;
}

/** The shared H2 + lede block used by every landing section. */
export function SectionHeader({ title, lede, ledeClassName, className }: SectionHeaderProps) {
  return (
    <FadeIn className={className}>
      <h2 className="font-ss text-[28px] font-medium leading-[34px] tracking-[-0.3px] text-foreground md:text-[40px] md:leading-[48px] md:tracking-[-0.4px]">
        {title}
      </h2>
      <p
        className={cn(
          'font-ss mt-4 text-base font-normal leading-[28px] tracking-[-0.2px] text-marketing-text-muted md:text-[20px] md:leading-[32px]',
          ledeClassName,
        )}
      >
        {lede}
      </p>
    </FadeIn>
  );
}
