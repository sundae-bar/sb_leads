import Image from 'next/image';
import styles from './logo-cloud.module.css';

interface Provider {
  name: string;
  /** Filename (no extension) under public/brand/providers/. */
  slug: string;
}

/**
 * The data providers the scoop waterfall draws from, plus complementary
 * services we benchmark against. All logos live in
 * `apps/web/public/brand/providers/<slug>.png` so we never depend on an
 * external CDN at render time.
 */
const PROVIDERS: Provider[] = [
  { name: 'Apollo', slug: 'apollo' },
  { name: 'Hunter.io', slug: 'hunter' },
  { name: 'ContactOut', slug: 'contactout' },
  { name: 'Nymeria', slug: 'nymeria' },
  { name: 'People Data Labs', slug: 'peopledatalabs' },
  { name: 'Snov.io', slug: 'snov' },
  { name: 'Lusha', slug: 'lusha' },
  { name: 'RocketReach', slug: 'rocketreach' },
  { name: 'ZoomInfo', slug: 'zoominfo' },
];

function Strip({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className={styles.strip} aria-hidden={ariaHidden}>
      {PROVIDERS.map((p) => (
        <div key={p.slug} className={styles.item}>
          <Image
            src={`/brand/providers/${p.slug}.png`}
            alt={ariaHidden ? '' : p.name}
            width={48}
            height={48}
            className={styles.logo}
            unoptimized
          />
          <span className={styles.label}>{p.name}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  /** Optional eyebrow shown above the strip. */
  eyebrow?: string;
  /** Optional one-line caption rendered below the strip. */
  caption?: string;
  /** Override animation duration. Default 45s for a calm scroll. */
  durationSeconds?: number;
}

export function LogoCloud({ eyebrow, caption, durationSeconds = 45 }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {eyebrow && (
        <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </span>
      )}
      <div
        className={styles.viewport}
        style={
          {
            '--duration': `${durationSeconds}s`,
          } as React.CSSProperties
        }
      >
        <div className={styles.track}>
          {/* Two identical strips — the keyframe translates by exactly one
              strip width, so the seam is invisible. */}
          <Strip />
          <Strip ariaHidden />
        </div>
      </div>
      {caption && (
        <p className="max-w-xl text-center text-sm text-muted-foreground">{caption}</p>
      )}
    </div>
  );
}
