import { cn } from '@/lib/utils';

import { DarkBlobBackdrop } from './dark-blob-backdrop';

interface Props {
  children: React.ReactNode;
  innerClassName?: string;
  /** Fill the viewport vertically when there's no separate header above. */
  fullHeight?: boolean;
}

/** Dark scoop-blob backdrop reused on every auth page. */
export function AuthBackdrop({ children, innerClassName, fullHeight }: Props) {
  return (
    <main
      className={cn(
        'relative isolate flex items-center justify-center overflow-hidden bg-foreground p-6',
        fullHeight ? 'min-h-svh' : 'flex-1',
      )}
    >
      <DarkBlobBackdrop blob="/brand/scoop-blob-D.jpg" priority />
      <div className={cn('relative z-10 w-full', innerClassName ?? 'max-w-sm')}>{children}</div>
    </main>
  );
}
