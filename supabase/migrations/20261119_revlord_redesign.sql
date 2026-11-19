-- RevLord Group: optional, non-destructive per-user chat removal.
-- Run ONCE in Supabase SQL Editor after 20261119_revlord_upgrade.sql.
-- Does not delete messages, threads, listings or users.
BEGIN;

CREATE TABLE IF NOT EXISTS public.chat_hides (
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (thread_id, user_id)
);
ALTER TABLE public.chat_hides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_hides FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_chat_for_me(thread uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = thread AND auth.uid() IN (t.owner_id, t.peer_id)
  ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  INSERT INTO public.chat_hides(thread_id, user_id, hidden_at)
  VALUES (thread, auth.uid(), clock_timestamp())
  ON CONFLICT(thread_id, user_id)
  DO UPDATE SET hidden_at = EXCLUDED.hidden_at;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_chat_for_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_chat_for_me(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chat_history(thread uuid)
RETURNS SETOF public.messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = thread AND auth.uid() IN (t.owner_id, t.peer_id)
  ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
    SELECT m.* FROM public.messages m
    WHERE m.thread_id=thread AND m.created_at > COALESCE(
      (SELECT h.hidden_at FROM public.chat_hides h WHERE h.thread_id=thread AND h.user_id=auth.uid()),
      '-infinity'::timestamptz
    )
    ORDER BY m.created_at, m.id;
END;
$$;
REVOKE ALL ON FUNCTION public.chat_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_history(uuid) TO authenticated;

-- Preserve the existing RPC signature used by the envelope.
-- A hidden chat reappears automatically when it receives a new message.
CREATE OR REPLACE FUNCTION public.inbox_overview()
RETURNS TABLE(thread_id uuid, listing_id uuid, peer_name text, listing_title text, last_body text, last_at timestamptz, unread bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
    SELECT t.id,t.listing_id,coalesce(nullif(p.name,''),'Korisnik'),l.title,
    lm.body,lm.created_at,
    (SELECT count(*) FROM public.messages m
      WHERE m.thread_id=t.id AND m.sender<>auth.uid()
      AND m.created_at>GREATEST(
        COALESCE(CASE WHEN auth.uid()=t.owner_id THEN t.owner_last_read_at ELSE t.peer_last_read_at END,'-infinity'::timestamptz),
        COALESCE(h.hidden_at,'-infinity'::timestamptz)
      ))::bigint
    FROM public.threads t
    JOIN public.listings l ON l.id=t.listing_id
    JOIN public.profiles p ON p.id=(CASE WHEN t.owner_id=auth.uid() THEN t.peer_id ELSE t.owner_id END)
    LEFT JOIN public.chat_hides h ON h.thread_id=t.id AND h.user_id=auth.uid()
    LEFT JOIN LATERAL (
      SELECT m.body,m.created_at FROM public.messages m
      WHERE m.thread_id=t.id AND m.created_at>COALESCE(h.hidden_at,'-infinity'::timestamptz)
      ORDER BY m.created_at DESC,m.id DESC LIMIT 1
    ) lm ON TRUE
    WHERE auth.uid() IN(t.owner_id,t.peer_id) AND (h.thread_id IS NULL OR lm.created_at IS NOT NULL)
    ORDER BY lm.created_at DESC NULLS LAST,t.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.inbox_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.inbox_overview() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
