-- Her sabah 09:00 (Türkiye) yaklaşan ödemeler için telefon bildirimi gönderir
select cron.schedule(
  'cebim-payment-reminders',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://ssrurizfftncqgwqiijk.supabase.co/functions/v1/cebim?action=cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', (select value from public.app_secrets where name = 'cron_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
