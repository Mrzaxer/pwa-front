self.addEventListener('install',event=>{
    cache.open("openShell_v1.0")
    .then(cache=>{
        cache.addAll([
            "/src/index.css",
            "/src/App.jsx",
            "/src/App.css",
        ]);
    });
self.skipWaiting();
});
self.addEventListener('activate',event=>{
    caches.delete("openShell");
});
self.addEventListener('fetch',event=>{
    if(event.request.method=="GET"){
        const resp=fetch(event.request)
        .then(respuesta=>{
            caches.match(event.request)
            .then(cache=>{
                if(cache===undefined){
                    caches.open("dynamic")
                    .then(cacheDyn=>{
                    cacheDyn.put(event.request, respuesta);
                 });
                
                }
            });
            return respuesta.clone();
        }).catch(error=>{
            return caches.match(event.request);
        });
    }
});