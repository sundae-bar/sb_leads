import { cn } from '@/lib/utils';
import { FadeIn } from './fade-in';

interface Props {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** Tinted band with a centered column, fading title/description and content. */
export function MarketingSection({ title, description, children, className }: Props) {
  return (
    <section className={cn('w-full py-12 md:py-[120px]', className)}>
      <div className="marketing-container">
        <FadeIn>
          <div className="mb-10 flex flex-col gap-3">
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
            {description && (
              <p className="max-w-2xl text-base text-marketing-text-muted">{description}</p>
            )}
          </div>
        </FadeIn>
        <FadeIn delay={100}>{children}</FadeIn>
      </div>
    </section>
  );
}
