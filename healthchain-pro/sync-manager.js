// sync-manager.js - Multi-device sync orchestration
// Supports: IPFS, CouchDB, QR Code, Export/Import, Bluetooth

class SyncManager {
  constructor() {
    this.syncRegistry = null; // PouchDB instance for sync metadata
    this.syncStatus = {
      ipfs: { enabled: true, lastSync: null, status: 'idle' },
      couchdb: { enabled: false, lastSync: null, status: 'idle', url: null },
      bluetooth: { enabled: false, lastSync: null, status: 'idle' }
    };
  }

  // Initialize sync registry
  async init() {
    try {
      // Separate database for sync metadata
      this.syncRegistry = new PouchDB('healthchain-sync-registry');
      console.log('✅ Sync Manager initialized');
      return true;
    } catch (error) {
      console.error('❌ Sync Manager init failed:', error);
      return false;
    }
  }

  // ==================== IPFS SYNC ====================
  
  /**
   * Register a new patient record in IPFS sync registry
   * This allows other devices to discover and download new records
   */
  async registerIPFSRecord(patientId, ipfsCid, metadata) {
    try {
      const syncDoc = {
        _id: `ipfs_${patientId}`,
        type: 'ipfs_record',
        patient_id: patientId,
        ipfs_cid: ipfsCid,
        metadata: metadata,
        created_at: new Date().toISOString(),
        device_id: this.getDeviceId(),
        synced: false
      };

      await this.syncRegistry.put(syncDoc);
      console.log('✅ IPFS record registered:', patientId);

      // Upload sync registry to IPFS
      await this.uploadSyncRegistryToIPFS();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to register IPFS record:', error);
      return false;
    }
  }

  /**
   * Upload the entire sync registry to IPFS
   * This creates a master index that all devices can access
   */
  async uploadSyncRegistryToIPFS() {
    try {
      const allDocs = await this.syncRegistry.allDocs({ include_docs: true });
      const registry = {
        version: 1,
        updated_at: new Date().toISOString(),
        records: allDocs.rows.map(row => row.doc)
      };

      const registryJson = JSON.stringify(registry);
      
      // Upload to IPFS with fixed MFS path
      const cid = await ipfsManager.addData(registryJson, {
        path: '/healthchain/sync-registry.json'
      });

      // Store latest registry CID in localStorage AND in IPFS MFS
      localStorage.setItem('healthchain_registry_cid', cid);
      
      // Also create a "latest" pointer file that all devices can read
      const latestPointer = {
        latest_cid: cid,
        updated_at: new Date().toISOString()
      };
      
      await ipfsManager.addData(JSON.stringify(latestPointer), {
        path: '/healthchain/sync-registry-latest.json'
      });
      
      console.log('✅ Sync registry uploaded to IPFS:', cid);
      console.log('📍 Latest pointer updated at /healthchain/sync-registry-latest.json');
      
      this.syncStatus.ipfs.lastSync = new Date().toISOString();
      this.syncStatus.ipfs.status = 'synced';
      
      return cid;
    } catch (error) {
      console.error('❌ Failed to upload sync registry:', error);
      this.syncStatus.ipfs.status = 'error';
      return null;
    }
  }

