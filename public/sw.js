/* RevLord message notifications: generic preview protects private conversation text. */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch (_) {}
  const thread = /^[a-f\d-]{36}$/i.test(String(data.thread || '')) ? data.thread : '';
  const options = {
    body: 'Imaš novu poruku na RevLord platformi.',
    icon: '/icons/revlord-192.png', badge: '/icons/revlord-192.png',
    tag: 'rg-new-message-' + (thread || 'inbox'), renotify: false,
    data: { url: '/?thread=' + encodeURIComponent(thread) }
  };
  event.waitUntil(self.registration.showNotification('Nova poruka Revlord-Group',options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/',self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil((async()=>{
    const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if(new URL(client.url).origin!==url.origin) continue;
      await client.navigate(url.toString());
      return client.focus();
    }
    return self.clients.openWindow(url.toString());
  })());
});
