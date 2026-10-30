ALTER VIEW public.v_revenue_daily SET (security_invoker = true);
ALTER VIEW public.v_traffic_human_daily SET (security_invoker = true);
REVOKE ALL ON public.v_revenue_daily FROM anon, authenticated;
REVOKE ALL ON public.v_traffic_human_daily FROM anon, authenticated;
GRANT SELECT ON public.v_revenue_daily TO service_role;
GRANT SELECT ON public.v_traffic_human_daily TO service_role;
DELETE FROM public.telegram_media_files WHERE source_key = 'selftest:1';