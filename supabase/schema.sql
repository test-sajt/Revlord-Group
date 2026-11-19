-- Jednom pokreni ceo fajl u novom Supabase projektu. Transakcija sprečava delimičnu instalaciju.
begin;
create table public.profiles (
 id uuid primary key references auth.users on delete cascade, name text not null default '' check(length(name)<=100),
 bio text not null default '' check(length(bio)<=3000), avatar text not null default '',
 intent text not null default '' check(intent in ('','client','expert','both')), category text not null default '',
 branch text not null default '', specialty text not null default '', onboarded boolean not null default false
);
create table public.admins (user_id uuid primary key references auth.users on delete cascade);
create table public.listings (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('service','project')), status text not null check(status in ('draft','published','closed')),
 title text not null check(length(trim(title)) between 1 and 150), body text not null check(length(body)<=12000),
 category text not null, specialty text not null default '', tags text not null default '', price numeric(12,2) check(price>=0),
 deadline date, reference_url text not null default '' check(reference_url='' or reference_url like 'https://%'),
 created_at timestamptz not null default now(), check(status='draft' or length(trim(body))>=10)
);
-- Svaki portfolio pripada tačno jednoj usluzi. Redosled definiše autor.
create table public.works (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings on delete cascade,
 title text not null check(length(trim(title)) between 1 and 150), contribution text not null default '',
 image_path text not null default '', video text not null default '', position int not null default 0,
 check(image_path<>'' or video<>''),check(image_path='' or split_part(image_path,'/',2)=listing_id::text)
);
create table public.applications (
 id uuid primary key default gen_random_uuid(),listing_id uuid not null references public.listings, applicant uuid not null references public.profiles,
 proposal text not null check(length(trim(proposal)) between 1 and 6000),price numeric(12,2) check(price>=0),deadline date,
 work_id uuid references public.works on delete set null,status text not null default 'pending' check(status in ('pending','accepted','declined')),
 unique(listing_id,applicant)
);
create unique index one_winner on public.applications(listing_id) where status='accepted';
create table public.slots (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles,
 starts_at timestamptz not null, booked boolean not null default false, unique(owner_id,starts_at)
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), slot_id uuid not null references public.slots,
 listing_id uuid not null references public.listings, client_id uuid not null references public.profiles,
 brief text not null check(length(trim(brief)) between 1 and 6000),status text not null default 'pending' check(status in ('pending','accepted','declined')),
 unique(slot_id,client_id)
);
create unique index one_booking on public.bookings(slot_id) where status='accepted';
create table public.threads (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings,
 owner_id uuid not null references public.profiles,peer_id uuid not null references public.profiles,
 created_at timestamptz not null default now(),check(owner_id<>peer_id),unique(listing_id,peer_id)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(),thread_id uuid not null references public.threads,
 sender uuid not null references public.profiles,body text not null check(length(trim(body)) between 1 and 6000),
 created_at timestamptz not null default now()
);
create index message_history on public.messages(thread_id,created_at,id);
create index listings_catalog on public.listings(kind,status,created_at desc);
create table public.reports (
 id uuid primary key default gen_random_uuid(),reporter uuid not null references public.profiles, thread_id uuid references public.threads,
 listing_id uuid references public.listings, reason text not null check(length(trim(reason)) between 1 and 3000),
 resolved boolean not null default false,created_at timestamptz not null default now(),check(num_nonnulls(thread_id,listing_id)=1)
);
create table public.moderation_log (
 id bigint generated always as identity primary key,actor uuid not null references auth.users(id),
 thread_id uuid not null references public.threads, reason text not null check(length(trim(reason)) between 3 and 3000),created_at timestamptz not null default now()
);
-- Baza proverava identitet za svaki zahtev, uključujući direktne API pozive.
alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.listings enable row level security;
alter table public.works enable row level security;
alter table public.applications enable row level security;
alter table public.slots enable row level security;
alter table public.bookings enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_log enable row level security;
do $$declare n text;begin foreach n in array array['profiles','admins','listings','works','applications','slots','bookings','threads','messages','reports','moderation_log'] loop
 execute format('revoke all on public.%I from anon,authenticated,public',n);
 end loop;end$$;
