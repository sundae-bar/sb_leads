import { cn } from '@/lib/utils';
import { FadeIn } from './fade-in';

interface Props {
  number?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Numbered marketing section — matches the "002/" rhythm used across
 * sundaebar.ai and crumble.sundaebar.ai. Generous vertical spacing,
 * monospace section label, large sans-serif title.
 */
export function MarketingSection({
  number,
  title,
  description,
  children,
  className,
}: Props) {
  return (
    <section className={cn('w-full py-12 md:py-[120px]', className)}>
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-[80px]">
        <FadeIn>
          <div className="mb-10 flex flex-col gap-3">
            {number && <span className="font-mono text-xs text-muted-foreground">{number}/</span>}
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h2>
            {description && (
              <p className="max-w-2xl text-base text-muted-foreground">{description}</p>
            )}
          </div>
        </FadeIn>
        <FadeIn delay={100}>
          {children}
        </FadeIn>
      </div>
    </section>
  );
}
