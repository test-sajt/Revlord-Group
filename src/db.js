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
  await disableNotifications().catch(() => {});
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
    if (order !== 'id' && !['admins','listing_review_stats','profile_review_stats'].includes(table)) q = q.order('id');
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
    const maxSide = bucket === 'avatars' ? (path.includes('/cover/') ? 1600 : 384) : 1800;
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
export async function mediaUrl(bucket, path) {
  return path ? checked(await api().storage.from(bucket).createSignedUrl(path, 3600)).signedUrl : '';
}
export async function imageUrl(path) { return mediaUrl('portfolio', path); }
export function inbox() { return rpc('inbox_overview', {}); }
export function deleteChatForMe(thread) { return rpc('delete_chat_for_me', {thread}); }
export async function chatHistory(thread) {
  try { return await rpc('chat_history', {thread}); }
  catch (error) {
    // Keep existing conversations functional even before the new optional SQL migration is applied.
    if (/PGRST202|chat_history.*not found|could not find the function/i.test(String(error?.message || error))) {
      return rows('messages', {thread_id: thread}, '*', 'created_at');
    }
    throw error;
  }
}
// Separate shared room: existing private thread/message APIs are untouched.
export function liveChatHistory() { return rpc('live_chat_history', {}); }
export function sendLiveChat(sender, body) { return insert('live_chat_messages', { sender, body }); }
export function listenLiveChat(refresh) {
  const channel = api().channel('live-chat-' + crypto.randomUUID())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_chat_messages' }, refresh)
    .subscribe();
  return () => { api().removeChannel(channel); };
}
export function markRead(thread) { return rpc('mark_thread_read', {thread}); }
export function listenInbox(refresh) {
  const channel = api().channel('inbox-' + crypto.randomUUID())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => refresh(payload))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'threads' }, payload => refresh(payload))
    .subscribe();
  return () => { api().removeChannel(channel); };
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

// Permissions are requested only after a user clicks "Enable notifications".
const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
export const pushConfigured = Boolean(vapidPublicKey);
function applicationServerKey(value) {
  const padded = (value.replace(/-/g, '+').replace(/_/g, '/') + '====').slice(0, value.length + (4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
export function canNotify() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && window.isSecureContext;
}
export async function enableNotifications(userId) {
  if (!canNotify()) throw Error('NOTIFICATIONS_UNSUPPORTED');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw Error('NOTIFICATIONS_DENIED');
  localStorage.removeItem('rg-notifications-optout');
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  if (!vapidPublicKey) return 'local';
  if (!registration.pushManager) throw Error('PUSH_UNSUPPORTED');
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    // If the browser has changed accounts, never attach the old push endpoint to a new user.
    const own = checked(await api().from('push_subscriptions').select('id').eq('endpoint',subscription.endpoint));
    if (!own?.length) { await subscription.unsubscribe(); subscription=null; }
  }
  if (!subscription) subscription = await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationServerKey(vapidPublicKey)});
  const json=subscription.toJSON();
  const keys=json.keys || {};
  if (!json.endpoint || !keys.p256dh || !keys.auth) throw Error('PUSH_SUBSCRIPTION_FAILED');
  const prior=checked(await api().from('push_subscriptions').select('id').eq('endpoint',json.endpoint));
  if (!prior?.length) checked(await api().from('push_subscriptions').insert({user_id:userId,endpoint:json.endpoint,p256dh:keys.p256dh,auth_key:keys.auth}));
  return 'push';
}
export async function notificationsEnabled() {
  if (localStorage.getItem('rg-notifications-optout')==='true') return false;
  if (!canNotify() || Notification.permission!=='granted') return false;
  if (!vapidPublicKey) return false;
  const reg=await navigator.serviceWorker.getRegistration('/');
  if (!reg) return false;
  const sub=await reg.pushManager.getSubscription();
  if (!sub) return false;
  const own=checked(await api().from('push_subscriptions').select('id').eq('endpoint',sub.endpoint));
  return Boolean(own?.length);
}
export async function disableNotifications() {
  localStorage.setItem('rg-notifications-optout','true');
  if (!canNotify()) return;
  const reg=await navigator.serviceWorker.getRegistration('/');
  const sub=await reg?.pushManager?.getSubscription();
  if(sub) {
    if(client) checked(await client.from('push_subscriptions').delete().eq('endpoint',sub.endpoint));
    await sub.unsubscribe();
  }
}
export async function showInTabNotification(threadId) {
  if (localStorage.getItem('rg-notifications-optout')==='true') return;
  if (!canNotify() || Notification.permission !== 'granted') return;
  const registration=await navigator.serviceWorker.register('/sw.js');
  await registration.showNotification('Nova poruka Revlord-Group',{
    body:'Imaš novu poruku na RevLord platformi.', icon:'/icons/revlord-192.png',
    tag:'rg-new-message-'+threadId, data:{url:'/?thread='+encodeURIComponent(threadId)}
  });
}
