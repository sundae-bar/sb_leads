'use client';

import { useLeads } from '@/hooks/useLeads';
import { useSubscription } from '@/hooks/useBilling';
import { ContactsTable } from '@/components/leads/contacts-table';

export default function LeadsPage() {
  const { data: sub } = useSubscription();
  const { contacts, contactsLoading } = useLeads();
  const creditsRemaining = sub?.creditsRemaining ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Every lead this workspace has enriched. Sort, filter, and top up
            providers per row.
          </p>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {contactsLoading ? (
            <span>Loading…</span>
          ) : (
            <span>
              <span className="font-medium text-foreground">{contacts.length.toLocaleString()}</span>{' '}
              {contacts.length === 1 ? 'lead' : 'leads'} saved
            </span>
          )}
        </div>
      </div>

      <ContactsTable
        results={contacts}
        creditsRemaining={creditsRemaining}
        emptyState="table"
      />
    </div>
  );
}
