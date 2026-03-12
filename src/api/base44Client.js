import { createClient } from '@base44/sdk';

export const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
});

export const COLLECTIONS = {
  CALENDAR: 'calendar_event',
  SONG: 'song',
  LEDGER_USER: 'ledger_user',
  LEDGER_CONFIG: 'ledger_config',
  ADMIN_USER: 'admin_user',
  PART_DISTRIBUTOR: 'PartDistributor',
};
