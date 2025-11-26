// supabase-adapter.js - Supabase real-time sync for HealthChain
// Browser-friendly cloud database with automatic real-time sync

class SupabaseAdapter {
  constructor() {
    this.supabase = null;
    this.connected = false;
    this.realtimeChannel = null;
    this.supabaseUrl = null;
    this.supabaseKey = null;
  }

  // Initialize Supabase connection
  async init(supabaseUrl, supabaseKey) {
    try {
      console.log('🔄 Connecting to Supabase...');
      
      this.supabaseUrl = supabaseUrl;
      this.supabaseKey = supabaseKey;
      
      // Create Supabase client using CDN
      if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase library not loaded. Please add the script tag.');
        return false;
      }
      
      this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
      
      // Test connection
      const { data, error } = await this.supabase.from('patients').select('count');
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
        console.warn('⚠️ Supabase connection warning:', error.message);
        // Continue anyway - table might not exist yet
      }
      
      this.connected = true;
      console.log('✅ Connected to Supabase');
      
      // Setup real-time sync
      this.setupRealtimeSync();
      
      return true;
    } catch (error) {
      console.error('❌ Supabase connection failed:', error);
      this.connected = false;
      return false;
    }
  }

  // Setup real-time sync listener
  setupRealtimeSync() {
    if (!this.connected) return;

    try {
      console.log('🔄 Setting up real-time sync...');
      
      // Subscribe to changes in patients table
      this.realtimeChannel = this.supabase
        .channel('patients-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'patients' },
          (payload) => {
            console.log('📥 Real-time change received:', payload);
            
            // Trigger UI refresh
            window.dispatchEvent(new CustomEvent('supabase-sync-change', {
              detail: { 
                event: payload.eventType,
                record: payload.new || payload.old
              }
            }));
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time sync enabled');
          }
        });
    } catch (error) {
      console.warn('⚠️ Real-time sync setup failed:', error);
    }
  }

  // Sync PouchDB to Supabase
  async syncToSupabase(pouchDB) {
    if (!this.connected) {
      console.warn('⚠️ Supabase not connected. Skipping sync.');
      return { pushed: 0, pulled: 0 };
    }

    try {
      console.log('🔄 Syncing PouchDB to Supabase...');
      
      // PUSH: Get all local documents
      const localDocs = await pouchDB.allDocs({ include_docs: true });
      const patientDocs = localDocs.rows
        .filter(row => row.doc._id.startsWith('patient_'))
        .map(row => ({
          id: row.doc._id,
          metadata: row.doc.metadata || {},
          ipfs_cid: row.doc.ipfs_cid,
          blockchain_hash: row.doc.blockchain_hash,
          created_at: row.doc.metadata?.created_at || new Date().toISOString(),
          updated_at: row.doc.metadata?.updated_at || row.doc.metadata?.created_at || new Date().toISOString()
        }));

      console.log('📤 Found', patientDocs.length, 'local documents to sync');

      let pushedCount = 0;
      
      // Push each document to Supabase (upsert)
      for (const doc of patientDocs) {
        try {
          const { error } = await this.supabase
            .from('patients')
            .upsert(doc, { onConflict: 'id' });
          
          if (error) {
            console.warn('Failed to push document:', doc.id, error.message);
          } else {
            pushedCount++;
          }
        } catch (error) {
          console.warn('Failed to push document:', doc.id, error);
        }
      }

      console.log('✅ Pushed', pushedCount, 'documents to Supabase');

      // PULL: Get all remote documents
      const { data: remoteDocs, error } = await this.supabase
        .from('patients')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to pull from Supabase:', error);
        return { pushed: pushedCount, pulled: 0 };
      }

      let pulledCount = 0;

      // Merge remote documents into PouchDB
      for (const remoteDoc of remoteDocs || []) {
        try {
          const localId = remoteDoc.id;
          
          // Check if document exists locally
          let needsUpdate = false;
          let existingRev = null;

          try {
            const localDoc = await pouchDB.get(localId);
            const localUpdatedAt = new Date(localDoc.metadata?.updated_at || localDoc.metadata?.created_at || 0);
            const remoteUpdatedAt = new Date(remoteDoc.updated_at);
            
            if (remoteUpdatedAt > localUpdatedAt) {
              needsUpdate = true;
              existingRev = localDoc._rev;
            }
          } catch (error) {
            // Document doesn't exist locally
            needsUpdate = true;
          }

          if (needsUpdate) {
            // Create PouchDB document
            const pouchDoc = {
              _id: remoteDoc.id,
              metadata: remoteDoc.metadata,
              ipfs_cid: remoteDoc.ipfs_cid,
              blockchain_hash: remoteDoc.blockchain_hash,
              encrypted: true
            };

            if (existingRev) {
              pouchDoc._rev = existingRev;
            }

            await pouchDB.put(pouchDoc);
            pulledCount++;
          }
        } catch (error) {
          console.warn('Failed to pull document:', remoteDoc.id, error);
        }
      }

      console.log('📥 Pulled', pulledCount, 'documents from Supabase');

      return { pushed: pushedCount, pulled: pulledCount };
    } catch (error) {
      console.error('❌ Supabase sync failed:', error);
      throw error;
    }
  }

  // Setup continuous sync
  setupLiveSync(pouchDB, interval = 10000) {
    if (!this.connected) {
      console.warn('⚠️ Supabase not connected. Live sync disabled.');
      return null;
    }

    console.log('🔄 Setting up live sync (interval:', interval / 1000, 'seconds)');

    // Sync immediately
    this.syncToSupabase(pouchDB);

    // Setup periodic sync
    const syncInterval = setInterval(async () => {
      try {
        const result = await this.syncToSupabase(pouchDB);
        if (result.pulled > 0 || result.pushed > 0) {
          console.log(`📊 Sync: ↑${result.pushed} ↓${result.pulled}`);
          
          if (result.pulled > 0) {
            // Trigger UI refresh
            window.dispatchEvent(new CustomEvent('supabase-sync-complete', {
              detail: { pulled: result.pulled, pushed: result.pushed }
            }));
          }
        }
      } catch (error) {
        console.error('Live sync error:', error);
      }
    }, interval);

    console.log('✅ Live sync enabled - Syncing every', interval / 1000, 'seconds');
    return syncInterval;
  }

  // Check if connected
  isConnected() {
    return this.connected;
  }

  // Disconnect
  disconnect() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.connected = false;
    console.log('🔌 Disconnected from Supabase');
  }
}

