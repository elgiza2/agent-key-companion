CREATE TABLE public.telegram_media_files (
  source_key text PRIMARY KEY,
  file_id text NOT NULL,
  file_path text,
  file_path_at timestamptz,
  mime text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.telegram_media_files TO service_role;
ALTER TABLE public.telegram_media_files ENABLE ROW LEVEL SECURITY;