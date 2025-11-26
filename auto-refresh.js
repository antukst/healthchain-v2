// auto-refresh.js - Auto-refresh UI when data syncs from other devices

console.log('🔄 Auto-refresh module loaded');

// Listen for CouchDB sync changes
window.addEventListener('couchdb-sync-change', function(event) {
  console.log('📥 Received CouchDB sync change event:', event.detail);
  
  const docs = event.detail.docs || [];
  
  if (docs.length > 0) {
    console.log(`🔄 Auto-refreshing UI - ${docs.length} new documents synced`);
    
    // Show notification to user
    showNotification(`📥 Synced ${docs.length} record(s) from remote device`, 'info');
    
    // Refresh patient list if we're on the main page
    if (typeof loadPatientList === 'function') {
      setTimeout(() => {
        loadPatientList();
        updateStats();
        console.log('✅ Patient list refreshed');
      }, 500);
    }
    
    // Refresh dashboard if we're on dashboard page
    if (typeof loadDashboard === 'function') {
      setTimeout(() => {
        loadDashboard();
        console.log('✅ Dashboard refreshed');
      }, 500);
    }
  }
});

// Listen for MongoDB sync changes
window.addEventListener('mongodb-sync-change', function(event) {
  console.log('📥 Received MongoDB sync change event:', event.detail);
  
  const { pulled, pushed } = event.detail || {};
  
  if (pulled > 0) {
    console.log(`🔄 Auto-refreshing UI - ${pulled} records pulled from MongoDB`);
    
    // Show notification to user
    showNotification(`📥 Synced ${pulled} record(s) from MongoDB Atlas`, 'success');
    
    // Refresh patient list if we're on the main page
    if (typeof loadPatientList === 'function') {
      setTimeout(() => {
        loadPatientList();
        updateStats();
        console.log('✅ Patient list refreshed');
      }, 500);
    }
    
    // Refresh dashboard if we're on dashboard page
    if (typeof loadDashboard === 'function') {
      setTimeout(() => {
        loadDashboard();
        console.log('✅ Dashboard refreshed');
      }, 500);
    }
  }
});

// Listen for PouchDB changes (local database updates)
if (typeof db !== 'undefined') {
  db.changes({
    since: 'now',
    live: true,
    include_docs: true
  }).on('change', function(change) {
    console.log('📝 Local database changed:', change.id);
    
    // Only refresh if change came from remote sync
    if (change.doc && !change.doc._deleted) {
      // Check if this change came from sync (has synced_from field)
      if (change.doc.synced_from || change.doc.synced_at) {
        console.log('🔄 Remote change detected - refreshing UI');
        
        // Refresh patient list
        if (typeof loadPatientList === 'function') {
          setTimeout(() => {
            loadPatientList();
            updateStats();
          }, 1000);
        }
      }
    }
  }).on('error', function(err) {
    console.error('❌ Change listener error:', err);
  });
  
  console.log('✅ Auto-refresh listener registered on PouchDB');
}

// Periodic sync check (every 30 seconds)
setInterval(async function() {
  if (typeof syncManager !== 'undefined' && syncManager.syncStatus) {
    const status = syncManager.getSyncStatus();
    
    // Check if we haven't synced in a while
    const lastIPFSSync = status.ipfs.lastSync ? new Date(status.ipfs.lastSync) : null;
    const now = new Date();
    
    if (!lastIPFSSync || (now - lastIPFSSync) > 5 * 60 * 1000) { // 5 minutes
      console.log('⏰ Periodic IPFS sync check...');
      
      try {
        const result = await syncManager.syncFromIPFS();
        
        if (result && result.newRecords > 0) {
          console.log(`📥 Found ${result.newRecords} new records from IPFS`);
          showNotification(`📥 Synced ${result.newRecords} record(s) from IPFS`, 'success');
          
          // Refresh UI
          if (typeof loadPatientList === 'function') {
            loadPatientList();
            updateStats();
          }
        }
      } catch (error) {
        console.warn('⚠️ Periodic IPFS sync failed:', error.message);
      }
    }
  }
}, 30000); // Check every 30 seconds

// Manual sync button handler
window.manualSync = async function() {
  console.log('🔄 Manual sync triggered...');
  showNotification('🔄 Syncing...', 'info');
  
  try {
    let syncedCount = 0;
    
    // Sync from IPFS
    if (typeof syncManager !== 'undefined') {
      const ipfsResult = await syncManager.syncFromIPFS();
      if (ipfsResult && ipfsResult.newRecords) {
        syncedCount += ipfsResult.newRecords;
      }
    }
    
    // CouchDB sync happens automatically in background
    
    if (syncedCount > 0) {
      showNotification(`✅ Synced ${syncedCount} new record(s)`, 'success');
      
      // Refresh UI
      if (typeof loadPatientList === 'function') {
        loadPatientList();
        updateStats();
      }
    } else {
      showNotification('✅ Already up to date', 'info');
    }
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    showNotification('❌ Sync failed: ' + error.message, 'error');
  }
};

// Force refresh button handler
window.forceRefresh = function() {
  console.log('🔄 Force refreshing UI...');
  
  if (typeof loadPatientList === 'function') {
    loadPatientList();
    updateStats();
    showNotification('✅ UI refreshed', 'success');
  } else {
    location.reload();
  }
};

console.log('✅ Auto-refresh system ready');
console.log('💡 Use manualSync() to force sync, forceRefresh() to refresh UI');
