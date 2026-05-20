// Declarative manifest of services we list on the402.ai. Drives both the
// sync script (which POSTs these to /v1/services) and the webhook dispatcher
// (which looks up our internal handler by service name).
//
// Re-exports the NormalizedEmail shape into the deliverable_schema so the
// listed contract stays in sync with our internal types — change the type
// and the next `pnpm the402:sync` will publish the update.

export interface The402Service {
  /** Internal identifier — also used to route incoming job_dispatch events. */
  name: string;
  service_type: 'data_api' | 'automated_service' | 'human_service';
  pricing_model: 'fixed' | 'quote_required';
  /** Either a fixed price or a min/max range, USD. */
  price: { fixed: string } | { min: string; max: string };
  fulfillment_type: 'instant' | 'automated' | 'human';
  description: string;
  input_schema: Record<string, unknown>;
  deliverable_schema?: Record<string, unknown>;
  category: string;
  tags: string[];
  estimated_delivery: string;
}

const normalizedEmailSchema = {
  type: 'object',
  required: ['address', 'type', 'source_provider'],
  properties: {
    address: { type: 'string', format: 'email' },
    type: { type: 'string', enum: ['work', 'personal'] },
    source_provider: { type: 'string' },
    verified: { type: 'boolean' },
    verified_by: { type: 'string' },
    confidence: { type: 'number' },
  },
} as const;

export const LISTED_SERVICES: readonly The402Service[] = [
  {
    // Must match the service name in the402's dashboard. Buyers see this string
    // in the marketplace; our webhook handler matches incoming `service_name`
    // against this value to route the job.
    name: 'Scoop',
    service_type: 'data_api',
    pricing_model: 'fixed',
    // Covers our provider cost (~$0.05-0.15 depending on hit) plus margin.
    // Confirm with the operator before first sync.
    price: { fixed: '$0.25' },
    fulfillment_type: 'instant',
    description:
      "Find verified work and/or personal emails across multiple data providers (Aleads, Apollo, Nymeria, ContactOut). Two input modes: (1) by LinkedIn URL, or (2) by full name + company domain (or company name). Waterfall fallback with optional Hunter.io verification. Returns deliverability-graded results in under 5 seconds.",
    input_schema: {
      type: 'object',
      description:
        'Provide EITHER linkedin_url OR full_name plus one of company_domain / company_name. Mixing both modes in one call is rejected.',
      additionalProperties: false,
      properties: {
        linkedin_url: {
          type: 'string',
          format: 'uri',
          description:
            'Full LinkedIn profile URL, e.g. https://www.linkedin.com/in/williamhgates/. URL mode is the most accurate when available.',
        },
        full_name: {
          type: 'string',
          description:
            "Person's full name, e.g. 'Aran McKenna'. Use when no LinkedIn URL is available. Requires company_domain or company_name.",
        },
        first_name: { type: 'string', description: 'Optional — refines name-mode matching.' },
        last_name: { type: 'string', description: 'Optional — refines name-mode matching.' },
        company_domain: {
          type: 'string',
          description:
            "Company website domain, e.g. 'cykel.ai'. Strongly preferred over company_name when available — providers match much better against a domain.",
        },
        company_name: {
          type: 'string',
          description:
            "Free-text company name, e.g. 'Cykel'. Used when no domain is known; some providers will resolve it themselves.",
        },
        email_types: {
          type: 'array',
          items: { type: 'string', enum: ['work', 'personal'] },
          default: ['work', 'personal'],
        },
        verify: {
          type: 'boolean',
          default: false,
          description:
            'When true, runs Hunter.io deliverability verification on each found email.',
        },
      },
    },
    deliverable_schema: {
      type: 'object',
      properties: {
        linkedin_url: { type: 'string', format: 'uri' },
        emails: { type: 'array', items: normalizedEmailSchema },
        person: {
          type: 'object',
          properties: {
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            full_name: { type: 'string' },
            title: { type: 'string' },
          },
        },
        company: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            domain: { type: 'string' },
          },
        },
      },
    },
    category: 'sales-intelligence',
    tags: ['email', 'linkedin', 'enrichment', 'b2b'],
    estimated_delivery: 'instant',
  },
] as const;
