/*
 * alpha-coach-sw.js — service worker for Alpha Coach.
 *
 * Pairs with the `Notify` module in alpha-coach.html, which registers this file
 * with scope "./" ONLY when the app is served over http(s) (see
 * Notify.canServeInBackground / registerServiceWorker). On file:// the app skips
 * registration entirely and shows meal reminders from the open tab instead.
 *
 * Meal reminders themselves are scheduled by the PAGE (Notify.plan / schedule)
 * from the wake-derived meal times and shown via the Notification API while a
 * tab is open. This worker's job is to (1) let that registration succeed so the
 * app is "background-capable", (2) show a notification if a push payload ever
 * arrives, and (3) focus/open the app when a reminder is clicked.
 *
 * It caches nothing: Alpha Coach is a single local file and must keep working
 * offline without a stale-cache layer.
 */

self.addEventListener('install', () => {
  // Activate immediately instead of waiting for existing tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of already-open pages within scope.
  event.waitUntil(self.clients.claim());
});

// Future/optional path: if a push service ever delivers a payload, surface it.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }
  const title = data.title || 'Alpha Coach';
  const body = data.body || 'Time to log a meal.';
  event.waitUntil(
    self.registration.showNotification(title, { body, tag: 'alpha-coach' })
  );
});

// Focus an existing Alpha Coach tab when a reminder is clicked, else open one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if (client.url.includes('alpha-coach') && 'focus' in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow('./alpha-coach.html');
  })());
});
