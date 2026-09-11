import { createClient } from '@base44/sdk';

const appId = import.meta.env.VITE_BASE44_APP_ID || '698c8fe4f23098983e1aa792';

export const base44 = createClient({ appId });

export const COLLECTIONS = {
  CALENDAR: 'calendar_event',
  SONG: 'song',
  LEDGER_USER: 'ledger_user',
  LEDGER_CONFIG: 'ledger_config',
  ADMIN_USER: 'admin_user',
  PART_DISTRIBUTOR: 'PartDistributor',
  MUSIC_STATE: 'MusicState',
};