// Supabase configuration
const SUPABASE_CONFIG = {
  // Will be set from localStorage after user setup
  url: null,
  key: null,
  
  // Auto-detect from environment
  get effectiveUrl() {
    return localStorage.getItem('healthchain_supabase_url') || this.url;
  },
  
  get effectiveKey() {
    return localStorage.getItem('healthchain_supabase_key') || this.key;
  },
  
  // Sync options
  syncEnabled: true,
  syncInterval: 10000, // 10 seconds (faster than MongoDB)
};

// Global Supabase adapter instance
const supabaseAdapter = new SupabaseAdapter();

// Initialize Supabase sync
async function setupSupabaseSync(pouchDB) {
  if (!SUPABASE_CONFIG.syncEnabled) {
    console.log('📝 Supabase sync disabled');
    return null;
  }

  try {
    const supabaseUrl = SUPABASE_CONFIG.effectiveUrl;
    const supabaseKey = SUPABASE_CONFIG.effectiveKey;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase credentials not configured.');
      console.log('💡 To enable cloud sync:');
      console.log('   1. Sign up: https://supabase.com (FREE)');
      console.log('   2. Create project & get URL + API key');
      console.log('   3. Run in console:');
      console.log('      localStorage.setItem("healthchain_supabase_url", "YOUR_URL")');
      console.log('      localStorage.setItem("healthchain_supabase_key", "YOUR_KEY")');
      console.log('   4. Reload page');
      return null;
    }
    
    // Initialize connection
    const connected = await supabaseAdapter.init(supabaseUrl, supabaseKey);
    
    if (!connected) {
      console.warn('⚠️ Supabase connection failed. Running in offline mode.');
      return null;
    }

    // Setup live sync
    const syncHandler = supabaseAdapter.setupLiveSync(pouchDB, SUPABASE_CONFIG.syncInterval);
    
    console.log('✅ Supabase sync enabled - Multi-device sync active');
    console.log('📱 Data will sync automatically every', SUPABASE_CONFIG.syncInterval / 1000, 'seconds');
    console.log('🔄 Real-time updates enabled');
    
    return syncHandler;
  } catch (error) {
    console.error('❌ Supabase sync setup failed:', error);
    return null;
  }
}

// Expose Supabase adapter
window.supabaseAdapter = supabaseAdapter;
window.setupSupabaseSync = setupSupabaseSync;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;

console.log('📦 Supabase adapter loaded');
console.log('💡 Supabase is browser-friendly with real-time sync!');
