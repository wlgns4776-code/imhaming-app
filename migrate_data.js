import { createClient as createBase44Client } from '@base44/sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load env vars
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const base44 = createBase44Client({
  appId: process.env.VITE_BASE44_APP_ID
});

const supabase = createSupabaseClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const tables = [
  { base44Name: 'CalendarEvent', supabaseName: 'calendar_events' },
  { base44Name: 'Song', supabaseName: 'songs' },
  { base44Name: 'LedgerUser', supabaseName: 'ledger_users' },
  { base44Name: 'LedgerConfig', supabaseName: 'ledger_configs' },
  { base44Name: 'AdminUser', supabaseName: 'admin_users' },
  { base44Name: 'PartDistributor', supabaseName: 'part_distributors' },
  { base44Name: 'MusicState', supabaseName: 'music_states' },
  { base44Name: 'Outfit', supabaseName: 'outfits' },
  { base44Name: 'ActiveSession', supabaseName: 'active_sessions' },
  { base44Name: 'CalendarMemo', supabaseName: 'calendar_memos' },
  { base44Name: 'ShopExchangeRate', supabaseName: 'shop_exchange_rates' },
  { base44Name: 'ShopOrder', supabaseName: 'shop_orders' },
  { base44Name: 'Task', supabaseName: 'tasks' }
];

const schemaMap = {
  'active_sessions': ['username', 'sessionId', 'last_active_at', 'ip'],
  'admin_users': ['username', 'password', 'role'],
  'calendar_events': ['title', 'start', 'end', 'order', 'externalId', 'color', 'time', 'memo'],
  'calendar_memos': ['content', 'updatedAt'],
  'ledger_configs': ['columns', 'categories'],
  'ledger_users': ['nickname', 'userId', 'category', 'counts', 'data'],
  'music_states': ['track', 'lyrics', 'currentLyricIndex', 'isPlaying'],
  'outfits': ['title', 'description', 'category', 'images'],
  'part_distributors': ['song_id', 'song_title', 'lyrics', 'members', 'assignments'],
  'shop_exchange_rates': ['pieces', 'reward', 'emoji', 'colorFrom', 'colorTo', 'popular', 'sortOrder'],
  'shop_orders': ['nickname', 'costume', 'type', 'pieces', 'status'],
  'songs': ['title', 'artist', 'lyrics', 'key', 'tags', 'proficiency', 'conditionCheck', 'remarks', 'youtubeUrl', 'mrUrl', 'coverUrl'],
  'tasks': ['title', 'completed']
};

async function migrate() {
  console.log('Starting data migration...');
  
  for (const table of tables) {
    console.log(`\nFetching from Base44: ${table.base44Name}...`);
    try {
      const data = await base44.entities[table.base44Name].list();
      if (!data || data.length === 0) {
        console.log(`No data found for ${table.base44Name}. Skipping.`);
        continue;
      }
      console.log(`Found ${data.length} records. Inserting into Supabase ${table.supabaseName}...`);
      
      const allowedKeys = schemaMap[table.supabaseName] || [];
      const cleanData = data.map(item => {
        const cleanObj = {};
        for (const key of allowedKeys) {
          if (item[key] !== undefined) {
            cleanObj[key] = item[key];
          }
        }
        return cleanObj;
      });

      // Insert in batches
      const batchSize = 50;
      for (let i = 0; i < cleanData.length; i += batchSize) {
        const batch = cleanData.slice(i, i + batchSize);
        const { error } = await supabase.from(table.supabaseName).insert(batch);
        if (error) {
          console.error(`Error inserting batch into ${table.supabaseName}:`, error);
        } else {
          console.log(`Inserted batch ${i/batchSize + 1} (${batch.length} records) into ${table.supabaseName}`);
        }
      }
    } catch (err) {
      console.error(`Failed to migrate ${table.base44Name}:`, err.message || err);
    }
  }
  console.log('\nMigration complete!');
}

migrate();
