create policy "No public access to Despar import runs"
  on public.despar_price_scrape_runs
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "No public access to Despar price history"
  on public.despar_price_observations
  for all
  to anon, authenticated
  using (false)
  with check (false);

create index despar_price_observations_run_id_idx
  on public.despar_price_observations (run_id);

comment on policy "No public access to Despar import runs"
  on public.despar_price_scrape_runs is
  'Explicit deny policy: only the service role may access operational job data.';
comment on policy "No public access to Despar price history"
  on public.despar_price_observations is
  'Explicit deny policy: only the service role may access the private price history.';
