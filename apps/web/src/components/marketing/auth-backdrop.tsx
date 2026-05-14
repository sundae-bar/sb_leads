import Image from 'next/image';
import { cn } from '@/lib/utils';
import hero from '@/app/(marketing)/scoop-hero.module.css';

interface Props {
  children: React.ReactNode;
  /** Tailwind max-width class for the inner content wrapper. Defaults to `max-w-sm`. */
  innerClassName?: string;
  /** Whether the backdrop should also fill the viewport vertically when used
   * on a page without a separate header. Defaults to false (assumes a header
   * is rendered above and the backdrop just fills the remaining flex space). */
  fullHeight?: boolean;
}

/**
 * Dark scoop-blob backdrop reused on every auth page (login, signup,
 * forgot-password, onboarding). Same vignette + grain treatment as the
 * marketing hero so the auth card visually slots into the same product world.
 */
export function AuthBackdrop({ children, innerClassName, fullHeight }: Props) {
  return (
    <main
      className={cn(
        'relative isolate flex items-center justify-center overflow-hidden bg-[#1A1B26] p-6',
        fullHeight ? 'min-h-svh' : 'flex-1',
      )}
    >
      <Image
        src="/brand/scoop-blob-D.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 z-0 object-cover object-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(26,27,38,0.30) 0%, rgba(26,27,38,0.70) 60%, rgba(26,27,38,0.92) 100%)',
        }}
      />
      <div className={hero.grain} />
      <div className={cn('relative z-10 w-full', innerClassName ?? 'max-w-sm')}>
        {children}
      </div>
    </main>
  );
}
