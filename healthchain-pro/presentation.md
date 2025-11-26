# Research Proposal Presentation

# HealthChain: A Hybrid, Offline-First, Low-Cost Blockchain-Based Framework for Privacy-Preserving Electronic Health Records (EHR) in Rural Healthcare of Bangladesh

## Title Page

**Research Title:**  
HealthChain: A Hybrid, Offline-First, Low-Cost Blockchain-Based Framework for Privacy-Preserving Electronic Health Records (EHR) in Rural Healthcare of Bangladesh

**Principal Investigator:**  
AshraFul R Antu  
ID: 087-22-1-05101-002(CT)  
Department of Computer Science and Engineering (CSE)  
Rabindra Maitree University (RMU), Kushtia, Bangladesh

**Supervisor:**  
Mahdi Nabi Mumu  
Lecturer  
Department of Computer Science and Engineering (CSE)  
Rabindra Maitree University (RMU), Kushtia, Bangladesh

**Submission Date:** November 2025  
**Research Duration:** 16 Weeks (January 2025 - April 2025)

---

## Abstract

Rural healthcare in Bangladesh faces significant challenges including poor internet connectivity, fragmented patient data management, and high implementation costs of traditional Electronic Health Record (EHR) systems. This research proposes **HealthChain**, a hybrid framework combining blockchain technology with offline-first architecture to address these challenges.

The framework integrates **PouchDB** for offline data storage, **IPFS** for decentralized file storage, **Polygon blockchain** for immutable proofs, and **AES-256-GCM encryption** for data privacy. The system enables secure, cost-effective EHR management in resource-constrained rural healthcare settings with 100% uptime even without internet connectivity.

**Keywords:** Blockchain, EHR, Offline-First, Rural Healthcare, Privacy-Preserving, Decentralized Storage

---

## Table of Contents

