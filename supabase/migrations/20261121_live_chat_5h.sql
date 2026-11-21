-- ADDITIVE MIGRATION: live chat only. Private messages, accounts and listings stay unchanged.
-- Run this ONCE in the Supabase SQL Editor on the existing project.
-- To delete even when no one is on the website, enable pg_cron (Database > Extensions)
-- BEFORE running this file. The UI and database reads enforce five-hour expiry regardless.
BEGIN;

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS rg_live_chat_recent ON public.live_chat_messages(created_at DESC,id DESC);
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_chat_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.live_chat_messages TO authenticated;
-- The timestamp and message ID are set by Postgres, never by the browser.
GRANT INSERT(sender,body) ON public.live_chat_messages TO authenticated;
DROP POLICY IF EXISTS rg_live_chat_read ON public.live_chat_messages;
CREATE POLICY rg_live_chat_read ON public.live_chat_messages FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND created_at > now() - interval '5 hours');
DROP POLICY IF EXISTS rg_live_chat_send ON public.live_chat_messages;
CREATE POLICY rg_live_chat_send ON public.live_chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender = auth.uid());

-- Authenticated room listing: older messages are physically removed whenever anyone refreshes chat.
-- In addition, the five-hour cutoff is enforced on the SELECT policy itself.
CREATE OR REPLACE FUNCTION public.live_chat_history()
RETURNS TABLE(id uuid, sender uuid, sender_name text, body text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  DELETE FROM public.live_chat_messages
  WHERE public.live_chat_messages.created_at <= clock_timestamp() - interval '5 hours';
  RETURN QUERY SELECT recent.id, recent.sender,
    coalesce(nullif(p.name, ''), 'Korisnik')::text, recent.body, recent.created_at
  FROM (
    SELECT m.id, m.sender, m.body, m.created_at
    FROM public.live_chat_messages m
    WHERE m.created_at > clock_timestamp() - interval '5 hours'
    ORDER BY m.created_at DESC,m.id DESC LIMIT 150
  ) AS recent
  JOIN public.profiles p ON p.id=recent.sender
  ORDER BY recent.created_at, recent.id;
END;
$$;
REVOKE ALL ON FUNCTION public.live_chat_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.live_chat_history() TO authenticated;

-- Deliver new shared-room messages to signed-in clients via Supabase Realtime.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='live_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
  END IF;
END $$;

-- If pg_cron is enabled, schedule server-side deletion every minute, even with no visitors.
-- If it is not enabled yet, the SQL installation still succeeds; re-run this migration
-- after enabling pg_cron to activate the schedule.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='cron') THEN
    PERFORM cron.schedule('rg-live-chat-five-hour-cleanup', '* * * * *',
      'DELETE FROM public.live_chat_messages WHERE created_at <= now() - interval ''5 hours''');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
