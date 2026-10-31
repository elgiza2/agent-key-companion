CREATE OR REPLACE FUNCTION public.is_subscribed_by_email(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM auth.users AS u
      JOIN public.subscriptions AS s ON s.user_id = u.id
     WHERE lower(u.email) = lower(btrim(coalesce(p_email, '')))
       AND lower(btrim(coalesce(s.plan, ''))) NOT IN ('', 'free')
       AND lower(btrim(coalesce(s.status, ''))) IN ('active', 'trialing', 'past_due')
       AND (
         s.current_period_end IS NULL
         OR s.current_period_end >= now() - interval '3 days'
       )
  );
$$;

REVOKE ALL ON FUNCTION public.is_subscribed_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscribed_by_email(text) TO service_role;
