'use client';

import { useState } from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ProviderName, EmailType } from '@sundae/types';
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
  const [emailTypes, setEmailTypes] = useState<EmailType[]>(['work', 'personal']);

  const noCredits = creditsRemaining <= 0;
  const canSearch = url.trim() !== '' && selectedProviders.length > 0 && emailTypes.length > 0 && !noCredits && !isLoading;

  const handleToggleProvider = (id: ProviderName) => {
    setSelectedProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleEmailTypeChange = (val: string[]) => {
    if (val.length === 0) return;
    setEmailTypes(val as EmailType[]);
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
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Email Finder</CardTitle>
        <CardDescription>
          Find email addresses from a LinkedIn profile URL using multiple data providers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium shrink-0">Email type</span>
            <ToggleGroup
              type="multiple"
              value={emailTypes}
              onValueChange={handleEmailTypeChange}
              variant="outline"
              className="gap-1"
            >
              <ToggleGroupItem value="work" size="sm">Business</ToggleGroupItem>
              <ToggleGroupItem value="personal" size="sm">Personal</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={!canSearch}>
              {isLoading ? 'Searching…' : 'Search'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
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

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {noCredits ? (
                <>
                  <AlertTriangle className="size-3.5 text-destructive" />
                  <span className="text-destructive">No credits remaining — upgrade to continue</span>
                </>
              ) : (
                <>
                  <Zap className="size-3.5" />
                  <span>1 credit per search · {creditsRemaining} remaining</span>
                </>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
