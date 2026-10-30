DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
         '_settle_usage_turn','claim_stale_background_jobs','claim_team_agent',
         'cleanup_high_volume_tables','cleanup_old_research_reports','cleanup_rate_limits',
         'sweep_open_usage_turns','grant_welcome_credits','telegram_admin_add_task',
         'telegram_admin_add_task_session','telegram_admin_is_verified','telegram_admin_list_tasks',
         'telegram_admin_verify','claim_telegram_referral','expire_lapsed_subscriptions')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;