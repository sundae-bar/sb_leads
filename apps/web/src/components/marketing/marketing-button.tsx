import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const marketingButtonVariants = cva(
  'font-ss focus-ring inline-flex items-center justify-center gap-1 px-6 py-2 text-base font-medium tracking-[-0.01em] transition',
  {
    variants: {
      variant: {
        primary: 'rounded-[8px] bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'rounded-[8px] border border-border text-foreground hover:bg-foreground/5',
        ghost: 'rounded-full text-foreground hover:bg-foreground/5',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

function MarketingButton({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof marketingButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="marketing-button"
      className={cn(marketingButtonVariants({ variant, className }))}
      {...props}
    />
  );
}

export { MarketingButton, marketingButtonVariants };
