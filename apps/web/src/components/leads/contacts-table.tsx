'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { TopUpDialog } from './top-up-dialog';
import { useLeads } from '@/hooks/useLeads';
import type { FindEmailResult, ProviderName } from '@sundae/types';

/** All provider columns shown in the table — order matters (left to right). */
export const PROVIDER_COLUMNS: { id: ProviderName; label: string; canFind: boolean }[] = [
  { id: 'aleads', label: 'Aleads', canFind: true },
  { id: 'apollo', label: 'Apollo', canFind: true },
  { id: 'nymeria', label: 'Nymeria', canFind: true },
  { id: 'contactout', label: 'ContactOut', canFind: true },
  // Hunter is a verifier only — no email-finder API. Column shown for completeness.
  { id: 'hunterio', label: 'Hunter', canFind: false },
];

interface Props {
  results: FindEmailResult[];
  creditsRemaining: number;
  /**
   * How to render the empty state.
   * - `card` (default): big dashed-border card prompting the user to search.
   *   Right for the dashboard, where the table is paired with a finder form.
   * - `table`: keep the table chrome (headers, search, pagination) and show
   *   "No leads yet" inside the body. Right for browse pages where the user
   *   expects to see the structure even when empty.
   */
  emptyState?: 'card' | 'table';
}

interface PendingTopUp {
  linkedinUrl: string;
  provider: ProviderName;
  providerLabel: string;
}

export function ContactsTable({ results, creditsRemaining, emptyState = 'card' }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pending, setPending] = useState<PendingTopUp | null>(null);
  /** Tracks which `(linkedin_url::provider)` cells are currently fetching. */
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const { topUp } = useLeads();

  const handleConfirmTopUp = () => {
    if (!pending) return;
    const key = `${pending.linkedinUrl}::${pending.provider}`;
    setActiveKey(key);
    topUp.mutate(
      { linkedin_url: pending.linkedinUrl, provider: pending.provider },
      {
        onSuccess: (result) => {
          const found = result.emails.some((e) => e.source_provider === pending.provider);
          toast[found ? 'success' : 'info'](
            found
              ? `Found ${result.emails.filter((e) => e.source_provider === pending.provider).length} email(s) on ${pending.providerLabel}`
              : `No email found on ${pending.providerLabel} — no credit charged`,
          );
          setPending(null);
          setActiveKey(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Top-up failed');
          setActiveKey(null);
        },
      },
    );
  };

  const columns = useMemo<ColumnDef<FindEmailResult>[]>(() => {
    const base: ColumnDef<FindEmailResult>[] = [
      {
        id: 'name',
        accessorFn: (r) => r.person?.full_name ?? '',
        header: 'Name',
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap font-medium">
            {(getValue() as string) || '—'}
          </span>
        ),
        sortingFn: 'alphanumeric',
      },
      {
        id: 'linkedin',
        accessorKey: 'linkedin_url',
        header: 'LinkedIn',
        enableSorting: false,
        cell: ({ row }) => {
          const url = row.original.linkedin_url;
          const handle = url
            .replace('https://www.linkedin.com/in/', '')
            .replace('https://linkedin.com/in/', '')
            .replace(/\/$/, '');
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-[180px] truncate text-primary underline-offset-2 hover:underline"
              title={url}
            >
              {handle}
            </a>
          );
        },
      },
      {
        id: 'company',
        accessorFn: (r) => r.company?.name ?? '',
        header: 'Company',
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">
            {(getValue() as string) || '—'}
          </span>
        ),
      },
    ];

    const providerCols: ColumnDef<FindEmailResult>[] = PROVIDER_COLUMNS.map((p) => ({
      id: `provider-${p.id}`,
      header: p.label,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const lead = row.original;
        const emails = lead.emails.filter((e) => e.source_provider === p.id);
        const attempted = lead.providers_attempted.some((a) => a.provider === p.id);
        const cellKey = `${lead.linkedin_url}::${p.id}`;
        const isActive = activeKey === cellKey;

        if (emails.length > 0) {
          return (
            <div className="flex flex-col gap-1">
              {emails.map((e) => (
                <div key={e.address} className="flex items-center gap-1.5">
                  <span className="text-sm">{e.address}</span>
                  <Badge variant="outline" className="px-1 py-0 text-xs capitalize">
                    {e.type}
                  </Badge>
                </div>
              ))}
            </div>
          );
        }

        // Hunter has no email-finder. Show a static dash with a tooltip.
        if (!p.canFind) {
          return (
            <span className="text-muted-foreground" title="Verifier only — no email finder">
              —
            </span>
          );
        }

        // Already tried, came back empty — disable to avoid burning a credit.
        // (Server refunds zero-result calls anyway, but disabling makes intent clear.)
        if (attempted) {
          return <span className="text-xs text-muted-foreground">No email</span>;
        }

        return (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isActive || topUp.isPending}
            onClick={() =>
              setPending({
                linkedinUrl: lead.linkedin_url,
                provider: p.id,
                providerLabel: p.label,
              })
            }
          >
            {isActive ? (
              <>
                <Loader2 className="mr-1 size-3 animate-spin" />
                Finding…
              </>
            ) : (
              'Find'
            )}
          </Button>
        );
      },
    }));

    return [...base, ...providerCols];
  }, [activeKey, topUp.isPending]);

  const table = useReactTable({
    data: results,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  if (results.length === 0 && emptyState === 'card') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 py-20 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Search className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">No results yet</p>
          <p className="text-xs text-muted-foreground">
            Paste a LinkedIn URL above and we&apos;ll search across your selected providers.
          </p>
        </div>
      </div>
    );
  }

  const filteredCount = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const start = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(filteredCount, (pageIndex + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search name, company, or LinkedIn…"
            className="h-9 pl-8"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {filteredCount.toLocaleString()} {filteredCount === 1 ? 'result' : 'results'}
          {globalFilter && ` of ${results.length.toLocaleString()}`}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  return (
                    <TableHead key={h.id}>
                      {h.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="-ml-2 flex h-8 items-center gap-1.5 rounded px-2 text-xs font-medium uppercase tracking-wide hover:bg-muted/60"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {globalFilter ? (
                    <>No leads match &quot;{globalFilter}&quot;.</>
                  ) : results.length === 0 ? (
                    <div className="flex flex-col items-center gap-1 py-4">
                      <p className="font-medium text-foreground">No leads yet</p>
                      <p className="text-xs">
                        Head to the Email finder and paste a LinkedIn URL — leads land here.
                      </p>
                    </div>
                  ) : (
                    'No results on this page.'
                  )}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{start}</span>–
          <span className="font-medium text-foreground">{end}</span> of{' '}
          <span className="font-medium text-foreground">{filteredCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              Page <span className="font-medium text-foreground">{pageIndex + 1}</span> of{' '}
              <span className="font-medium text-foreground">{table.getPageCount() || 1}</span>
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <TopUpDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !topUp.isPending) setPending(null);
        }}
        providerLabel={pending?.providerLabel ?? null}
        creditsRemaining={creditsRemaining}
        isPending={topUp.isPending}
        onConfirm={handleConfirmTopUp}
      />
    </div>
  );
}
