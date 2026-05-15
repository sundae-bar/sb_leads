'use client';

import { useState } from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import type { ProviderName, EmailType } from '@scoop/types';
import type { FindEmailParams } from '@/hooks/useLeads';

const PROVIDERS: { id: ProviderName; label: string }[] = [
  { id: 'aleads', label: 'Aleads' },
  { id: 'apollo', label: 'Apollo' },
  { id: 'nymeria', label: 'Nymeria' },
  { id: 'contactout', label: 'ContactOut' },
];

interface Props {
  onSearch: (params: FindEmailParams) => void;
  isLoading: boolean;
  creditsRemaining: number;
}

export function EmailFinderForm({ onSearch, isLoading, creditsRemaining }: Props) {
  const [url, setUrl] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<ProviderName[]>(
    PROVIDERS.map((p) => p.id)
  );
  const [emailType, setEmailType] = useState<EmailType>('work');
  const emailTypes: EmailType[] = [emailType];

  const noCredits = creditsRemaining <= 0;
  const canSearch = url.trim() !== '' && selectedProviders.length > 0 && emailTypes.length > 0 && !noCredits && !isLoading;

  const handleToggleProvider = (id: ProviderName) => {
    setSelectedProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSearch) return;
    onSearch({
      linkedin_url: url.trim(),
      providers: selectedProviders,
      waterfall: true,
      email_types: emailTypes,
      verify: false,
    });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="linkedin-url" className="text-sm font-medium">
              LinkedIn profile URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="linkedin-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="flex-1 h-10"
                disabled={isLoading}
              />
              <Button type="submit" disabled={!canSearch} className="h-10 px-6">
                {isLoading ? 'Searching…' : 'Find emails'}
              </Button>
            </div>
          </div>

          <Tabs value={emailType} onValueChange={(v) => setEmailType(v as EmailType)}>
            <TabsList>
              <TabsTrigger value="work">Business</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Providers</span>
              <div className="flex flex-wrap gap-3">
                {PROVIDERS.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`provider-${p.id}`}
                      checked={selectedProviders.includes(p.id)}
                      onCheckedChange={() => handleToggleProvider(p.id)}
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor={`provider-${p.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {p.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-1.5 text-xs">
              {noCredits ? (
                <>
                  <AlertTriangle className="size-3.5 text-destructive" />
                  <span className="text-destructive font-medium">No credits — upgrade to continue</span>
                </>
              ) : (
                <>
                  <Zap className="size-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{creditsRemaining}</span> credits · 1 per search
                  </span>
                </>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