grant select on public.profiles,public.listings,public.works,public.slots to anon,authenticated;
grant select on public.admins,public.applications,public.bookings,public.threads,public.messages,public.reports to authenticated;
grant insert (id,name,bio,avatar,intent,category,branch,specialty,onboarded),update(name,bio,avatar,intent,category,branch,specialty,onboarded) on public.profiles to authenticated;
grant insert (id,owner_id,kind,status,title,body,category,specialty,tags,price,deadline,reference_url),update(status,title,body,category,specialty,tags,price,deadline,reference_url) on public.listings to authenticated;
grant insert(listing_id,title,contribution,image_path,video,position),update(title,contribution,image_path,video,position),delete on public.works to authenticated;
grant insert(owner_id,starts_at),delete on public.slots to authenticated;
grant insert(id,thread_id,sender,body) on public.messages to authenticated;
grant insert(reporter,thread_id,listing_id,reason),update(resolved) on public.reports to authenticated;
create policy my_admin on public.admins for select using(user_id=auth.uid());
create policy profile_read on public.profiles for select using(true);
create policy profile_add on public.profiles for insert with check(id=auth.uid());
create policy profile_edit on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy listing_read on public.listings for select using(status<>'draft' or owner_id=auth.uid());
create policy listing_add on public.listings for insert with check(owner_id=auth.uid());
create policy listing_edit on public.listings for update using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy work_read on public.works for select using(exists(select 1 from public.listings l where l.id=listing_id));
create policy work_write on public.works for all to authenticated using(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid() and l.kind='service')) with check(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid() and l.kind='service') and (image_path='' or split_part(image_path,'/',1)=auth.uid()::text));
create policy applications_private on public.applications for select using(applicant=auth.uid() or exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid()));
create policy slots_read on public.slots for select using(owner_id=auth.uid() or (starts_at>now() and not booked) or booked);
create policy slots_add on public.slots for insert with check(owner_id=auth.uid() and starts_at>now());
create policy slots_remove on public.slots for delete using(owner_id=auth.uid() and not booked);
create policy bookings_private on public.bookings for select using(client_id=auth.uid() or exists(select 1 from public.slots s where s.id=slot_id and s.owner_id=auth.uid()));
create policy thread_members on public.threads for select using(auth.uid() in(owner_id,peer_id));
create policy message_read on public.messages for select using(exists(select 1 from public.threads t where t.id=thread_id));
create policy message_add on public.messages for insert with check(sender=auth.uid() and exists(select 1 from public.threads t where t.id=thread_id));
create policy report_read on public.reports for select using(reporter=auth.uid() or exists(select 1 from public.admins));
create policy report_add on public.reports for insert with check(reporter=auth.uid() and (exists(select 1 from public.threads t where t.id=thread_id) or exists(select 1 from public.listings l where l.id=listing_id)));
create policy report_resolve on public.reports for update using(exists(select 1 from public.admins));

-- Zahtev i potvrda zaključavaju isti termin. Dve istovremene potvrde ne mogu zauzeti isto mesto.
create function public.request_booking(slot uuid,listing uuid,brief_text text) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.slots; b uuid;begin
 select * into s from public.slots where id=slot for update;
 if auth.uid() is null or s.id is null or s.booked or s.starts_at<=now() or s.owner_id=auth.uid() or not exists(select 1 from public.listings where id=listing and kind='service' and status='published' and owner_id=s.owner_id) then raise exception 'SLOT_UNAVAILABLE';end if;
 insert into public.bookings(slot_id,listing_id,client_id,brief) values(slot,listing,auth.uid(),brief_text) on conflict(slot_id,client_id) do nothing returning id into b;
 return coalesce(b,(select id from public.bookings where slot_id=slot and client_id=auth.uid()));end$$;
