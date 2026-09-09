const CACHE = 'keep-healthy-v4-2';
const OFFLINE = '/offline.html';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll([OFFLINE,'/manifest.webmanifest','/icon-192.png','/icon-512.png']))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('keep-healthy-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('sign'))return;
 if(request.mode==='navigate'){
   event.respondWith(fetch(request).then(response=>{if(response.ok&&url.pathname==='/'){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put('/',copy)));}return response;}).catch(async()=>await caches.match('/')||await caches.match(OFFLINE)));
 }else if(/\.(?:js|css|png|svg|woff2|webmanifest)$/.test(url.pathname)){
   event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copy)));}return response;})));
 }
});
