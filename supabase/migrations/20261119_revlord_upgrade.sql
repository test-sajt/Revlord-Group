-- 2026-11-19: additive upgrade. Run ONCE in Supabase SQL Editor on the existing project.
-- Existing auth.users, listings, profiles, messages, threads and storage objects remain intact.
begin;

create table if not exists public.categories (
 id text primary key check(length(id) between 1 and 120),
 parent_id text references public.categories(id) on delete restrict,
 name_sr text not null check(length(trim(name_sr)) between 1 and 100),
 name_en text not null check(length(trim(name_en)) between 1 and 100),
 icon text not null default 'folder',
 sort_order integer not null default 0,
 active boolean not null default true,
 check(id<>coalesce(parent_id,''))
);
create index if not exists category_parent on public.categories(parent_id,sort_order);
alter table public.categories enable row level security;
revoke all on public.categories from anon,authenticated,public;
grant select on public.categories to anon,authenticated;
grant insert(id,parent_id,name_sr,name_en,icon,sort_order,active), update(parent_id,name_sr,name_en,icon,sort_order,active), delete on public.categories to authenticated;
create policy categories_read on public.categories for select using(true);
create policy categories_insert on public.categories for insert to authenticated with check(exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy categories_edit on public.categories for update to authenticated using(exists(select 1 from public.admins a where a.user_id=auth.uid())) with check(exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy categories_delete on public.categories for delete to authenticated using(exists(select 1 from public.admins a where a.user_id=auth.uid()));
insert into public.categories(id,parent_id,name_sr,name_en,icon,sort_order) values
('development',NULL,'Programiranje i software development','Programming & software development','code',0),
('gaming',NULL,'Gaming development','Gaming development','terminal',10),
('design',NULL,'Dizajn i grafika','Design & graphics','pen',20),
('3d',NULL,'3D modelovanje i animacija','3D modelling & animation','box',30),
('video',NULL,'Video i audio','Video & audio','film',40),
('community',NULL,'Discord i community','Discord & community','globe',50),
('marketing',NULL,'Marketing i digitalne usluge','Marketing & digital services','web',60),
('development-software','development','Software development','Software development','folder',0),
('development-software-software-developer','development-software','Software Developer','Software Developer','folder',0),
('development-software-frontend-developer','development-software','Frontend Developer','Frontend Developer','folder',10),
('development-software-backend-developer','development-software','Backend Developer','Backend Developer','folder',20),
('development-software-full-stack-developer','development-software','Full Stack Developer','Full Stack Developer','folder',30),
('development-software-web-developer','development-software','Web Developer','Web Developer','folder',40),
('development-software-mobile-app-developer','development-software','Mobile App Developer','Mobile App Developer','folder',50),
('development-software-python-developer','development-software','Python Developer','Python Developer','folder',60),
('development-software-javascript-typescript-developer','development-software','JavaScript / TypeScript Developer','JavaScript / TypeScript Developer','folder',70),
('development-software-java-developer','development-software','Java Developer','Java Developer','folder',80),
('development-software-csharp-dotnet-developer','development-software','C# / .NET Developer','C# / .NET Developer','folder',90),
('development-software-cpp-developer','development-software','C++ Developer','C++ Developer','folder',100),
('development-software-php-laravel-developer','development-software','PHP / Laravel Developer','PHP / Laravel Developer','folder',110),
('development-software-react-next-js-developer','development-software','React / Next.js Developer','React / Next.js Developer','folder',120),
('development-software-node-js-developer','development-software','Node.js Developer','Node.js Developer','folder',130),
('development-software-api-developer','development-software','API Developer','API Developer','folder',140),
('development-software-database-developer','development-software','Database Developer','Database Developer','folder',150),
('development-software-ai-machine-learning-developer','development-software','AI / Machine Learning Developer','AI / Machine Learning Developer','folder',160),
('development-software-automation-developer','development-software','Automation Developer','Automation Developer','folder',170),
('development-software-devops-cloud-developer','development-software','DevOps / Cloud Developer','DevOps / Cloud Developer','folder',180),
('development-software-qa-software-tester','development-software','QA / Software Tester','QA / Software Tester','folder',190),
('development-gaming','development','Gaming Development','Gaming Development','folder',10),
('development-gaming-game-developer','development-gaming','Game Developer','Game Developer','folder',0),
('development-gaming-roblox-developer','development-gaming','Roblox Developer','Roblox Developer','folder',10),
('development-gaming-fivem-developer','development-gaming','FiveM Developer','FiveM Developer','folder',20),
('development-gaming-minecraft-plugin-developer','development-gaming','Minecraft Plugin Developer','Minecraft Plugin Developer','folder',30),
('development-gaming-unity-developer','development-gaming','Unity Developer','Unity Developer','folder',40),
('development-gaming-unreal-engine-developer','development-gaming','Unreal Engine Developer','Unreal Engine Developer','folder',50),
('development-gaming-godot-developer','development-gaming','Godot Developer','Godot Developer','folder',60),
('gaming-roblox','gaming','Roblox','Roblox','folder',0),
('gaming-roblox-roblox-developer','gaming-roblox','Roblox Developer','Roblox Developer','folder',0),
('gaming-roblox-roblox-lua-luau-scripter','gaming-roblox','Roblox Lua / Luau Scripter','Roblox Lua / Luau Scripter','folder',10),
('gaming-roblox-roblox-ui-developer','gaming-roblox','Roblox UI Developer','Roblox UI Developer','folder',20),
('gaming-roblox-roblox-map-builder','gaming-roblox','Roblox Map Builder','Roblox Map Builder','folder',30),
('gaming-fivem','gaming','FiveM','FiveM','folder',10),
('gaming-fivem-fivem-developer','gaming-fivem','FiveM Developer','FiveM Developer','folder',0),
('gaming-fivem-fivem-lua-scripter','gaming-fivem','FiveM Lua Scripter','FiveM Lua Scripter','folder',10),
('gaming-fivem-fivem-esx-developer','gaming-fivem','FiveM ESX Developer','FiveM ESX Developer','folder',20),
('gaming-fivem-fivem-qbcore-developer','gaming-fivem','FiveM QBCore Developer','FiveM QBCore Developer','folder',30),
('gaming-fivem-fivem-mlo-mapping','gaming-fivem','FiveM MLO / Mapping','FiveM MLO / Mapping','folder',40),
('gaming-samp','gaming','SA-MP / open.mp','SA-MP / open.mp','folder',20),
('gaming-samp-sa-mp-developer','gaming-samp','SA-MP Developer','SA-MP Developer','folder',0),
('gaming-samp-sa-mp-pawn-scripter','gaming-samp','SA-MP Pawn Scripter','SA-MP Pawn Scripter','folder',10),
('gaming-samp-open-mp-developer','gaming-samp','open.mp Developer','open.mp Developer','folder',20),
('gaming-minecraft','gaming','Minecraft','Minecraft','folder',30),
('gaming-minecraft-minecraft-plugin-developer','gaming-minecraft','Minecraft Plugin Developer','Minecraft Plugin Developer','folder',0),
('gaming-minecraft-minecraft-mod-developer','gaming-minecraft','Minecraft Mod Developer','Minecraft Mod Developer','folder',10),
('gaming-minecraft-minecraft-server-developer','gaming-minecraft','Minecraft Server Developer','Minecraft Server Developer','folder',20),
('gaming-engines','gaming','Game engines','Game engines','folder',40),
('gaming-engines-unity-developer','gaming-engines','Unity Developer','Unity Developer','folder',0),
('gaming-engines-unreal-engine-developer','gaming-engines','Unreal Engine Developer','Unreal Engine Developer','folder',10),
('gaming-engines-godot-developer','gaming-engines','Godot Developer','Godot Developer','folder',20),
('gaming-engines-game-ui-developer','gaming-engines','Game UI Developer','Game UI Developer','folder',30),
('gaming-engines-game-systems-developer','gaming-engines','Game Systems Developer','Game Systems Developer','folder',40),
('design-branding','design','Grafika i brending','Graphics & branding','folder',0),
('design-branding-graphic-designer','design-branding','Graphic Designer','Graphic Designer','folder',0),
('design-branding-logo-designer','design-branding','Logo Designer','Logo Designer','folder',10),
('design-branding-brand-identity-designer','design-branding','Brand Identity Designer','Brand Identity Designer','folder',20),
('design-branding-banner-designer','design-branding','Banner Designer','Banner Designer','folder',30),
('design-branding-poster-designer','design-branding','Poster Designer','Poster Designer','folder',40),
('design-branding-illustrator','design-branding','Illustrator','Illustrator','folder',50),
('design-branding-pixel-artist','design-branding','Pixel Artist','Pixel Artist','folder',60),
('design-branding-photoshop-editor','design-branding','Photoshop Editor','Photoshop Editor','folder',70),
('design-ui','design','UI / UX','UI / UX','folder',10),
('design-ui-ui-designer','design-ui','UI Designer','UI Designer','folder',0),
('design-ui-ux-designer','design-ui','UX Designer','UX Designer','folder',10),
('design-ui-ui-ux-designer','design-ui','UI/UX Designer','UI/UX Designer','folder',20),
('design-ui-web-designer','design-ui','Web Designer','Web Designer','folder',30),
('design-ui-game-ui-designer','design-ui','Game UI Designer','Game UI Designer','folder',40),
('design-ui-figma-designer','design-ui','Figma Designer','Figma Designer','folder',50),
('design-social','design','Dizajn za društvene mreže','Social content design','folder',20),
('design-social-social-media-designer','design-social','Social Media Designer','Social Media Designer','folder',0),
('design-social-thumbnail-designer','design-social','Thumbnail Designer','Thumbnail Designer','folder',10),
('3d-modeling','3d','3D modelovanje','3D modelling','folder',0),
('3d-modeling-3d-modeler','3d-modeling','3D Modeler','3D Modeler','folder',0),
('3d-modeling-blender-artist','3d-modeling','Blender Artist','Blender Artist','folder',10),
('3d-modeling-3d-character-artist','3d-modeling','3D Character Artist','3D Character Artist','folder',20),
('3d-modeling-3d-environment-artist','3d-modeling','3D Environment Artist','3D Environment Artist','folder',30),
('3d-modeling-3d-game-asset-creator','3d-modeling','3D Game Asset Creator','3D Game Asset Creator','folder',40),
('3d-modeling-3d-vehicle-modeler','3d-modeling','3D Vehicle Modeler','3D Vehicle Modeler','folder',50),
('3d-modeling-3d-interior-designer','3d-modeling','3D Interior Designer','3D Interior Designer','folder',60),
('3d-modeling-roblox-3d-modeler','3d-modeling','Roblox 3D Modeler','Roblox 3D Modeler','folder',70),
('3d-modeling-fivem-3d-modeler','3d-modeling','FiveM 3D Modeler','FiveM 3D Modeler','folder',80),
('3d-animation','3d','Animacija i VFX','Animation & VFX','folder',10),
('3d-animation-3d-animator','3d-animation','3D Animator','3D Animator','folder',0),
('3d-animation-character-rigger','3d-animation','Character Rigger','Character Rigger','folder',10),
('3d-animation-texture-artist','3d-animation','Texture Artist','Texture Artist','folder',20),
('3d-animation-vfx-artist','3d-animation','VFX Artist','VFX Artist','folder',30),
('video-editing','video','Video montaža','Video editing','folder',0),
('video-editing-video-editor','video-editing','Video Editor','Video Editor','folder',0),
('video-editing-youtube-video-editor','video-editing','YouTube Video Editor','YouTube Video Editor','folder',10),
('video-editing-tiktok-reels-editor','video-editing','TikTok / Reels Editor','TikTok / Reels Editor','folder',20),
('video-editing-gaming-montage-editor','video-editing','Gaming Montage Editor','Gaming Montage Editor','folder',30),
('video-motion','video','Motion i animacija','Motion & animation','folder',10),
('video-motion-motion-graphics-designer','video-motion','Motion Graphics Designer','Motion Graphics Designer','folder',0),
('video-motion-after-effects-editor','video-motion','After Effects Editor','After Effects Editor','folder',10),
('video-motion-video-animator','video-motion','Video Animator','Video Animator','folder',20),
('video-audio','video','Audio produkcija','Audio production','folder',20),
('video-audio-sound-designer','video-audio','Sound Designer','Sound Designer','folder',0),
('video-audio-audio-editor','video-audio','Audio Editor','Audio Editor','folder',10),
('video-audio-voice-over-artist','video-audio','Voice Over Artist','Voice Over Artist','folder',20),
('video-audio-music-producer','video-audio','Music Producer','Music Producer','folder',30),
('community-discord','community','Discord development','Discord development','folder',0),
('community-discord-discord-bot-developer','community-discord','Discord Bot Developer','Discord Bot Developer','folder',0),
('community-discord-discord-server-designer','community-discord','Discord Server Designer','Discord Server Designer','folder',10),
('community-discord-discord-automation-developer','community-discord','Discord Automation Developer','Discord Automation Developer','folder',20),
('community-discord-discord-integration-developer','community-discord','Discord Integration Developer','Discord Integration Developer','folder',30),
('community-management','community','Community management','Community management','folder',10),
('community-management-discord-moderator','community-management','Discord Moderator','Discord Moderator','folder',0),
('community-management-community-manager','community-management','Community Manager','Community Manager','folder',10),
('community-management-gaming-server-administrator','community-management','Gaming Server Administrator','Gaming Server Administrator','folder',20),
('marketing-growth','marketing','Marketing i SEO','Marketing & SEO','folder',0),
('marketing-growth-seo-specialist','marketing-growth','SEO Specialist','SEO Specialist','folder',0),
('marketing-growth-social-media-manager','marketing-growth','Social Media Manager','Social Media Manager','folder',10),
('marketing-growth-digital-marketing-specialist','marketing-growth','Digital Marketing Specialist','Digital Marketing Specialist','folder',20),
('marketing-growth-ads-specialist','marketing-growth','Ads Specialist','Ads Specialist','folder',30),
('marketing-content','marketing','Kreiranje sadržaja','Content creation','folder',10),
('marketing-content-content-creator','marketing-content','Content Creator','Content Creator','folder',0),
('marketing-content-copywriter','marketing-content','Copywriter','Copywriter','folder',10),
('marketing-content-content-writer','marketing-content','Content Writer','Content Writer','folder',20),
('marketing-content-translator','marketing-content','Translator','Translator','folder',30),
('marketing-commerce','marketing','E-commerce','E-commerce','folder',20),
('marketing-commerce-e-commerce-developer','marketing-commerce','E-commerce Developer','E-commerce Developer','folder',0),
('marketing-commerce-shopify-developer','marketing-commerce','Shopify Developer','Shopify Developer','folder',10),
('marketing-commerce-wordpress-developer','marketing-commerce','WordPress Developer','WordPress Developer','folder',20),
('marketing-assistance','marketing','Virtuelna pomoć','Virtual assistance','folder',30),
('marketing-assistance-virtual-assistant','marketing-assistance','Virtual Assistant','Virtual Assistant','folder',0),
('marketing-assistance-data-entry-specialist','marketing-assistance','Data Entry Specialist','Data Entry Specialist','folder',10)
on conflict (id) do nothing;
-- The original category/specialty values are retained for legacy advertisements.
alter table public.listings add column if not exists category_id text references public.categories(id) on delete restrict;
alter table public.listings add column if not exists currency text not null default 'EUR' check(currency in ('EUR','USD','RSD','GBP'));
alter table public.listings add column if not exists job_type text not null default 'fixed' check(job_type in ('fixed','hourly','oneoff','ongoing'));
create index if not exists listings_category_selected on public.listings(category_id);
grant insert(category_id,currency,job_type),update(category_id,currency,job_type) on public.listings to authenticated;
grant delete on public.listings to authenticated;
create policy listing_delete_own on public.listings for delete to authenticated using(owner_id=auth.uid());

create table if not exists public.listing_images (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id) on delete cascade,
 image_path text not null, position integer not null default 0, is_cover boolean not null default false,
 unique(listing_id,image_path), check(length(image_path)>4)
);
create unique index if not exists one_listing_cover on public.listing_images(listing_id) where is_cover;
create index if not exists listing_images_parent on public.listing_images(listing_id,position);
create function public.listing_image_validate() returns trigger language plpgsql set search_path='' as $$
declare owner uuid; existing integer; begin
 select l.owner_id into owner from public.listings l where l.id=new.listing_id for update;
 if owner is null or split_part(new.image_path,'/',1)<>owner::text or split_part(new.image_path,'/',2)<>new.listing_id::text then raise exception 'INVALID_IMAGE_PATH';end if;
 if tg_op='INSERT' then select count(*) into existing from public.listing_images where listing_id=new.listing_id;
 if existing>=5 then raise exception 'MAX_5_IMAGES';end if; end if;
 return new; end$$;
create trigger listing_image_guard before insert or update on public.listing_images for each row execute function public.listing_image_validate();
-- Replace the image references in ONE transaction after storage uploads succeed.
-- Prevents partial gallery deletion when a file or permission check fails.
create function public.save_listing_gallery(listing uuid,paths text[],cover_path text)
returns void language plpgsql security definer set search_path='' as $$
declare owner uuid; path text; ix integer := 0; begin
 select l.owner_id into owner from public.listings l where l.id=listing for update;
 if auth.uid() is null or owner is distinct from auth.uid() then raise exception 'FORBIDDEN';end if;
 if cardinality(paths)>5 or (cardinality(paths)>0 and (cover_path is null or cover_path<>all(paths))) then raise exception 'MAX_5_IMAGES_OR_COVER';end if;
 if cardinality(paths)<>(select count(distinct u.path) from unnest(paths) as u(path)) then raise exception 'DUPLICATE_IMAGE';end if;
 foreach path in array paths loop
  if path is null or split_part(path,'/',1)<>owner::text or split_part(path,'/',2)<>listing::text or
   not exists(select 1 from storage.objects s where s.bucket_id='listing-images' and s.name=path) then
   raise exception 'INVALID_IMAGE_PATH';end if;
 end loop;
 delete from public.listing_images im where im.listing_id=listing;
 foreach path in array paths loop
   insert into public.listing_images(listing_id,image_path,position,is_cover)
   values(listing,path,ix,path=cover_path);
   ix:=ix+1;
 end loop;
end$$;
revoke all on function public.save_listing_gallery(uuid,text[],text) from public,anon;
grant execute on function public.save_listing_gallery(uuid,text[],text) to authenticated;
alter table public.listing_images enable row level security;
revoke all on public.listing_images from anon,authenticated,public;
grant select on public.listing_images to anon,authenticated;
grant insert(listing_id,image_path,position,is_cover),update(position,is_cover),delete on public.listing_images to authenticated;
create policy listing_image_read on public.listing_images for select using(exists(select 1 from public.listings l where l.id=listing_id));
create policy listing_image_insert on public.listing_images for insert to authenticated with check(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid()));
create policy listing_image_edit on public.listing_images for update to authenticated using(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid())) with check(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid()));
create policy listing_image_remove on public.listing_images for delete to authenticated using(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid()));

