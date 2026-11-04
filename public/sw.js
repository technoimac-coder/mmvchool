self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title || 'MMV Smart School', {
    body: data.body || 'มีรายการแจ้งเตือนใหม่',
    icon: '/school-logo.png', badge: '/school-logo.png',
    tag: data.tag || 'mmv-notification', renotify: true,
    data: { url: data.url || '/#dashboard' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/#dashboard', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    for (const client of windows) {
      if ('focus' in client) { client.navigate(target); return client.focus(); }
    }
    return clients.openWindow(target);
  }));
});
