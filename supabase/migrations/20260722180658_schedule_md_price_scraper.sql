create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'fudit_md_prices_weekly';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'fudit_md_prices_weekly',
  '0 4 * * 2',
  $$
    select net.http_post(
      url := 'https://oaazqgfeawpwkgmcykgg.supabase.co/functions/v1/md-price-scraper',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-fudit-cron-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'fudit_md_cron_token'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $$
);

comment on extension pg_cron is
  'Runs the Fudit MD price import every Tuesday at 04:00 UTC.';
