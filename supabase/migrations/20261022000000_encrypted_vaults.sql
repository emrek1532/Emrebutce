-- Uçtan uca şifreli aile kasaları (sunucu yalnızca şifreli veriyi görür)
create table if not exists public.encrypted_vaults (
  vault_id    text primary key check (char_length(vault_id) between 1 and 128),
  ciphertext  text not null,
  iv          text not null,
  salt        text not null,
  version     integer not null default 1,
  updated_at  timestamptz not null default now(),
  client_info text
);

-- Tabloya doğrudan erişim kapalı: RLS açık, hiç policy yok.
-- İstemciler yalnızca aşağıdaki iki fonksiyonu çağırabilir; böylece
-- kasa listesi çekilemez, sadece kimliği bilinen kasa okunur/yazılır.
alter table public.encrypted_vaults enable row level security;
revoke all on public.encrypted_vaults from anon, authenticated;

create or replace function public.get_vault(p_vault_id text)
returns table (
  vault_id text, ciphertext text, iv text, salt text,
  version integer, updated_at timestamptz, client_info text
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.vault_id, v.ciphertext, v.iv, v.salt, v.version, v.updated_at, v.client_info
  from public.encrypted_vaults v
  where v.vault_id = p_vault_id;
$$;

create or replace function public.upsert_vault(
  p_vault_id text,
  p_ciphertext text,
  p_iv text,
  p_salt text,
  p_version integer default 1,
  p_client_info text default null
)
returns timestamptz
language sql
security definer
set search_path = ''
as $$
  insert into public.encrypted_vaults (vault_id, ciphertext, iv, salt, version, updated_at, client_info)
  values (p_vault_id, p_ciphertext, p_iv, p_salt, coalesce(p_version, 1), now(), p_client_info)
  on conflict (vault_id) do update set
    ciphertext  = excluded.ciphertext,
    iv          = excluded.iv,
    salt        = excluded.salt,
    version     = excluded.version,
    updated_at  = excluded.updated_at,
    client_info = excluded.client_info
  returning updated_at;
$$;

revoke all on function public.get_vault(text) from public;
revoke all on function public.upsert_vault(text, text, text, text, integer, text) from public;
grant execute on function public.get_vault(text) to anon, authenticated;
grant execute on function public.upsert_vault(text, text, text, text, integer, text) to anon, authenticated;
