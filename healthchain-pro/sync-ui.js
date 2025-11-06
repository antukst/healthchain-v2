// sync-ui.js - UI handlers for sync modal

document.addEventListener('DOMContentLoaded', async function() {
  console.log('🔄 Sync UI initializing...');

  // Initialize sync manager
  try {
    await syncManager.init();
    console.log('✅ Sync Manager initialized');
  } catch (error) {
    console.error('❌ Sync Manager init failed:', error);
  }

  // DOM Elements
  const syncModal = document.getElementById('syncModal');
  const openSyncBtn = document.getElementById('openSyncBtn');
  const closeSyncModal = document.getElementById('closeSyncModal');
  const syncNowIPFS = document.getElementById('syncNowIPFS');
  const couchdbToggle = document.getElementById('couchdbToggle');
  const couchdbUrl = document.getElementById('couchdbUrl');
  const saveCouchDB = document.getElementById('saveCouchDB');
  const copyDeviceId = document.getElementById('copyDeviceId');
  const deviceIdDisplay = document.getElementById('deviceIdDisplay');
  const exportAllJSON = document.getElementById('exportAllJSON');
  const importJSONBtn = document.getElementById('importJSONBtn');
  const importJSONInput = document.getElementById('importJSONInput');

  // Status elements
  const ipfsSyncStatus = document.getElementById('ipfsSyncStatus');
  const ipfsLastSync = document.getElementById('ipfsLastSync');
  const couchdbSyncStatus = document.getElementById('couchdbSyncStatus');
  const couchdbLastSync = document.getElementById('couchdbLastSync');

  // Display device ID
  if (deviceIdDisplay) {
    const deviceId = syncManager.getDeviceId();
    deviceIdDisplay.textContent = deviceId;
  }

  // Open modal
  if (openSyncBtn) {
    openSyncBtn.addEventListener('click', () => {
      if (syncModal) {
        syncModal.classList.remove('hidden');
        updateSyncStatus();
      }
    });
  }

  // Close modal
  if (closeSyncModal) {
    closeSyncModal.addEventListener('click', () => {
      if (syncModal) {
        syncModal.classList.add('hidden');
      }
    });
  }

  // Close on backdrop click
  if (syncModal) {
    syncModal.addEventListener('click', (e) => {
      if (e.target === syncModal) {
        syncModal.classList.add('hidden');
      }
    });
  }

  // Copy Device ID
  if (copyDeviceId) {
    copyDeviceId.addEventListener('click', async () => {
      const deviceId = syncManager.getDeviceId();
      try {
        await navigator.clipboard.writeText(deviceId);
        showNotification('Device ID copied to clipboard!', 'success');
      } catch (error) {
        console.error('Failed to copy:', error);
        showNotification('Failed to copy Device ID', 'error');
      }
    });
  }

  // Sync Now (IPFS)
  if (syncNowIPFS) {
    syncNowIPFS.addEventListener('click', async () => {
      try {
        if (!isSystemInitialized) {
          showNotification('System not initialized yet', 'error');
          return;
        }

        showNotification('Starting IPFS sync...', 'info');
        ipfsSyncStatus.textContent = '🔄 Syncing...';
        ipfsSyncStatus.className = 'px-2 py-1 rounded-full bg-blue-300 dark:bg-blue-600 text-xs';

        const result = await syncManager.syncFromIPFS();
        
        if (result.error) {
          throw new Error(result.error);
        }

        ipfsSyncStatus.textContent = '✅ Synced';
        ipfsSyncStatus.className = 'px-2 py-1 rounded-full bg-green-300 dark:bg-green-600 text-xs';
        
        if (ipfsLastSync) {
          ipfsLastSync.textContent = `Last: ${new Date().toLocaleTimeString()}`;
        }

        showNotification(`IPFS Sync complete! ${result.newRecords} new records, ${result.syncedRecords} existing`, 'success');
        
        // Refresh patient list if function exists
        if (typeof refreshPatientList === 'function') {
          await refreshPatientList();
        }
      } catch (error) {
        console.error('IPFS sync failed:', error);
        ipfsSyncStatus.textContent = '❌ Error';
        ipfsSyncStatus.className = 'px-2 py-1 rounded-full bg-red-300 dark:bg-red-600 text-xs';
        showNotification('IPFS sync failed: ' + error.message, 'error');
      }
    });
  }

  // CouchDB Toggle
  if (couchdbToggle) {
    couchdbToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        const url = couchdbUrl?.value || localStorage.getItem('healthchain_couchdb_url');
        if (url) {
          syncManager.configureRemoteDB(url);
          syncManager.startCouchDBSync();
          couchdbSyncStatus.textContent = '🔄 Syncing';
          couchdbSyncStatus.className = 'px-2 py-1 rounded-full bg-green-300 dark:bg-green-600 text-xs';
          showNotification('CouchDB sync started', 'success');
        } else {
          showNotification('Please enter CouchDB URL first', 'error');
          e.target.checked = false;
        }
      } else {
        syncManager.syncStatus.couchdb.enabled = false;
        couchdbSyncStatus.textContent = '⏸️ Off';
        couchdbSyncStatus.className = 'px-2 py-1 rounded-full bg-gray-300 dark:bg-gray-600 text-xs';
        showNotification('CouchDB sync disabled', 'info');
      }
    });
  }

  // Save CouchDB URL
  if (saveCouchDB) {
    saveCouchDB.addEventListener('click', () => {
      const url = couchdbUrl?.value;
      if (!url) {
        showNotification('Please enter CouchDB URL', 'error');
        return;
      }

      syncManager.configureRemoteDB(url);
      syncManager.startCouchDBSync();
      
      if (couchdbToggle) {
        couchdbToggle.checked = true;
      }
      
      couchdbSyncStatus.textContent = '🔄 Syncing';
      couchdbSyncStatus.className = 'px-2 py-1 rounded-full bg-green-300 dark:bg-green-600 text-xs';
      showNotification('CouchDB configured and sync started!', 'success');
    });
  }

  // Load saved CouchDB URL
  const savedUrl = localStorage.getItem('healthchain_couchdb_url');
  if (savedUrl && couchdbUrl) {
    couchdbUrl.value = savedUrl;
  }

  // Export All JSON
  if (exportAllJSON) {
    exportAllJSON.addEventListener('click', async () => {
      try {
        showNotification('Exporting all patient data...', 'info');
        const success = await syncManager.exportAllPatients();
        if (success) {
          showNotification('All patient data exported successfully!', 'success');
        } else {
          showNotification('Export failed', 'error');
        }
      } catch (error) {
        console.error('Export failed:', error);
        showNotification('Export failed: ' + error.message, 'error');
      }
    });
  }

  // Import JSON Button
  if (importJSONBtn && importJSONInput) {
    importJSONBtn.addEventListener('click', () => {
      importJSONInput.click();
    });

    importJSONInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        showNotification('Importing patient data...', 'info');
        const result = await syncManager.importFromJSON(file);
        
        if (result) {
          showNotification(`Import complete! ${result.imported} new patients, ${result.skipped} skipped`, 'success');
          
          // Refresh patient list
          if (typeof refreshPatientList === 'function') {
            await refreshPatientList();
          }
        } else {
          showNotification('Import failed', 'error');
        }
      } catch (error) {
        console.error('Import failed:', error);
        showNotification('Import failed: ' + error.message, 'error');
      }

      // Reset input
      e.target.value = '';
    });
  }

  // Update sync status periodically
  function updateSyncStatus() {
    const status = syncManager.getSyncStatus();
    
    // IPFS Status
    if (ipfsSyncStatus) {
      if (status.ipfs.status === 'synced') {
        ipfsSyncStatus.textContent = '✅ Synced';
        ipfsSyncStatus.className = 'px-2 py-1 rounded-full bg-green-300 dark:bg-green-600 text-xs';
      } else if (status.ipfs.status === 'syncing') {
        ipfsSyncStatus.textContent = '🔄 Syncing';
        ipfsSyncStatus.className = 'px-2 py-1 rounded-full bg-blue-300 dark:bg-blue-600 text-xs';
      } else if (status.ipfs.status === 'error') {
        ipfsSyncStatus.textContent = '❌ Error';
        ipfsSyncStatus.className = 'px-2 py-1 rounded-full bg-red-300 dark:bg-red-600 text-xs';
      } else {
        ipfsSyncStatus.textContent = '⏳ Idle';
        ipfsSyncStatus.className = 'px-2 py-1 rounded-full bg-gray-300 dark:bg-gray-600 text-xs';
      }
    }

    if (ipfsLastSync && status.ipfs.lastSync) {
      const lastSync = new Date(status.ipfs.lastSync);
      ipfsLastSync.textContent = `Last: ${lastSync.toLocaleTimeString()}`;
    }

    // CouchDB Status
    if (couchdbSyncStatus) {
      if (status.couchdb.status === 'synced' || status.couchdb.status === 'syncing') {
        couchdbSyncStatus.textContent = '✅ Active';
        couchdbSyncStatus.className = 'px-2 py-1 rounded-full bg-green-300 dark:bg-green-600 text-xs';
      } else if (status.couchdb.status === 'error') {
        couchdbSyncStatus.textContent = '❌ Error';
        couchdbSyncStatus.className = 'px-2 py-1 rounded-full bg-red-300 dark:bg-red-600 text-xs';
      } else {
        couchdbSyncStatus.textContent = '⏸️ Off';
        couchdbSyncStatus.className = 'px-2 py-1 rounded-full bg-gray-300 dark:bg-gray-600 text-xs';
      }
    }

    if (couchdbLastSync && status.couchdb.lastSync) {
      const lastSync = new Date(status.couchdb.lastSync);
      couchdbLastSync.textContent = `Last: ${lastSync.toLocaleTimeString()}`;
    }
  }

  // Update status every 10 seconds
  setInterval(updateSyncStatus, 10000);

  console.log('✅ Sync UI initialized');
});