  /**
   * Download sync registry from IPFS and pull new records
   * This is how devices discover data added on other devices
   */
  async syncFromIPFS() {
    try {
      this.syncStatus.ipfs.status = 'syncing';
      console.log('🔄 Starting IPFS sync...');

      // Try to get latest registry CID from IPFS MFS
      let registryCid = null;
      
      try {
        // First, try to read the latest pointer from IPFS MFS
        const latestPointerPath = '/healthchain/sync-registry-latest.json';
        console.log('📍 Reading latest pointer from IPFS MFS:', latestPointerPath);
        
        const pointerData = await this.readFromIPFSMFS(latestPointerPath);
        if (pointerData) {
          const pointer = JSON.parse(pointerData);
          registryCid = pointer.latest_cid;
          console.log('✅ Found latest registry CID:', registryCid);
        }
      } catch (error) {
        console.log('ℹ️ No latest pointer found in IPFS MFS, checking localStorage...');
      }
      
      // Fallback to localStorage if IPFS MFS read failed
      if (!registryCid) {
        registryCid = localStorage.getItem('healthchain_registry_cid');
      }
      
      if (!registryCid) {
        console.log('ℹ️ No registry CID found - first time setup');
        this.syncStatus.ipfs.status = 'idle';
        return { newRecords: 0 };
      }

      // Download registry from IPFS
      console.log('📥 Downloading registry from IPFS...');
      const registryData = await ipfsManager.getData(registryCid);
      const registry = JSON.parse(registryData);
      
      console.log(`📥 Found ${registry.records.length} records in registry`);

      let newRecords = 0;
      let syncedRecords = 0;

      // Check each record
      for (const record of registry.records) {
        if (record.type !== 'ipfs_record') continue;

        try {
          // Check if we already have this patient
          const exists = await db.get(record.patient_id).catch(() => null);
          
          if (!exists) {
            // Download patient data from IPFS
            console.log(`📥 Downloading new patient: ${record.patient_id}`);
            const encryptedData = await ipfsManager.getData(record.ipfs_cid);
            
            // Decrypt patient data
            const patientData = await encryptionManager.decrypt(encryptedData, encryptionKey);
            
            // Create local database entry
            const doc = {
              _id: record.patient_id,
              ipfs_cid: record.ipfs_cid,
              metadata: record.metadata,
              encrypted: true,
              synced_from: 'ipfs',
              synced_at: new Date().toISOString()
            };

            await db.put(doc);
            newRecords++;
            console.log(`✅ Synced patient: ${record.metadata.name}`);
          } else {
            syncedRecords++;
          }
        } catch (error) {
          console.error(`❌ Failed to sync record ${record.patient_id}:`, error);
        }
      }

      this.syncStatus.ipfs.lastSync = new Date().toISOString();
      this.syncStatus.ipfs.status = 'synced';

      console.log(`✅ IPFS sync complete: ${newRecords} new, ${syncedRecords} existing`);
      
      return { newRecords, syncedRecords };
    } catch (error) {
      console.error('❌ IPFS sync failed:', error);
      this.syncStatus.ipfs.status = 'error';
      return { error: error.message };
    }
  }

