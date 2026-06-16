// Race a promise against a deadline. If the timeout fires first, reject with the
// error from `onTimeout()`.
//
// NOTE: this only stops the caller WAITING — the underlying promise keeps
// running unless the caller also cancels it. `onTimeout` is the hook for that:
// it runs exactly once when the deadline fires, so callers abort their
// AbortController there (see routes/x402-find-email.ts, which threads the
// signal through findEmails into the provider HTTP calls).
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => Error,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(onTimeout()), ms);
  });
  // If the timeout wins, `promise` may still reject later with nothing awaiting
  // it — swallow that to avoid an unhandledRejection. When `promise` wins, the
  // race below still observes its result/rejection normally.
  promise.catch(() => {});
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
