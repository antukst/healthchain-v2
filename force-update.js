// force-update.js - Force cache clear and update
(function() {
  console.log('🔄 Force updating cache...');
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
        console.log('🗑️ Deleted cache:', name);
      }
    });
  }
  
  // Unregister service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
        console.log('🗑️ Unregistered SW:', registration.scope);
      }
    });
  }
  
  // Clear localStorage cache keys
  const cacheKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('cache') || key.includes('version')) {
      cacheKeys.push(key);
    }
  }
  cacheKeys.forEach(key => localStorage.removeItem(key));
  
  // Set force update flag
  localStorage.setItem('force_update', Date.now());
  
  console.log('✅ Cache cleared! Reloading...');
  
  // Reload with cache bypass
  setTimeout(() => {
    window.location.reload(true);
  }, 1000);
})();
