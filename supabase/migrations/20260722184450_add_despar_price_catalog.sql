create table public.despar_price_scrape_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  source_url text not null,
  source_area text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'skipped', 'error')),
  products_found integer not null default 0 check (products_found >= 0),
  products_saved integer not null default 0 check (products_saved >= 0),
  products_mapped integer not null default 0 check (products_mapped >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.despar_products (
  id bigint generated always as identity primary key,
  external_id text not null unique,
  catalog_id text not null,
  name text not null,
  brand text,
  category text,
  package_quantity numeric(12, 3) not null check (package_quantity > 0),
  package_unit text not null check (package_unit in ('g', 'ml', 'pz')),
  price numeric(12, 2) not null check (price > 0),
  regular_price numeric(12, 2) check (regular_price is null or regular_price > 0),
  reference_price numeric(12, 2) check (reference_price is null or reference_price > 0),
  reference_unit text check (reference_unit in ('kg', 'l', 'pz')),
  is_promotion boolean not null default false,
  valid_from date,
  valid_to date,
  captured_at timestamptz not null default now(),
  source_url text not null,
  source_label text not null,
  source_area text not null,
  active boolean not null default true,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table public.despar_price_observations (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.despar_products(id) on delete cascade,
  run_id uuid not null references public.despar_price_scrape_runs(id) on delete cascade,
  price numeric(12, 2) not null check (price > 0),
  regular_price numeric(12, 2) check (regular_price is null or regular_price > 0),
  captured_at timestamptz not null default now(),
  unique (product_id, run_id)
);

alter table public.despar_price_scrape_runs enable row level security;
alter table public.despar_products enable row level security;
alter table public.despar_price_observations enable row level security;

create index despar_products_catalog_active_idx
  on public.despar_products (catalog_id, reference_price)
  where active;
create index despar_products_captured_active_idx
  on public.despar_products (captured_at desc)
  where active;
create index despar_price_observations_product_captured_idx
  on public.despar_price_observations (product_id, captured_at desc);
create index despar_price_scrape_runs_started_idx
  on public.despar_price_scrape_runs (started_at desc);

revoke all on table public.despar_price_scrape_runs from public, anon, authenticated;
revoke all on table public.despar_products from public, anon, authenticated;
revoke all on table public.despar_price_observations from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

grant select on table public.despar_products to anon, authenticated;
grant all on table public.despar_price_scrape_runs to service_role;
grant all on table public.despar_products to service_role;
grant all on table public.despar_price_observations to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy "Public can read active Despar prices"
  on public.despar_products
  for select
  to anon, authenticated
  using (active);

create or replace function public.verify_fudit_despar_cron_token(token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.runtime_secrets
    where name = 'fudit_despar_cron_token'
      and value_hash = extensions.digest(token, 'sha256')
  );
$$;

revoke all on function public.verify_fudit_despar_cron_token(text)
  from public, anon, authenticated;
grant execute on function public.verify_fudit_despar_cron_token(text)
  to service_role;

do $$
declare
  generated_token text;
begin
  if not exists (
    select 1 from private.runtime_secrets
    where name = 'fudit_despar_cron_token'
  ) then
    generated_token := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(
      generated_token,
      'fudit_despar_cron_token',
      'Token for the weekly Fudit Despar Centro Sud price import'
    );
    insert into private.runtime_secrets (name, value_hash)
    values (
      'fudit_despar_cron_token',
      extensions.digest(generated_token, 'sha256')
    );
  end if;
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'fudit_despar_prices_weekly';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'fudit_despar_prices_weekly',
  '30 4 * * 2',
  $scheduled$
    select net.http_post(
      url := 'https://oaazqgfeawpwkgmcykgg.supabase.co/functions/v1/despar-price-scraper',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-fudit-cron-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'fudit_despar_cron_token'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $scheduled$
);

comment on table public.despar_products is
  'Latest prices imported weekly from the official Despar a Casa catalog for Corato, Puglia.';
comment on table public.despar_price_observations is
  'Append-only history of prices observed during Despar Centro Sud imports.';
comment on function public.verify_fudit_despar_cron_token(text) is
  'Validates the private token used by the scheduled Despar import.';
