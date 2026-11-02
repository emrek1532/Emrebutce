create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Sunucuda tutulan gizli değerler (VAPID anahtarları, zamanlayıcı anahtarı). Sadece servis rolü okur.
create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

insert into public.app_secrets (name, value)
values ('cron_key', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (name) do nothing;

-- Telefon bildirim abonelikleri + o cihazın hatırlatılacak ödemeleri (ad, tutar, gün).
-- Diğer tüm bütçe verileri şifreli kasada kalır.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  vault_hash text not null,
  reminders jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  last_sent_on date,
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

create or replace function public.save_push_reminders(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_vault_hash text,
  p_reminders jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then
    raise exception 'invalid endpoint';
  end if;
  if length(coalesce(p_p256dh, '')) > 200 or length(coalesce(p_auth, '')) > 100 or length(coalesce(p_vault_hash, '')) > 100 then
    raise exception 'invalid keys';
  end if;
  if jsonb_typeof(p_reminders) <> 'array' or jsonb_array_length(p_reminders) > 100 or length(p_reminders::text) > 20000 then
    raise exception 'invalid reminders';
  end if;
  insert into public.push_subscriptions (endpoint, p256dh, auth, vault_hash, reminders, active, updated_at)
  values (p_endpoint, p_p256dh, p_auth, p_vault_hash, p_reminders, true, now())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        vault_hash = excluded.vault_hash,
        reminders = excluded.reminders,
        active = true,
        updated_at = now();
end;
$$;

create or replace function public.disable_push_subscription(p_endpoint text) returns void
language sql
security definer
set search_path = public
as $$
  update public.push_subscriptions set active = false, updated_at = now() where endpoint = p_endpoint;
$$;

revoke all on function public.save_push_reminders(text, text, text, text, jsonb) from public;
revoke all on function public.disable_push_subscription(text) from public;
grant execute on function public.save_push_reminders(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.disable_push_subscription(text) to anon, authenticated;
