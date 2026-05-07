import { mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ProviderName } from "./config.js";
import { logger } from "./logger.js";

export type CreditAction = "find" | "verify" | "intent" | "search";

export interface CreditEvent {
  ts: string;
  tenant: string;
  provider: ProviderName;
  action: CreditAction;
  amount: number;
  request_id?: string;
  meta?: Record<string, unknown>;
}

const LOG_PATH = "./logs/credits.jsonl";
let initialized = false;

const ensureDir = (): void => {
  if (initialized) return;
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  initialized = true;
};

export const logCredit = (
  event: Omit<CreditEvent, "ts" | "tenant"> & { tenant?: string },
): void => {
  ensureDir();
  const full: CreditEvent = {
    ts: new Date().toISOString(),
    tenant: event.tenant ?? "default",
    provider: event.provider,
    action: event.action,
    amount: event.amount,
    request_id: event.request_id,
    meta: event.meta,
  };
  appendFileSync(LOG_PATH, JSON.stringify(full) + "\n");
  logger.info({ credit: full }, "credit charged");
};
