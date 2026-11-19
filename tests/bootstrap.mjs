import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

// Svako pokretanje koristi praznu bazu u memoriji. Ovi objekti modeluju samo
// Supabase-ove SQL ugovore; Auth HTTP, Storage HTTP i Realtime nisu pokriveni.
export async function initialize(sqlPath) {
  const db = new PGlite({ extensions: { pgcrypto, btree_gist, pg_trgm } });
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema storage;
    create schema extensions;
    create publication supabase_realtime;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid;
    $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
    $$;
    create function auth.role() returns text language sql stable as $$
      select current_setting('request.jwt.claim.role', true);
    $$;
    create table storage.buckets (id text primary key, name text not null, owner uuid, public boolean default false, allowed_mime_types text[], file_size_limit bigint);
    create table storage.objects (id uuid primary key default gen_random_uuid(), name text not null, bucket_id text references storage.buckets(id), owner uuid, owner_id text, metadata jsonb, created_at timestamptz default now(), unique(bucket_id,name));
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1];
    $$;
    create function storage.extension(name text) returns text language sql immutable as $$
      select substring(name from '[.]([^./]+)$');
    $$;
    grant usage on schema auth, storage, public to anon, authenticated, service_role;
    grant all on storage.objects to anon, authenticated, service_role;
    grant select on storage.buckets to anon, authenticated, service_role;
    alter default privileges in schema public grant select,insert,update,delete on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant usage,select on sequences to anon, authenticated, service_role;
  `);
  const sql = await fs.readFile(sqlPath,'utf8');
  const hash = createHash('sha256').update(sql).digest('hex');
  await db.exec(sql);
  if (process.argv[3]) {
    const upgrade = await fs.readFile(process.argv[3], 'utf8');
    await db.exec(upgrade);
    console.log('Non-destructive upgrade applied:',createHash('sha256').update(upgrade).digest('hex'));
  }
  console.log('Schema applied:',hash);
  return db;
}

export async function role(db, uid, role = uid ? 'authenticated' : 'anon') {
  if (!['anon','authenticated','postgres'].includes(role)) throw new Error('Invalid test role');
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false),set_config('request.jwt.claims',$3,false)",[uid||'',role,JSON.stringify({sub:uid,role})]);
  await db.exec('set role '+role);
}
