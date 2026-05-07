'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { FindEmailResult, ProviderName } from '@sundae/types';

const PROVIDER_LABELS: Record<ProviderName, string> = {
  aleads: 'Aleads',
  apollo: 'Apollo',
  nymeria: 'Nymeria',
  contactout: 'ContactOut',
  hunterio: 'Hunter',
};

interface Props {
  results: FindEmailResult[];
  providers: ProviderName[];
}

export function ContactsTable({ results, providers }: Props) {
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed py-16 text-sm text-muted-foreground">
        Search a LinkedIn URL above to find emails.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>LinkedIn</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Past Companies</TableHead>
            {providers.map((p) => (
              <TableHead key={p}>{PROVIDER_LABELS[p]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r) => (
            <TableRow key={r.linkedin_url}>
              <TableCell className="font-medium whitespace-nowrap">
                {r.person?.full_name ?? '—'}
              </TableCell>
              <TableCell>
                <a
                  href={r.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-[180px] truncate block text-primary underline-offset-2 hover:underline"
                  title={r.linkedin_url}
                >
                  {r.linkedin_url.replace('https://www.linkedin.com/in/', '').replace('https://linkedin.com/in/', '').replace(/\/$/, '')}
                </a>
              </TableCell>
              <TableCell className="whitespace-nowrap">{r.company?.name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              {providers.map((p) => {
                const emails = r.emails.filter((e) => e.source_provider === p);
                return (
                  <TableCell key={p}>
                    {emails.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {emails.map((e) => (
                          <div key={e.address} className="flex items-center gap-1.5">
                            <span className="text-sm">{e.address}</span>
                            <Badge variant="outline" className="text-xs capitalize px-1 py-0">
                              {e.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
