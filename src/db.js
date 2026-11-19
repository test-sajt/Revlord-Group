import { createClient } from '@supabase/supabase-js';

// Jedini ključ u pregledaču je javni publishable ključ. Ovlašćenja proveravaju RLS politike baze.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && /^https:\/\//.test(url) && key?.startsWith('sb_publishable_'));
export const emailEnabled = import.meta.env.VITE_EMAIL_AUTH === 'true';
const client = configured ? createClient(url, key, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: false
  }
}) : null;
function api() {
  if (!client) throw Error('CONFIG');
  return client;
}
function checked({
  data,
  error
}) {
  if (error) throw Error(error.message);
  return data;
}
export async function session() {
  return checked(await api().auth.getSession()).session?.user ?? null;
}
export function watchAuth(fn) {
  const {
    data
  } = api().auth.onAuthStateChange((_event, s) => fn(s?.user ?? null));
  return () => data.subscription.unsubscribe();
}
export async function google() {
  checked(await api().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: location.origin + '/auth/callback'
    }
  }));
}
export async function callback(code) {
  return checked(await api().auth.exchangeCodeForSession(code));
}
export async function email(mode, email, password) {
  const auth = api().auth;
  if (mode === 'signup') return checked(await auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: location.origin + '/auth/callback'
    }
  }));
  if (mode === 'recover') return checked(await auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + '/auth/reset'
  }));
  if (mode === 'reset') return checked(await auth.updateUser({
    password
  }));
  return checked(await auth.signInWithPassword({
    email,
    password
  }));
}
export async function logout() {
  checked(await api().auth.signOut());
}
// Svako čitanje ide u bazu. Paginacija obuhvata i kataloge sa više od hiljadu zapisa.
export async function rows(table, filters = {}, columns = '*', order = 'id') {
  const result = [];
  const size = 500;
  for (let start = 0;; start += size) {
    let q = api().from(table).select(columns);
    for (const [key, value] of Object.entries(filters)) q = q.eq(key, value);
    q = q.order(order);
    if (order !== 'id' && table !== 'admins') q = q.order('id');
    let page = checked(await q.range(start, start + size - 1));
    result.push(...page);
    if (page.length < size) return result;
  }
}
export async function insert(table, data) {
  return checked(await api().from(table).insert(data).select().single());
}
export async function update(table, id, data) {
  return checked(await api().from(table).update(data).eq('id', id).select().single());
}
export async function remove(table, id) {
  checked(await api().from(table).delete().eq('id', id).select().single());
}
export async function rpc(name, args) {
  return checked(await api().rpc(name, args));
}
// Ne čuvamo lozinke, razgovore ili nacrte u localStorage. SDK obnavlja korisničku sesiju.
export async function profile(user) {
  let existing = await rows('profiles', {
    id: user.id
  });
  if (existing.length) return existing[0];
  let name = (user.user_metadata?.full_name || user.user_metadata?.name || '').slice(0, 100);
  const res = await api().from('profiles').upsert({
    id: user.id,
    name
  }, {
    onConflict: 'id',
    ignoreDuplicates: true
  });
  checked(res);
  return (await rows('profiles', {
    id: user.id
  }))[0];
}
export async function upload(bucket, path, file) {
  let max = bucket === 'avatars' ? 2097152 : 4194304;
  if (!['image/jpeg', 'image/webp', 'image/png'].includes(file.type) || file.size > max) throw Error('IMAGE');
  // Dekodiranje odbacuje nečitljivu sliku. WebP umanjuje potrošnju korisničke kvote.
  const image = await createImageBitmap(file).catch(() => {
    throw Error('IMAGE');
  });
  let content;
  try {
    const maxSide = bucket === 'avatars' ? 384 : 1800;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.87));
    content = blob && blob.size < file.size ? blob : file;
  } finally {
    image.close();
  }
  checked(await api().storage.from(bucket).upload(path, content, {
    upsert: false,
    contentType: content.type
  }));
  return path;
}
export async function dropFile(bucket, path) {
  if (path) checked(await api().storage.from(bucket).remove([path]));
}
export function avatar(path) {
  return path && client ? client.storage.from('avatars').getPublicUrl(path).data.publicUrl : '';
}
export async function imageUrl(path) {
  return path ? checked(await api().storage.from('portfolio').createSignedUrl(path, 3600)).signedUrl : '';
}
export function listen(thread, refresh) {
  const c = api().channel('messages-' + thread + '-' + crypto.randomUUID()).on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: 'thread_id=eq.' + thread
  }, refresh).subscribe();
  return () => {
    api().removeChannel(c);
  };
}
