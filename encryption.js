// encryption.js - AES-GCM encryption utilities for HealthChain
class EncryptionManager {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12; // 96 bits for GCM
  }

  // Generate a new encryption key
  async generateKey() {
    return await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  // Export key as base64 string
  async exportKey(key) {
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  // Import key from base64 string
  async importKey(keyBase64) {
    const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      this.algorithm,
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt data
  async encrypt(data, key) {
    const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv: iv
      },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  // Decrypt data
  async decrypt(encryptedDataBase64, key) {
    const combined = Uint8Array.from(atob(encryptedDataBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, this.ivLength);
    const encrypted = combined.slice(this.ivLength);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: this.algorithm,
        iv: iv
      },
      key,
      encrypted
    );

    const decodedData = new TextDecoder().decode(decrypted);
    return JSON.parse(decodedData);
  }

  // Generate key from password using PBKDF2
  async deriveKeyFromPassword(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Store encryption key securely (in this demo, we'll use localStorage with a master password)
  async storeKey(key, masterPassword) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await this.deriveKeyFromPassword(masterPassword, btoa(String.fromCharCode(...salt)));

    const exportedKey = await this.exportKey(key);
    const encryptedKey = await this.encrypt({ key: exportedKey, salt: btoa(String.fromCharCode(...salt)) }, derivedKey);

    localStorage.setItem('healthchain_master_key', encryptedKey);
  }

  // Retrieve encryption key
  async retrieveKey(masterPassword) {
    const encryptedKeyData = localStorage.getItem('healthchain_master_key');
    if (!encryptedKeyData) return null;

    // For simplicity, we'll use a fixed salt for master key derivation
    // In production, you'd want to store the salt securely
    const salt = 'healthchain_salt_2024';
    const derivedKey = await this.deriveKeyFromPassword(masterPassword, salt);

    try {
      const keyData = await this.decrypt(encryptedKeyData, derivedKey);
      return await this.importKey(keyData.key);
    } catch (error) {
      console.error('Failed to decrypt master key:', error);
      return null;
    }
  }
}

// Global encryption manager instance
const encryptionManager = new EncryptionManager();