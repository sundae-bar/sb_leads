import { notFound } from 'next/navigation';
import { getAuthProvider } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EarningsResponse {
  settled?: string | number;
  held?: string | number;
  pending?: string | number;
  // the402 may add fields — we render whatever we get.
  [key: string]: unknown;
}

async function fetchEarnings(): Promise<EarningsResponse | { error: string }> {
  const apiUrl = process.env.THE402_API_URL ?? 'https://api.the402.ai';
  const apiKey = process.env.THE402_API_KEY;
  if (!apiKey) return { error: 'THE402_API_KEY not configured' };

  try {
    const res = await fetch(`${apiUrl}/v1/provider/earnings`, {
      headers: { 'X-API-Key': apiKey },
      // Always fetch fresh — earnings change as jobs settle.
      cache: 'no-store',
    });
    if (!res.ok) return { error: `${res.status} from the402 API` };
    return (await res.json()) as EarningsResponse;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'fetch failed' };
  }
}

function formatAmount(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'number') return `$${value.toFixed(2)}`;
  return String(value);
}

export default async function The402EarningsPage() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) notFound();
  if (!user.isSuperAdmin) notFound();

  const result = await fetchEarnings();
  const isError = 'error' in result;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">the402.ai earnings</h1>
        <p className="text-sm text-muted-foreground">
          Live snapshot of payouts for jobs we&apos;ve fulfilled via the the402.ai
          marketplace. Super-admin only.
        </p>
      </div>

      {isError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Couldn&apos;t fetch earnings</CardTitle>
            <CardDescription>{String(result.error)}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Settled</CardDescription>
              <CardTitle className="text-2xl">{formatAmount(result.settled)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Paid out from escrow into your wallet.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Held in escrow</CardDescription>
              <CardTitle className="text-2xl">{formatAmount(result.held)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Pending release per the402&apos;s settlement window.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl">{formatAmount(result.pending)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Jobs not yet settled.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!isError && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raw response</CardTitle>
            <CardDescription>
              For debugging. Reflects whatever <code>/v1/provider/earnings</code> returns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
