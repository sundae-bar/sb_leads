import { describe, it, expect } from 'vitest';
import { consumeCreditsArgs, refundLedgerRow, toCreditLedgerEntry } from '@scoop/types';

// These pure helpers are the single source of truth for the money-moving
// contracts shared by apps/api and apps/web. If either side drifts, billing
// breaks — so lock the exact shapes here.
describe('credit contracts (@scoop/types)', () => {
  it('consumeCreditsArgs maps options to RPC params, defaulting kind to debit_find', () => {
    expect(consumeCreditsArgs('t1', 5)).toEqual({
      p_tenant_id: 't1',
      p_amount: 5,
      p_kind: 'debit_find',
      p_description: null,
      p_ref_type: null,
      p_ref_id: null,
    });

    expect(
      consumeCreditsArgs('t1', 2, {
        kind: 'debit_verify',
        description: 'verify acme.com',
        refType: 'verify_email',
        refId: 'req-1',
      }),
    ).toEqual({
      p_tenant_id: 't1',
      p_amount: 2,
      p_kind: 'debit_verify',
      p_description: 'verify acme.com',
      p_ref_type: 'verify_email',
      p_ref_id: 'req-1',
    });
  });

  it('refundLedgerRow builds a positive refund row with null defaults', () => {
    expect(
      refundLedgerRow('t1', 3, {
        description: 'no results',
        refType: 'find_email_request',
        refId: 'req-1',
      }),
    ).toEqual({
      tenant_id: 't1',
      amount: 3,
      kind: 'refund',
      description: 'no results',
      ref_type: 'find_email_request',
      ref_id: 'req-1',
    });

    expect(refundLedgerRow('t1', 3)).toEqual({
      tenant_id: 't1',
      amount: 3,
      kind: 'refund',
      description: null,
      ref_type: null,
      ref_id: null,
    });
  });

  it('toCreditLedgerEntry maps a snake_case row to a camelCase entry', () => {
    expect(
      toCreditLedgerEntry({
        id: 1,
        tenant_id: 't1',
        amount: -1,
        kind: 'debit_find',
        description: 'find_email Cykel',
        ref_type: 'find_email_request',
        ref_id: 'req-1',
        actor_id: 'user-1',
        metadata: { provider: 'apollo' },
        created_at: '2026-01-01T00:00:00Z',
      }),
    ).toEqual({
      id: 1,
      tenantId: 't1',
      amount: -1,
      kind: 'debit_find',
      description: 'find_email Cykel',
      refType: 'find_email_request',
      refId: 'req-1',
      actorId: 'user-1',
      metadata: { provider: 'apollo' },
      createdAt: '2026-01-01T00:00:00Z',
    });
  });
});
