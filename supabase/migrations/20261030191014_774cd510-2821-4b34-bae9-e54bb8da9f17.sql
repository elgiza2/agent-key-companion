drop policy if exists golden_read_auth on public.agent_golden_dataset;
create policy golden_read_admin on public.agent_golden_dataset for select to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Authenticated read sync runs" on public.i18n_sync_runs;
create policy "Admins read sync runs" on public.i18n_sync_runs for select to authenticated using (public.has_role(auth.uid(), 'admin'));