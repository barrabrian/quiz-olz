CREATE TABLE public.quiz_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event TEXT NOT NULL,
  step TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX quiz_events_created_at_idx ON public.quiz_events (created_at DESC);
CREATE INDEX quiz_events_session_idx ON public.quiz_events (session_id);
CREATE INDEX quiz_events_event_idx ON public.quiz_events (event);

GRANT INSERT ON public.quiz_events TO anon, authenticated;
GRANT ALL ON public.quiz_events TO service_role;

ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record quiz events"
ON public.quiz_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);