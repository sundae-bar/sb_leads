import Image from 'next/image';

interface DarkBlobBackdropProps {
  blob?: string;
  priority?: boolean;
}

/** Dark scoop-blob backdrop layers (blob, vignette, grain). Drop inside a
 *  `relative isolate overflow-hidden bg-foreground` element. */
export function DarkBlobBackdrop({
  blob = '/brand/scoop-blob-G.jpg',
  priority = false,
}: DarkBlobBackdropProps) {
  return (
    <>
      <Image
        src={blob}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="absolute inset-0 z-0 object-cover object-center"
      />
      <div aria-hidden className="dark-blob-vignette absolute inset-0 z-[1]" />
      <div className="grain" />
    </>
  );
}
