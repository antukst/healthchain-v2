// ipfs.js - Hybrid IPFS integration (Local Node + Pinata Cloud Backup)
class IPFSManager {
  constructor() {
    this.isConnected = false;
    this.pinataConnected = false;
    this.localIPFSConnected = false;
    this.jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNWNkMTk4Zi1kMjYxLTQ2YjctYTViMy1kYmMyMzMyYWRmMmYiLCJlbWFpbCI6ImFudHVyYXprc3RAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImQ5Y2M4ZGY0YTQ1YzBmODU1N2RiIiwic2NvcGVkS2V5U2VjcmV0IjoiYzc0MTkyYWE3MzZlYjViNDI1YjAyZjU5MmM2YjU2MDIxYjg5OTBjMGJmZTZlODM4ZDQ1OWI0MWI5MjU0MzQ2NCIsImV4cCI6MTc5MzYzODk4MX0.VTGk-4OS_3Rx0y0BGz-hlODfrce728FlABOLAvooRTA'; // Pinata JWT
    this.localIPFSUrl = 'http://127.0.0.1:5001'; // IPFS Desktop/Kubo API
    this.useLocalIPFS = true; // Set to true to use local IPFS node
  }

  // Initialize both Local IPFS + Pinata Cloud
  async init() {
    try {
      console.log('🔄 Initializing Hybrid IPFS (Local + Cloud)...');
      
      // Try local IPFS first
      if (this.useLocalIPFS) {
        await this.initLocalIPFS();
      }
      
      // Always try Pinata cloud backup
      await this.initPinata();
      
      // Connected if either works
      this.isConnected = this.localIPFSConnected || this.pinataConnected;
      
      if (this.isConnected) {
        console.log('✅ IPFS initialized successfully');
        if (this.localIPFSConnected && this.pinataConnected) {
          console.log('🌐 Using: Local IPFS + Pinata Cloud Backup');
        } else if (this.localIPFSConnected) {
          console.log('🖥️ Using: Local IPFS only (Pinata backup unavailable)');
        } else {
          console.log('☁️ Using: Pinata Cloud only (Local IPFS unavailable)');
        }
      }
      
      return this.isConnected;
    } catch (error) {
      console.error('❌ IPFS initialization failed:', error);
      return false;
    }
  }

  // Initialize local IPFS node
  async initLocalIPFS() {
    try {
      console.log('🔄 Connecting to local IPFS node...');
      const response = await fetch(`${this.localIPFSUrl}/api/v0/version`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.localIPFSConnected = true;
        console.log(`✅ Connected to local IPFS node (Version: ${data.Version})`);
        return true;
      } else {
        throw new Error('Local IPFS not responding');
      }
    } catch (error) {
      console.warn('⚠️ Local IPFS not available:', error.message);
      console.log('💡 Install IPFS Desktop from: https://docs.ipfs.tech/install/ipfs-desktop/');
      this.localIPFSConnected = false;
      return false;
    }
  }

