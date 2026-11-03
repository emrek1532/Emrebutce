-- Kör üzerine yazmayı önler (upsert_vault_v3: beklenen sürüm kontrolü) ve her yazmadan önce
-- önceki sürümü vault_history'ye saklar (son 30 sürüm, dönen yuvalar). Canlıya MCP ile uygulandı.
create table if not exists public.vault_history (
  vault_id text not null,
  slot integer not null,
  ciphertext text not null,
  iv text not null,
  salt text not null,
  version integer,
  vault_updated_at timestamptz,
  client_info text,
  saved_at timestamptz not null default now(),
  primary key (vault_id, slot)
);
alter table public.vault_history enable row level security;
revoke all on public.vault_history from anon, authenticated;
alter table public.encrypted_vaults add column if not exists history_seq integer not null default 0;

create or replace function public.archive_vault_version(p_vault_id text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.vault_history (vault_id, slot, ciphertext, iv, salt, version, vault_updated_at, client_info, saved_at)
  select v.vault_id, v.history_seq % 30, v.ciphertext, v.iv, v.salt, v.version, v.updated_at, v.client_info, now()
  from public.encrypted_vaults v where v.vault_id = p_vault_id
  on conflict (vault_id, slot) do update
    set ciphertext = excluded.ciphertext, iv = excluded.iv, salt = excluded.salt, version = excluded.version,
        vault_updated_at = excluded.vault_updated_at, client_info = excluded.client_info, saved_at = excluded.saved_at;
  update public.encrypted_vaults set history_seq = history_seq + 1 where vault_id = p_vault_id;
end;
$$;
revoke all on function public.archive_vault_version(text) from public, anon, authenticated;

create or replace function public.upsert_vault_v3(
  p_vault_id text, p_ciphertext text, p_iv text, p_salt text, p_version integer, p_client_info text,
  p_write_token text, p_expected_updated_at timestamptz, p_new_write_token text default null
) returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_existing text;
  v_updated timestamptz;
  v_found boolean := false;
  v_result timestamptz;
begin
  if p_write_token is null or length(p_write_token) < 32 then
    raise exception 'write_token_required' using errcode = '42501';
  end if;
  select write_token_hash, updated_at, true into v_existing, v_updated, v_found
  from public.encrypted_vaults where vault_id = p_vault_id for update;
  if v_found and v_existing is not null
     and v_existing <> encode(pg_catalog.sha256(convert_to(p_write_token, 'UTF8')), 'hex') then
    raise exception 'write_token_mismatch' using errcode = '42501';
  end if;
  if v_found and (p_expected_updated_at is null or date_trunc('milliseconds', v_updated) <> date_trunc('milliseconds', p_expected_updated_at)) then
    raise exception 'vault_conflict' using errcode = '40001';
  end if;
  if v_found then
    perform public.archive_vault_version(p_vault_id);
  end if;
  insert into public.encrypted_vaults (vault_id, ciphertext, iv, salt, version, updated_at, client_info, write_token_hash)
  values (p_vault_id, p_ciphertext, p_iv, p_salt, coalesce(p_version, 1), now(), p_client_info,
    encode(pg_catalog.sha256(convert_to(coalesce(p_new_write_token, p_write_token), 'UTF8')), 'hex'))
  on conflict (vault_id) do update set
    ciphertext = excluded.ciphertext, iv = excluded.iv, salt = excluded.salt, version = excluded.version,
    updated_at = excluded.updated_at, client_info = excluded.client_info, write_token_hash = excluded.write_token_hash
  returning updated_at into v_result;
  return v_result;
end;
$$;
revoke all on function public.upsert_vault_v3(text, text, text, text, integer, text, text, timestamptz, text) from public;
grant execute on function public.upsert_vault_v3(text, text, text, text, integer, text, text, timestamptz, text) to anon, authenticated;

-- upsert_vault_v2 (eski uygulama sürümleri) da yazmadan önce archive_vault_version çağırır (canlıda güncellendi).

create or replace function public.list_vault_history(p_vault_id text)
returns table (slot integer, vault_updated_at timestamptz, client_info text, saved_at timestamptz)
language sql security definer set search_path = ''
as $$
  select h.slot, h.vault_updated_at, h.client_info, h.saved_at from public.vault_history h
  where h.vault_id = p_vault_id order by h.vault_updated_at desc;
$$;
create or replace function public.get_vault_history(p_vault_id text, p_slot integer)
returns table (ciphertext text, iv text, salt text, version integer, vault_updated_at timestamptz)
language sql security definer set search_path = ''
as $$
  select h.ciphertext, h.iv, h.salt, h.version, h.vault_updated_at from public.vault_history h
  where h.vault_id = p_vault_id and h.slot = p_slot;
$$;
revoke all on function public.list_vault_history(text) from public;
revoke all on function public.get_vault_history(text, integer) from public;
grant execute on function public.list_vault_history(text) to anon, authenticated;
grant execute on function public.get_vault_history(text, integer) to anon, authenticated;