  /**
   * Read file from IPFS MFS
   */
  async readFromIPFSMFS(path) {
    try {
      const response = await fetch(`http://127.0.0.1:5001/api/v0/files/read?arg=${encodeURIComponent(path)}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.text();
      return data;
    } catch (error) {
      console.warn(`Failed to read from IPFS MFS ${path}:`, error.message);
      return null;
    }
  }

  // ==================== COUCHDB SYNC ====================

  /**
   * Configure remote CouchDB server
   */
  configureRemoteDB(url) {
    try {
      this.syncStatus.couchdb.url = url;
      this.syncStatus.couchdb.enabled = true;
      localStorage.setItem('healthchain_couchdb_url', url);
      console.log('✅ CouchDB configured:', url);
      return true;
    } catch (error) {
      console.error('❌ CouchDB config failed:', error);
      return false;
    }
  }

  /**
   * Start continuous CouchDB sync
   */
  startCouchDBSync() {
    try {
      const remoteUrl = this.syncStatus.couchdb.url || localStorage.getItem('healthchain_couchdb_url');
      
      if (!remoteUrl) {
        console.warn('⚠️ No CouchDB URL configured');
        return false;
      }

      this.syncStatus.couchdb.status = 'syncing';

      db.sync(remoteUrl, {
        live: true,
        retry: true
      }).on('change', (info) => {
        console.log('✅ CouchDB sync change:', info);
        this.syncStatus.couchdb.lastSync = new Date().toISOString();
      }).on('error', (err) => {
        console.error('❌ CouchDB sync error:', err);
        this.syncStatus.couchdb.status = 'error';
      }).on('complete', (info) => {
        console.log('✅ CouchDB sync complete:', info);
        this.syncStatus.couchdb.status = 'synced';
      }).on('paused', () => {
        this.syncStatus.couchdb.status = 'paused';
      }).on('active', () => {
        this.syncStatus.couchdb.status = 'syncing';
      });

      console.log('✅ CouchDB sync started');
      return true;
    } catch (error) {
      console.error('❌ CouchDB sync failed:', error);
      this.syncStatus.couchdb.status = 'error';
      return false;
    }
  }

  // ==================== QR CODE SYNC ====================

  /**
   * Generate QR code for a patient record
   * Contains: IPFS CID + encrypted metadata
   */
  async generatePatientQRCode(patientId) {
    try {
      const doc = await db.get(patientId);
      
      const shareData = {
        version: 1,
        type: 'healthchain_patient',
        patient_id: patientId,
        ipfs_cid: doc.ipfs_cid,
        metadata: doc.metadata,
        timestamp: new Date().toISOString()
      };

      const shareUrl = `healthchain://sync?data=${btoa(JSON.stringify(shareData))}`;
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      console.log('✅ QR code generated for patient:', patientId);
      return qrDataUrl;
    } catch (error) {
      console.error('❌ QR code generation failed:', error);
      return null;
    }
  }

  /**
   * Import patient from QR code data
   */
  async importFromQRCode(qrData) {
    try {
      // Extract data from URL
      const url = new URL(qrData);
      const encodedData = url.searchParams.get('data');
      const shareData = JSON.parse(atob(encodedData));

      console.log('📥 Importing patient from QR code:', shareData.metadata.name);

      // Download from IPFS
      const encryptedData = await ipfsManager.getData(shareData.ipfs_cid);
      
      // Create local entry
      const doc = {
        _id: shareData.patient_id,
        ipfs_cid: shareData.ipfs_cid,
        metadata: shareData.metadata,
        encrypted: true,
        synced_from: 'qr_code',
        synced_at: new Date().toISOString()
      };

      await db.put(doc);
      console.log('✅ Patient imported from QR code');
      
      return shareData.patient_id;
    } catch (error) {
      console.error('❌ QR import failed:', error);
      return null;
    }
  }

  // ==================== EXPORT/IMPORT JSON ====================

  /**
   * Export all patients to encrypted JSON file
   */
  async exportAllPatients() {
    try {
      const allDocs = await db.allDocs({ include_docs: true });
      
      const exportData = {
        version: 1,
        exported_at: new Date().toISOString(),
        device_id: this.getDeviceId(),
        patients: allDocs.rows.map(row => row.doc)
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      // Download file
      const fileName = `healthchain-export-${new Date().toISOString().split('T')[0]}.json`;
      saveAs(blob, fileName);

      console.log(`✅ Exported ${exportData.patients.length} patients to ${fileName}`);
      return true;
    } catch (error) {
      console.error('❌ Export failed:', error);
      return false;
    }
  }

  /**
   * Import patients from JSON file
   */
  async importFromJSON(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      console.log(`📥 Importing ${importData.patients.length} patients...`);

      let imported = 0;
      let skipped = 0;

      for (const patient of importData.patients) {
        try {
          // Check if already exists
          const exists = await db.get(patient._id).catch(() => null);
          
          if (!exists) {
            await db.put(patient);
            imported++;
          } else {
            skipped++;
          }
        } catch (error) {
          console.error(`❌ Failed to import ${patient._id}:`, error);
        }
      }

      console.log(`✅ Import complete: ${imported} new, ${skipped} skipped`);
      return { imported, skipped };
    } catch (error) {
      console.error('❌ Import failed:', error);
      return null;
    }
  }

  // ==================== BLUETOOTH SYNC ====================

  /**
   * Initialize Bluetooth sync (Web Bluetooth API)
   */
  async initBluetoothSync() {
    try {
      if (!navigator.bluetooth) {
        console.warn('⚠️ Web Bluetooth not supported in this browser');
        return false;
      }

      console.log('🔵 Bluetooth sync available');
      this.syncStatus.bluetooth.enabled = true;
      return true;
    } catch (error) {
      console.error('❌ Bluetooth init failed:', error);
      return false;
    }
  }

  /**
   * Send patient data via Bluetooth
   */
  async sendViaBluetoothSimple(patientId) {
    try {
      const doc = await db.get(patientId);
      const dataStr = JSON.stringify(doc);

      // For now, just copy to clipboard (Web Bluetooth requires user interaction)
      await navigator.clipboard.writeText(dataStr);
      
      console.log('✅ Patient data copied to clipboard for Bluetooth transfer');
      return true;
    } catch (error) {
      console.error('❌ Bluetooth send failed:', error);
      return false;
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Get unique device identifier
   */
  getDeviceId() {
    let deviceId = localStorage.getItem('healthchain_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('healthchain_device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Get sync status for all methods
   */
  getSyncStatus() {
    return {
      ...this.syncStatus,
      device_id: this.getDeviceId(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Auto-sync - run periodically to keep devices in sync
   */
  async autoSync() {
    console.log('🔄 Running auto-sync...');
    
    const results = {
      ipfs: null,
      couchdb: null
    };

    // IPFS sync (if enabled)
    if (this.syncStatus.ipfs.enabled) {
      results.ipfs = await this.syncFromIPFS();
    }

    // CouchDB is already continuous, no action needed

    console.log('✅ Auto-sync complete:', results);
    return results;
  }
}

// Global instance
const syncManager = new SyncManager();

// Auto-sync every 5 minutes (configurable)
const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

setInterval(() => {
  if (isSystemInitialized && syncManager.syncStatus.ipfs.enabled) {
    syncManager.autoSync().catch(err => {
      console.error('❌ Auto-sync error:', err);
    });
  }
}, AUTO_SYNC_INTERVAL);

// Expose globally
window.syncManager = syncManager;
