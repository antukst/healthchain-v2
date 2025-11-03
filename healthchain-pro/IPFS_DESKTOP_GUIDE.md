# 📂 IPFS Desktop এ Files দেখার গাইড

## ✅ সমস্যা সমাধান হয়েছে!

এখন যখন আপনি patient record বা file upload করবেন, তা **IPFS Desktop এর Files tab** এ দেখা যাবে।

---

## 🔧 যা Fix করা হয়েছে:

### 1. **Auto-Pin করা হয়েছে**
```javascript
const result = await this.ipfs.add({ 
  content: encryptedData,
  pin: true  // ✅ এখন local node এ pin হবে
});
```

### 2. **MFS (Mutable File System) এ Auto-Mirror**
```javascript
// Files automatically copy হয় এই folder structure এ:
/healthchain/
├── patients/          ← Patient records (JSON)
│   ├── patient_1730678400000.json
│   └── patient_1730678450000.json
└── uploads/           ← Medical documents/images
    ├── prescription.pdf
    └── xray.jpg
```

### 3. **Console Logging Improved**
```
✅ Local IPFS upload: QmXxxx...
📁 Added to IPFS Desktop Files: /healthchain/patients/patient_1730678400000.json
📂 MFS: /healthchain/patients/patient_1730678400000.json
```

---

## 📍 IPFS Desktop এ কীভাবে দেখবেন:

### ধাপ ১: IPFS Desktop খুলুন
1. System tray (নিচের ডানে) থেকে IPFS icon ক্লিক করুন
2. **"Open Webui"** অথবা সরাসরি: http://127.0.0.1:5001/webui

### ধাপ ২: Files Tab যান
1. বামপাশের মেনু থেকে **"Files"** ক্লিক করুন
2. আপনি দেখবেন একটা folder structure:

```
📁 /
└── 📁 healthchain/
    ├── 📁 patients/      ← সব patient records এখানে
    └── 📁 uploads/       ← সব uploaded files এখানে
```

### ধাপ ৩: Patient Records দেখুন
1. **healthchain** folder expand করুন
2. **patients** folder open করুন
3. প্রতিটা file এর নাম হবে: `patient_[timestamp].json`
4. যেকোনো file click করলে **content preview** দেখা যাবে

### ধাপ ৪: Uploaded Documents দেখুন
1. **uploads** folder open করুন
2. PDF, images, documents দেখা যাবে
3. Click করে download/preview করতে পারবেন

---

## 🎯 Test করার জন্য:

### Option 1: Browser থেকে Test করুন
1. HealthChain Pro খুলুন: http://localhost:8000/healthchain-pro/
2. একটা test patient add করুন:
   - Name: IPFS Test Patient
   - Age: 25
   - Diagnosis: Testing IPFS visibility
3. **Save Patient** click করুন
4. Console (F12) দেখুন - এই messages আসবে:
   ```
   ✅ Local IPFS upload: QmYourCIDHere...
   📁 Added to IPFS Desktop Files: /healthchain/patients/patient_1730678400000.json
   ```

### Option 2: IPFS Desktop থেকে Verify করুন
1. IPFS Desktop → **Files** tab
2. Navigate: `/healthchain/patients/`
3. সদ্য added করা file টা দেখা যাবে
4. File click করে content দেখুন

---

## 🔍 Troubleshooting

### Files দেখা যাচ্ছে না?

#### সমাধান ১: IPFS Desktop Restart করুন
```
1. IPFS Desktop সম্পূর্ণ বন্ধ করুন (system tray → Quit)
2. IPFS Desktop আবার চালু করুন
3. সবুজ checkmark দেখার পর browser refresh করুন
4. নতুন patient add করুন
```

#### সমাধান ২: CORS Config চেক করুন
```
IPFS Desktop → Settings → IPFS Config → এই section খুঁজুন:

{
  "API": {
    "HTTPHeaders": {
      "Access-Control-Allow-Origin": ["*"],
      "Access-Control-Allow-Methods": ["POST", "GET"],
      "Access-Control-Allow-Headers": ["Content-Type"]
    }
  }
}

যদি না থাকে, add করুন এবং IPFS Desktop restart করুন।
```

#### সমাধান ৩: Browser Hard Refresh করুন
```
Ctrl + Shift + R  (Windows)
Cmd + Shift + R   (Mac)

এটা browser cache clear করে fresh code load করবে।
```

