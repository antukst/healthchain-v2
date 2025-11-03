# 🔧 IPFS Desktop CORS Fix - বাংলা গাইড

## ⚠️ সমস্যা: Files IPFS Desktop এ দেখা যাচ্ছে না

**কারণ:** Browser থেকে IPFS API access blocked (403 Forbidden - CORS error)

---

## ✅ সমাধান: CORS Configuration Add করুন

### ধাপ ১: IPFS Desktop Settings খুলুন

1. **IPFS Desktop** চালু করুন
2. উপরের মেনু বার থেকে **"Settings"** click করুন (⚙️ gear icon)
3. বামপাশের মেনু থেকে **"IPFS Config"** select করুন

---

### ধাপ ২: API Configuration খুঁজুন

Config file এ scroll করে **`"API"`** section খুঁজুন। এটা দেখতে এরকম:

```json
{
  "API": {
    "HTTPHeaders": {}
  }
}
```

অথবা হয়তো শুধু:

```json
{
  "API": {}
}
```

---

### ধাপ ৩: HTTPHeaders Add করুন

**পুরো `"API"` section টা এভাবে replace করুন:**

```json
{
  "API": {
    "HTTPHeaders": {
      "Access-Control-Allow-Origin": [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:5001",
        "https://webui.ipfs.io"
      ],
      "Access-Control-Allow-Methods": [
        "PUT",
        "POST",
        "GET"
      ],
      "Access-Control-Allow-Headers": [
        "Content-Type"
      ]
    }
  }
}
```

**⚠️ গুরুত্বপূর্ণ:**
- JSON syntax ঠিক রাখুন (comma, brackets)
- Double quotes ব্যবহার করুন (`"` not `'`)
- শেষ item এর পরে comma দেবেন না

---

### ধাপ ৪: Save এবং Restart

1. **"Save"** বা **"Apply"** button click করুন
2. IPFS Desktop **সম্পূর্ণ বন্ধ করুন**:
   - Windows: System tray → IPFS icon → Right-click → **"Quit"**
   - Mac: Menu bar → IPFS icon → **"Quit IPFS Desktop"**
3. **IPFS Desktop আবার চালু করুন**
4. সবুজ ✅ checkmark আসা পর্যন্ত অপেক্ষা করুন (30-60 seconds)

---

### ধাপ ৫: Verify করুন

Browser এ যান: **http://localhost:8000/ipfs-test.html**

**"Step 1: Check IPFS Desktop"** button click করুন

**Expected Result:**
```
✅ IPFS Desktop Connected!
Endpoint: http://127.0.0.1:5001
Peer ID: 12D3KooW...
Agent: kubo/0.xx.x
```

---

## 🎯 পুরো Config File Example

যদি confused হন, আপনার পুরো config file এরকম দেখা উচিত:

```json
{
  "API": {
    "HTTPHeaders": {
      "Access-Control-Allow-Origin": [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:5001",
        "https://webui.ipfs.io"
      ],
      "Access-Control-Allow-Methods": [
        "PUT",
        "POST",
        "GET"
      ],
      "Access-Control-Allow-Headers": [
        "Content-Type"
      ]
    }
  },
  "Addresses": {
    "API": "/ip4/127.0.0.1/tcp/5001",
    "Gateway": "/ip4/127.0.0.1/tcp/8080"
  },
  "Bootstrap": [
    "/dnsaddr/bootstrap.libp2p.io/p2p/...",
    ...
  ],
  ...other settings...
}
```

**মূল point:** শুধু `"API"` section টা সঠিক করুন, বাকি কিছু change করবেন না!

---

## 🔍 Troubleshooting

### ❌ JSON Parse Error দেখাচ্ছে?

**সমস্যা:** Syntax ভুল আছে

**চেক করুন:**
- সব brackets match করছে কিনা: `{ }` এবং `[ ]`
- Double quotes আছে কিনা: `"key": "value"`
- Comma সঠিক জায়গায় আছে কিনা
- শেষ item এর পরে comma নেই তো?

**সমাধান:** Online JSON validator ব্যবহার করুন:
1. পুরো config copy করুন
2. যান: https://jsonlint.com/
3. Paste করুন এবং **"Validate JSON"** click করুন
4. Error দেখালে fix করুন
5. Corrected JSON copy করে IPFS Config এ paste করুন

---

### ❌ IPFS Desktop Crash করছে?

**সমস্যা:** Config file corrupt হয়ে গেছে

**সমাধান:**
1. IPFS Desktop বন্ধ করুন
2. Config backup নিন:
   - Windows: `C:\Users\[YourName]\.ipfs\config`
   - Mac: `~/.ipfs/config`
3. Original config restore করুন বা IPFS Desktop reinstall করুন

---

### ✅ এখনও 403 Forbidden?

**Additional fix:** Wildcard origin allow করুন (security কমবে):

```json
{
  "API": {
    "HTTPHeaders": {
      "Access-Control-Allow-Origin": ["*"],
      "Access-Control-Allow-Methods": ["PUT", "POST", "GET"],
      "Access-Control-Allow-Headers": ["Content-Type"]
    }
  }
}
```

**⚠️ Warning:** `"*"` দিলে যেকোনো website আপনার IPFS access করতে পারবে। শুধু local development এর জন্য এটা use করুন।

---

## 📝 Quick Copy-Paste Config

**Safe version (specific origins):**
```json
"API": {
  "HTTPHeaders": {
    "Access-Control-Allow-Origin": [
      "http://localhost:8000",
      "http://127.0.0.1:8000"
    ],
    "Access-Control-Allow-Methods": ["PUT", "POST", "GET"],
    "Access-Control-Allow-Headers": ["Content-Type"]
  }
}
```

**Open version (all origins - development only):**
```json
"API": {
  "HTTPHeaders": {
    "Access-Control-Allow-Origin": ["*"],
    "Access-Control-Allow-Methods": ["PUT", "POST", "GET"],
    "Access-Control-Allow-Headers": ["Content-Type"]
  }
}
```

---

## ✅ Success Checklist

Configure করার পর এগুলো verify করুন:

- [ ] IPFS Desktop চালু আছে (green checkmark)
- [ ] http://127.0.0.1:5001/webui খুলছে
- [ ] http://localhost:8000/ipfs-test.html → Step 1 ✅ success
- [ ] Browser console (F12) এ CORS error নেই
- [ ] Test file upload করলে Files tab এ দেখা যাচ্ছে

---

## 🚀 Next Steps

CORS fix করার পর:

1. **HealthChain Pro** চালান: http://localhost:8000/healthchain-pro/
2. Browser **hard refresh** করুন: `Ctrl + Shift + R`
3. Patient add করুন
4. Console (F12) চেক করুন:
   ```
   ✅ IPFS connected via Local IPFS Desktop
   ✅ Local IPFS upload: QmXxxx...
   📁 Added to IPFS Desktop Files: /healthchain/patients/...
   ```
5. IPFS Desktop → Files → `/healthchain/patients/` চেক করুন

---

## 📞 Still Having Issues?

1. **Test page run করুন:** http://localhost:8000/ipfs-test.html
2. **Console check করুন:** F12 → Console tab → error messages দেখুন
3. **IPFS logs check করুন:** IPFS Desktop → Advanced → View Logs
4. **Github issue create করুন:** Include console errors + config file

---

**সংক্ষেপে:**
1. IPFS Desktop → Settings → IPFS Config
2. Add CORS headers to API section
3. Save এবং Restart
4. Test page দিয়ে verify করুন
5. HealthChain Pro চালান

**এটা করার পর IPFS Desktop এ files দেখা যাবে!** ✅