alter table public.profiles add column if not exists username text not null default '' check(length(username)<=30 and (username='' or username ~ '^[A-Za-z0-9_]{3,30}$'));
alter table public.profiles add column if not exists cover text not null default '';
alter table public.profiles add column if not exists about text not null default '' check(length(about)<=8000);
alter table public.profiles add column if not exists skills text[] not null default '{}';
alter table public.profiles add column if not exists github_url text not null default '' check(github_url='' or github_url like 'https://%');
alter table public.profiles add column if not exists behance_url text not null default '' check(behance_url='' or behance_url like 'https://%');
alter table public.profiles add column if not exists website_url text not null default '' check(website_url='' or website_url like 'https://%');
alter table public.profiles add column if not exists available boolean not null default true;
create unique index if not exists unique_username on public.profiles(lower(username)) where username<>'';
grant insert(username,cover,about,skills,github_url,behance_url,website_url,available),update(username,cover,about,skills,github_url,behance_url,website_url,available) on public.profiles to authenticated;
create table if not exists public.portfolio_projects (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 150), description text not null default '' check(length(description)<=8000),
 image_paths text[] not null default '{}', project_url text not null default '' check(project_url='' or project_url like 'https://%'),
 created_at timestamptz not null default now(),check(cardinality(image_paths)<=5)
);
alter table public.portfolio_projects enable row level security;
revoke all on public.portfolio_projects from anon,authenticated,public;
grant select on public.portfolio_projects to anon,authenticated;
grant insert(id,owner_id,title,description,image_paths,project_url),update(title,description,image_paths,project_url),delete on public.portfolio_projects to authenticated;
create policy portfolio_projects_read on public.portfolio_projects for select using(true);
create policy portfolio_projects_add on public.portfolio_projects for insert to authenticated with check(owner_id=auth.uid() and (select bool_and(split_part(x,'/',1)=owner_id::text and split_part(x,'/',2)='profile') from unnest(image_paths) as x) is distinct from false);
create policy portfolio_projects_edit on public.portfolio_projects for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid() and (select bool_and(split_part(x,'/',1)=owner_id::text and split_part(x,'/',2)='profile') from unnest(image_paths) as x) is distinct from false);
create policy portfolio_projects_delete on public.portfolio_projects for delete to authenticated using(owner_id=auth.uid());

