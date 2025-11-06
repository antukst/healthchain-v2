// db.js - Enhanced database layer with encryption and IPFS
const db = new PouchDB('healthchain-pro');

// Replace with your CouchDB remote URL
const remoteCouch = 'http://127.0.0.1:5984/healthchain-pro';

// Global variables for encryption and IPFS
let encryptionKey = null;
let isInitialized = false;

// Initialize encryption and IPFS
async function initializeSystem(masterPassword = 'default_password_2024') {
  try {
    // Initialize IPFS
    await ipfsManager.init();

    // Try to retrieve existing encryption key
    encryptionKey = await encryptionManager.retrieveKey(masterPassword);

    if (!encryptionKey) {
      // Generate new key if none exists
      console.log('Generating new encryption key...');
      encryptionKey = await encryptionManager.generateKey();
      await encryptionManager.storeKey(encryptionKey, masterPassword);
    }

    isInitialized = true;
    console.log('✅ HealthChain system initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize system:', error);
    return false;
  }
}

// Enhanced patient data operations with encryption and IPFS
class SecurePatientDB {
  constructor() {
    this.db = db;
  }

  // Helper to clean metadata values (convert literal 'undefined' strings to empty)
  cleanMetadata(meta) {
    if (!meta) return meta;
    const cleaned = { ...meta };
    for (const k of Object.keys(cleaned)) {
      const v = cleaned[k];
      if (typeof v === 'string' && v.trim().toLowerCase() === 'undefined') {
        cleaned[k] = '';
      }
    }
    return cleaned;
  }

