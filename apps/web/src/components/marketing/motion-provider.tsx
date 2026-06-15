'use client';

import { MotionConfig } from 'motion/react';

/** Makes every marketing animation respect `prefers-reduced-motion`. */
export function MarketingMotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