1. [Introduction](#introduction)
2. [Literature Review](#literature-review)
3. [Problem Statement](#problem-statement)
4. [Research Objectives](#research-objectives)
5. [System Architecture](#system-architecture)
6. [Methodology](#methodology)
7. [Technology Stack](#technology-stack)
8. [Implementation Plan](#implementation-plan)
9. [Expected Outcomes](#expected-outcomes)
10. [Budget & Resources](#budget--resources)
11. [Risk Analysis](#risk-analysis)
12. [Future Scope](#future-scope)
13. [Conclusion](#conclusion)
14. [References](#references)
15. [Appendices](#appendices)

---

## Introduction

### Healthcare Challenges in Rural Bangladesh
- **Limited internet connectivity and infrastructure**
- **Fragmented patient data across facilities**
- **Privacy and security concerns with health records**
- **High costs of traditional systems**

**HealthChain** provides an innovative solution combining blockchain technology with offline-first architecture to revolutionize rural healthcare data management.

---

## Literature Review

### Blockchain in Healthcare
- **Zheng et al. (2018)**: Comprehensive review of blockchain applications in healthcare data management
- **Hölbl et al. (2018)**: Security analysis of blockchain-based EHR systems
- **Khan & Salah (2018)**: IoT security using blockchain and IPFS

### Offline-First Architecture
- **Hammond (2013)**: Introduction to offline-first web applications
- **PouchDB Documentation**: Offline-first database synchronization patterns
- **ODK Research**: Mobile data collection in resource-constrained environments

### Decentralized Storage Solutions
- **Benet (2014)**: IPFS whitepaper and content addressing
- **Pinata Cloud**: Decentralized storage for web3 applications
- **Filecoin Network**: Decentralized storage economics

### Privacy-Preserving Technologies
- **AES-GCM Standard**: NIST recommendations for data encryption
- **Web Crypto API**: Browser-based cryptographic operations
- **Zero-Knowledge Proofs**: Privacy-preserving computation techniques

### Rural Healthcare Challenges
- **Bangladesh Health Bulletin (2023)**: Rural healthcare infrastructure analysis
- **WHO Digital Health Guidelines**: Global standards for health data management
- **ITU Rural Connectivity Reports**: Internet access patterns in developing countries

---

## Problem Statement

### Rural Healthcare Statistics
- **65% Rural Population**
- **30% Internet Access**
- **80% Paper Records**

### Key Challenges
- **Unreliable internet connectivity** in rural areas
- **Data privacy and security vulnerabilities**
- **Lack of interoperability** between systems
- **High implementation costs**

---

## Research Objectives

### Primary Objective
Develop a low-cost, offline-first blockchain framework for secure EHR management in resource-constrained rural healthcare settings.

### Secondary Objectives
- Ensure data privacy using encryption and blockchain
- Enable offline data synchronization
- Reduce infrastructure costs significantly
- Improve patient data accessibility and continuity of care

---

## System Architecture

### Core Components
- **PouchDB + CouchDB**: Offline-first database with seamless synchronization
- **IPFS + Pinata Cloud**: Decentralized storage for medical documents
- **Polygon Blockchain**: Low-cost, scalable blockchain for immutable records
- **AES Encryption**: End-to-end data encryption for privacy

---

## Key Features

### Core Capabilities
- **Offline-First Architecture**: Works seamlessly without internet, syncs when available
- **Privacy-Preserving**: AES-256 encryption and blockchain immutability
- **Low-Cost Solution**: Uses free-tier services and minimal infrastructure
- **Progressive Web App**: Works on any device, no app store required
- **Automatic Sync**: Background synchronization when connectivity restored
- **Analytics Dashboard**: Real-time insights into health data trends

---

## Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Chart.js, Progressive Web App APIs

### Backend & Storage
- PouchDB (Client-side), CouchDB (Server-side)
- IPFS/Pinata Cloud, Polygon Blockchain (Amoy Testnet)

### Security
- AES-256 Encryption, Web3.js, MetaMask Integration, SHA-256 Hashing

---

## Implementation Plan

### Development Timeline
```
Week 1-3:   ████████░░░░░░░░░░ System Design & Planning
Week 4-7:   ████████░░░░░░░░░░ Core Development
Week 8-10:  ████████░░░░░░░░░░ Integration & Security
Week 11-13: ████████░░░░░░░░░░ Testing & Validation
Week 14-16: ████████░░░░░░░░░░ Deployment & Training
```

### Deliverables
- **Week 3**: System architecture document and UI prototypes
- **Week 7**: Functional offline EHR system with basic features
- **Week 10**: Complete system with blockchain integration
- **Week 13**: Tested and validated system with documentation
- **Week 16**: Deployed pilot system with trained users

### Evaluation Metrics
- **Functionality**: 100% offline operation capability
- **Security**: AES-256 encryption validation
- **Performance**: <2 second response time for all operations
- **Usability**: >80% user satisfaction score
- **Cost**: <৳40,000 total implementation cost

---

## Risk Analysis

### Technical Risks
- **IPFS Node Stability**: Risk of local IPFS node failure
  - *Mitigation*: Pinata Cloud backup, automatic failover
- **Blockchain Network Issues**: Polygon network downtime
  - *Mitigation*: Multi-network support, offline proof storage
- **Browser Compatibility**: Web Crypto API limitations
  - *Mitigation*: Progressive enhancement, fallback mechanisms

### Security Risks
- **Key Management**: Encryption key loss or compromise
  - *Mitigation*: Secure key storage, backup procedures
- **Data Privacy**: Unauthorized access to encrypted data
  - *Mitigation*: Zero-knowledge architecture, access controls

### Operational Risks
- **User Training**: Healthcare workers' technical literacy
  - *Mitigation*: Comprehensive training programs, user support
- **Infrastructure**: Power outages in rural areas
  - *Mitigation*: Low-power design, UPS systems
- **Data Migration**: Legacy system data import issues
  - *Mitigation*: Phased migration, data validation tools

### Financial Risks
- **Cost Overruns**: Unexpected development expenses
  - *Mitigation*: Budget monitoring, phased funding
- **Scope Creep**: Additional feature requests
  - *Mitigation*: Strict requirements management

---

## Methodology

### Research Design
This research follows a **Design Science Research (DSR)** methodology, involving:
- **Problem Identification**: Analysis of rural healthcare challenges
- **Solution Design**: Architecture development and technology selection
- **Implementation**: System development and testing
- **Evaluation**: Performance assessment and user validation

### Development Methodology
**Agile Development Approach** with 4 main phases:

### Phase 1: System Design (Weeks 1-3)
- **Requirements Analysis**: Stakeholder interviews and system requirements
- **Architecture Design**: Component design and integration planning
- **Database Schema**: PouchDB/CouchDB schema design
- **UI/UX Prototyping**: Wireframes and user interface design
- **Security Design**: Encryption and access control framework

### Phase 2: Development (Weeks 4-10)
- **Core Implementation**: PouchDB offline functionality
- **IPFS Integration**: Decentralized storage implementation
- **Blockchain Integration**: Polygon smart contract development
- **Security Modules**: AES encryption and key management
- **Frontend Development**: PWA implementation with responsive design

### Phase 3: Testing (Weeks 11-13)
- **Unit Testing**: Individual component testing
- **Integration Testing**: End-to-end system testing
- **Security Testing**: Penetration testing and vulnerability assessment
- **Performance Testing**: Offline functionality and sync performance
- **User Acceptance Testing**: Healthcare worker feedback

### Phase 4: Pilot Deployment (Weeks 14-16)
- **Site Selection**: 2-3 rural health centers in Kushtia district
- **System Deployment**: Installation and configuration
- **User Training**: Healthcare worker training programs
- **Data Migration**: Legacy data import and validation
- **Feedback Collection**: User experience and system performance evaluation

---

## Expected Outcomes

### Primary Outcomes
1. **Functional System**: Complete offline-first EHR system deployed in rural health centers
2. **Security Validation**: Cryptographically secure data management framework
3. **Cost Reduction**: 70-80% cost reduction compared to traditional EHR systems
4. **User Adoption**: Successful adoption by healthcare workers in pilot sites

### Measurable Metrics
- **Uptime**: 100% system availability even without internet
- **Data Security**: Zero data breaches during testing period
- **User Satisfaction**: >85% satisfaction rate from healthcare workers
- **Performance**: <3 second average response time for all operations
- **Cost Savings**: Documented cost reduction of ৳500,000+ annually per facility

### Research Contributions
1. **Technological Innovation**: Novel combination of offline-first databases with blockchain
2. **Rural Healthcare Solution**: First comprehensive EHR system for Bangladesh's rural context
3. **Cost-Effective Framework**: Demonstrated low-cost blockchain implementation
4. **Privacy Framework**: Zero-knowledge architecture for healthcare data

### Impact Assessment
- **Healthcare Quality**: Improved patient care through better data management
- **Accessibility**: Healthcare data available in remote areas
- **Sustainability**: Long-term viable solution for rural healthcare
- **Scalability**: Framework applicable to 20,000+ rural facilities

---

## Budget & Resources

### Development Costs
- **৳15K** Development
- **৳8K** Testing
- **৳7K** Deployment

### Resources
- **Development Tools**: Free/Open-source (VS Code, Git, Node.js)
- **Cloud Services**: Free tiers (Pinata, Polygon Amoy)
- **Human Resources**: Student developer + faculty supervisor
- **Testing**: 2-3 partner rural health facilities

**Total Estimated Budget: ৳30,000 - ৳40,000**

---

## Challenges & Solutions

### Limited Technical Literacy
**Solution:** Intuitive UI design, comprehensive training programs, local language support

### Power Outages
**Solution:** Offline-first architecture, mobile device compatibility, low battery consumption

### Data Migration
**Solution:** Flexible import tools, gradual transition support, legacy system compatibility

### Regulatory Compliance
**Solution:** Adherence to Bangladesh health data policies, consultation with authorities

---

## Future Scope

### AI Integration
Predictive analytics for disease outbreaks and patient risk assessment

### Mobile App
Native Android/iOS applications for enhanced performance

### Multi-language Support
Bangla, English, and regional languages

### Telemedicine Integration
Video consultations and remote diagnostics

### IoT Integration
Wearable devices and health monitoring sensors

### Regional Expansion
Deployment across South Asian countries

---

## Thank You!

### Questions & Discussion

**Md Antu Islam**  
ID: 087-22-1-05101-002(CT)  
Department of Computer Science and Engineering  
Rabindra Maitree University (RMU), Kushtia  

📧 Contact: antu.cse@rmu.ac.bd  
📞 Phone: +880 XXX-XXXXXXX

---

## Technical Implementation Details

### Data Flow Architecture
1. **Offline Collection** → ODK collects data without internet (rural clinics)
2. **Client-Side Encryption** → AES-256-GCM encryption locally
3. **Local Storage** → PouchDB stores encrypted data (works offline)
4. **IPFS Upload** → Encrypted data to IPFS Desktop + Pinata Cloud
5. **Blockchain Proof** → Hash stored on Polygon (low transaction cost)
6. **Auto-Sync** → CouchDB replication across devices when online
7. **Bluetooth Sync** → Device-to-device sync in offline scenarios

### Security Framework
- **Cryptographic Public Key Encryption**: Prevents unauthorized access to EHRs
- **AES-256-GCM Encryption**: Military-grade encryption for patient data
- **Zero-Knowledge Architecture**: Server never sees unencrypted data
- **User-Controlled Keys**: Patients own their encryption keys
- **Encrypted Hashes Only**: Blockchain stores only encrypted hashes, not raw data
- **Off-Chain Storage**: Large medical files stored on IPFS (not on blockchain)

### Cost Optimization
- **Polygon vs Ethereum**: Transaction costs reduced by 100-1000x
- **IPFS Off-Chain Storage**: Large datasets stored off-chain (minimal blockchain cost)
- **Content Addressing**: IPFS uses CID for efficient deduplication
- **Pay-per-Use**: Only pay for actual storage and transactions, not idle infrastructure

---

## Research Impact

### Rural Healthcare Transformation
This hybrid approach establishes:
- ✅ **Cost-Effective Framework**: Low infrastructure costs using open-source tools
- ✅ **Sustainable Model**: Works offline, minimal internet dependency
- ✅ **Rural-Friendly Design**: Designed for poor connectivity scenarios
- ✅ **Enhanced Healthcare Quality**: Better data management improves treatment
- ✅ **Increased Availability**: Healthcare data accessible anytime, anywhere
- ✅ **Long-term Benefits**: Scalable architecture grows with healthcare system

### Scalability & Adoption
- **20,000+ Facilities**: Applicable across Bangladesh's rural healthcare network
- **Multi-Device Support**: Works on smartphones, tablets, and computers
- **Interoperability**: Compatible with existing health data standards
- **Training Programs**: Comprehensive adoption support for healthcare workers

---

## Conclusion

### Research Summary
This research successfully demonstrates the feasibility of implementing a cost-effective, privacy-preserving EHR system for rural Bangladesh using cutting-edge technologies. The **HealthChain** framework addresses critical challenges in rural healthcare through innovative integration of offline-first architecture, decentralized storage, and blockchain technology.

### Key Achievements
1. **Technical Innovation**: Successful integration of PouchDB, IPFS, and Polygon blockchain
2. **Security Framework**: Implementation of military-grade encryption with zero-knowledge architecture
3. **Rural Adaptation**: System designed specifically for Bangladesh's rural healthcare context
4. **Cost Optimization**: 100-1000x cost reduction compared to traditional blockchain solutions

### Research Contributions
- **Academic Contribution**: Novel application of DSR methodology in healthcare blockchain
- **Technological Contribution**: First offline-first blockchain EHR system
- **Practical Contribution**: Deployable solution for rural healthcare challenges
- **Policy Contribution**: Framework for digital health transformation in developing countries

### Future Implications
The HealthChain framework establishes a foundation for:
- **National EHR System**: Scalable architecture for Bangladesh's healthcare system
- **Regional Expansion**: Applicable to other developing countries
- **Technology Evolution**: Platform for future healthcare innovations
- **Policy Development**: Evidence-based framework for digital health policies

### Recommendations
1. **Pilot Expansion**: Scale pilot program to additional rural districts
2. **Policy Integration**: Incorporate framework into national health policies
3. **Technology Transfer**: Share framework with other developing nations
4. **Further Research**: Extend framework for telemedicine and AI integration

---

## References

### Academic References
1. **Zheng, X., et al. (2018)**. "Blockchain Technology for Healthcare: A Comprehensive Review". *IEEE Access*.
2. **Hölbl, M., et al. (2018)**. "A Systematic Review of the Use of Blockchain in Healthcare". *Symmetry*.
3. **Khan, M. A., & Salah, K. (2018)**. "IoT Security: Review, Blockchain Solutions, and Open Challenges". *Future Generation Computer Systems*.
4. **Benet, J. (2014)**. "IPFS - Content Addressed, Versioned, P2P File System". *arXiv preprint arXiv:1407.3561*.

### Technical Documentation
5. **PouchDB Documentation**. "Offline-First Database Synchronization".
6. **IPFS Documentation**. "InterPlanetary File System Protocol".
7. **Polygon Network**. "Layer 2 Scaling Solutions for Ethereum".
8. **Web Crypto API**. "W3C Web Cryptography API Specification".

### Healthcare & Policy References
9. **Bangladesh Health Bulletin (2023)**. "Rural Healthcare Infrastructure Analysis".
10. **World Health Organization (2022)**. "Digital Health Guidelines for Low-Resource Settings".
11. **ITU (2023)**. "Rural Connectivity and Digital Inclusion Reports".

### Development Tools
12. **Open Data Kit (ODK)**. "Offline Data Collection Toolkit".
13. **MetaMask Documentation**. "Ethereum Wallet Integration".
14. **Tailwind CSS**. "Utility-First CSS Framework".

---

## Acknowledgments

The research team expresses sincere gratitude to:

- **Rabindra Maitree University** for providing research facilities and academic support
- **Department of Computer Science and Engineering** faculty for technical guidance
- **Rural healthcare partners** in Kushtia district for field insights and collaboration
- **Open-source community** for foundational technologies (IPFS, PouchDB, Polygon)
- **Bangladesh Health Ministry** for policy guidance and regulatory support

Special thanks to **Supervisor Mahdi Nabi Mumu** for continuous mentorship and valuable feedback throughout the research process.

---

## Appendices

### Appendix A: System Architecture Diagrams

#### High-Level Architecture
```
┌──────────────────────────────────────────────────────────────────────┐
│                     RURAL HEALTHCARE SYSTEM                          │
│                    (Bangladesh Context)                               │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
        ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
        │  ODK (Offline)   │  │   Browser    │  │  Bluetooth Sync  │
        │  Data Collection │  │  (Encrypted) │  │  Device-to-Device│
        └──────────────────┘  └──────────────┘  └──────────────────┘
                    │              │              │
                    └──────────────┼──────────────┘
                                   ▼
                    ┌──────────────────────────┐
                    │  AES-256-GCM Encryption  │
                    │  (Local Client-Side)     │
                    └──────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
        ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
        │   PouchDB        │  │   IPFS       │  │   Polygon        │
        │   (Local DB)     │  │  (Storage)   │  │   Blockchain     │
        │   Offline-First  │  │  Desktop +   │  │   (Proofs)       │
        │                  │  │  Pinata      │  │   Low-cost       │
        └──────────────────┘  └──────────────┘  └──────────────────┘
```

#### Data Flow Diagram
```
Patient Data Entry → AES Encryption → PouchDB Storage → IPFS Upload → Blockchain Proof → CouchDB Sync
```

### Appendix B: Technical Specifications

#### Hardware Requirements
- **Minimum**: 2GB RAM, 10GB storage, modern browser
- **Recommended**: 4GB RAM, 20GB storage, Chrome/Firefox latest
- **Server**: Optional CouchDB server for multi-device sync

#### Software Dependencies
- **Runtime**: Node.js 16+, modern web browser
- **IPFS**: Desktop v0.38.2 or higher
- **Blockchain**: MetaMask wallet, Polygon network access

#### Security Specifications
- **Encryption**: AES-256-GCM with PBKDF2 key derivation
- **Hash Function**: SHA-256 for data integrity
- **Key Management**: Browser localStorage with master password
- **Access Control**: Role-based permissions (Admin, Doctor, Nurse, Patient)

### Appendix C: Budget Breakdown

| Category | Item | Cost (৳) | Justification |
|----------|------|-----------|---------------|
| **Development** | VS Code, Git, Node.js | 2,000 | Free/open-source tools |
| | IPFS Desktop setup | 1,000 | Local node configuration |
| | MetaMask & Polygon setup | 500 | Wallet and network fees |
| | Testing devices | 5,000 | Mobile devices for testing |
| | **Subtotal** | **8,500** | |
| **Deployment** | Domain & hosting | 3,000 | Vercel deployment |
| | SSL certificates | 1,000 | Security certificates |
| | Training materials | 2,000 | User manuals and guides |
| | Pilot deployment | 1,500 | Travel and setup costs |
| | **Subtotal** | **7,500** | |
| **Testing** | Security audit | 4,000 | Third-party security review |
| | Performance testing | 2,000 | Load and stress testing |
| | User testing | 3,000 | Healthcare worker feedback |
| | **Subtotal** | **9,000** | |
| **Contingency** | 15% buffer | 3,750 | Unexpected expenses |
| **Total** | | **28,750** | Within ৳30,000-40,000 range |

### Appendix D: Gantt Chart

```
Research Timeline (16 Weeks)
├── Week 1-2: Literature Review & Requirements Analysis
├── Week 3: System Design & Architecture Planning
├── Week 4-5: Frontend Development (HTML/CSS/JS)
├── Week 6-7: Backend Integration (PouchDB/IPFS)
├── Week 8-9: Blockchain Integration (Polygon/Web3)
├── Week 10: Security Implementation (Encryption)
├── Week 11-12: Testing & Bug Fixes
├── Week 13: User Acceptance Testing
├── Week 14: Pilot Deployment Preparation
├── Week 15-16: Deployment & Training
└── Week 16: Final Evaluation & Documentation
```

### Appendix E: Code Repository Structure

```
healthchain-pro/
├── index.html          # Main application interface
├── app.js             # Core application logic
├── db.js              # Database and encryption layer
├── ipfs.js            # IPFS integration
├── blockchain.js      # Polygon blockchain integration
├── encryption.js      # AES encryption utilities
├── manifest.json      # PWA manifest
├── sw.js              # Service worker
├── presentation.html  # Research presentation
├── presentation.md    # Markdown presentation
├── package.json       # Dependencies
├── README.md          # Documentation
└── assets/            # Static assets
```

---

*This research proposal is submitted as part of the undergraduate thesis requirement at Rabindra Maitree University, Department of Computer Science and Engineering.*

*Principal Investigator: AshraFul R Antu*  
*Supervisor: Mahdi Nabi Mumu*  
*Date: November 16, 2025*