create function public.decide_booking(booking uuid,accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare s public.slots;begin
 select * into s from public.slots where id=(select slot_id from public.bookings where id=booking) for update;
 if auth.uid() is null or s.owner_id is distinct from auth.uid() or s.booked or not exists(select 1 from public.bookings where id=booking and status='pending') or (accept and s.starts_at<=now()) then raise exception 'SLOT_UNAVAILABLE';end if;
 update public.bookings set status=case when accept then 'accepted' else 'declined' end where id=booking;
 if accept then update public.slots set booked=true where id=s.id; update public.bookings set status='declined' where slot_id=s.id and status='pending';end if;end$$;
create function public.apply_project(listing uuid,proposal_text text,amount numeric,due date,work uuid) returns void language plpgsql security definer set search_path='' as $$
declare l public.listings;begin
 select * into l from public.listings where id=listing for update;
 if auth.uid() is null or l.id is null or l.owner_id=auth.uid() or l.status<>'published' or l.kind<>'project' then raise exception 'PROJECT_CLOSED'; end if;
 if work is not null and not exists(select 1 from public.works w join public.listings a on a.id=w.listing_id where w.id=work and a.owner_id=auth.uid() and a.status='published') then raise exception 'INVALID_WORK';end if;
 insert into public.applications(listing_id,applicant,proposal,price,deadline,work_id) values(listing,auth.uid(),proposal_text,amount,due,work) on conflict(listing_id,applicant) do nothing;end$$;
create function public.decide_application(application uuid,accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare l public.listings;begin
 select * into l from public.listings where id=(select listing_id from public.applications where id=application) for update;
 if auth.uid() is null or l.owner_id is distinct from auth.uid() or not exists(select 1 from public.applications where id=application and status='pending') or exists(select 1 from public.applications where listing_id=l.id and status='accepted') then raise exception 'FORBIDDEN';end if;
 update public.applications set status=case when accept then 'accepted' else 'declined' end where id=application;
 if accept then update public.listings set status='closed' where id=l.id;update public.applications set status='declined' where listing_id=l.id and status='pending';end if;end$$;
-- Par sagovornika određuje baza prema oglasu. Ponovni klik otvara isti razgovor.
create function public.open_thread(listing uuid,peer uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare l public.listings;other_id uuid;result uuid;begin
 select * into l from public.listings where id=listing;
 if auth.uid() is null or l.id is null or l.status='draft' then raise exception 'FORBIDDEN';end if;
 other_id:=case when auth.uid()=l.owner_id then peer else auth.uid() end;
 if other_id is null or other_id=l.owner_id or (l.kind='project' and not exists(select 1 from public.applications where listing_id=l.id and applicant=other_id)) or (l.kind='service' and auth.uid()=l.owner_id and not exists(select 1 from public.threads where listing_id=l.id and peer_id=other_id)) then raise exception 'FORBIDDEN';end if;
 insert into public.threads(listing_id,owner_id,peer_id) values(l.id,l.owner_id,other_id) on conflict(listing_id,peer_id) do nothing;
 select id into result from public.threads where listing_id=l.id and peer_id=other_id;return result;end$$;
-- Administrator vidi poruke samo preko ove funkcije. Čitanje i zapis razloga su jedna transakcija.
create function public.review_thread(thread uuid,justification text) returns setof public.messages language plpgsql security definer set search_path='' as $$
begin if not exists(select 1 from public.admins where user_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 insert into public.moderation_log(actor,thread_id,reason) values(auth.uid(),thread,justification);
 return query select * from public.messages m where m.thread_id=thread order by m.created_at,m.id;end$$;
do $$declare f regprocedure;begin foreach f in array array['public.request_booking(uuid,uuid,text)'::regprocedure,'public.decide_booking(uuid,boolean)'::regprocedure,'public.apply_project(uuid,text,numeric,date,uuid)'::regprocedure,'public.decide_application(uuid,boolean)'::regprocedure,'public.open_thread(uuid,uuid)'::regprocedure,'public.review_thread(uuid,text)'::regprocedure] loop execute format('revoke all on function %s from public,anon',f);execute format('grant execute on function %s to authenticated',f);end loop;end$$;
-- Slike portfolija su privatne dok ih autor ne objavi; aplikacija dobija privremene potpisane URL adrese.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('portfolio','portfolio',false,4194304,array['image/jpeg','image/webp','image/png']),
('avatars','avatars',true,2097152,array['image/jpeg','image/webp','image/png']);
create policy rg_image_add on storage.objects for insert to authenticated with check(bucket_id in('portfolio','avatars') and split_part(name,'/',1)=auth.uid()::text);
create policy rg_image_delete on storage.objects for delete to authenticated using(bucket_id in('portfolio','avatars') and split_part(name,'/',1)=auth.uid()::text);
create policy rg_image_read on storage.objects for select using((bucket_id='avatars') or (bucket_id='portfolio' and (split_part(name,'/',1)=auth.uid()::text or exists(select 1 from public.works w join public.listings l on l.id=w.listing_id where w.image_path=name and l.status<>'draft'))));
do $$begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then alter publication supabase_realtime add table public.messages;end if;end$$;
-- Izmena redosleda zaključava oglas i normalizuje redne brojeve unutar jedne transakcije.
create function public.move_work(work uuid,direction integer) returns void language plpgsql security definer set search_path='' as $$
declare parent uuid;ids uuid[];pos integer;other integer;tmp uuid;begin
 select l.id into parent from public.listings l join public.works w on l.id=w.listing_id where w.id=work and l.owner_id=auth.uid() for update of l;
 if parent is null or direction not in (-1,1) then raise exception 'FORBIDDEN';end if;
 select array_agg(id order by position,id) into ids from public.works where listing_id=parent;
 pos:=array_position(ids,work);other:=pos+direction;if other<1 or other>cardinality(ids) then return;end if;
 tmp:=ids[other];ids[other]:=work;ids[pos]:=tmp;
 update public.works w set position=u.i from unnest(ids) with ordinality u(id,i) where w.id=u.id;end$$;
revoke all on function public.move_work(uuid,integer) from public,anon;
grant execute on function public.move_work(uuid,integer) to authenticated;
-- Izabrani saradnik zaključava konkurs čak i pri direktnoj izmeni kroz API.
create function public.keep_awarded_project_closed() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.kind='project' and new.status<>'closed' and exists(select 1 from public.applications where listing_id=new.id and status='accepted') then raise exception 'PROJECT_AWARDED';end if;return new;end$$;
create trigger awarded_project before update on public.listings for each row execute function public.keep_awarded_project_closed();
revoke all on function public.keep_awarded_project_closed() from public,anon,authenticated;
create function public.moderation_threads() returns setof public.threads language plpgsql security definer set search_path='' as $$
begin if not exists(select 1 from public.admins where user_id=auth.uid()) then raise exception 'FORBIDDEN';end if;
return query select * from public.threads order by created_at desc;end$$;
revoke all on function public.moderation_threads() from public,anon;
grant execute on function public.moderation_threads() to authenticated;


commit;

