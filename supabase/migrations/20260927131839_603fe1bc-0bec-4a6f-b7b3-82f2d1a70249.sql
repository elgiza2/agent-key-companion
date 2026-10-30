INSERT INTO public.provider_api_keys (provider, api_key, status)
SELECT 'wavespeed', 'wsk_live_vsvIiw1UaHy4-WVcZRRnn2YS-NUPkBUJi9zVpIehf0I', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.provider_api_keys WHERE api_key = 'wsk_live_vsvIiw1UaHy4-WVcZRRnn2YS-NUPkBUJi9zVpIehf0I');