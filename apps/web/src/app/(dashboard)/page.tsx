"use client"

import { useState } from 'react';
import { toast } from 'sonner';
import { useLeads } from '@/hooks/useLeads';
import { useSubscription } from '@/hooks/useBilling';
import { EmailFinderForm } from '@/components/leads/email-finder-form';
import { ContactsTable } from '@/components/leads/contacts-table';
import type { ProviderName } from '@sundae/types';
import type { FindEmailParams } from '@/hooks/useLeads';

const DEFAULT_PROVIDERS: ProviderName[] = ['aleads', 'apollo', 'nymeria', 'contactout'];

export default function DashboardPage() {
  const { data: sub } = useSubscription();
  const { contacts, search } = useLeads();
  const [activeProviders, setActiveProviders] = useState<ProviderName[]>(DEFAULT_PROVIDERS);

  const handleSearch = (params: FindEmailParams) => {
    setActiveProviders(params.providers);
    search.mutate(params, {
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Search failed');
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <EmailFinderForm
        onSearch={handleSearch}
        isLoading={search.isPending}
        creditsRemaining={sub?.creditsRemaining ?? 0}
      />
      <ContactsTable results={contacts} providers={activeProviders} />
    </div>
  );
}
