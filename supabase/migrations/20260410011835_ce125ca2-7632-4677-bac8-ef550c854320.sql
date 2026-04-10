
CREATE UNIQUE INDEX idx_api_key_usage_unique_window 
  ON public.api_key_usage_log (api_key_id, endpoint, window_start);
