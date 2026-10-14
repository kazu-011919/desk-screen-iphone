const PREFIX='desk-screen:'+self.registration.scope+':';
const CACHE=PREFIX+'10';
const URLS=['index.html','screen.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'].map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(URLS);
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data&&event.data.type==='OFFLINE_STATUS'&&event.ports[0])event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const present=await Promise.all(URLS.map(url=>cache.match(url)));
 event.ports[0].postMessage({ready:present.every(Boolean)});
 })());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 const isHome=event.request.mode==='navigate'&&(url.pathname===scope.pathname||url.pathname===scope.pathname+'index.html'||url.pathname===scope.pathname+'screen.html');
 if(isHome){event.respondWith((async()=>{
  const cache=await caches.open(CACHE),homeURL=url.pathname.endsWith('/screen.html')?URLS[1]:URLS[0],controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4000);
  try{const response=await fetch(event.request,{signal:controller.signal});
   if(!response.ok||response.redirected||!response.headers.get('content-type')?.includes('text/html'))throw new Error('unavailable');
   await cache.put(homeURL,response.clone());return response;
  }catch(error){const offline=await cache.match(homeURL);if(offline)return offline;throw error;}
  finally{clearTimeout(timer);}
 })());return;}
 if(URLS.includes(url.href))event.respondWith((async()=>{
 const cache=await caches.open(CACHE);return (await cache.match(url.href))||fetch(event.request);
 })());
});