#### সমাধান ৪: Console Check করুন
```
F12 → Console tab → দেখুন:

✅ Expected (Good):
"✅ Local IPFS upload: Qm..."
"📁 Added to IPFS Desktop Files: /healthchain/patients/..."

❌ Problem:
"⚠️ Local IPFS upload failed: ..."
"⚠️ Failed to mirror to MFS: ..."

যদি error থাকে, IPFS Desktop চালু আছে কিনা verify করুন।
```

---

## 📊 File Organization Structure

### Patient Records Format:
```
Filename: patient_1730678400000.json
Location: /healthchain/patients/
Content: {encrypted AES-256-GCM data}
CID: QmXxxx... (globally unique)
```

### Uploaded Files Format:
```
Filename: [original filename].pdf
Location: /healthchain/uploads/
Content: {binary file data}
CID: QmYyyy... (globally unique)
```

---

## 🚀 Advanced: Manual File Operations

### IPFS Web UI থেকে Files Manage করুন:

#### 1. File Download করুন:
- File select করুন → **"⋯"** (three dots) → **Download**

#### 2. File Share করুন:
- File select করুন → **Copy CID**
- Share link: `https://ipfs.io/ipfs/[CID]`
- Pinata gateway: `https://gateway.pinata.cloud/ipfs/[CID]`

#### 3. File Delete করুন:
- File select করুন → **"⋯"** → **Remove**
- ⚠️ Warning: এটা শুধু MFS থেকে remove করবে, IPFS network থেকে নয়

#### 4. New Folder Create করুন:
- **"+ New folder"** button
- Custom organization করতে পারবেন

---

## 🔐 Security Note

**যা MFS/Files tab এ দেখা যায়:**
- ✅ Encrypted patient data (decryption key ছাড়া পড়া যাবে না)
- ✅ File metadata (filename, size, timestamp)
- ✅ IPFS CID (content address)

**যা দেখা যায় না:**
- ❌ Actual patient details (encrypted)
- ❌ Unencrypted medical records
- ❌ Personal health information

**নিরাপত্তা:** AES-256-GCM encryption দিয়ে encrypt করা তাই IPFS network এ public হলেও কেউ পড়তে পারবে না।

---

## 📈 What Happens Behind the Scenes:

```
Patient Save করলে যা হয়:
1. Patient data → AES-256 Encrypt
2. Encrypted data → IPFS.add() with pin: true
3. Get CID (e.g., QmXxxx...)
4. Copy to MFS: /healthchain/patients/patient_[timestamp].json
5. (Optional) Backup to Pinata Cloud
6. (Optional) Record on Polygon Blockchain
7. Save CID to PouchDB local database
8. Display in HealthChain UI

সব steps console এ logged থাকে (F12)
```

---

## ✅ Success Indicators

### Console Messages (F12):
```
✅ IPFS connected via Local IPFS Desktop (127.0.0.1)
   Peer ID: 12D3KooW...
   Agent Version: kubo/0.xx.x
✅ Local IPFS upload: QmXxxx...
📁 Added to IPFS Desktop Files: /healthchain/patients/patient_1730678400000.json
📂 MFS: /healthchain/patients/patient_1730678400000.json
📦 Upload complete
```

### IPFS Desktop Status:
- 🟢 Green checkmark in system tray
- 🟢 Files tab shows `/healthchain/` folder
- 🟢 Peers count: 10+ connections
- 🟢 Repo size increasing with each upload

---

## 🎓 Next Steps:

1. ✅ Add test patient record
2. ✅ Verify file in IPFS Desktop Files tab
3. ✅ Copy CID and verify on public gateway
4. ✅ Upload medical document (PDF/image)
5. ✅ Check uploads folder in IPFS Desktop
6. ✅ Share IPFS link with colleague

---

## 📞 Still Having Issues?

1. **Check IPFS Desktop is running** (green icon in system tray)
2. **Check browser console** (F12) for error messages
3. **Restart IPFS Desktop** completely
4. **Hard refresh browser** (Ctrl+Shift+R)
5. **Check CORS config** in IPFS settings
6. **Read full setup guide**: `SETUP_GUIDE.md`

---

**Last Updated**: November 3, 2025  
**Fix Version**: v2.1  
**Status**: ✅ Files এখন IPFS Desktop এ দেখা যাবে!