  // Encrypt and store patient data
  async addPatient(patientData) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏥 DB addPatient called');
    console.log('Patient data:', patientData);
    console.log('System initialized:', isInitialized);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!isInitialized) {
      throw new Error('System not initialized. Call initializeSystem() first.');
    }

    try {
      const createdAt = patientData.created_at || new Date().toISOString();
      const normalizedAge = Number.isFinite(Number(patientData.age)) ? Number(patientData.age) : '';
      const docId = `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('🔐 Encrypting patient data...');
      // Encrypt sensitive data
      const encryptedData = await encryptionManager.encrypt(patientData, encryptionKey);
      console.log('✅ Encryption complete. Data length:', encryptedData.length);

      console.log('📤 Calling ipfsManager.addData...');
      // Store on IPFS
      const ipfsCid = await ipfsManager.addData(encryptedData, {
        path: `/healthchain/patients/${docId}/profile.enc`
      });
      console.log('✅ IPFS upload complete. CID:', ipfsCid);

      // Create database document with IPFS reference
      const doc = {
        _id: docId,
        ipfs_cid: ipfsCid,
        metadata: {
          name: patientData.name || '',
          age: normalizedAge,
          gender: patientData.gender || '',
          diagnosis: patientData.diagnosis || '',
          prescription: patientData.prescription || '',
          room: patientData.room || '',
          medical_history: patientData.medical_history || '',
          allergies: patientData.allergies || '',
          emergency_contact: patientData.emergency_contact || '',
          created_by: patientData.created_by || '',
          created_at: createdAt,
          encrypted: true
        },
        blockchain_hash: null // Will be set after blockchain transaction
      };

      const result = await this.db.put(doc);

      // Register in sync registry for multi-device sync
      if (window.syncManager) {
        try {
          await syncManager.registerIPFSRecord(docId, ipfsCid, doc.metadata);
          console.log('✅ Patient registered in sync registry');
        } catch (syncError) {
          console.warn('⚠️ Failed to register in sync registry:', syncError);
          // Don't fail the whole operation if sync fails
        }
      }

      // Create blockchain proof
      try {
        const dataHash = await polygonManager.createIntegrityHash(patientData);
        const blockchainProof = await polygonManager.createDataProof(dataHash, {
          type: 'patient_record',
          patient_id: result.id,
          ipfs_cid: ipfsCid,
          created_at: createdAt
        });

        // Update document with blockchain proof
        const updatedDoc = {
          ...doc,
          _rev: result.rev,
          blockchain_hash: blockchainProof.txHash,
          blockchain_proof: blockchainProof
        };

        await this.db.put(updatedDoc);
        console.log('Patient added securely with blockchain proof:', result.id);
      } catch (blockchainError) {
        console.warn('Blockchain proof creation failed, but patient data is secure:', blockchainError);
      }

      return result;
    } catch (error) {
      console.error('Failed to add patient:', error);
      throw error;
    }
  }

  // Retrieve and decrypt patient data
  async getPatient(docId) {
    if (!isInitialized) {
      throw new Error('System not initialized. Call initializeSystem() first.');
    }

    try {
      const doc = await this.db.get(docId);

      if (!doc.encrypted) {
        // Legacy unencrypted data - ensure metadata cleaned
        if (doc.metadata) doc.metadata = this.cleanMetadata(doc.metadata);
        return doc;
      }

      // Retrieve from IPFS
      const encryptedData = await ipfsManager.getData(doc.ipfs_cid);

      // Decrypt data
      const decryptedData = await encryptionManager.decrypt(encryptedData, encryptionKey);

      // Ensure metadata cleaned and return combined data
      const cleanedMeta = this.cleanMetadata(doc.metadata);
      return {
        ...decryptedData,
        _id: doc._id,
        _rev: doc._rev,
        ipfs_cid: doc.ipfs_cid,
        blockchain_hash: doc.blockchain_hash,
        metadata: cleanedMeta
      };
    } catch (error) {
      console.error('Failed to get patient:', error);
      throw error;
    }
  }

  // Update patient data
  async updatePatient(docId, updatedData) {
    if (!isInitialized) {
      throw new Error('System not initialized. Call initializeSystem() first.');
    }

    try {
  const existingDoc = await this.db.get(docId);
      const updatedAt = updatedData.updated_at || new Date().toISOString();
      const normalizedAge = Number.isFinite(Number(updatedData.age)) ? Number(updatedData.age) : '';

      // Encrypt updated data
      const encryptedData = await encryptionManager.encrypt(updatedData, encryptionKey);

      // Store new version on IPFS
      const newIpfsCid = await ipfsManager.addData(encryptedData, {
        path: `/healthchain/patients/${docId}/profile.enc`
      });

      // Update database document
      const updatedDoc = {
        ...existingDoc,
        ipfs_cid: newIpfsCid,
        metadata: {
          ...existingDoc.metadata,
          name: updatedData.name || '',
          age: normalizedAge,
          gender: updatedData.gender || '',
          diagnosis: updatedData.diagnosis || '',
          prescription: updatedData.prescription || '',
          room: updatedData.room || '',
          medical_history: updatedData.medical_history || '',
          allergies: updatedData.allergies || '',
          emergency_contact: updatedData.emergency_contact || '',
          updated_by: updatedData.updated_by || '',
          updated_at: updatedAt
        }
      };

      const result = await this.db.put(updatedDoc);
      console.log('Patient updated securely:', result.id);
      return result;
    } catch (error) {
      console.error('Failed to update patient:', error);
      throw error;
    }
  }

  // Delete patient data
  async deletePatient(docId) {
    try {
      const doc = await this.db.get(docId);
      await this.db.remove(doc);
      console.log('Patient deleted:', docId);
      return true;
    } catch (error) {
      console.error('Failed to delete patient:', error);
      throw error;
    }
  }

  // Search patients (searches metadata only, not encrypted data)
  async searchPatients(query) {
    try {
      const result = await this.db.allDocs({
        include_docs: true
      });

      const patients = result.rows
        .filter(row => row.doc && row.doc.metadata)
        .filter(row => {
          const meta = this.cleanMetadata(row.doc.metadata || {});
          const searchTerm = query.toLowerCase();
          const name = (meta.name || '').toString().toLowerCase();
          const diagnosis = (meta.diagnosis || '').toString().toLowerCase();
          const age = meta.age !== undefined && meta.age !== null ? meta.age.toString() : '';
          return (
            name.includes(searchTerm) ||
            diagnosis.includes(searchTerm) ||
            age.includes(searchTerm)
          );
        })
        .map(row => ({
          _id: row.doc._id,
          metadata: this.cleanMetadata(row.doc.metadata),
          ipfs_cid: row.doc.ipfs_cid,
          blockchain_hash: row.doc.blockchain_hash
        }));

      return patients;
    } catch (error) {
      console.error('Failed to search patients:', error);
      throw error;
    }
  }

  // Get all patients metadata
  async getAllPatients() {
    try {
      const result = await this.db.allDocs({
        include_docs: true
      });

      return result.rows
        .filter(row => row.doc.metadata)
        .map(row => ({
          _id: row.doc._id,
          metadata: this.cleanMetadata(row.doc.metadata),
          ipfs_cid: row.doc.ipfs_cid,
          blockchain_hash: row.doc.blockchain_hash
        }));
    } catch (error) {
      console.error('Failed to get all patients:', error);
      throw error;
    }
  }

  // Add medical file (image, document, etc.)
  // Allow optional fileMetadata param (type, description, uploaded_by, uploaded_at, file_size)
  async addMedicalFile(patientId, file, fileMetadata = {}) {
    if (!isInitialized) {
      throw new Error('System not initialized. Call initializeSystem() first.');
    }

    try {
      // Get the patient document
      const patientDoc = await this.db.get(patientId);

      // Prepare file blob
      let fileBlob;
      if (file instanceof Blob) {
        fileBlob = file;
      } else if (file instanceof File) {
        fileBlob = file;
      } else if (file.buffer) {
        fileBlob = new Blob([file.buffer], { type: file.type || 'application/octet-stream' });
      } else {
        throw new Error('Unsupported file format');
      }

      // Generate attachment ID
      const attachmentId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store as PouchDB attachment
      const attachmentResult = await this.db.putAttachment(patientId, attachmentId, patientDoc._rev, fileBlob, file.type || 'application/octet-stream');

      // Upload file to IPFS as well
      const safeFileName = (file.name || fileMetadata.filename || 'medical-file').replace(/[\\/:*?"<>|#]+/g, '_');
      const ipfsResult = await ipfsManager.addFile(fileBlob, {
        path: `/healthchain/patients/${patientId}/files/${attachmentId}_${safeFileName}`
      });

      // Build metadata (merge provided metadata with derived values)
      const derived = {
        filename: file.name || fileMetadata.filename || '',
        display_name: fileMetadata.display_name || fileMetadata.filename || file.name || '',
        size: fileBlob.size,
        type: file.type || fileMetadata.type || 'application/octet-stream',
        uploaded_at: fileMetadata.uploaded_at || new Date().toISOString(),
        description: fileMetadata.description || '',
        uploaded_by: fileMetadata.uploaded_by || '',
        attachment_id: attachmentId,
        ipfs_cid: ipfsResult.cid
      };

      let blockchainProof = null;
      if (polygonManager && typeof polygonManager.createIntegrityHash === 'function') {
        try {
          const dataHash = await polygonManager.createIntegrityHash({
            patient_id: patientId,
            attachment_id: attachmentId,
            filename: derived.filename,
            display_name: derived.display_name,
            size: derived.size,
            type: derived.type,
            ipfs_cid: derived.ipfs_cid
          });

          blockchainProof = await polygonManager.createDataProof(dataHash, {
            type: 'patient_file',
            patient_id: patientId,
            attachment_id: attachmentId,
            ipfs_cid: derived.ipfs_cid
          });

          derived.blockchain_hash = blockchainProof.txHash;
          derived.blockchain_proof = blockchainProof;
        } catch (err) {
          console.warn('Blockchain proof creation failed for file attachment:', err);
        }
      }

      const encryptedMetadata = await encryptionManager.encrypt(derived, encryptionKey);
      const metadataCid = await ipfsManager.addData(encryptedMetadata, {
        path: `/healthchain/patients/${patientId}/meta/${attachmentId}.json`
      });

      // Update patient document with file reference
      const updatedDoc = {
        ...patientDoc,
        _rev: attachmentResult.rev,
        attachments: {
          ...(patientDoc.attachments || {}),
          [attachmentId]: {
            content_type: file.type || 'application/octet-stream',
            data: null, // Will be populated when retrieved
            ipfs_cid: ipfsResult.cid,
            metadata_cid: metadataCid,
            blockchain_hash: blockchainProof ? blockchainProof.txHash : null,
            blockchain_proof: blockchainProof || null
          }
        }
      };

      await this.db.put(updatedDoc);

      console.log('Medical file added as attachment and uploaded to IPFS:', attachmentId);
      return {
        id: attachmentId,
        rev: attachmentResult.rev,
        ipfs_cid: ipfsResult.cid,
        blockchain_hash: blockchainProof ? blockchainProof.txHash : null
      };
    } catch (error) {
      console.error('Failed to add medical file:', error);
      throw error;
    }
  }

  // Get medical files for a patient
  async getPatientFiles(patientId) {
    try {
      const patientDoc = await this.db.get(patientId, { attachments: true });

      const files = [];

      if (patientDoc.attachments) {
        for (const [attachmentId, attachmentInfo] of Object.entries(patientDoc.attachments)) {
          try {
            // Get attachment data
            const attachment = await this.db.getAttachment(patientId, attachmentId);

            // Decrypt metadata if available
            let metadata = {};
            if (attachmentInfo.metadata_cid) {
              const encryptedMetadata = await ipfsManager.getData(attachmentInfo.metadata_cid);
              metadata = await encryptionManager.decrypt(encryptedMetadata, encryptionKey);
            }

            files.push({
              attachment_id: attachmentId,
              filename: metadata.filename || attachmentId,
              display_name: metadata.display_name || metadata.filename || attachmentId,
              size: attachment.size || metadata.size || 0,
              type: attachment.type || metadata.type || attachmentInfo.content_type,
              uploaded_at: metadata.uploaded_at || patientDoc.created_at || new Date().toISOString(),
              description: metadata.description || '',
              uploaded_by: metadata.uploaded_by || '',
              ipfs_cid: attachmentInfo.ipfs_cid || metadata.ipfs_cid,
              blockchain_hash: metadata.blockchain_hash || attachmentInfo.blockchain_hash || null,
              blockchain_proof: metadata.blockchain_proof || attachmentInfo.blockchain_proof || null,
              data: attachment // The blob data
            });
          } catch (error) {
            console.warn('Failed to get attachment:', attachmentId, error);
          }
        }
      }

      return files;
    } catch (error) {
      console.error('Failed to get patient files:', error);
      throw error;
    }
  }
}

// Global secure database instance
const securePatientDB = new SecurePatientDB();

// Sync local PouchDB with CouchDB (with error handling)
const sync = () => {
  try {
    db.sync(remoteCouch, {
      live: true,
      retry: true
    }).on('change', info => {
      console.log('✅ DB sync change:', info);
    }).on('error', err => {
      console.warn('⚠️ DB sync error (continuing locally):', err.message);
      console.log('📱 Application will work offline with local database');
    }).on('complete', info => {
      console.log('✅ DB sync complete:', info);
    });
  } catch (error) {
    console.warn('⚠️ Failed to initialize sync (continuing locally):', error.message);
    console.log('📱 Application will work offline with local database');
  }
};

// Initialize sync (disabled for production deployment)
// sync();

// Expose key helpers for other scripts
window.db = db;
window.initializeSystem = initializeSystem;
window.securePatientDB = securePatientDB;
window.SecurePatientDB = SecurePatientDB;
