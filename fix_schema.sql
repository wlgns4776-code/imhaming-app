-- Fix columns to match exactly with JSON keys from Base44 (to prevent insertion errors)

ALTER TABLE active_sessions RENAME COLUMN session_id TO "sessionId";
ALTER TABLE calendar_events RENAME COLUMN start_time TO start;
ALTER TABLE calendar_events RENAME COLUMN end_time TO "end";
ALTER TABLE calendar_events RENAME COLUMN sort_order TO "order";
ALTER TABLE calendar_events RENAME COLUMN external_id TO "externalId";
ALTER TABLE calendar_memos RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE ledger_users RENAME COLUMN user_id TO "userId";
ALTER TABLE music_states RENAME COLUMN current_lyric_index TO "currentLyricIndex";
ALTER TABLE music_states RENAME COLUMN is_playing TO "isPlaying";
ALTER TABLE shop_exchange_rates RENAME COLUMN color_from TO "colorFrom";
ALTER TABLE shop_exchange_rates RENAME COLUMN color_to TO "colorTo";
ALTER TABLE shop_exchange_rates RENAME COLUMN sort_order TO "sortOrder";
ALTER TABLE songs RENAME COLUMN condition_check TO "conditionCheck";
ALTER TABLE songs RENAME COLUMN youtube_url TO "youtubeUrl";
ALTER TABLE songs RENAME COLUMN mr_url TO "mrUrl";
ALTER TABLE songs RENAME COLUMN cover_url TO "coverUrl";
