-- Yazma koruması: kasaya yalnızca anahtardan türetilen yazma belirtecini bilen cihaz yazabilir.
-- Sunucu belirtecin kendisini değil SHA-256 özetini saklar; şifreleme anahtarını hiç görmez.
-- İlk belirteçli yazma özeti kaydeder; anahtar değiştirilirken p_new_write_token ile devredilir.
alter table public.encrypted_vaults add column if not exists write_token_hash text;

create or replace function public.upsert_vault_v2(
  p_vault_id text,
  p_ciphertext text,
  p_iv text,
  p_salt text,
  p_version integer,
  p_client_info text,
  p_write_token text,
  p_new_write_token text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing text;
  v_found boolean;
  v_result timestamptz;
begin
  if p_write_token is null or length(p_write_token) < 32 then
    raise exception 'write_token_required' using errcode = '42501';
  end if;

  select write_token_hash, true into v_existing, v_found
  from public.encrypted_vaults where vault_id = p_vault_id for update;

  if v_found and v_existing is not null
     and v_existing <> encode(pg_catalog.sha256(convert_to(p_write_token, 'UTF8')), 'hex') then
    raise exception 'write_token_mismatch' using errcode = '42501';
  end if;

  insert into public.encrypted_vaults (vault_id, ciphertext, iv, salt, version, updated_at, client_info, write_token_hash)
  values (
    p_vault_id, p_ciphertext, p_iv, p_salt, coalesce(p_version, 1), now(), p_client_info,
    encode(pg_catalog.sha256(convert_to(coalesce(p_new_write_token, p_write_token), 'UTF8')), 'hex')
  )
  on conflict (vault_id) do update set
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    salt = excluded.salt,
    version = excluded.version,
    updated_at = excluded.updated_at,
    client_info = excluded.client_info,
    write_token_hash = excluded.write_token_hash
  returning updated_at into v_result;

  return v_result;
end;
$$;

-- Eski (belirteçsiz) yazma: korumalı kasalara artık yazamaz
create or replace function public.upsert_vault(
  p_vault_id text,
  p_ciphertext text,
  p_iv text,
  p_salt text,
  p_version integer default 1,
  p_client_info text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result timestamptz;
begin
  if exists (select 1 from public.encrypted_vaults where vault_id = p_vault_id and write_token_hash is not null) then
    raise exception 'write_token_required' using errcode = '42501';
  end if;
  insert into public.encrypted_vaults (vault_id, ciphertext, iv, salt, version, updated_at, client_info)
  values (p_vault_id, p_ciphertext, p_iv, p_salt, coalesce(p_version, 1), now(), p_client_info)
  on conflict (vault_id) do update set
    ciphertext = excluded.ciphertext, iv = excluded.iv, salt = excluded.salt,
    version = excluded.version, updated_at = excluded.updated_at, client_info = excluded.client_info
  returning updated_at into v_result;
  return v_result;
end;
$$;

revoke all on function public.upsert_vault_v2(text, text, text, text, integer, text, text, text) from public;
grant execute on function public.upsert_vault_v2(text, text, text, text, integer, text, text, text) to anon, authenticated;
revoke all on function public.upsert_vault(text, text, text, text, integer, text) from public;
grant execute on function public.upsert_vault(text, text, text, text, integer, text) to anon, authenticated;
