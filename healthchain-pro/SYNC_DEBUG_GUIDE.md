# 🔧 Multi-Device Sync Debugging Guide

## Problem: অন্য device এ patient record দেখা যাচ্ছে না

---

## ✅ Step-by-Step Debugging

### Step 1: Check IPFS Desktop Status

**Device 1 (PC যেখানে patient add করেছেন):**
```
1. IPFS Desktop খোলা আছে কিনা check করুন
2. IPFS Desktop → Files tab → healthchain folder আছে কিনা দেখুন
3. Browser console (F12) খুলুন
4. Run: localStorage.getItem('healthchain_registry_cid')
   - যদি null দেখায় = Registry তৈরি হয়নি
   - যদি CID দেখায় = ভালো আছে
```

**Device 2 (যেখানে দেখা যাচ্ছে না):**
```
1. IPFS Desktop চালু করুন
2. Browser console খুলুন
3. Run: await fetch('http://127.0.0.1:5001/api/v0/version').then(r => r.json())
   - Success = IPFS connected
   - Error = IPFS না চালু অথবা CORS issue
```

---

### Step 2: Check Console Errors

**Device 1 এ patient add করার সময় console দেখুন:**
```javascript
// Expected logs:
✅ DB addPatient called
✅ IPFS upload complete. CID: Qm...
✅ Patient registered in sync registry
✅ Sync registry uploaded to IPFS: Qm...
📍 Latest pointer updated at /healthchain/sync-registry-latest.json
```

**যদি এই logs না আসে, তাহলে:**
- System initialized না হওয়া
- IPFS manager না চালু হওয়া
- Sync manager initialized না হওয়া

---

### Step 3: Manual Sync Test

**Device 2 তে run করুন (Console এ):**

```javascript
// Test 1: Check if sync manager exists
console.log('Sync Manager:', window.syncManager);

// Test 2: Try manual sync
await syncManager.syncFromIPFS();

// Test 3: Check local database
const allPatients = await db.allDocs({ include_docs: true });
console.log('Total patients:', allPatients.rows.length);
```

---

### Step 4: Check IPFS MFS Files

**Device 1 এ console এ run করুন:**
```javascript
// Check if sync registry exists in IPFS MFS
const response = await fetch('http://127.0.0.1:5001/api/v0/files/ls?arg=/healthchain');
const data = await response.json();
console.log('Files in /healthchain:', data);

// Should show:
// - patients/
// - sync-registry.json
// - sync-registry-latest.json
```

---

### Step 5: Common Issues & Solutions

#### Issue 1: "No registry CID found"
**Solution:**
```
1. Device 1 এ নতুন patient add করুন
2. Console দেখুন registry upload হচ্ছে কিনা
3. IPFS Desktop → Files → /healthchain/sync-registry-latest.json আছে কিনা check করুন
```

#### Issue 2: "Failed to read from IPFS MFS"
**Solution:**
```
1. IPFS Desktop CORS configured আছে কিনা check করুন
2. Settings → IPFS Config → Add:
{
  "API": {
    "HTTPHeaders": {
      "Access-Control-Allow-Origin": ["*"]
    }
  }
}
3. IPFS Desktop restart করুন
```

#### Issue 3: "Sync Manager not initialized"
**Solution:**
```
1. Page refresh করুন (Ctrl+Shift+R)
2. Console দেখুন: "✅ Sync Manager initialized"
3. না দেখালে script loading order issue
```

#### Issue 4: Different IPFS Networks
**Problem:** Device 1 এবং Device 2 different IPFS networks এ আছে
**Solution:**
```
Option A: Same WiFi/LAN এ রাখুন
Option B: IPFS Desktop → Settings → Add Bootstrap nodes:
/ip4/127.0.0.1/tcp/4001
```

#### Issue 5: Encryption Key Mismatch
**Problem:** Device 2 এ different encryption key আছে
**Solution:**
```
দুটো device এ same master password use করুন
অথবা:
1. Device 1 এ: localStorage.getItem('encryption_key')
2. Copy করে Device 2 এ: localStorage.setItem('encryption_key', 'paste_here')
```

---

## 🧪 Quick Test Script

**Device 2 এ console এ paste করুন:**

```javascript
(async function testSync() {
  console.log('🧪 Starting Sync Test...\n');
  
  // Test 1: IPFS Connection
  try {
    const ipfsVersion = await fetch('http://127.0.0.1:5001/api/v0/version').then(r => r.json());
    console.log('✅ IPFS Connected:', ipfsVersion.Version);
  } catch (e) {
    console.error('❌ IPFS NOT Connected:', e.message);
    return;
  }
  
  // Test 2: Sync Manager
  if (!window.syncManager) {
    console.error('❌ Sync Manager not found');
    return;
  }
  console.log('✅ Sync Manager exists');
  
  // Test 3: Read Latest Pointer
  try {
    const response = await fetch('http://127.0.0.1:5001/api/v0/files/read?arg=/healthchain/sync-registry-latest.json', {
      method: 'POST'
    });
    const pointer = await response.json();
    console.log('✅ Latest Pointer:', pointer);
  } catch (e) {
    console.error('❌ Cannot read latest pointer:', e.message);
  }
  
  // Test 4: Try Sync
  console.log('🔄 Attempting sync...');
  const result = await syncManager.syncFromIPFS();
  console.log('📊 Sync Result:', result);
  
  // Test 5: Check Patients
  const patients = await db.allDocs({ include_docs: true });
  console.log('👥 Total Patients:', patients.rows.length);
  
  console.log('\n✅ Test Complete!');
})();
```

---

## 🎯 Expected Flow

### Device 1 (Add Patient):
```
Patient Add
  ↓
Encrypt Data
  ↓
Upload to IPFS → Get CID
  ↓
Save to PouchDB
  ↓
Register in Sync Registry
  ↓
Upload Registry to IPFS
  ↓
Create Latest Pointer → /healthchain/sync-registry-latest.json
```

### Device 2 (Sync):
```
Click "Sync Now"
  ↓
Read /healthchain/sync-registry-latest.json
  ↓
Get Latest Registry CID
  ↓
Download Registry from IPFS
  ↓
For each patient:
  - Check if exists locally
  - If not: Download from IPFS
  - Decrypt data
  - Save to local PouchDB
  ↓
Refresh Patient List
```

---

## 📞 Still Not Working?

**Report these details:**
1. Console errors from both devices
2. IPFS Desktop version
3. Browser name and version
4. Are both devices on same network?
5. Output of the Quick Test Script

---

## 🔥 Nuclear Option (Last Resort)

যদি কিছুই কাজ না করে:

**Device 1:**
```javascript
// Export all data
const allPatients = await db.allDocs({ include_docs: true });
const exportData = JSON.stringify(allPatients.rows.map(r => r.doc));
console.log(exportData); // Copy this
```

**Device 2:**
```javascript
// Import manually
const importData = JSON.parse('PASTE_HERE');
for (const doc of importData) {
  await db.put(doc);
}
await refreshPatientList();
```

---

**Good Luck! 🚀**
