/* ═══════════════════════════════════════════
   service worker · обучалка local adaptation
   кэширует всё для офлайн-работы
   ═══════════════════════════════════════════ */

const CACHE_NAME = "obuchalka-v1";

// что кэшировать при установке
const CORE_FILES = [
  "./",
  "./index.html",
  "./_shared/style.css",
  "./_shared/app.js",
  "./_shared/profile.html",
  "./web/index.html",
  "./ai/index.html",
  "./python/index.html"
];

// установка: кэшируем основные файлы
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_FILES).catch(() => {
        // если какой-то файл не нашёлся — не падаем
        return Promise.all(
          CORE_FILES.map(url =>
            cache.add(url).catch(() => null)
          )
        );
      });
    })
  );
  self.skipWaiting();
});

// активация: удаляем старые кэши
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// запросы: сначала кэш, потом сеть (и обновляем кэш)
self.addEventListener("fetch", (event) => {
  // не кэшируем внешние ссылки (картинки с pinterest и т.д.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        // обновляем кэш свежей версией
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => cached);

      return cached || network;
    })
  );
});