import { cn } from '@/lib/utils';

interface CornerMarksProps {
  markClassName?: string;
  /** Inset from each edge, set via the `--corner` property (e.g. `[--corner:23px]`). */
  insetClassName?: string;
}

const CORNERS = [
  'top-(--corner) left-(--corner)',
  'top-(--corner) right-(--corner)',
  'bottom-(--corner) left-(--corner)',
  'bottom-(--corner) right-(--corner)',
] as const;

/** Four decorative corner squares. Render inside any `relative` ancestor. */
export function CornerMarks({
  markClassName = 'size-[8px] bg-border',
  insetClassName = '[--corner:23px]',
}: CornerMarksProps) {
  return (
    <>
      {CORNERS.map((position) => (
        <span
          key={position}
          aria-hidden
          className={cn('pointer-events-none absolute', insetClassName, position, markClassName)}
        />
      ))}
    </>
  );
}
