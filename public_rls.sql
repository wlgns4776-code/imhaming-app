-- Enable RLS and add public access policies so the frontend and migration script can read/write data

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t_name);
        
        -- Drop policy if exists to avoid error
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Public access" ON %I;', t_name);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        
        EXECUTE format('CREATE POLICY "Public access" ON %I FOR ALL USING (true) WITH CHECK (true);', t_name);
    END LOOP;
END
$$;
