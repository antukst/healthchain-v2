# ⚡ HealthChain Pro - Quick Setup Checklist

## 📋 30-Minute Complete Setup

### ✅ Step 1: IPFS Desktop (5 min)
- [ ] Download: https://docs.ipfs.tech/install/ipfs-desktop/
- [ ] Install & Launch
- [ ] Settings → IPFS Config → Add CORS headers
- [ ] Restart IPFS Desktop
- [ ] Verify: http://127.0.0.1:5001/webui

### ✅ Step 2: Pinata Cloud (5 min)
- [ ] Sign up: https://app.pinata.cloud/register
- [ ] API Keys → New Key → Enable pinFileToIPFS + pinJSONToIPFS
- [ ] Copy API Key + API Secret
- [ ] Open `healthchain-pro/ipfs.js`
- [ ] Paste keys at line ~13
- [ ] Change `enabled: false` to `enabled: true`
- [ ] Save file

### ✅ Step 3: MetaMask (10 min)
- [ ] Install: https://metamask.io/download/
- [ ] Complete setup wizard
- [ ] **SAVE 12-word seed phrase** (CRITICAL!)
- [ ] Add Polygon Amoy Testnet:
  - Network Name: `Polygon Amoy Testnet`
  - RPC URL: `https://rpc-amoy.polygon.technology/`
  - Chain ID: `80002`
  - Symbol: `MATIC`
  - Explorer: `https://amoy.polygonscan.com/`
- [ ] Get test MATIC: https://faucet.polygon.technology/
- [ ] Wait for 0.5 MATIC to arrive

### ✅ Step 4: Run HealthChain (5 min)
```powershell
cd "C:\Users\AshraFul R Antu\OneDrive\Desktop\healthchain-v2"
python -m http.server 8000
```
- [ ] Open: http://localhost:8000/healthchain-pro/
- [ ] Connect MetaMask (approve prompt)
- [ ] Check status: IPFS ✅ | Polygon ✅

### ✅ Step 5: Test (5 min)
- [ ] Add Patient → Fill form → Save
- [ ] Press F12 → Check console:
  ```
  ✅ Local IPFS upload: Qm...
  ☁️ Pinata Cloud backup: Qm...
  🦊 MetaMask transaction: 0x...
  ```
- [ ] Verify Pinata: https://app.pinata.cloud/pinmanager
- [ ] Verify Blockchain: https://amoy.polygonscan.com/

---

## 🎯 Configuration Files Summary

### File 1: `healthchain-pro/ipfs.js` (Line ~13)
```javascript
this.pinata = {
  apiKey: 'YOUR_PINATA_API_KEY',      // ← Your key here
  apiSecret: 'YOUR_PINATA_API_SECRET', // ← Your secret here
  enabled: true                        // ← Change to true
};
```

### File 2: `healthchain-pro/blockchain.js` (Line ~21)
```javascript
await this.init(true);  // true = Amoy testnet (FREE)
                        // false = Mainnet (requires real MATIC)
```

---

## 🔍 Verification Commands

### Check IPFS Desktop Running
```powershell
# Should open IPFS Web UI
start http://127.0.0.1:5001/webui
```

### Check MetaMask Balance
```
Open MetaMask → Should show 0.5 MATIC
```

### Check HealthChain Status
```
Browser Console (F12):
- Look for "✅ IPFS connected"
- Look for "🦊 MetaMask detected"
```

---

## 🚨 Common Errors & Quick Fixes

| Error | Fix |
|-------|-----|
| IPFS: ❌ | Restart IPFS Desktop, wait 30s, refresh browser |
| Pinata: ❌ | Check API keys in ipfs.js (no spaces!) |
| MetaMask: ❌ | Install extension, refresh browser |
| No MATIC | Get from faucet, wait 2 minutes |
| CORS error | Add CORS config to IPFS, restart |

---

## 🎓 What You Get

✅ **Triple Redundant Storage:**
1. 🖥️ Local IPFS (Your Computer) - Private, Fast
2. ☁️ Pinata Cloud (1GB Free) - Distributed Backup
3. ⛓️ Polygon Blockchain - Immutable Proof

✅ **Security:**
- AES-256-GCM encryption
- Decentralized (no single point of failure)
- Tamper-proof blockchain records

✅ **Cost:**
- IPFS Desktop: FREE
- Pinata Cloud: FREE (1GB)
- Polygon Amoy: FREE (testnet)
- **Total: $0.00** 🎉

---

## 📞 Need Help?

1. Check console (F12) for error messages
2. Read full guide: `SETUP_GUIDE.md` (English)
3. Read full guide: `SETUP_BANGLA.md` (বাংলা)
4. GitHub Issues: https://github.com/antukst/healthchain-v2/issues

---

**⏱️ Total Time: ~30 minutes**  
**💰 Total Cost: FREE**  
**🔒 Security Level: Enterprise-grade**

Let's go! 🚀
