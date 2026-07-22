create policy "Public cannot access MD scrape runs"
  on public.md_price_scrape_runs
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Public cannot access MD price history"
  on public.md_price_observations
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Public cannot access runtime secrets"
  on private.runtime_secrets
  for all
  to anon, authenticated
  using (false)
  with check (false);

create index md_price_observations_run_id_idx
  on public.md_price_observations (run_id);
