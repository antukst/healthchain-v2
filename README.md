# HealthChain Pro - Decentralized Healthcare System

A low-cost, decentralized healthcare management system that ensures patient data privacy, security, and interoperability through AES-GCM encryption, IPFS storage, and Polygon blockchain proofs.

## 🚀 Features

### 🔐 Security & Privacy
- **AES-GCM Encryption**: Patient data is encrypted locally before storage
- **Zero-Knowledge Architecture**: Only authorized users can decrypt and view data
- **End-to-End Security**: Data remains encrypted throughout the entire pipeline

### 🌐 Decentralization
- **IPFS Storage**: Medical records stored on InterPlanetary File System
- **Polygon Blockchain**: Immutable proofs of data integrity and timestamps
- **Offline-First**: Works without internet connection, syncs when online

### 🔄 Interoperability
- **Data Sharing**: Secure sharing between healthcare providers via QR codes/links
- **Standardized Format**: Compatible with healthcare data exchange standards
- **Multi-Provider Support**: Seamless data transfer between hospitals/clinics

### 👥 User Management
- **Role-Based Access**: Admin, Doctor, Nurse, and Patient roles
- **Permission Control**: Granular access controls for different user types
- **Audit Trail**: Complete logging of data access and modifications

## 🛠️ Technology Stack

- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+)
- **Database**: PouchDB (local) + CouchDB (remote sync)
- **Encryption**: Web Crypto API (AES-GCM)
- **Storage**: IPFS (InterPlanetary File System)
- **Blockchain**: Polygon Network
- **Authentication**: Role-based access control

## 📋 Prerequisites

- Modern web browser with Web Crypto API support
- MetaMask wallet (for blockchain interactions)
- Node.js (for development server)
- CouchDB server (optional, for multi-device sync)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd healthchain-pro
npm install
```

### 2. Configure Environment
- Update `db.js` with your CouchDB remote URL
- Configure IPFS settings in `ipfs.js`
- Set up Polygon network in MetaMask

### 3. Start Development Server
```bash
npm start
```

### 4. Access Application
Open `http://localhost:3000` in your browser

## 🌐 Deployment to Vercel

1. Push code to GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign up/login
3. Click "New Project" and import your GitHub repo
4. Vercel will auto-detect as static site
5. Deploy
6. Add custom domain in Project Settings > Domains

### PWA Installation
- Visit deployed site
- Browser will prompt "Add to Home Screen"
- App works offline after installation

### Production Notes
- CouchDB sync disabled (localhost won't work on Vercel)
- All data stored locally in browser
- IPFS and Polygon work in production

## 🔧 Configuration

### CouchDB Setup
```javascript
// In db.js
const remoteCouch = 'https://username:password@your-couchdb-server.com/healthchain-pro';
```

### IPFS Configuration
```javascript
// In ipfs.js - Update with your Infura credentials
const ipfs = window.IpfsHttpClient.create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: 'Basic ' + btoa('your-project-id:your-secret')
  }
});
```

### Polygon Network
Ensure MetaMask is connected to Polygon Mainnet (Chain ID: 137)

## 📖 Usage Guide

### Adding Patients
1. Fill in patient information in the form
2. Upload medical photos/documents (optional)
3. Click "Add Patient Securely"
4. Data is automatically encrypted and stored

### Viewing Patient Data
- Click "View" button on any patient row
- Full encrypted data is retrieved and decrypted locally
- Medical files can be downloaded from IPFS

### Sharing Patient Data
1. Click "Share" button on patient row
2. Generate shareable link or QR code
3. Share with other healthcare providers
4. Recipients can import data into their systems

### Data Export/Import
- **Export**: Download patient metadata as JSON
- **Import**: Upload previously exported data
- Useful for backups and data migration

## 🔒 Security Model

### Encryption Flow
1. **Data Entry**: Patient data entered in browser
2. **Local Encryption**: AES-GCM encryption using user-specific key
3. **IPFS Storage**: Encrypted data uploaded to IPFS
4. **Database Index**: Only searchable metadata stored locally
5. **Blockchain Proof**: Hash of data stored on Polygon for immutability

### Access Control
- **Admin**: Full system access, user management
- **Doctor**: Read/write patient data, blockchain verification
- **Nurse**: Read/write basic patient data
- **Patient**: Read own data only

## 🌐 Decentralized Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │     IPFS        │    │   Polygon       │
│   (Encrypted)   │◄──►│   (Storage)     │    │   Blockchain    │
│                 │    │                 │    │   (Proofs)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PouchDB       │    │   CouchDB       │    │   MetaMask      │
│   (Local)       │◄──►│   (Sync)        │    │   (Wallet)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 Offline Functionality

- **Local Storage**: All data stored locally in browser
- **Offline Operations**: Add/edit patients without internet
- **Automatic Sync**: Data syncs when connection restored
- **Conflict Resolution**: PouchDB handles sync conflicts

## 📊 Data Flow

1. **Input** → Patient data entered
2. **Encrypt** → AES-GCM encryption locally
3. **Store** → Encrypted data to IPFS
4. **Index** → Metadata to PouchDB
5. **Prove** → Hash to Polygon blockchain
6. **Sync** → Data replication across devices

## 🛡️ Privacy & Compliance

- **GDPR Compliant**: Data encryption and user consent
- **HIPAA Ready**: Medical data privacy standards
- **Zero Trust**: Every access is authenticated and logged
- **Data Ownership**: Patients control their medical data

## 🚨 Important Notes

### Security Considerations
- Keep encryption keys secure
- Use strong master passwords
- Regularly backup encryption keys
- Monitor blockchain transactions

### Performance
- Large files may take time to upload to IPFS
- Blockchain transactions require MATIC tokens
- Local storage has browser limitations

### Browser Support
- Chrome 65+
- Firefox 60+
- Safari 12+
- Edge 79+

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create GitHub issue
- Check documentation
- Review console logs for debugging

## 🔮 Future Enhancements

- [ ] Multi-signature approvals for critical data
- [ ] Integration with electronic health records (EHR)
- [ ] AI-powered diagnosis assistance
- [ ] Telemedicine integration
- [ ] Mobile app version
- [ ] Advanced audit logging
- [ ] Smart contract automation

---

**HealthChain Pro** - Revolutionizing healthcare data management through decentralization, security, and interoperability.</content>
<parameter name="filePath">c:\Users\AshraFul R Antu\OneDrive\Desktop\healthchain-v2\healthchain-pro\README.md