  // Initialize Pinata cloud backup
  async initPinata() {
    try {
      console.log('🔄 Connecting to Pinata cloud backup...');
      const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        }
      });

      if (response.ok) {
        this.pinataConnected = true;
        console.log('✅ Connected to Pinata cloud backup');
        return true;
      } else {
        throw new Error('Pinata authentication failed');
      }
    } catch (error) {
      console.warn('⚠️ Pinata cloud backup unavailable:', error.message);
      this.pinataConnected = false;
      return false;
    }
  }

  // Add data (JSON) to IPFS - tries local first, then Pinata backup
  async addData(data, options = {}) {
    if (!this.isConnected) {
      throw new Error('IPFS not connected');
    }

    let localCID = null;
    let pinataCID = null;

    try {
      // Try local IPFS first
      if (this.localIPFSConnected) {
        try {
          localCID = await this.addDataToLocalIPFS(data, options);
          console.log('📁 Added to local IPFS:', localCID);
        } catch (error) {
          console.warn('⚠️ Local IPFS add failed, will use Pinata:', error.message);
        }
      }

      // Always backup to Pinata cloud
      if (this.pinataConnected) {
        try {
          pinataCID = await this.addDataToPinata(data, options);
          console.log('☁️ Backed up to Pinata cloud:', pinataCID);
        } catch (error) {
          console.warn('⚠️ Pinata backup failed:', error.message);
          if (!localCID) throw error; // If both failed, throw error
        }
      }

      // Return whichever CID we got (prefer local)
      const cid = localCID || pinataCID;
      if (!cid) {
        throw new Error('Failed to add data to both local IPFS and Pinata');
      }

      console.log('📌 Data pinned to IPFS:', cid);
      return cid;
    } catch (error) {
      console.error('❌ Failed to add data to IPFS:', error);
      throw error;
    }
  }

  // Add data to local IPFS node
  async addDataToLocalIPFS(data, options = {}) {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('file', blob, options.path || 'data.json');

    const response = await fetch(`${this.localIPFSUrl}/api/v0/add`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Local IPFS add failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.Hash;
  }

  // Add data to Pinata cloud
  async addDataToPinata(data, options = {}) {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('file', blob, options.path || 'data.json');

    if (options.pinataOptions) {
      formData.append('pinataOptions', JSON.stringify(options.pinataOptions));
    }

    if (options.pinataMetadata) {
      formData.append('pinataMetadata', JSON.stringify(options.pinataMetadata));
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.jwt}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.status}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  }

  // Get data from IPFS via Pinata gateway
  async getData(cid) {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get data from IPFS:', error);
      throw error;
    }
  }

  // Add file to IPFS via Pinata
  async addFile(file, options = {}) {
    if (!this.isConnected) {
      throw new Error('IPFS not connected');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (options.pinataOptions) {
        formData.append('pinataOptions', JSON.stringify(options.pinataOptions));
      }

      if (options.pinataMetadata) {
        formData.append('pinataMetadata', JSON.stringify(options.pinataMetadata));
      }

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Pinata API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📌 File pinned to IPFS:', result.IpfsHash);
      return result.IpfsHash;
    } catch (error) {
      console.error('Failed to add file to IPFS:', error);
      throw error;
    }
  }

  // Get file from IPFS via Pinata gateway
  async getFile(cid) {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Failed to get file from IPFS:', error);
      throw error;
    }
  }

  // Manual status check for debugging
  async checkStatus() {
    try {
      console.log('🔍 Checking IPFS status...');
      console.log('Connected:', this.isConnected);
      console.log('JWT configured:', !!this.jwt);

      // Test the actual API connection
      console.log('🌐 Testing Pinata API connection...');
      const testResponse = await fetch('https://api.pinata.cloud/data/testAuthentication', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        }
      });

      console.log('API Response Status:', testResponse.status);
      console.log('API Response OK:', testResponse.ok);

      if (testResponse.ok) {
        this.isConnected = true;
        console.log('✅ IPFS is connected and ready for distributed file pinning');
        return { connected: true, service: 'Pinata Cloud', status: 'operational', apiStatus: testResponse.status };
      } else {
        this.isConnected = false;
        const errorText = await testResponse.text();
        console.log('❌ API authentication failed:', testResponse.status, errorText);
        return { connected: false, service: 'Pinata Cloud', status: 'auth_failed', apiStatus: testResponse.status, error: errorText };
      }
    } catch (error) {
      console.error('❌ Status check failed:', error);
      this.isConnected = false;
      return { connected: false, service: 'Pinata Cloud', status: 'error', error: error.message };
    }
  }

  // Force reconnect (useful for debugging)
  async forceReconnect() {
    console.log('🔄 Force reconnecting to Pinata...');
    this.isConnected = false;
    const success = await this.init();
    if (success) {
      console.log('✅ Force reconnect successful');
    } else {
      console.log('❌ Force reconnect failed');
    }
    return success;
  }

  // Test file pinning (for debugging)
  async testPinning() {
    try {
      console.log('🧪 Testing file pinning...');
      const testData = { test: 'HealthChain IPFS test', timestamp: new Date().toISOString() };
      const cid = await this.addData(testData, { path: '/healthchain/test.json' });
      console.log('✅ Test pinning successful, CID:', cid);
      return { success: true, cid: cid };
    } catch (error) {
      console.error('❌ Test pinning failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Global IPFS manager instance
const ipfsManager = new IPFSManager();