/* PCInbox Admin
 * Solo existe para que el navegador permita el acceso directo.
 * No guarda páginas, ventas, sesión ni pagos.
 */
self.__pcinboxAdminSwVersion = "pcinbox-admin-pwa-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;
  if (
    event.request.cache === "only-if-cached" &&
    event.request.mode !== "same-origin"
  ) {
    return;
  }
  /* Vuelve a pedir el dato. No lo guarda en el dispositivo. */
  event.respondWith(fetch(event.request));
});
