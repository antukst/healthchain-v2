// blockchain.js - Polygon blockchain integration for HealthChain
class PolygonManager {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
    this.isConnected = false;
  }

  // Initialize Polygon connection
  async init() {
    try {
      // Check if MetaMask is available
      if (typeof window.ethereum !== 'undefined') {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.web3 = new Web3(window.ethereum);

        // Get current account
        const accounts = await this.web3.eth.getAccounts();
        this.account = accounts[0];

        // Switch to Polygon network
        await this.switchToPolygon();

        this.isConnected = true;
        console.log('✅ Connected to Polygon network:', this.account);
        return true;
      } else {
        console.warn('⚠️ MetaMask not detected. Using mock blockchain for demo.');
        this.isConnected = false;
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Polygon:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Switch to Polygon network
  async switchToPolygon() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }], // Polygon Mainnet
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x89',
              chainName: 'Polygon Mainnet',
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18
              },
              rpcUrls: ['https://polygon-rpc.com/'],
              blockExplorerUrls: ['https://polygonscan.com/']
            }]
          });
        } catch (addError) {
          console.error('Failed to add Polygon network:', addError);
        }
      } else {
        console.error('Failed to switch to Polygon network:', switchError);
      }
    }
  }

  // Create immutable proof of data on blockchain
  async createDataProof(dataHash, metadata) {
    if (!this.isConnected) {
      console.warn('Blockchain not connected, creating mock proof');
      return this.createMockProof(dataHash, metadata);
    }

    try {
      // In a real implementation, you'd deploy a smart contract for data proofs
      // For demo purposes, we'll create a transaction that stores the hash

      const proofData = {
        dataHash: dataHash,
        timestamp: Date.now(),
        creator: this.account,
        metadata: metadata
      };

      // Create a simple transaction (in production, use a proper smart contract)
      const txHash = await this.createSimpleTransaction(proofData);

      console.log('✅ Data proof created on Polygon:', txHash);
      return {
        txHash: txHash,
        proofData: proofData,
        timestamp: new Date().toISOString(),
        network: 'polygon'
      };
    } catch (error) {
      console.error('❌ Failed to create data proof:', error);
      return this.createMockProof(dataHash, metadata);
    }
  }

  // Create a simple transaction (demo purposes)
  async createSimpleTransaction(proofData) {
    try {
      const gasPrice = await this.web3.eth.getGasPrice();
      const gasLimit = 21000; // Simple transfer gas limit

      // For demo, we'll send a tiny amount to self with data
      const tx = {
        from: this.account,
        to: this.account, // Send to self
        value: '0x0', // 0 MATIC
        gas: gasLimit,
        gasPrice: gasPrice,
        data: this.web3.utils.asciiToHex(JSON.stringify(proofData))
      };

      const txHash = await this.web3.eth.sendTransaction(tx);
      return txHash.transactionHash;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  }

  // Verify data proof
  async verifyDataProof(txHash) {
    if (!this.isConnected) {
      console.warn('Blockchain not connected, cannot verify proof');
      return { verified: false, reason: 'Blockchain not connected' };
    }

    try {
      const tx = await this.web3.eth.getTransaction(txHash);
      if (!tx) {
        return { verified: false, reason: 'Transaction not found' };
      }

      // In production, you'd verify against smart contract state
      const isValid = tx.to === this.account && tx.from === this.account;

      return {
        verified: isValid,
        transaction: {
          hash: tx.hash,
          blockNumber: tx.blockNumber,
          timestamp: null, // Would need to get from block
          from: tx.from,
          to: tx.to,
          data: tx.input
        }
      };
    } catch (error) {
      console.error('Failed to verify proof:', error);
      return { verified: false, reason: error.message };
    }
  }

  // Create mock proof for demo when blockchain is not available
  createMockProof(dataHash, metadata) {
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
    console.log('📝 Created mock blockchain proof:', mockTxHash);

    return {
      txHash: mockTxHash,
      proofData: {
        dataHash: dataHash,
        timestamp: Date.now(),
        creator: 'demo_account',
        metadata: metadata
      },
      timestamp: new Date().toISOString(),
      network: 'mock_polygon',
      isMock: true
    };
  }

  // Get blockchain network info
  async getNetworkInfo() {
    if (!this.isConnected) {
      return { network: 'disconnected', chainId: null };
    }

    try {
      const chainId = await this.web3.eth.getChainId();
      const networkName = chainId === 137 ? 'Polygon Mainnet' :
                         chainId === 80001 ? 'Polygon Mumbai' : 'Unknown';

      return {
        network: networkName,
        chainId: chainId,
        account: this.account
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return { network: 'error', chainId: null };
    }
  }

  // Create data integrity hash
  async createIntegrityHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Global Polygon manager instance
const polygonManager = new PolygonManager();