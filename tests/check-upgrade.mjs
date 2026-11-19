import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=async(p)=>fs.readFile(path.join(root,p),'utf8');
const sql=await load('supabase/migrations/20261119_revlord_upgrade.sql');
const browse=await load('src/Catalog.tsx');
const editor=await load('src/Editor.tsx');
const inbox=await load('src/Inbox.tsx');
const shell=await load('src/shell.tsx');
const account=await load('src/Account.tsx');
const messages=await load('src/Messages.tsx');
const baseSchema=await load('supabase/schema.sql');
const css=await load('src/style.css');
const workspace=await load('src/workspace.css');
const redesignSql=await load('supabase/migrations/20261119_revlord_redesign.sql');
const revamp=await load('src/revamp.css');
const db=await load('src/db.js');
let count=0;
function check(label,fn){fn();console.log('PASS: '+label);count++;}
check('Migration never drops or truncates existing tables',()=>{
 assert.doesNotMatch(sql, /\bdrop\s+table\b|\btruncate\b|\bdelete\s+from\s+public\.profiles\b/i);
 assert.match(sql,/\bbegin\s*;/i);assert.match(sql,/\bcommit\s*;/i);
});
check('Seven top-level categories and requested Roblox/FiveM specialisations exist',()=>{
 const match=sql.match(/insert into public\.categories\([\s\S]+?values\n([\s\S]+?)on conflict \(id\) do nothing;/);
 assert.ok(match,'category seed missing');
 const roots=match[1].split('\n').filter(x=>/^\('(development|gaming|design|3d|video|community|marketing)',NULL,/.test(x));
 assert.equal(roots.length,7);
 for (const item of ['Roblox Developer','Roblox Lua / Luau Scripter','FiveM Developer','FiveM QBCore Developer','Python Developer','AI / Machine Learning Developer','Blender Artist','Discord Bot Developer','Shopify Developer']) assert.ok(sql.includes(item),item+' missing');
});
check('Realtime inbox reads participants only, tracking unread server-side',()=>{
 for (const f of ['inbox_overview','mark_thread_read','owner_last_read_at','peer_last_read_at','auth.uid() in(t.owner_id,t.peer_id)']) assert.ok(sql.includes(f));
 assert.match(shell,/<Inbox\s*\/>/);assert.match(inbox,/inbox-badge/);assert.match(inbox,/listenInbox/);
});
check('Listing gallery saved through atomic RPC, with storage permission and five-image limit',()=>{
 for(const k of ['listing_images','save_listing_gallery','for update','cardinality(paths)>5','rg_listing_image_read','listing-images']) assert.ok(sql.includes(k));
 assert.match(editor,/db\.rpc\('save_listing_gallery'/);assert.match(editor,/PendingImages/);
});
check('Authenticated editable categories, privacy protected profiles and portfolio',()=>{
 for(const k of ['categories_insert','categories_delete','profile_edit','portfolio_projects_edit','unique_username']) assert.ok((sql+'\n'+baseSchema).includes(k));
});
check('Search uses live query parameters and real listing data',()=>{
 for(const k of ["db.rows('listings'", "filter('currency'", "filter('type'", "params.set('min'", "params.set('max'", "filter('sort'", "categoryParents(nodes, l.category_id)", 'Reset all filters']) assert.ok(browse.includes(k),k);
});
check('Responsive breakpoints cover 320–desktop, compact mobile chat',()=>{
 for(const key of ['max-width:520px','max-width:760px','max-width:350px']) assert.ok(css.includes(key),key);
 assert.match(workspace,/max-height:\s*min\(79dvh,650px\)/);
});
check('Profiles, portfolio and admin UI integrated',()=>{
 assert.match(account,/export function PortfolioEditor/);
 assert.match(account,/export function ProfileEdit/);
 assert.match(messages,/<CategoryAdmin\s*\/>/);
});
check('Redesign preserves original logo, offers desktop and mobile menu with requested order',()=>{
  const order=["to:'/'", "to:'/new/project'", "to:'/new/service'", "to:'/services'"];
  let pos=-1;
  for (const item of order) {const i=shell.indexOf(item,pos+1);assert.ok(i>pos,item);pos=i;}
  assert.match(shell,/className="brand"/);
  assert.match(shell,/rg-desktop-nav/);
  assert.match(shell,/rg-mobile-panel/);
  assert.match(shell,/user \? <Inbox \/> : <Link className="rg-signin"/);
  assert.match(shell,/rg-languages/);
  assert.match(revamp,/@keyframes rg-lava-a/);
});
check('Per-user chat deletion is optional and never deletes other participants messages',()=>{
  assert.match(inbox,/deleteChatForMe/);
  assert.match(db,/chat_history.*not found/);
  assert.match(redesignSql,/create table if not exists public.chat_hides/i);
  assert.match(redesignSql,/create or replace function public.delete_chat_for_me/i);
  assert.match(redesignSql,/create or replace function public.chat_history/i);
  assert.doesNotMatch(redesignSql,/delete\s+from\s+public\.messages|drop\s+table|truncate\s+table/i);
  assert.match(redesignSql,/auth\.uid\(\) in \(t\.owner_id, t\.peer_id\)/i);
});
console.log(`PASS: ${count} static upgrade checks. Live backend and browser tests still required.`);
