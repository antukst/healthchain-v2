# 🚀 HealthChain Pro - Complete Setup Guide

## 📋 Prerequisites
- **Web Browser**: Chrome/Edge (for MetaMask)
- **Node.js**: v16+ (for local server)
- **Git**: For version control

---

## 1️⃣ IPFS Desktop Setup (Local Storage)

### Download & Install
1. Visit: https://docs.ipfs.tech/install/ipfs-desktop/
2. Download for Windows
3. Install and launch IPFS Desktop
4. Wait for initialization (green checkmark in system tray)

### Configure CORS for Web Access
1. Open IPFS Desktop
2. Go to **Settings** → **IPFS Config**
3. Find `API.HTTPHeaders` section
4. Add these headers:
```json
{
  "API": {
    "HTTPHeaders": {
      "Access-Control-Allow-Origin": ["*"],
      "Access-Control-Allow-Methods": ["POST", "GET"],
      "Access-Control-Allow-Headers": ["Content-Type"]
    }
  }
}
```
5. Click **Save** and restart IPFS Desktop

### Verify Local IPFS
- Open browser: http://127.0.0.1:5001/webui
- You should see IPFS Web UI
- Check "Peers" - should have 10+ connections

✅ **Local IPFS Ready!** Files will now sync to your computer.

---

## 2️⃣ Pinata Cloud Setup (FREE Cloud Backup)

### Create Account
1. Visit: https://app.pinata.cloud/register
2. Sign up (FREE - 1GB storage)
3. Verify email

### Get API Keys
1. Go to **API Keys** section
2. Click **+ New Key**
3. Enable permissions:
   - ✅ `pinFileToIPFS`
   - ✅ `pinJSONToIPFS`
4. Name it: `HealthChain Pro`
5. Click **Create Key**
6. **SAVE THESE VALUES:**
   - API Key: `xxxxxxxxxxxx`
   - API Secret: `xxxxxxxxxxxxxxxxxxxxxxxx`

### Configure HealthChain
1. Open: `healthchain-pro/ipfs.js`
2. Find line ~13:
```javascript
this.pinata = {
  apiKey: 'YOUR_PINATA_API_KEY',        // ← Paste your API Key
  apiSecret: 'YOUR_PINATA_API_SECRET',  // ← Paste your API Secret
  gateway: 'gateway.pinata.cloud',
  enabled: true  // ← Change false to true
};
```
3. Save file

✅ **Pinata Cloud Ready!** Files will backup to cloud automatically.

---

## 3️⃣ MetaMask Wallet Setup

### Install Extension
1. Visit: https://metamask.io/download/
2. Click **Install MetaMask for Chrome**
3. Follow setup wizard
4. **SAVE YOUR SEED PHRASE** (12 words) - CRITICAL!
5. Create strong password

### Add Polygon Amoy Testnet (FREE)
1. Open MetaMask
2. Click network dropdown (top center)
3. Click **Add Network** → **Add a network manually**
4. Fill in these details:

```
Network Name: Polygon Amoy Testnet
RPC URL: https://rpc-amoy.polygon.technology/
Chain ID: 80002
Currency Symbol: MATIC
Block Explorer: https://amoy.polygonscan.com/
```

5. Click **Save**
6. Switch to Polygon Amoy network

### Get FREE Test MATIC
1. Copy your wallet address (click to copy)
2. Visit faucet: https://faucet.polygon.technology/
3. Select **Polygon Amoy**
4. Paste your address
5. Click **Submit**
6. Wait 1-2 minutes
7. Check MetaMask - you should have 0.5 MATIC

✅ **Polygon Blockchain Ready!** You can now make blockchain transactions.

---

## 4️⃣ Run HealthChain Pro

### Start Local Server
```powershell
cd "C:\Users\AshraFul R Antu\OneDrive\Desktop\healthchain-v2"
python -m http.server 8000
```

### Open Application
1. Browser: http://localhost:8000/healthchain-pro/
2. **Connect MetaMask** when prompted
3. **Approve** network switch to Polygon Amoy

### Verify All Systems
Check top-right status indicators:
- 🟢 **IPFS: ✅** (Local Desktop connected)
- 🟢 **Polygon: ✅** (MetaMask connected)

---

## 5️⃣ Test Full Integration

