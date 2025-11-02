// ipfs.js - Pinata IPFS integration for HealthChain
class IPFSManager {
  constructor() {
    this.isConnected = false;
    this.jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNWNkMTk4Zi1kMjYxLTQ2YjctYTViMy1kYmMyMzMyYWRmMmYiLCJlbWFpbCI6ImFudHVyYXprc3RAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImQ5Y2M4ZGY0YTQ1YzBmODU1N2RiIiwic2NvcGVkS2V5U2VjcmV0IjoiYzc0MTkyYWE3MzZlYjViNDI1YjAyZjU5MmM2YjU2MDIxYjg5OTBjMGJmZTZlODM4ZDQ1OWI0MWI5MjU0MzQ2NCIsImV4cCI6MTc5MzYzODk4MX0.VTGk-4OS_3Rx0y0BGz-hlODfrce728FlABOLAvooRTA'; // Pinata JWT
  }

  // Initialize Pinata connection
  async init() {
    try {
      console.log('🔄 Initializing Pinata IPFS connection...');
      const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        }
      });

      if (response.ok) {
        this.isConnected = true;
        console.log('✅ Connected to Pinata IPFS - Ready for distributed file pinning');
        return true;
      } else {
        console.warn('⚠️ Pinata authentication failed:', response.status, response.statusText);
        this.isConnected = false;
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Pinata initialization failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  // Add data (JSON) to IPFS via Pinata
  async addData(data, options = {}) {
    if (!this.isConnected) {
      throw new Error('IPFS not connected');
    }

    try {
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
      console.log('📌 Data pinned to IPFS:', result.IpfsHash);
      return result.IpfsHash;
    } catch (error) {
      console.error('Failed to add data to IPFS:', error);
      throw error;
    }
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
    return await this.init();
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