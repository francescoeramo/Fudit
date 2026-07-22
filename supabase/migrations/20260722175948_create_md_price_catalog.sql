create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault with schema vault;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.md_price_scrape_runs (
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

create table public.md_products (
  id bigint generated always as identity primary key,
  external_id text not null unique,
  catalog_id text,
  name text not null,
  brand text,
  category text,
  package_quantity numeric(12, 3),
  package_unit text check (package_unit in ('g', 'ml', 'pz')),
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

create table public.md_price_observations (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.md_products(id) on delete cascade,
  run_id uuid not null references public.md_price_scrape_runs(id) on delete cascade,
  price numeric(12, 2) not null check (price > 0),
  regular_price numeric(12, 2) check (regular_price is null or regular_price > 0),
  captured_at timestamptz not null default now(),
  valid_from date,
  valid_to date,
  unique (product_id, run_id)
);

create table private.runtime_secrets (
  name text primary key,
  value_hash bytea not null,
  created_at timestamptz not null default now()
);

alter table public.md_price_scrape_runs enable row level security;
alter table public.md_products enable row level security;
alter table public.md_price_observations enable row level security;
alter table private.runtime_secrets enable row level security;

create index md_products_catalog_id_idx
  on public.md_products (catalog_id)
  where catalog_id is not null and active;
create index md_products_validity_idx
  on public.md_products (valid_to, active);
create index md_price_observations_product_captured_idx
  on public.md_price_observations (product_id, captured_at desc);
create index md_price_scrape_runs_started_idx
  on public.md_price_scrape_runs (started_at desc);

revoke all on table public.md_price_scrape_runs from public, anon, authenticated;
revoke all on table public.md_products from public, anon, authenticated;
revoke all on table public.md_price_observations from public, anon, authenticated;
revoke all on table private.runtime_secrets from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant select on table public.md_products to anon, authenticated;
grant all on table public.md_price_scrape_runs to service_role;
grant all on table public.md_products to service_role;
grant all on table public.md_price_observations to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy "Public can read active MD prices"
  on public.md_products
  for select
  to anon, authenticated
  using (active);

create or replace function public.verify_fudit_md_cron_token(token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.runtime_secrets
    where name = 'fudit_md_cron_token'
      and value_hash = extensions.digest(token, 'sha256')
  );
$$;

revoke all on function public.verify_fudit_md_cron_token(text)
  from public, anon, authenticated;
grant execute on function public.verify_fudit_md_cron_token(text)
  to service_role;

do $$
declare
  generated_token text;
begin
  if not exists (
    select 1 from private.runtime_secrets where name = 'fudit_md_cron_token'
  ) then
    generated_token := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(
      generated_token,
      'fudit_md_cron_token',
      'Token for the weekly Fudit MD price import'
    );
    insert into private.runtime_secrets (name, value_hash)
    values (
      'fudit_md_cron_token',
      extensions.digest(generated_token, 'sha256')
    );
  end if;
end;
$$;

comment on table public.md_products is
  'Latest prices imported weekly from the official MD promotional flyer.';
comment on table public.md_price_observations is
  'Append-only history of prices observed during MD flyer imports.';
comment on function public.verify_fudit_md_cron_token(text) is
  'Validates the private token used by the scheduled MD import.';
