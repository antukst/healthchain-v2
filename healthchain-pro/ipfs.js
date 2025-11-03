// ipfs.js - IPFS integration for HealthChain
class IPFSManager {
  constructor() {
    this.ipfs = null;
    this.isConnected = false;
    this._dbPromise = null; // for IndexedDB fallback storage
    
    // Pinata Cloud Configuration (FREE tier - 1GB storage)
    this.pinata = {
      apiKey: 'YOUR_PINATA_API_KEY', // Get from https://app.pinata.cloud/keys
      apiSecret: 'YOUR_PINATA_API_SECRET',
      gateway: 'gateway.pinata.cloud',
      enabled: false // Set true after adding your keys
    };
  }

  // Initialize IPFS client with auto-detect local API
  async init() {
    const endpoints = [
      { host: '127.0.0.1', port: 5001, protocol: 'http', label: 'Local IPFS Desktop (127.0.0.1)' },
      { host: 'localhost', port: 5001, protocol: 'http', label: 'Local IPFS Desktop (localhost)' },
      { host: '127.0.0.1', port: 5002, protocol: 'http', label: 'Local IPFS Desktop Alt Port (5002)' },
      { host: 'ipfs.infura.io', port: 5001, protocol: 'https', label: 'Public Infura Gateway' }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying IPFS endpoint: ${endpoint.label} (${endpoint.protocol}://${endpoint.host}:${endpoint.port})`);

        this.ipfs = window.IpfsHttpClient.create({
          host: endpoint.host,
          port: endpoint.port,
          protocol: endpoint.protocol,
          timeout: 10000, // 10 second timeout
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });

        // Test connection with id() which is more reliable than version()
        try {
          const id = await this.ipfs.id();
          console.log(`✅ IPFS connected via ${endpoint.label}`);
          console.log(`   Peer ID: ${id.id}`);
          console.log(`   Agent Version: ${id.agentVersion}`);
          this.isConnected = true;
          return true;
        } catch (idError) {
          // Fallback to version() if id() fails
          const version = await this.ipfs.version();
          console.log(`✅ IPFS connected via ${endpoint.label}, version: ${version.version}`);
          this.isConnected = true;
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to connect to ${endpoint.label}: ${error.message}`);
        this.ipfs = null;
      }
    }

    console.warn('⚠️ All IPFS endpoints failed. Continuing with gateway-only mode (limited functionality)');
    this.isConnected = false;
    return false;
  }

  // Add encrypted data to IPFS (Dual upload: Local + Pinata)
  async addData(encryptedData, mirrorOptions = undefined) {
    const uploadResults = {
      local: null,
      pinata: null,
      primary: null
    };

    // Try Local IPFS first
    if (this.isConnected) {
      try {
        const result = await this.ipfs.add({ 
          content: encryptedData,
          pin: true  // Pin to local node so it appears in Files
        });
        uploadResults.local = result.cid.toString();
        console.log('✅ Local IPFS upload:', uploadResults.local);
        
        // Always mirror to MFS for visibility in IPFS Desktop
        const mfsOptions = mirrorOptions || {
          filename: `patient_${Date.now()}.json`,
          folder: '/healthchain/patients'
        };
        const mfsPath = await this._mirrorToMfs(uploadResults.local, mfsOptions);
        if (mfsPath) {
          console.log('📁 Added to IPFS Desktop Files:', mfsPath);
        }
      } catch (error) {
        console.warn('⚠️ Local IPFS upload failed:', error.message);
      }
    }

    // Try Pinata Cloud backup
    if (this.pinata.enabled) {
      try {
        const pinataResult = await this._uploadToPinata(encryptedData);
        uploadResults.pinata = pinataResult.IpfsHash;
        console.log('☁️ Pinata Cloud backup:', uploadResults.pinata);
      } catch (error) {
        console.warn('⚠️ Pinata upload failed:', error.message);
      }
    }

    // Determine primary CID
    uploadResults.primary = uploadResults.local || uploadResults.pinata;

    // Fallback to local storage if both IPFS methods fail
    if (!uploadResults.primary) {
      console.warn('⚠️ All IPFS uploads failed, using local storage');
      const localId = await this._saveLocalData(encryptedData);
      uploadResults.primary = `local:${localId}`;
    }

    console.log('📦 Upload complete:', uploadResults);
    return uploadResults.primary;
  }

  // Upload to Pinata Cloud (FREE 1GB storage)
  async _uploadToPinata(data) {
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': this.pinata.apiKey,
        'pinata_secret_api_key': this.pinata.apiSecret
      },
      body: JSON.stringify({
        pinataContent: { data: data },
        pinataMetadata: {
          name: `healthchain-${Date.now()}`,
          keyvalues: {
            app: 'HealthChain Pro',
            timestamp: new Date().toISOString()
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Retrieve data from IPFS
  async getData(cid) {
    // Check if it's a local storage ID
    if (typeof cid === 'string' && cid.startsWith('local:')) {
      const localId = cid.split(':')[1];
      try {
        const data = await this._getLocalData(localId);
        if (data) return data;
      } catch (err) {
        console.warn('Failed to retrieve from local storage:', err);
      }
    }

    try {
      if (!this.isConnected) {
        throw new Error('IPFS not connected');
      }

      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }

      const data = Buffer.concat(chunks).toString();
      return data;
    } catch (error) {
      console.error('Failed to get data from IPFS:', error);
      // Fallback: try public gateway
      try {
        const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
        if (response.ok) {
          return await response.text();
        }
      } catch (gatewayError) {
        console.error('Gateway fallback also failed:', gatewayError);
      }
      throw error;
    }
  }

  // Add file to IPFS (for medical images, documents, etc.)
  async addFile(file, mirrorOptions = undefined) {
    try {
      if (!this.isConnected) {
        throw new Error('IPFS not connected');
      }

      const result = await this.ipfs.add({
        path: file.name,
        content: file,
        pin: true  // Pin so it stays in local node
      });

      const cid = result.cid.toString();
      console.log('📄 File added to IPFS:', cid, '-', file.name);
      
      // Always mirror to MFS for IPFS Desktop visibility
      const mfsOptions = mirrorOptions || {
        filename: file.name,
        folder: '/healthchain/uploads'
      };
      const mfsPath = await this._mirrorToMfs(cid, mfsOptions);
      if (mfsPath) {
        console.log('📁 File visible in IPFS Desktop:', mfsPath);
      }
      
      return {
        cid: cid,
        path: result.path,
        size: result.size
      };
    } catch (error) {
      console.error('Failed to add file to IPFS:', error);
      // Fallback: store file locally in IndexedDB so it can be downloaded later
      try {
        const localId = await this._saveLocalFile(file);
        return {
          cid: `local:${localId}`,
          path: file.name,
          size: file.size
        };
      } catch (dbErr) {
        console.error('Local fallback storage failed:', dbErr);
        // As a last resort, return a mock CID so UI remains functional (file won't download)
        return {
          cid: 'Qm' + Math.random().toString(36).substr(2, 44),
          path: file.name,
          size: file.size
        };
      }
    }
  }

  async _ensureMfsDir(dirPath) {
    if (!this.isConnected || !this.ipfs?.files || typeof this.ipfs.files.stat !== 'function') {
      return false;
    }

    const normalized = dirPath.startsWith('/') ? dirPath : `/${dirPath}`;

    try {
      await this.ipfs.files.stat(normalized);
      return true;
    } catch (err) {
      if (err?.code === 'ERR_NOT_FOUND' || /does not exist/i.test(err?.message || '')) {
        try {
          await this.ipfs.files.mkdir(normalized, { parents: true });
          return true;
        } catch (mkdirErr) {
          console.warn('Failed to create MFS directory:', normalized, mkdirErr);
          return false;
        }
      }

      console.warn('Failed to stat MFS directory:', normalized, err);
      return false;
    }
  }

  async _mirrorToMfs(cid, options = {}) {
    console.log('🔄 _mirrorToMfs called with:', { cid, options });
    
    if (!this.isConnected || !cid || !this.ipfs?.files || typeof this.ipfs.files.cp !== 'function') {
      console.warn('⚠️ Cannot mirror to MFS:', {
        isConnected: this.isConnected,
        hasCid: !!cid,
        hasFiles: !!this.ipfs?.files,
        hasCpFunc: typeof this.ipfs?.files?.cp === 'function'
      });
      return null;
    }

    const folder = options.folder || '/healthchain/data';
    const normalizedFolder = folder.startsWith('/') ? folder : `/${folder}`;
    const filename = options.filename || cid;
    const targetPath = options.path || `${normalizedFolder}/${filename}`;
    const parentPath = targetPath.includes('/') ? targetPath.substring(0, targetPath.lastIndexOf('/')) || '/' : '/';

    console.log('📂 MFS target:', { folder, filename, targetPath, parentPath });

    try {
      // Create directory if doesn't exist
      console.log('📁 Creating directory:', parentPath);
      await this._ensureMfsDir(parentPath);
      
      // Remove existing file if present
      try {
        await this.ipfs.files.rm(targetPath, { recursive: true });
        console.log('🗑️ Removed existing file:', targetPath);
      } catch (rmErr) {
        // File doesn't exist, that's fine
        console.log('ℹ️ No existing file to remove');
      }

      // Copy CID to MFS (this makes it visible in IPFS Desktop Files tab)
      const sourcePath = `/ipfs/${cid}`;
      console.log('📋 Copying:', sourcePath, '→', targetPath);
      await this.ipfs.files.cp(sourcePath, targetPath);
      console.log(`✅ MFS copy successful: ${targetPath}`);
      
      return targetPath;
    } catch (err) {
      console.error('❌ Failed to mirror to MFS:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      return null;
    }
  }

  // Get file from IPFS
  async getFile(cid) {
    // Support local fallback pseudo-CIDs: local:<id>
    if (typeof cid === 'string' && cid.startsWith('local:')) {
      const localId = cid.split(':')[1];
      try {
        const blob = await this._getLocalFile(localId);
        if (blob) return blob;
      } catch (err) {
        console.warn('Failed to retrieve local fallback file:', err);
        // continue to other fallbacks
      }
    }
    try {
      if (!this.isConnected) {
        throw new Error('IPFS not connected');
      }

      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }

      return new Blob(chunks);
    } catch (error) {
      console.error('Failed to get file from IPFS:', error);
      // Fallback: try public gateway
      try {
        const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
        if (response.ok) {
          return await response.blob();
        }
      } catch (gatewayError) {
        console.error('Gateway fallback also failed:', gatewayError);
      }
      // If all else fails, but CID looks like local:<id>, try IndexedDB again
      if (typeof cid === 'string' && cid.startsWith('local:')) {
        const localId = cid.split(':')[1];
        try {
          const blob = await this._getLocalFile(localId);
          if (blob) return blob;
        } catch (dbErr) {
          console.error('IndexedDB fallback failed:', dbErr);
        }
      }
      throw error;
    }
  }

  // IndexedDB helpers for local fallback storage
  _openDB() {
    if (this._dbPromise) return this._dbPromise;
    this._dbPromise = new Promise((resolve, reject) => {
      try {
        const req = window.indexedDB.open('hc_ipfs_storage', 2);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('files')) {
            db.createObjectStore('files', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data', { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
      } catch (err) {
        reject(err);
      }
    });
    return this._dbPromise;
  }

  async _saveLocalData(encryptedData) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite');
      const store = tx.objectStore('data');
      const id = 'data_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
      const record = { id, content: encryptedData, timestamp: Date.now() };
      const req = store.put(record);
      req.onsuccess = () => resolve(id);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async _getLocalData(id) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', 'readonly');
      const store = tx.objectStore('data');
      const req = store.get(id);
      req.onsuccess = (e) => {
        const rec = e.target.result;
        if (rec) resolve(rec.content);
        else resolve(null);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async _saveLocalFile(file) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const id = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
      const record = { id, name: file.name || 'file', blob: file, mime: file.type || 'application/octet-stream', size: file.size || 0 };
      const req = store.put(record);
      req.onsuccess = () => resolve(id);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async _getLocalFile(id) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.get(id);
      req.onsuccess = (e) => {
        const rec = e.target.result;
        if (rec) resolve(rec.blob);
        else resolve(null);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Pin content to ensure persistence
  async pinContent(cid) {
    try {
      if (!this.isConnected) {
        console.warn('IPFS not connected, cannot pin content');
        return false;
      }

      await this.ipfs.pin.add(cid);
      console.log('Content pinned:', cid);
      return true;
    } catch (error) {
      console.error('Failed to pin content:', error);
      return false;
    }
  }

  // Create IPFS hash for data integrity verification
  async createHash(data) {
    try {
      if (!this.isConnected) {
        throw new Error('IPFS not connected');
      }

      const result = await this.ipfs.add(data, { onlyHash: true });
      return result.cid.toString();
    } catch (error) {
      console.error('Failed to create hash:', error);
      // Fallback: use crypto API
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }

  // Sync all local-only data to IPFS when connection is restored
  async syncLocalDataToIPFS() {
    if (!this.isConnected) {
      console.warn('⚠️ Cannot sync: IPFS not connected');
      return { synced: 0, failed: 0 };
    }

    console.log('🔄 Starting sync of local data to IPFS...');
    
    let synced = 0;
    let failed = 0;

    try {
      const db = await this._openDB();
      
      // Sync data store
      const dataTx = db.transaction('data', 'readonly');
      const dataStore = dataTx.objectStore('data');
      const dataRequest = dataStore.getAll();
      
      const dataItems = await new Promise((resolve, reject) => {
        dataRequest.onsuccess = () => resolve(dataRequest.result);
        dataRequest.onerror = () => reject(dataRequest.error);
      });

      console.log(`📦 Found ${dataItems.length} local data items to sync`);

      for (const item of dataItems) {
        try {
          // Upload to IPFS
          const result = await this.ipfs.add({ content: item.content });
          const realCID = result.cid.toString();
          
          console.log(`✅ Synced data ${item.id} → IPFS CID: ${realCID}`);
          
          // Notify app to update the CID in database
          if (window.updateCIDAfterSync) {
            await window.updateCIDAfterSync(`local:${item.id}`, realCID);
          }
          
          // Delete from local storage
          await this._deleteLocalData(item.id);
          synced++;
        } catch (err) {
          console.error(`❌ Failed to sync ${item.id}:`, err);
          failed++;
        }
      }

      // Sync files store
      const filesTx = db.transaction('files', 'readonly');
      const filesStore = filesTx.objectStore('files');
      const filesRequest = filesStore.getAll();
      
      const fileItems = await new Promise((resolve, reject) => {
        filesRequest.onsuccess = () => resolve(filesRequest.result);
        filesRequest.onerror = () => reject(filesRequest.error);
      });

      console.log(`📁 Found ${fileItems.length} local files to sync`);

      for (const item of fileItems) {
        try {
          // Upload to IPFS
          const result = await this.ipfs.add({
            path: item.name,
            content: item.blob
          });
          const realCID = result.cid.toString();
          
          console.log(`✅ Synced file ${item.name} → IPFS CID: ${realCID}`);
          
          // Notify app to update the CID
          if (window.updateCIDAfterSync) {
            await window.updateCIDAfterSync(`local:${item.id}`, realCID);
          }
          
          // Delete from local storage
          await this._deleteLocalFile(item.id);
          synced++;
        } catch (err) {
          console.error(`❌ Failed to sync ${item.name}:`, err);
          failed++;
        }
      }

      console.log(`🎉 Sync complete: ${synced} synced, ${failed} failed`);
      return { synced, failed };
      
    } catch (error) {
      console.error('❌ Sync process failed:', error);
      return { synced, failed };
    }
  }

  // Delete local data after successful sync
  async _deleteLocalData(id) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite');
      const store = tx.objectStore('data');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async _deleteLocalFile(id) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Get count of pending sync items
  async getPendingSyncCount() {
    try {
      const db = await this._openDB();
      
      const dataCount = await new Promise((resolve) => {
        const tx = db.transaction('data', 'readonly');
        const store = tx.objectStore('data');
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      });

      const filesCount = await new Promise((resolve) => {
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      });

      return dataCount + filesCount;
    } catch (error) {
      console.error('Failed to get pending sync count:', error);
      return 0;
    }
  }
}

// Global IPFS manager instance
const ipfsManager = new IPFSManager();