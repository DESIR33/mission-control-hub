DROP POLICY "Service role can insert extraction logs" ON public.conversation_extraction_log;

CREATE POLICY "Service role can insert extraction logs"
  ON public.conversation_extraction_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);