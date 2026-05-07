import { tool } from 'ai';
import { z } from 'zod';

export const getCurrentTimeTool = tool({
  description: 'Returns the current date and time in ISO 8601 format.',
  parameters: z.object({
    timezone: z.string().describe('IANA timezone name, e.g. "America/New_York". Optional - if not provided, returns UTC time.'),
  }).partial(),
  execute: async ({ timezone }) => {
    const now = new Date();
    if (timezone) {
      return now.toLocaleString('en-US', { timeZone: timezone, hour12: false });
    }
    return now.toISOString();
  },
});
