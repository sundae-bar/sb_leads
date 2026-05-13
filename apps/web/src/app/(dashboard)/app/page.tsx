"use client"

import { toast } from 'sonner';
import { useLeads } from '@/hooks/useLeads';
import { useSubscription } from '@/hooks/useBilling';
import { EmailFinderForm } from '@/components/leads/email-finder-form';
import { ContactsTable } from '@/components/leads/contacts-table';
import type { FindEmailParams } from '@/hooks/useLeads';

export default function DashboardPage() {
  const { data: sub } = useSubscription();
  const { contacts, search } = useLeads();
  const creditsRemaining = sub?.creditsRemaining ?? 0;

  const handleSearch = (params: FindEmailParams) => {
    search.mutate(params, {
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Search failed');
      },
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email finder</h1>
          <p className="text-sm text-muted-foreground">
            Find verified emails from a LinkedIn URL across multiple providers.
          </p>
        </div>
      </div>
      <EmailFinderForm
        onSearch={handleSearch}
        isLoading={search.isPending}
        creditsRemaining={creditsRemaining}
      />
      <ContactsTable results={contacts} creditsRemaining={creditsRemaining} />
    </div>
  );
}
