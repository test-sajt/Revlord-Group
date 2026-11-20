-- RevLord Group: additive migration. Existing accounts, listings, messages and media stay untouched.
-- Apply AFTER the two 20261119 migrations. No data is deleted.
begin;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(trim(body)) between 5 and 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rg_review_exactly_one_target check (num_nonnulls(listing_id, profile_id) = 1)
);
create unique index if not exists rg_review_one_per_listing on public.reviews(listing_id, reviewer_id) where listing_id is not null;
create unique index if not exists rg_review_one_per_profile on public.reviews(profile_id, reviewer_id) where profile_id is not null;
create index if not exists rg_review_listing_recent on public.reviews(listing_id,created_at desc) where listing_id is not null;
create index if not exists rg_review_profile_recent on public.reviews(profile_id,created_at desc) where profile_id is not null;

alter table public.reviews enable row level security;
revoke all on public.reviews from anon,authenticated,public;
grant select on public.reviews to anon,authenticated;
create policy rg_public_review_read on public.reviews for select to anon, authenticated using (
 (listing_id is not null and exists(select 1 from public.listings l where l.id=listing_id and l.status <> 'draft'))
 or (profile_id is not null and exists(select 1 from public.profiles p where p.id=profile_id))
);
-- No client-side INSERT/UPDATE grant: all changes must pass save_review() checks below.

create or replace function public.save_review(target_listing uuid, target_profile uuid, stars integer, note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare author uuid := auth.uid(); target_owner uuid; existing uuid; last_edit timestamptz; clean_note text := trim(coalesce(note,''));
begin
  if author is null then raise exception 'LOGIN_REQUIRED'; end if;
  if num_nonnulls(target_listing,target_profile) <> 1 or stars not between 1 and 5 or char_length(clean_note) not between 5 and 1200 then
    raise exception 'INVALID_REVIEW';
  end if;
  if target_listing is not null then
    select l.owner_id into target_owner from public.listings l where l.id=target_listing and l.status <> 'draft';
    select r.id,r.updated_at into existing,last_edit from public.reviews r where r.listing_id=target_listing and r.reviewer_id=author for update;
  else
    select p.id into target_owner from public.profiles p where p.id=target_profile;
    select r.id,r.updated_at into existing,last_edit from public.reviews r where r.profile_id=target_profile and r.reviewer_id=author for update;
  end if;
  if target_owner is null then raise exception 'REVIEW_TARGET_UNAVAILABLE'; end if;
  if target_owner=author then raise exception 'OWN_REVIEW_FORBIDDEN'; end if;
  if existing is not null and last_edit > clock_timestamp()-interval '15 seconds' then raise exception 'REVIEW_SLOW_DOWN'; end if;
  if target_listing is not null then
    insert into public.reviews(reviewer_id,listing_id,rating,body)
    values(author,target_listing,stars,clean_note)
    on conflict (listing_id,reviewer_id) where listing_id is not null
    do update set rating=excluded.rating, body=excluded.body, updated_at=clock_timestamp()
    returning id into existing;
  else
    insert into public.reviews(reviewer_id,profile_id,rating,body)
    values(author,target_profile,stars,clean_note)
    on conflict (profile_id,reviewer_id) where profile_id is not null
    do update set rating=excluded.rating, body=excluded.body, updated_at=clock_timestamp()
    returning id into existing;
  end if;
  return existing;
end $$;
revoke all on function public.save_review(uuid,uuid,integer,text) from public,anon;
grant execute on function public.save_review(uuid,uuid,integer,text) to authenticated;

create or replace view public.listing_review_stats with (security_invoker=true) as
 select listing_id, count(*)::integer as review_count, round(avg(rating)::numeric,1) as rating_avg,
 round((count(*)::numeric/(count(*)+5))*avg(rating) + (5::numeric/(count(*)+5))*3.5,4) as rank_score
 from public.reviews where listing_id is not null group by listing_id;
create or replace view public.profile_review_stats with (security_invoker=true) as
 select profile_id, count(*)::integer as review_count, round(avg(rating)::numeric,1) as rating_avg
 from public.reviews where profile_id is not null group by profile_id;
grant select on public.listing_review_stats,public.profile_review_stats to anon,authenticated;

-- Browser push endpoints are secrets: owners can see only their own subscriptions.
create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check (char_length(endpoint) between 32 and 2048 and endpoint like 'https://%'),
 p256dh text not null check (char_length(p256dh) between 20 and 512),
 auth_key text not null check (char_length(auth_key) between 8 and 512),
 created_at timestamptz not null default now()
);
create index if not exists rg_push_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon,authenticated,public;
grant select,insert,delete on public.push_subscriptions to authenticated;
create policy rg_push_own_select on public.push_subscriptions for select to authenticated using(user_id=auth.uid());
create policy rg_push_own_insert on public.push_subscriptions for insert to authenticated with check(user_id=auth.uid());
create policy rg_push_own_delete on public.push_subscriptions for delete to authenticated using(user_id=auth.uid());

-- A notification coalesces multiple rapid messages in the same conversation.
create table if not exists public.push_delivery_log (
 recipient uuid not null references auth.users(id) on delete cascade,
 thread_id uuid not null references public.threads(id) on delete cascade,
 last_sent timestamptz not null default now(),
 primary key (recipient,thread_id)
);
alter table public.push_delivery_log enable row level security;
revoke all on public.push_delivery_log from anon,authenticated,public;

commit;
