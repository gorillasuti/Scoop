const CACHE_NAME = "scoop-shell-v2"
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      ),
    ])
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL)
        if (cached) return cached
        return new Response("Offline", { status: 503, statusText: "Service Unavailable" })
      })
    )
    return
  }

  event.respondWith(fetch(event.request))
})

// ===================== WEB PUSH =====================
self.addEventListener("push", (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: "Scoop", body: event.data.text() }
  }

  const title = data.title || "Scoop"
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-512.png",
    badge: data.badge || "/icon-192.png",
    data: {
      url: data.url || "/",
    },
    vibrate: [200, 100, 200],
    tag: "scoop-notification",
    renotify: true,
  }

  // Always show native notification so the OS alerts the user, even if the app tab is currently open
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle notification click - open / focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, navigate it and focus it
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(url)
          }
          return client.focus()
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url)
    })
  )
})
