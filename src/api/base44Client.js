import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const createEntityWrapper = (tableName) => ({
  list: async () => {
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  create: async (payload) => {
    const { data, error } = await supabase.from(tableName).insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  filter: async (query) => {
    let q = supabase.from(tableName).select('*');
    for (const [key, value] of Object.entries(query)) {
      q = q.eq(key, value);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  subscribe: (callback) => {
    const channel = supabase.channel(`public:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, payload => {
        const action = payload.eventType === 'INSERT' ? 'CREATE' : payload.eventType === 'UPDATE' ? 'UPDATE' : 'DELETE';
        callback({ action, data: payload.new || payload.old });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }
});

export const base44 = {
  entities: {
    ActiveSession: createEntityWrapper('active_sessions'),
    AdminUser: createEntityWrapper('admin_users'),
    CalendarEvent: createEntityWrapper('calendar_events'),
    CalendarMemo: createEntityWrapper('calendar_memos'),
    LedgerConfig: createEntityWrapper('ledger_configs'),
    LedgerUser: createEntityWrapper('ledger_users'),
    MusicState: createEntityWrapper('music_states'),
    Outfit: createEntityWrapper('outfits'),
    PartDistributor: createEntityWrapper('part_distributors'),
    ShopExchangeRate: createEntityWrapper('shop_exchange_rates'),
    ShopOrder: createEntityWrapper('shop_orders'),
    Song: createEntityWrapper('songs'),
    Task: createEntityWrapper('tasks'),
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error } = await supabase.storage.from('uploads').upload(filePath, file);
        if (error) throw error;
        const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
        return { file_url: data.publicUrl };
      },
      InvokeLLM: async (params) => {
        console.warn("InvokeLLM is not natively supported in the Supabase free tier without an Edge Function setup.");
        alert('Supabase 무료 전환으로 인해 AI 가사 분배 기능이 비활성화되었습니다.');
        return { text: "AI 가사 자동 분배 기능은 현재 지원되지 않습니다." };
      }
    }
  }
};

export const COLLECTIONS = {
  CALENDAR: 'calendar_event',
  SONG: 'song',
  LEDGER_USER: 'ledger_user',
  LEDGER_CONFIG: 'ledger_config',
  ADMIN_USER: 'admin_user',
  PART_DISTRIBUTOR: 'PartDistributor',
  MUSIC_STATE: 'MusicState',
};
