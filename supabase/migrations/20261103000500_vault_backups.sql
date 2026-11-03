-- Otomatik şifreli yedek: her gece kasanın şifreli kopyası alınır.
-- Haftanın her günü için bir yuva (D1..D7, son 7 gün) + her ayın 1'inde aylık yuva (M1..M12).
-- Yuvalar üzerine yazıldığı için eski yedekleri silmeye gerek kalmaz.
create table if not exists public.vault_backups (
  vault_id text not null,
  slot text not null,
  ciphertext text not null,
  iv text not null,
  salt text not null,
  version integer,
  vault_updated_at timestamptz,
  backed_up_at timestamptz not null default now(),
  primary key (vault_id, slot)
);
alter table public.vault_backups enable row level security;
revoke all on public.vault_backups from anon, authenticated;

create or replace function public.backup_vaults() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  tr_now timestamp := now() at time zone 'Europe/Istanbul';
begin
  insert into public.vault_backups (vault_id, slot, ciphertext, iv, salt, version, vault_updated_at, backed_up_at)
  select v.vault_id, 'D' || extract(isodow from tr_now)::int, v.ciphertext, v.iv, v.salt, v.version, v.updated_at, now()
  from public.encrypted_vaults v
  on conflict (vault_id, slot) do update
    set ciphertext = excluded.ciphertext, iv = excluded.iv, salt = excluded.salt, version = excluded.version,
        vault_updated_at = excluded.vault_updated_at, backed_up_at = excluded.backed_up_at;
  get diagnostics n = row_count;

  if extract(day from tr_now) = 1 then
    insert into public.vault_backups (vault_id, slot, ciphertext, iv, salt, version, vault_updated_at, backed_up_at)
    select v.vault_id, 'M' || extract(month from tr_now)::int, v.ciphertext, v.iv, v.salt, v.version, v.updated_at, now()
    from public.encrypted_vaults v
    on conflict (vault_id, slot) do update
      set ciphertext = excluded.ciphertext, iv = excluded.iv, salt = excluded.salt, version = excluded.version,
          vault_updated_at = excluded.vault_updated_at, backed_up_at = excluded.backed_up_at;
  end if;
  return n;
end;
$$;
revoke all on function public.backup_vaults() from public, anon, authenticated;

create or replace function public.list_vault_backups(p_vault_id text)
returns table (slot text, vault_updated_at timestamptz, backed_up_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select b.slot, b.vault_updated_at, b.backed_up_at
  from public.vault_backups b
  where b.vault_id = p_vault_id
  order by b.vault_updated_at desc nulls last;
$$;

create or replace function public.get_vault_backup(p_vault_id text, p_slot text)
returns table (ciphertext text, iv text, salt text, version integer, vault_updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select b.ciphertext, b.iv, b.salt, b.version, b.vault_updated_at
  from public.vault_backups b
  where b.vault_id = p_vault_id and b.slot = p_slot;
$$;

revoke all on function public.list_vault_backups(text) from public;
revoke all on function public.get_vault_backup(text, text) from public;
grant execute on function public.list_vault_backups(text) to anon, authenticated;
grant execute on function public.get_vault_backup(text, text) to anon, authenticated;

-- Her gece 03:30 (Türkiye)
select cron.schedule('cebim-vault-backup', '30 0 * * *', $$ select public.backup_vaults(); $$);

select public.backup_vaults();
