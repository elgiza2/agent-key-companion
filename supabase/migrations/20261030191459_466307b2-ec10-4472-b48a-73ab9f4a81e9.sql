delete from public.page_views where started_at < now() - interval '30 days';
delete from public.admin_error_log where created_at < now() - interval '7 days';