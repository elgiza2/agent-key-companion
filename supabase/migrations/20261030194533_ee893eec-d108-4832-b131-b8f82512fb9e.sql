CREATE OR REPLACE FUNCTION public.expire_lapsed_subscriptions(_grace interval DEFAULT interval '3 days')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH lapsed AS (
    UPDATE public.subscriptions s
       SET status = 'cancelled', updated_at = now()
     WHERE s.status IN ('active','trialing','past_due')
       AND s.current_period_end IS NOT NULL
       AND s.current_period_end < now() - _grace
    RETURNING s.user_id
  )
  UPDATE public.profiles p
     SET plan = 'free', updated_at = now()
   WHERE p.id IN (SELECT user_id FROM lapsed)
     AND NOT EXISTS (
       SELECT 1 FROM public.subscriptions o
        WHERE o.user_id = p.id AND o.status IN ('active','trialing')
          AND (o.current_period_end IS NULL OR o.current_period_end >= now())
     );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_lapsed_subscriptions(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_lapsed_subscriptions(interval) TO service_role;

SELECT public.expire_lapsed_subscriptions();

SELECT cron.schedule('expire-lapsed-subscriptions', '40 5 * * *', $$select public.expire_lapsed_subscriptions();$$);