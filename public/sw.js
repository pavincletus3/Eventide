if (!self.define) {
  let e,
    s = {};
  const i = (i, t) => (
    (i = new URL(i + ".js", t).href),
    s[i] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          (e.src = i), (e.onload = s), document.head.appendChild(e);
        } else (e = i), importScripts(i), s();
      }).then(() => {
        let e = s[i];
        if (!e) throw new Error(`Module ${i} didn't register its module`);
        return e;
      })
  );
  self.define = (t, a) => {
    const c =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[c]) return;
    let n = {};
    const r = (e) => i(e, c),
      o = { module: { uri: c }, exports: n, require: r };
    s[c] = Promise.all(t.map((e) => o[e] || r(e))).then((e) => (a(...e), n));
  };
}
define(["./workbox-f52fd911"], function (e) {
  "use strict";
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "8a070f4d4c35fb899cbaea8bbf96c402",
        },
        {
          url: "/_next/static/chunks/13-41f86c1cef562697.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/143-2ea03acf8010622f.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/266-42ab82f6e6005f16.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/341.34f2b76c309db662.js",
          revision: "34f2b76c309db662",
        },
        {
          url: "/_next/static/chunks/36b4fd63-7beed69b97a8fa0b.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/472.a3826d29d6854395.js",
          revision: "a3826d29d6854395",
        },
        {
          url: "/_next/static/chunks/4bd1b696-c0e5d5216c18d1a0.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/66-0e2096161451716b.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/662-6a9eed6836ada97d.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/669-3b05f086e0355d1b.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/684-16b36843535c09b7.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/715-99e65d6af6225979.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/766-41702d4e62bd5288.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/879-35cbdeb828708540.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/943-ec4820b0885e1aa0.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-a3cc41667356e2de.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/admin/users/page-08b46bb6dc83ce54.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/events/%5Bid%5D/page-3211e8a79c77adfe.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/events/create/page-d3ab885b35ab4706.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/events/page-1f48e0846422c701.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/layout-e4a8620b02db6f2f.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/login/page-fe6d9a0e1ceed307.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/organizer/dashboard/page-2c38e8035161e988.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/organizer/event/%5BeventId%5D/registrations/page-b2630f1d0861a15f.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/page-f3cbb1f7a1db8f90.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/app/register/page-26755f3c6420d907.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/bc9e92e6-e6be78ce8ca84dde.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/framework-6d868e9bc95e10d8.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/main-4ee46a0f3e6fdd0b.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/main-app-af6a175b5ef63c6f.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/pages/_app-f49b2a5977e4bd4f.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/pages/_error-c67e5ae945ee3c40.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-0540ea007ec083ed.js",
          revision: "euISQIoUD7ipFoZZrF3WC",
        },
        {
          url: "/_next/static/css/2745add0ad7c93a6.css",
          revision: "2745add0ad7c93a6",
        },
        {
          url: "/_next/static/euISQIoUD7ipFoZZrF3WC/_buildManifest.js",
          revision: "7d28cb5d5054a73adc6b1ac7649e0a64",
        },
        {
          url: "/_next/static/euISQIoUD7ipFoZZrF3WC/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/media/569ce4b8f30dc480-s.p.woff2",
          revision: "ef6cefb32024deac234e82f932a95cbd",
        },
        {
          url: "/_next/static/media/747892c23ea88013-s.woff2",
          revision: "a0761690ccf4441ace5cec893b82d4ab",
        },
        {
          url: "/_next/static/media/8d697b304b401681-s.woff2",
          revision: "cc728f6c0adb04da0dfcb0fc436a8ae5",
        },
        {
          url: "/_next/static/media/93f479601ee12b01-s.p.woff2",
          revision: "da83d5f06d825c5ae65b7cca706cb312",
        },
        {
          url: "/_next/static/media/9610d9e46709d722-s.woff2",
          revision: "7b7c0ef93df188a852344fc272fc096b",
        },
        {
          url: "/_next/static/media/ba015fad6dcf6784-s.woff2",
          revision: "8ea4f719af3312a055caf09f34c89a77",
        },
        { url: "/manifest.json", revision: "a325f7694ad7bc8b5cfe1ff5d26fbaed" },
      ],
      { ignoreURLParametersMatching: [] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: i,
              state: t,
            }) =>
              s && "opaqueredirect" === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: "OK",
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /^https:\/\/www\.gstatic\.com\/firebasejs\/.*/,
      new e.CacheFirst({
        cacheName: "firebase-js-cache",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET"
    );
});
