const CACHE = 'keep-healthy-v4-9';
const OFFLINE = '/offline.html';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll([OFFLINE,'/manifest.webmanifest','/icon-192.png','/icon-512.png']))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('keep-healthy-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||['/signin-with-chatgpt','/signout-with-chatgpt','/callback'].includes(url.pathname))return;
 if(request.mode==='navigate'){
   event.respondWith((async()=>{
     const cache=await caches.open(CACHE);
     try {
       const response=await fetch(request);
       // Only the public app shell is cached, never an authentication redirect/page.
       if(url.pathname==='/'){
         if(response.redirected||response.status===401||response.status===403){const shell=await cache.match('/');if(shell)return shell;}
         else if(response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
           const html=await response.clone().text();
           if(html.includes('name="keep-healthy-shell"'))await cache.put('/',response.clone());
         }
       }
       return response;
     }catch{return await cache.match('/')||await cache.match(OFFLINE);}
   })());
 }else if(/\.(?:js|css|png|svg|woff2|webmanifest)$/.test(url.pathname)){
   event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copy)));}return response;})));
 }
});

self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
   const own=clients.find(c=>new URL(c.url).origin===self.location.origin);
   if(own)return own.focus();
   return self.clients.openWindow('/');
 }));
});