-- Supabase Realtime also reports newly opened conversation threads to their participants.
do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='threads') then
   alter publication supabase_realtime add table public.threads;
 end if;
end$$;
-- Per-participant read markers; never mark the other person's messages as read on their behalf.
alter table public.threads add column if not exists owner_last_read_at timestamptz;
alter table public.threads add column if not exists peer_last_read_at timestamptz;
create or replace function public.mark_thread_read(thread uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 update public.threads t set owner_last_read_at=greatest(coalesce(t.owner_last_read_at,'epoch'::timestamptz),now())
 where t.id=thread and t.owner_id=auth.uid();
 if found then return;end if;
 update public.threads t set peer_last_read_at=greatest(coalesce(t.peer_last_read_at,'epoch'::timestamptz),now())
 where t.id=thread and t.peer_id=auth.uid();
 if not found then raise exception 'FORBIDDEN';end if;
end$$;
revoke all on function public.mark_thread_read(uuid) from public,anon;
grant execute on function public.mark_thread_read(uuid) to authenticated;
create or replace function public.inbox_overview()
returns table(thread_id uuid, listing_id uuid, peer_name text, listing_title text, last_body text, last_at timestamptz, unread bigint)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'FORBIDDEN';end if;
 return query select t.id,t.listing_id,coalesce(nullif(p.name,''),'Korisnik'),l.title,
 lm.body,lm.created_at,
 (select count(*) from public.messages m where m.thread_id=t.id and m.sender<>auth.uid() and
 m.created_at>coalesce(case when auth.uid()=t.owner_id then t.owner_last_read_at else t.peer_last_read_at end,'epoch'::timestamptz))::bigint
 from public.threads t
 join public.listings l on l.id=t.listing_id
 join public.profiles p on p.id=(case when t.owner_id=auth.uid() then t.peer_id else t.owner_id end)
 left join lateral (select m.body,m.created_at from public.messages m where m.thread_id=t.id order by m.created_at desc,m.id desc limit 1) lm on true
 where auth.uid() in(t.owner_id,t.peer_id)
 order by lm.created_at desc nulls last,t.created_at desc;
end$$;
revoke all on function public.inbox_overview() from public,anon;
grant execute on function public.inbox_overview() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('listing-images','listing-images',false,4194304,array['image/jpeg','image/webp','image/png'])
on conflict(id) do nothing;
-- Original storage policies remain and cover portfolio and avatars; new policies add the new media scope.
create policy rg_listing_image_add on storage.objects for insert to authenticated with check(bucket_id='listing-images' and split_part(name,'/',1)=auth.uid()::text);
create policy rg_listing_image_delete on storage.objects for delete to authenticated using(bucket_id='listing-images' and split_part(name,'/',1)=auth.uid()::text);
create policy rg_listing_image_read on storage.objects for select using(bucket_id='listing-images' and (
 split_part(name,'/',1)=auth.uid()::text or exists(select 1 from public.listing_images i join public.listings l on l.id=i.listing_id where i.image_path=name and l.status<>'draft')
));
create policy rg_portfolio_project_media on storage.objects for select using(bucket_id='portfolio' and exists(select 1 from public.portfolio_projects p where name=any(p.image_paths)));

commit;
