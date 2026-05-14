// scoop wordmark. Always lowercase, with a superscripted `s_` per the
// design-system rules. Uses Plus Jakarta Sans (the dedicated wordmark face).
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

export function Wordmark({ className }: Props) {
  return (
    <span
      className={cn(
        'font-wordmark font-bold leading-none tracking-tight text-foreground',
        className,
      )}
    >
      scoop
      <sup className="ml-[0.05em] text-[0.6em] font-bold align-super">s_</sup>
    </span>
  );
}