### Add Test Patient
1. Click **➕ Add Patient**
2. Fill in:
   - Name: Test Patient
   - Age: 30
   - Gender: Male
   - Diagnosis: Test Condition
   - Prescription: RX12345
3. Click **Save Patient**

### Verify Storage Chain
Check browser console (F12):
```
✅ Local IPFS upload: Qm...
☁️ Pinata Cloud backup: Qm...
🦊 MetaMask transaction confirmed: 0x...
📦 Upload complete
```

### Verify in Pinata Dashboard
1. Visit: https://app.pinata.cloud/pinmanager
2. See your uploaded file
3. Click to view on IPFS gateway

### Verify on Blockchain
1. Copy transaction hash from console
2. Visit: https://amoy.polygonscan.com/
3. Paste hash in search
4. See your immutable proof!

---

## 🎯 Production Deployment (Optional)

### Switch to Polygon Mainnet (Real MATIC)
1. Change in `blockchain.js` line ~21:
```javascript
await this.init(false); // false = mainnet, true = testnet
```

2. MetaMask: Add Polygon Mainnet
```
Network Name: Polygon Mainnet
RPC URL: https://polygon-rpc.com/
Chain ID: 137
Currency Symbol: MATIC
Block Explorer: https://polygonscan.com/
```

3. Buy MATIC from exchange (Binance, Coinbase)
4. Send to your MetaMask wallet

**⚠️ Warning:** Mainnet transactions cost real money!

---

## 🔧 Troubleshooting

### IPFS Desktop Not Connecting
```
❌ Failed to connect to Local IPFS Desktop
```
**Fix:**
1. Close IPFS Desktop completely
2. Restart IPFS Desktop
3. Wait 30 seconds
4. Refresh browser (Ctrl+Shift+R)

### Pinata Upload Failed
```
⚠️ Pinata upload failed: Unauthorized
```
**Fix:**
1. Check API keys in `ipfs.js`
2. Verify keys are correct (no spaces)
3. Check Pinata dashboard - key not revoked

### MetaMask Not Detected
```
⚠️ MetaMask not detected
```
**Fix:**
1. Install MetaMask extension
2. Refresh browser completely
3. Check extension is enabled

### Transaction Failed - Insufficient MATIC
```
❌ Transaction failed: insufficient funds
```
**Fix:**
1. Get test MATIC from faucet
2. Wait 2 minutes for confirmation
3. Check balance in MetaMask

### CORS Errors in Console
```
Access-Control-Allow-Origin blocked
```
**Fix:**
1. Re-configure IPFS CORS settings (see step 1)
2. Restart IPFS Desktop
3. Clear browser cache (Ctrl+Shift+Delete)

---

## 📊 Architecture Overview

```
Patient Data
    ↓
[Encrypt with AES-256-GCM]
    ↓
┌─────────────────────────────────┐
│  Triple Redundant Storage       │
├─────────────────────────────────┤
│ 1. Local IPFS Desktop ────────→ Your Computer (Private)
│ 2. Pinata Cloud ──────────────→ Distributed Cloud (Backup)
│ 3. Polygon Blockchain ────────→ Immutable Proof (Public Hash)
└─────────────────────────────────┘
    ↓
PouchDB Local Database
    ↓
Display in HealthChain Pro
```

**Security Features:**
- ✅ End-to-end encryption (AES-256-GCM)
- ✅ Decentralized storage (no single point of failure)
- ✅ Blockchain immutability (tamper-proof)
- ✅ Local-first (works offline)

---

## 🎓 Next Steps

1. ✅ Test with sample patient data
2. ✅ Upload medical document (PDF/Image)
3. ✅ Export data to JSON
4. ✅ Import from Excel/CSV
5. ✅ Share IPFS link with colleague
6. ✅ Verify blockchain transaction

---

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/antukst/healthchain-v2/issues)
- **Email**: ashraful.antu@example.com
- **Developer**: Antu

---

## ⚠️ Important Notes

1. **Seed Phrase**: NEVER share your MetaMask seed phrase
2. **API Keys**: Keep Pinata keys private
3. **Testnet**: Always test on Amoy before mainnet
4. **Backup**: Export patient data regularly
5. **Privacy**: Medical data is encrypted before upload

---

**Last Updated**: November 3, 2025
**Version**: HealthChain Pro v2.0
