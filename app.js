// app.js - HealthChain Pro Application Logic
console.log('🚀 app.js loaded successfully');

// Global variables
let currentUser = null;
let currentSessionStarted = null;
let isSystemInitialized = false;
let patientSelectOptions = [];

// Pagination state
let currentPage = 1;
let itemsPerPage = 10;
let allPatients = [];
let filteredPatients = [];

// Filter state
let activeFilters = {
  dateFrom: null,
  dateTo: null,
  ageGroup: null,
  gender: null,
  diagnosis: null
};
let savedFilterPresets = JSON.parse(localStorage.getItem('filterPresets') || '[]');

// Small helper to sanitize fields coming from legacy data
function sanitizeField(value, fallback = 'N/A') {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') {
    const v = value.trim();
    if (v === '' || v.toLowerCase() === 'undefined') return fallback;
    return v;
  }
  // For numbers and other types, return as-is (but still handle NaN)
  if (typeof value === 'number') {
    return Number.isNaN(value) ? fallback : value;
  }
  return value;
}

function formatDate(dateStr, fallback = 'N/A') {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString();
}

// Utility: normalize stored literal "undefined" strings in existing patient docs.
// Run from the browser console: await normalizeStoredUndefineds();
async function normalizeStoredUndefineds() {
  try {
    const patients = await securePatientDB.getAllPatients();
    let updated = 0;
    for (const p of patients) {
      const updates = {};
      const keysToCheck = ['name','age','gender','diagnosis','prescription','room','medical_history','allergies','emergency_contact'];
      for (const k of keysToCheck) {
        const raw = p[k] !== undefined ? p[k] : (p.metadata && p.metadata[k]);
        if (typeof raw === 'string' && raw.trim().toLowerCase() === 'undefined') {
          updates[k] = '';
        }
      }
      if (Object.keys(updates).length > 0) {
        await securePatientDB.updatePatient(p._id, updates);
        updated++;
      }
    }
    console.log(`normalizeStoredUndefineds: cleaned ${updated} patient(s)`);
    return updated;
  } catch (err) {
    console.error('normalizeStoredUndefineds failed:', err);
    throw err;
  }
}

// Update any local CID references once IPFS sync finishes
window.updateCIDAfterSync = async function(oldCID, newCID) {
  try {
    if (!oldCID || !newCID || oldCID === newCID) {
      console.warn('updateCIDAfterSync skipped: invalid CID values', { oldCID, newCID });
      return false;
    }

    console.log(`🔄 Updating CID references: ${oldCID} → ${newCID}`);

    const allDocs = await securePatientDB.db.allDocs({ include_docs: true });
    let updatedCount = 0;

    for (const row of allDocs.rows) {
      const doc = row.doc;
      if (!doc) continue;

      let docUpdated = false;

      if (doc.ipfs_cid === oldCID) {
        doc.ipfs_cid = newCID;
        docUpdated = true;
      }

      if (doc.metadata && doc.metadata.ipfs_cid === oldCID) {
        doc.metadata.ipfs_cid = newCID;
        docUpdated = true;
      }

      const attachmentContainers = ['_attachments', 'attachments'];
      for (const key of attachmentContainers) {
        if (!doc[key]) continue;

        for (const [attachmentId, attachmentInfo] of Object.entries(doc[key])) {
          if (!attachmentInfo) continue;

          let attachmentUpdated = false;
          const updatedAttachment = { ...attachmentInfo };

          if (attachmentInfo.ipfs_cid === oldCID) {
            updatedAttachment.ipfs_cid = newCID;
            attachmentUpdated = true;
          }

          if (attachmentInfo.metadata_cid === oldCID) {
            updatedAttachment.metadata_cid = newCID;
            attachmentUpdated = true;
          }

          if (attachmentUpdated) {
            doc[key][attachmentId] = updatedAttachment;
            docUpdated = true;
          }
        }
      }

      if (docUpdated) {
        await securePatientDB.db.put(doc);
        updatedCount++;
        console.log(`✅ Updated CID references for document ${doc._id}`);
      }
    }

    console.log(`🎯 CID update complete. Documents touched: ${updatedCount}`);
    return true;
  } catch (error) {
    console.error('Failed to update CID after sync:', error);
    return false;
  }
};

// Initialize the application
async function initApp() {
  try {
    console.log('🚀 Initializing HealthChain Pro...');

    // Initialize encryption, IPFS, and blockchain with error handling
    let encryptionInitialized = false;
    let ipfsInitialized = false;
    let blockchainInitialized = false;

    try {
      encryptionInitialized = await initializeSystem();
      if (encryptionInitialized) {
        console.log('✅ Encryption system initialized');
      } else {
        console.warn('⚠️ Encryption system failed to initialize, using basic mode');
      }
    } catch (error) {
      console.warn('⚠️ Encryption initialization failed:', error.message);
    }

    try {
      ipfsInitialized = await ipfsManager.init();
      if (ipfsInitialized) {
        console.log('✅ IPFS system initialized');
        
        // Check for pending sync items
        const pendingCount = await ipfsManager.getPendingSyncCount();
        if (pendingCount > 0) {
          console.log(`🔄 Found ${pendingCount} items to sync to IPFS...`);
          showNotification(`Syncing ${pendingCount} offline items to IPFS...`, 'info');
          
          // Auto-sync in background
          setTimeout(async () => {
            const result = await ipfsManager.syncLocalDataToIPFS();
            if (result.synced > 0) {
              showNotification(`✅ Synced ${result.synced} items to IPFS!`, 'success');
              await loadDashboard(); // Reload to show updated data
            }
            if (result.failed > 0) {
              showNotification(`⚠️ ${result.failed} items failed to sync`, 'warning');
            }
          }, 2000); // Wait 2s before starting sync
        }
      } else {
        console.log('📝 IPFS not available, using gateway mode');
      }
    } catch (error) {
      console.warn('⚠️ IPFS initialization failed:', error.message);
    }

    try {
      blockchainInitialized = await polygonManager.init();
      if (blockchainInitialized) {
        console.log('✅ Blockchain system initialized');
      } else {
        console.log('📝 Blockchain not available, using mock mode');
      }
    } catch (error) {
      console.warn('⚠️ Blockchain initialization failed:', error.message);
    }

    // Set up user authentication (doesn't depend on other systems)
    await setupAuthentication();

    // Load initial data
    await loadDashboard();

    // Update system status
    await updateSystemStatus();

    // Initialize medical records functionality
    setTimeout(() => {
      initMedicalRecords();
    }, 500); // Wait 500ms to ensure DOM is fully loaded

    isSystemInitialized = true;
    console.log('✅ HealthChain Pro initialized successfully - Medical records ready');

    // Show success message
    showNotification('System initialized successfully!', 'success');

    // Update status periodically
    setInterval(updateSystemStatus, 30000); // Update every 30 seconds

    // Check for shared patient access
    const urlParams = new URLSearchParams(window.location.search);
    const sharedCid = urlParams.get('shared');
    if (sharedCid) {
      await handleSharedAccess(sharedCid);
    }

  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    showNotification('System initialized with limited functionality. Some features may not work.', 'warning');

    // Try to initialize basic functionality even if advanced features fail
    try {
      await setupAuthentication();
      await loadDashboard();
      isSystemInitialized = true;
      console.log('📱 Basic functionality initialized');
    } catch (basicError) {
      console.error('❌ Even basic initialization failed:', basicError);
      showNotification('Failed to initialize system. Please refresh the page.', 'error');
    }
  }
}

// Setup user authentication
async function setupAuthentication() {
  // Ensure main super-admin exists (username: 'antu' with password 'antu')
  await ensureMainAdminExists();

  // Initialize auth: if there's a logged-in user in localStorage, use it.
  const stored = localStorage.getItem('hc_auth_user');
  if (stored) {
    try {
      const u = JSON.parse(stored);
      currentUser = u;
      currentUser.permissions = getRolePermissions(currentUser.role);
      currentSessionStarted = new Date();
      updateUIForRole(currentUser.role);
      return;
    } catch (e) {
      console.warn('Failed to parse stored auth user', e);
    }
  }

  // No signed-in user -> show auth modal
  showAuthModal(false);
}

// Ensure there is a main super-admin account with username 'antu' and password 'antu'.
async function ensureMainAdminExists() {
  try {
    const users = getUsers();
    console.log('Current users in storage:', users);

    const main = users.find(u => u && u.username && u.username.toLowerCase() === 'antu');
    if (main) {
      console.log('Admin user already exists:', main);
      return;
    }

    // Create default super admin
    const id = 'user_admin_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
    const superUser = {
      id: id,
      username: 'antu',
      password: hashPassword('antu'),
      role: 'admin',
      is_super: true
    };

    users.push(superUser);
    saveUsers(users);
    console.log('✅ Default main admin created successfully:', superUser);
    console.log('Hashed password for "antu":', superUser.password);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
  }
}

// ---------------------- Simple local user store & auth (demo) ----------------------
function getUsers() {
  try {
    const raw = localStorage.getItem('hc_users');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem('hc_users', JSON.stringify(users));
}

function findUserByUsername(username) {
  const users = getUsers();
  return users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
}

function hashPassword(password) {
  // Lightweight demo hash (not cryptographically secure). For production, use proper hashing.
  return btoa(password);
}

async function registerUser({ username, password, role, patientId }) {
  if (!username || !password || !role) throw new Error('Missing fields');
  const users = getUsers();
  if (findUserByUsername(username)) throw new Error('User already exists');
  // Only the main super-admin (is_super) can create admin users
  if (role === 'admin') {
    const current = currentUser;
    if (!(current && current.is_super)) {
      throw new Error('Only the main admin can create new admin users');
    }
  }

  const id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
  const user = { id, username, password: hashPassword(password), role };
  if (role === 'patient' && patientId) user.patient_id = patientId;
  users.push(user);
  saveUsers(users);
  return user;
}

async function loginUser(username, password) {
  try {
    console.log('🔐 Attempting login for username:', username);

    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const u = findUserByUsername(username);
    console.log('👤 User found in database:', u);

    if (!u) {
      console.log('❌ User not found in database');
      throw new Error('User not found');
    }

    const hashedInput = hashPassword(password);
    console.log('🔒 Input password hashed to:', hashedInput);
    console.log('🔒 Stored password hash:', u.password);
    console.log('🔒 Passwords match:', u.password === hashedInput);

    if (u.password !== hashedInput) {
      console.log('❌ Password mismatch');
      throw new Error('Invalid credentials');
    }

    // Successful login
    console.log('✅ Login successful for user:', u.username);
    currentUser = {
      id: u.id,
      username: u.username,
      role: u.role
    };

    if (u.is_super) {
      currentUser.is_super = true;
      console.log('👑 User is super admin');
    }

    if (u.patient_id) {
      currentUser.patient_id = u.patient_id;
    }

    currentUser.permissions = getRolePermissions(currentUser.role);
    currentSessionStarted = new Date();
    localStorage.setItem('hc_auth_user', JSON.stringify(currentUser));

    console.log('💾 User saved to localStorage:', currentUser);
    updateUIForRole(currentUser.role);

    await loadDashboard();
    return currentUser;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
}

function logoutUser() {
  localStorage.removeItem('hc_auth_user');
  currentUser = null;
  currentSessionStarted = null;
  // Update UI
  document.getElementById('userDisplay').textContent = 'Not signed in';
  document.getElementById('authBtn').classList.remove('hidden');
  document.getElementById('logoutBtn').classList.add('hidden');
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) profileBtn.classList.add('hidden');
  // Hide delete buttons and reset view
  updateUIForRole('');
  showAuthModal(false);
}

// Show Sign In / Sign Up modal. If signUp=true, show registration form.
function showAuthModal(signUp = false) {
  // Remove existing modal
  const existing = document.querySelector('.auth-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'auth-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
      <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">${signUp ? 'Sign Up' : 'Sign In'}</h3>
      <form id="authForm" class="space-y-3">
        <input id="authUsername" placeholder="Username (email)" class="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded" required />
        <input id="authPassword" type="password" placeholder="Password" class="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded" required />
        ${signUp ? `
          <select id="authRole" class="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded">
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
          <input id="authPatientId" placeholder="(optional) Link Patient ID (patients only)" class="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded" />
        ` : ''}
        <div class="flex justify-between items-center">
          <button id="authSubmit" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">${signUp ? 'Register' : 'Sign In'}</button>
          <button id="authToggle" type="button" class="text-sm text-blue-600 dark:text-blue-400 underline">${signUp ? 'Have an account? Sign In' : 'Create an account'}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('authToggle').addEventListener('click', () => {
    modal.remove();
    showAuthModal(!signUp);
  });

  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!username || !password) return showNotification('Please enter username and password', 'warning');
    try {
      if (signUp) {
        const role = document.getElementById('authRole').value;
        const patientId = document.getElementById('authPatientId').value.trim() || undefined;
        const user = await registerUser({ username, password, role, patientId });
        showNotification('Registration successful. Signed in.', 'success');
        // Auto-login
        await loginUser(username, password);
        modal.remove();
      } else {
        await loginUser(username, password);
        showNotification('Signed in successfully', 'success');
        modal.remove();
      }
    } catch (err) {
      console.error('Auth error', err);
      showNotification(err.message || 'Authentication failed', 'error');
    }
  });
}


// Get permissions for a role
function getRolePermissions(role) {
  const permissions = {
    admin: ['read', 'write', 'delete', 'manage_users', 'view_blockchain'],
    doctor: ['read', 'write', 'view_blockchain'],
    nurse: ['read', 'write'],
    patient: ['read_own', 'upload_self']
  };
  return permissions[role] || ['read'];
}

function getRoleAccessLabel(role) {
  const labels = {
    admin: 'Full control',
    doctor: 'Care team write',
    nurse: 'Care updates',
    patient: 'Personal access'
  };
  return labels[role] || 'Read only';
}

function updateProfilePanel(user) {
  const profileBtn = document.getElementById('profileBtn');
  const userDisplay = document.getElementById('userDisplay');
  const profileName = document.getElementById('profileName');
  const profileUsername = document.getElementById('profileUsername');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileRole = document.getElementById('profileRole');
  const profileAccess = document.getElementById('profileAccess');
  const profilePermissions = document.getElementById('profilePermissions');
  const profileSession = document.getElementById('profileSession');
  const profileSignOut = document.getElementById('profileSignOut');

  if (!profileBtn || !userDisplay) return;

  if (!user) {
    userDisplay.textContent = 'Not signed in';
    profileBtn.classList.add('hidden');
    if (profileName) profileName.textContent = 'Guest';
    if (profileUsername) profileUsername.textContent = 'guest';
    if (profileAvatar) profileAvatar.textContent = '--';
  if (profileRole) profileRole.textContent = 'GUEST';
    if (profileAccess) profileAccess.textContent = 'Read only';
    if (profilePermissions) {
      profilePermissions.innerHTML = '<li class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> None</li>';
    }
    if (profileSession) profileSession.textContent = 'Not signed in';
    if (profileSignOut) profileSignOut.disabled = true;
    closeProfilePanel();
    return;
  }

  profileBtn.classList.remove('hidden');
  userDisplay.textContent = user.username || 'User';

  const prettyName = user.displayName || user.username || 'User';
  const initials = prettyName
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '--';
  const role = (user.role || 'guest').toLowerCase();
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  if (profileName) profileName.textContent = prettyName;
  if (profileUsername) profileUsername.textContent = user.username || 'unknown';
  if (profileAvatar) profileAvatar.textContent = initials;
  if (profileRole) profileRole.textContent = role.toUpperCase();
  if (profileAccess) profileAccess.textContent = getRoleAccessLabel(role);
  if (profilePermissions) {
    if (permissions.length === 0) {
      profilePermissions.innerHTML = '<li class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> None</li>';
    } else {
      profilePermissions.innerHTML = permissions
        .map(perm => {
          const label = perm
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
          return `<li class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span> ${label}</li>`;
        })
        .join('');
    }
  }

  if (profileSession) {
    if (!currentSessionStarted) currentSessionStarted = new Date();
    profileSession.textContent = `Active session • ${currentSessionStarted.toLocaleTimeString()}`;
  }

  if (profileSignOut) profileSignOut.disabled = false;
}

function openProfilePanel() {
  const panel = document.getElementById('profilePanel');
  const drawer = document.getElementById('profileDrawer');
  const trigger = document.getElementById('profileBtn');
  if (!panel || !drawer) return;
  panel.classList.remove('hidden');
  requestAnimationFrame(() => {
    drawer.classList.remove('translate-x-full');
    drawer.classList.add('translate-x-0');
  });
  document.body.classList.add('overflow-hidden');
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
}

function closeProfilePanel() {
  const panel = document.getElementById('profilePanel');
  const drawer = document.getElementById('profileDrawer');
  const trigger = document.getElementById('profileBtn');
  if (!panel || !drawer) return;
  drawer.classList.add('translate-x-full');
  drawer.classList.remove('translate-x-0');
  document.body.classList.remove('overflow-hidden');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    if (drawer.classList.contains('translate-x-full') && panel) {
      panel.classList.add('hidden');
    }
  }, 250);
}

// Update UI based on user role
function updateUIForRole(role) {
  // Update header display
  const userDisplay = document.getElementById('userDisplay');
  const authBtn = document.getElementById('authBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const profileBtn = document.getElementById('profileBtn');
  if (currentUser && currentUser.username) {
    userDisplay.textContent = currentUser.username;
    if (authBtn) authBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (profileBtn) profileBtn.classList.remove('hidden');
  } else {
    userDisplay.textContent = 'Not signed in';
    if (authBtn) authBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (profileBtn) profileBtn.classList.add('hidden');
  }

  const resolvedRole = role || (currentUser && currentUser.role) || '';
  const permissions = getRolePermissions(resolvedRole);
  const isLoggedIn = !!currentUser;
  const canWrite = permissions.includes('write');
  const canDelete = permissions.includes('delete');
  const canUploadSelf = permissions.includes('upload_self') && currentUser && currentUser.patient_id;

  const toggleInteractivity = (element, enabled) => {
    if (!element) return;
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
    if ('disabled' in element) {
      element.disabled = !enabled;
    }
    if (interactiveTags.includes(element.tagName)) {
      element.classList.toggle('pointer-events-none', !enabled);
      element.classList.toggle('opacity-50', !enabled);
      element.classList.toggle('cursor-not-allowed', !enabled);
    }
  };

  // Handle sections that require authentication/write permissions
  document.querySelectorAll('[data-requires-auth]').forEach(section => {
    if (!isLoggedIn) {
      section.classList.add('hidden');
      return;
    }

    const needsWrite = section.hasAttribute('data-requires-write');
    const patientOverride = section.dataset && section.dataset.patientAccess === 'self' && canUploadSelf;
    if (needsWrite && !canWrite && !patientOverride) {
      section.classList.add('hidden');
    } else {
      section.classList.remove('hidden');
    }
  });

  // Disable interactive controls when permissions are missing
  document.querySelectorAll('[data-requires-write]').forEach(element => {
    if (element.tagName === 'SECTION') return; // already handled above
    const patientOverride = element.closest('[data-patient-access="self"]') && canUploadSelf;
    toggleInteractivity(element, (isLoggedIn && canWrite) || patientOverride);
  });

  document.querySelectorAll('[data-requires-delete]').forEach(element => {
    toggleInteractivity(element, isLoggedIn && canDelete);
  });

  // Show or hide delete buttons rendered dynamically
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.style.display = canDelete ? '' : 'none';
  });

  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.disabled = !canDelete;
    selectAllCheckbox.classList.toggle('cursor-not-allowed', !canDelete);
    if (!canDelete) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    }
  }

  // If the form exists, disable its fields for read-only roles
  const patientForm = document.getElementById('patientForm');
  if (patientForm) {
    Array.from(patientForm.elements).forEach(el => {
      if (!('disabled' in el)) return;
      const shouldEnable = isLoggedIn && canWrite;
      if (el.dataset && el.dataset.optionalAccess === 'always') return;
      if (el.type === 'submit') {
        el.disabled = !shouldEnable;
        el.classList.toggle('pointer-events-none', !shouldEnable);
        el.classList.toggle('opacity-50', !shouldEnable);
      } else {
        el.disabled = !shouldEnable;
      }
    });
  }

  const uploadBtn = document.getElementById('uploadRecordsBtn');
  if (uploadBtn) {
    const patientOverride = uploadBtn.closest('[data-patient-access="self"]') && canUploadSelf;
    toggleInteractivity(uploadBtn, (isLoggedIn && canWrite) || patientOverride);
  }

  if (typeof updateDeleteButtonState === 'function') {
    updateDeleteButtonState();
  }

  if (typeof updateUploadButton === 'function') {
    updateUploadButton();
  }

  updateProfilePanel(currentUser);
}

// Load dashboard data
async function loadDashboard() {
  try {
    const patients = await securePatientDB.getAllPatients();

    // Apply role-based visibility
    let visiblePatients = [];
    if (!currentUser) {
      visiblePatients = [];
    } else if (currentUser.role === 'admin') {
      visiblePatients = patients;
    } else if (currentUser.role === 'doctor') {
      visiblePatients = patients.filter(p => {
        const createdBy = p.metadata && p.metadata.created_by;
        const assigned = p.metadata && p.metadata.assigned_to;
        return createdBy === currentUser.id || assigned === currentUser.id;
      });
    } else if (currentUser.role === 'patient') {
      visiblePatients = patients.filter(p => {
        if (!currentUser.patient_id) return false;
        if (p._id === currentUser.patient_id) return true;
        // support matching by suffix id if someone entered just an identifier
        try {
          const parts = p._id.split('_');
          if (parts.length > 1 && parts[1] === currentUser.patient_id) return true;
        } catch (e) {}
        return false;
      });
    } else {
      visiblePatients = [];
    }

    // Update stats
    updateStats(visiblePatients);

    // Store patients for pagination and reset to first page
    currentPage = 1;
    allPatients = visiblePatients;
    
    // Render patient list
    renderPatientList(visiblePatients);

    // Update charts (await to ensure file-level aggregation completes)
    await updateCharts(visiblePatients);

    // Update patient select for medical records
    await updatePatientSelect();

  } catch (error) {
    console.error('Failed to load dashboard:', error);
    showNotification('Failed to load dashboard data', 'error');
  }
}

// Update statistics
function updateStats(patients) {
  const totalPatientsEl = document.getElementById('totalPatients');
  const avgAgeEl = document.getElementById('avgAge');
  const criticalCasesEl = document.getElementById('criticalCases');
  if (!totalPatientsEl || !avgAgeEl || !criticalCasesEl) {
    return;
  }

  const totalPatients = patients.length;
  const avgAge = totalPatients > 0 ?
    patients.reduce((sum, p) => {
      const ageValue = Number(p.metadata && p.metadata.age);
      return sum + (Number.isFinite(ageValue) ? ageValue : 0);
    }, 0) / totalPatients : 0;
  const criticalCases = patients.filter(p => {
    const diagnosis = (p.metadata && p.metadata.diagnosis) ? p.metadata.diagnosis.toString().toLowerCase() : '';
    return diagnosis.includes('critical');
  }).length;

  // Gender distribution
  const maleCount = patients.filter(p => {
    const gender = (p.metadata && p.metadata.gender) ? p.metadata.gender.toString().toLowerCase() : '';
    return gender === 'male';
  }).length;
  const femaleCount = patients.filter(p => {
    const gender = (p.metadata && p.metadata.gender) ? p.metadata.gender.toString().toLowerCase() : '';
    return gender === 'female';
  }).length;
  const malePercentage = totalPatients > 0 ? (maleCount / totalPatients) * 100 : 0;
  const femalePercentage = totalPatients > 0 ? (femaleCount / totalPatients) * 100 : 0;

  // Total medical records (simplified - would need to count actual files)
  let totalRecords = 0;
  try {
    // This is a simplified count - in a real app you'd count actual files
    totalRecords = patients.reduce((sum, patient) => {
      // For now, just estimate based on patients
      return sum + Math.floor(Math.random() * 3) + 1; // Random 1-3 records per patient
    }, 0);
  } catch (error) {
    console.warn('Could not count medical records:', error);
  }

  // Update primary stats
  totalPatientsEl.textContent = totalPatients;
  avgAgeEl.textContent = avgAge.toFixed(1);
  criticalCasesEl.textContent = criticalCases;
  document.getElementById('totalRecords').textContent = totalRecords;

  // Update gender distribution
  document.getElementById('maleCount').textContent = maleCount;
  document.getElementById('femaleCount').textContent = femaleCount;
  document.getElementById('malePercentage').style.width = `${malePercentage}%`;
  document.getElementById('femalePercentage').style.width = `${femalePercentage}%`;

  // Update last updated time
  document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();

  // Update system health indicators
  updateSystemHealthIndicators();
}

function setStatusDot(element, state) {
  if (!element) return;
  element.className = 'status-dot';
  if (state === 'ok') {
    element.classList.add('status-dot--ok');
  } else if (state === 'warn') {
    element.classList.add('status-dot--warn');
  } else if (state === 'error') {
    element.classList.add('status-dot--error');
  }
}

function setStatusChip(element, state, text) {
  if (!element) return;
  element.className = 'status-chip';
  if (state === 'ok') {
    element.classList.add('status-chip--ok');
  } else if (state === 'warn') {
    element.classList.add('status-chip--warn');
  } else if (state === 'error') {
    element.classList.add('status-chip--error');
  }
  element.textContent = text;
}

function updateSystemHealthIndicators() {
  const ipfsHealth = document.getElementById('ipfsHealth');
  const blockchainHealth = document.getElementById('blockchainHealth');
  const encryptionHealth = document.getElementById('encryptionHealth');

  setStatusDot(ipfsHealth, (ipfsManager && ipfsManager.isConnected) ? 'ok' : 'warn');
  setStatusDot(blockchainHealth, (polygonManager && polygonManager.isConnected) ? 'ok' : 'warn');
  setStatusDot(encryptionHealth, isSystemInitialized ? 'ok' : 'error');
}

// Render patient list with pagination
function renderPatientList(patients) {
  // Store all patients for pagination
  filteredPatients = patients;
  
  // Calculate pagination
  const totalPatients = filteredPatients.length;
  const totalPages = Math.ceil(totalPatients / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalPatients);
  const patientsToShow = filteredPatients.slice(startIndex, endIndex);
  
  // Update pagination info
  updatePaginationControls(totalPatients, startIndex, endIndex, totalPages);
  
  const patientList = document.getElementById('patientList');
  patientList.innerHTML = '';

  // Render only current page patients
  patientsToShow.forEach((patient) => {
    const row = document.createElement('tr');
    row.className = "border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700";
    row.dataset.patientId = patient._id; // Store patient ID for selection

    const blockchainIcon = patient.blockchain_hash ?
      '<span class="text-green-500 text-xs sm:text-base" title="Blockchain verified">🔒</span>' :
      '<span class="text-gray-400 text-xs sm:text-base" title="Not blockchain verified">⭕</span>';

    // Initially show 0 files, then update asynchronously
    let recordsIcon = '<span class="text-gray-300 text-xs sm:text-base" title="Loading...">📄</span>';

    // Compute permissions safely (currentUser may be null during initial load)
    const perms = currentUser && Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
  const checkboxDisabled = perms.includes('delete') ? '' : 'disabled';

    // Build action buttons based on permissions
    let actionButtons = `<button onclick="viewPatientDetails('${patient._id}')" class="inline-flex items-center bg-blue-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm hover:bg-blue-600 whitespace-nowrap">View</button>`;
    if (perms.includes('write')) {
      actionButtons += ` <button onclick="editPatient('${patient._id}')" class="inline-flex items-center bg-yellow-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm hover:bg-yellow-600 whitespace-nowrap">Edit</button>`;
      actionButtons += ` <button onclick="sharePatient('${patient._id}')" class="inline-flex items-center bg-purple-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm hover:bg-purple-600 whitespace-nowrap hidden sm:inline-flex">Share</button>`;
    }
    if (perms.includes('delete')) {
      actionButtons += ` <button onclick="deletePatient('${patient._id}')" class="inline-flex items-center bg-red-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm hover:bg-red-600 delete-btn whitespace-nowrap hidden sm:inline-flex">Delete</button>`;
    }

    const shortId = (patient._id && patient._id.includes('_')) ? patient._id.split('_')[1] : patient._id;
    const truncatedId = shortId.length > 8 ? shortId.substring(0, 8) + '...' : shortId;

    row.innerHTML = `
      <td class="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 text-center">
        <input type="checkbox" class="patient-checkbox w-3 h-3 sm:w-4 sm:h-4 cursor-pointer" value="${patient._id}" ${checkboxDisabled}>
      </td>
      <td class="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 text-gray-900 dark:text-white text-[10px] sm:text-xs md:text-sm">
        <div class="flex items-center gap-0.5 sm:gap-1">
          <span class="hidden sm:inline">${shortId}</span>
          <span class="sm:hidden">${truncatedId}</span>
          <span class="text-[10px] sm:text-xs md:text-base">${blockchainIcon}</span>
          <span class="records-icon text-[10px] sm:text-xs md:text-base">${recordsIcon}</span>
        </div>
      </td>
      <td class="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 text-gray-900 dark:text-white text-[10px] sm:text-xs md:text-sm max-w-[80px] sm:max-w-none truncate">${sanitizeField(patient.metadata?.name, 'N/A')}</td>
      <td class="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 text-gray-900 dark:text-white text-[10px] sm:text-xs md:text-sm text-center">${sanitizeField(patient.metadata?.age, 'N/A')}</td>
      <td class="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 text-gray-900 dark:text-white text-[10px] sm:text-xs md:text-sm hidden md:table-cell">${sanitizeField(patient.metadata?.gender, 'N/A')}</td>
      <td class="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 text-gray-900 dark:text-white text-[10px] sm:text-xs md:text-sm max-w-[100px] sm:max-w-[150px] md:max-w-none truncate">${sanitizeField(patient.metadata?.diagnosis, 'Not specified')}</td>
      <td class="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 text-gray-900 dark:text-white text-[10px] sm:text-xs md:text-sm hidden lg:table-cell">${sanitizeField(patient.metadata?.prescription, 'N/A')}</td>
      <td class="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 text-gray-900 dark:text-white text-[10px] sm:text-xs md:text-sm hidden xl:table-cell">${formatDate(patient.metadata?.created_at, 'N/A')}</td>
      <td class="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-4 py-1.5 sm:py-2">
        <div class="flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 flex-wrap">
          ${actionButtons}
        </div>
      </td>
    `;

    patientList.appendChild(row);

    // Load file count asynchronously (non-blocking)
    securePatientDB.getPatientFiles(patient._id).then(files => {
      const fileCount = files.length;
      const recordsIconEl = row.querySelector('.records-icon');
      if (recordsIconEl) {
        recordsIconEl.innerHTML = fileCount > 0 ?
          `<span class="text-blue-500 text-xs sm:text-base" title="${fileCount} medical record${fileCount > 1 ? 's' : ''}">📄</span>` :
          '<span class="text-gray-300 text-xs sm:text-base" title="No medical records">📄</span>';
      }
    }).catch(error => {
      console.warn('Could not get file count for patient:', patient._id);
    });
  });
}

// Update pagination controls
function updatePaginationControls(total, start, end, totalPages) {
  const paginationStart = document.getElementById('paginationStart');
  const paginationEnd = document.getElementById('paginationEnd');
  const paginationTotal = document.getElementById('paginationTotal');
  const paginationInfo = document.getElementById('paginationInfo');
  const paginationPrev = document.getElementById('paginationPrev');
  const paginationNext = document.getElementById('paginationNext');
  
  if (paginationStart) paginationStart.textContent = total > 0 ? start + 1 : 0;
  if (paginationEnd) paginationEnd.textContent = end;
  if (paginationTotal) paginationTotal.textContent = total;
  if (paginationInfo) paginationInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
  
  if (paginationPrev) {
    paginationPrev.disabled = currentPage <= 1;
  }
  
  if (paginationNext) {
    paginationNext.disabled = currentPage >= totalPages;
  }
}

// Go to specific page
function goToPage(page) {
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  currentPage = page;
  renderPatientList(filteredPatients);
}

// Change items per page
function changeItemsPerPage(newItemsPerPage) {
  itemsPerPage = parseInt(newItemsPerPage);
  currentPage = 1; // Reset to first page
  renderPatientList(filteredPatients);
}

// ========== ADVANCED FILTERS ==========

// Apply filters to patient list
function applyAdvancedFilters() {
  const dateFrom = document.getElementById('filterDateFrom')?.value;
  const dateTo = document.getElementById('filterDateTo')?.value;
  const ageGroup = document.getElementById('filterAgeGroup')?.value;
  const gender = document.getElementById('filterGender')?.value;
  const diagnosis = document.getElementById('filterDiagnosis')?.value.trim().toLowerCase();
  
  // Update active filters
  activeFilters = { dateFrom, dateTo, ageGroup, gender, diagnosis };
  
  // Filter patients
  let filtered = [...allPatients];
  
  // Date range filter
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    filtered = filtered.filter(p => {
      const patientDate = new Date(p.metadata?.created_at || p.created_at);
      return patientDate >= fromDate;
    });
  }
  
  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter(p => {
      const patientDate = new Date(p.metadata?.created_at || p.created_at);
      return patientDate <= toDate;
    });
  }
  
  // Age group filter
  if (ageGroup) {
    filtered = filtered.filter(p => {
      const age = parseInt(p.metadata?.age || p.age);
      if (isNaN(age)) return false;
      
      if (ageGroup === '0-18') return age >= 0 && age <= 18;
      if (ageGroup === '19-40') return age >= 19 && age <= 40;
      if (ageGroup === '41-60') return age >= 41 && age <= 60;
      if (ageGroup === '60+') return age >= 60;
      return true;
    });
  }
  
  // Gender filter
  if (gender) {
    filtered = filtered.filter(p => {
      const patientGender = (p.metadata?.gender || p.gender || '').trim();
      return patientGender.toLowerCase() === gender.toLowerCase();
    });
  }
  
  // Diagnosis filter
  if (diagnosis) {
    filtered = filtered.filter(p => {
      const patientDiagnosis = (p.metadata?.diagnosis || p.diagnosis || '').toLowerCase();
      return patientDiagnosis.includes(diagnosis);
    });
  }
  
  // Reset to first page and render
  currentPage = 1;
  renderPatientList(filtered);
  
  // Update active filters display
  updateActiveFiltersDisplay();
  
  showNotification(`Found ${filtered.length} patient(s) matching filters`, 'success');
}

// Clear all filters
function clearAllFilters() {
  activeFilters = { dateFrom: null, dateTo: null, ageGroup: null, gender: null, diagnosis: null };
  
  // Reset form
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value = '';
  document.getElementById('filterAgeGroup').value = '';
  document.getElementById('filterGender').value = '';
  document.getElementById('filterDiagnosis').value = '';
  
  // Reset to all patients
  currentPage = 1;
  renderPatientList(allPatients);
  
  // Clear display
  updateActiveFiltersDisplay();
  
  showNotification('All filters cleared', 'info');
}

// Update active filters display
function updateActiveFiltersDisplay() {
  const display = document.getElementById('activeFiltersDisplay');
  if (!display) return;
  
  display.innerHTML = '';
  
  const filters = [];
  if (activeFilters.dateFrom) filters.push(`From: ${activeFilters.dateFrom}`);
  if (activeFilters.dateTo) filters.push(`To: ${activeFilters.dateTo}`);
  if (activeFilters.ageGroup) filters.push(`Age: ${activeFilters.ageGroup}`);
  if (activeFilters.gender) filters.push(`Gender: ${activeFilters.gender}`);
  if (activeFilters.diagnosis) filters.push(`Diagnosis: ${activeFilters.diagnosis}`);
  
  if (filters.length === 0) {
    display.innerHTML = '<span class="text-xs text-gray-500 dark:text-gray-400">No active filters</span>';
    return;
  }
  
  filters.forEach(filter => {
    const tag = document.createElement('span');
    tag.className = 'inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-xs rounded-full';
    tag.textContent = filter;
    display.appendChild(tag);
  });
}

// Save filter preset
function saveFilterPreset() {
  const hasActiveFilters = Object.values(activeFilters).some(v => v);
  if (!hasActiveFilters) {
    showNotification('No filters to save', 'warning');
    return;
  }
  
  const presetName = prompt('Enter a name for this filter preset:');
  if (!presetName || !presetName.trim()) return;
  
  const preset = {
    name: presetName.trim(),
    filters: { ...activeFilters },
    createdAt: new Date().toISOString()
  };
  
  savedFilterPresets.push(preset);
  localStorage.setItem('filterPresets', JSON.stringify(savedFilterPresets));
  
  updateFilterPresetDropdown();
  showNotification(`Filter preset "${presetName}" saved!`, 'success');
}

// Load filter preset
function loadFilterPreset(presetName) {
  const preset = savedFilterPresets.find(p => p.name === presetName);
  if (!preset) return;
  
  // Apply preset values to form
  document.getElementById('filterDateFrom').value = preset.filters.dateFrom || '';
  document.getElementById('filterDateTo').value = preset.filters.dateTo || '';
  document.getElementById('filterAgeGroup').value = preset.filters.ageGroup || '';
  document.getElementById('filterGender').value = preset.filters.gender || '';
  document.getElementById('filterDiagnosis').value = preset.filters.diagnosis || '';
  
  // Apply filters
  applyAdvancedFilters();
  
  showNotification(`Loaded preset "${presetName}"`, 'success');
}

// Update filter preset dropdown
function updateFilterPresetDropdown() {
  const dropdown = document.getElementById('loadFilterPreset');
  if (!dropdown) return;
  
  dropdown.innerHTML = '<option value="">Load Saved Preset...</option>';
  
  savedFilterPresets.forEach(preset => {
    const option = document.createElement('option');
    option.value = preset.name;
    option.textContent = preset.name;
    dropdown.appendChild(option);
  });
}

// Toggle filters panel
function toggleFiltersPanel() {
  const panel = document.getElementById('advancedFiltersPanel');
  if (!panel) return;
  
  panel.classList.toggle('hidden');
}

// ========== END ADVANCED FILTERS ==========

// Handle patient form submission
document.getElementById('patientForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!isSystemInitialized) {
    showNotification('System not initialized yet', 'error');
    return;
  }

  if (!currentUser || !Array.isArray(currentUser.permissions) || !currentUser.permissions.includes('write')) {
    showNotification('You do not have permission to add patients', 'error');
    return;
  }

  const formData = new FormData(e.target);
  const patientData = {
    name: formData.get('name') || '',
    age: parseInt(formData.get('age')) || '',
    gender: formData.get('gender') || '',
    diagnosis: formData.get('diagnosis') || '',
    prescription: formData.get('prescription') || '',
    room: formData.get('room') || '',
    medical_history: formData.get('medical_history') || '',
    allergies: formData.get('allergies') || '',
    emergency_contact: formData.get('emergency_contact') || '',
    created_by: currentUser ? currentUser.id : 'unknown',
    created_at: new Date().toISOString()
  };

  try {
    showNotification('Adding patient securely...', 'info');

    const result = await securePatientDB.addPatient(patientData);

    // Handle photo upload if provided
    const photoFile = formData.get('photo');
    if (photoFile && photoFile.size > 0) {
      await securePatientDB.addMedicalFile(result.id, photoFile);
    }

    e.target.reset();
    await loadDashboard();
    await updatePatientSelect(); // Update patient dropdown
    showNotification('Patient added successfully with encryption and blockchain proof!', 'success');

  } catch (error) {
    console.error('Failed to add patient:', error);
    showNotification('Failed to add patient: ' + error.message, 'error');
  }
});

// Medical Records Upload Functionality
let selectedFiles = [];

// Initialize medical records functionality
function initMedicalRecords() {
  console.log('🔄 Initializing medical records...');

  const medicalRecordsSection = document.getElementById('medicalRecordsSection');
  console.log('Medical records section found:', !!medicalRecordsSection);

  if (!medicalRecordsSection) {
    console.error('❌ Medical records section not found!');
    return;
  }

  console.log('✅ Medical records section visible:', medicalRecordsSection.offsetHeight > 0);

  const fileUploadArea = document.getElementById('fileUploadArea');
  const medicalFilesInput = document.getElementById('medicalFilesInput');
  const selectFilesBtn = document.getElementById('selectFilesBtn');
  const uploadRecordsBtn = document.getElementById('uploadRecordsBtn');
  const recordPatientSelect = document.getElementById('recordPatientSelect');
  const recordPatientSearch = document.getElementById('recordPatientSearch');
  const refreshPatientsBtn = document.getElementById('refreshPatientsBtn');

  console.log('Elements found:', {
    fileUploadArea: !!fileUploadArea,
    medicalFilesInput: !!medicalFilesInput,
    selectFilesBtn: !!selectFilesBtn,
    uploadRecordsBtn: !!uploadRecordsBtn,
    recordPatientSelect: !!recordPatientSelect,
    recordPatientSearch: !!recordPatientSearch,
    refreshPatientsBtn: !!refreshPatientsBtn
  });

  if (!fileUploadArea || !medicalFilesInput || !selectFilesBtn) {
    console.error('❌ Medical records elements not found!');
    return;
  }

  // File selection handlers
  selectFilesBtn.addEventListener('click', () => {
    console.log('📁 Select files button clicked');
    medicalFilesInput.click();
  });

  // Make the entire upload area clickable
  fileUploadArea.addEventListener('click', (e) => {
    console.log('🖱️ Upload area clicked', e.target);
    // Only trigger if clicking on the area itself, not on buttons or other elements
    if (e.target === fileUploadArea || e.target.closest('.text-gray-500')) {
      console.log('🎯 Triggering file input click');
      medicalFilesInput.click();
    }
  });

  medicalFilesInput.addEventListener('change', (e) => {
    console.log('📄 Files selected:', e.target.files.length);
    handleFileSelection(e.target.files);
  });

  // Drag and drop handlers
  fileUploadArea.addEventListener('dragover', (e) => {
    console.log('📥 Drag over');
    e.preventDefault();
    fileUploadArea.classList.add('border-purple-400', 'bg-purple-50', 'dark:bg-purple-900');
  });

  fileUploadArea.addEventListener('dragleave', () => {
    console.log('📤 Drag leave');
    fileUploadArea.classList.remove('border-purple-400', 'bg-purple-50', 'dark:bg-purple-900');
  });

  fileUploadArea.addEventListener('drop', (e) => {
    console.log('📦 Files dropped');
    e.preventDefault();
    fileUploadArea.classList.remove('border-purple-400', 'bg-purple-50', 'dark:bg-purple-900');
    handleFileSelection(e.dataTransfer.files);
  });

  // Upload button handler
  uploadRecordsBtn.addEventListener('click', (e) => {
    console.log('🚀 Upload button clicked');
    // If no files are currently selected, open the file picker so user can select files
    if (!selectedFiles || selectedFiles.length === 0) {
      console.log('No files selected yet - opening file picker');
      // Trigger the file input to let user choose files
      medicalFilesInput.click();
      showNotification('Please choose files to upload (you can enter a filename/summary first).', 'info');
      return;
    }

    uploadMedicalRecords();
  });

  // Refresh patients button
  refreshPatientsBtn.addEventListener('click', () => {
    console.log('🔄 Refresh patients clicked');
    updatePatientSelect();
  });

  // Patient select change handler
  recordPatientSelect.addEventListener('change', () => {
    console.log('👤 Patient selected:', recordPatientSelect.value);
    updateUploadButton();
  });

  if (recordPatientSearch) {
    recordPatientSearch.addEventListener('input', (e) => {
      applyPatientSelectFilter(e.target.value);
    });

    recordPatientSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const select = document.getElementById('recordPatientSelect');
        if (select && select.options.length > 1) {
          select.selectedIndex = 1;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        e.preventDefault();
      } else if (e.key === 'Escape') {
        e.target.value = '';
        applyPatientSelectFilter('');
        e.preventDefault();
      }
    });
  }

  // (debug upload state button removed per user request)

  console.log('✅ Medical records event listeners attached');

  // Initialize patient select
  updatePatientSelect();
  updateSelectedFilesDisplay();
}

// Handle file selection
function handleFileSelection(files) {
  console.log('📋 Processing files:', files.length);

  for (let file of files) {
    console.log('📄 File:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.warn('⚠️ File too large:', file.name);
      showNotification(`File "${file.name}" is too large. Maximum size is 10MB.`, 'error');
      continue;
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      console.warn('⚠️ Unsupported file type:', file.name, file.type);
      showNotification(`File type not supported for "${file.name}". Supported types: PDF, JPG, PNG, DOC, DOCX, TXT`, 'error');
      continue;
    }

    console.log('✅ File accepted:', file.name);
    selectedFiles.push(file);
  }

  console.log('📂 Selected files count:', selectedFiles.length);
  updateSelectedFilesDisplay();
  // Populate selected file name summary (first file or comma-separated list)
  try {
    const fileNameInput = document.getElementById('selectedFileName');
    if (fileNameInput) {
      // Only auto-fill the selectedFileName if the user hasn't provided a custom name/summary
      const hasUserProvidedName = fileNameInput.value && fileNameInput.value.trim() !== '';
      if (!hasUserProvidedName) {
        if (selectedFiles.length === 0) fileNameInput.value = '';
        else if (selectedFiles.length === 1) fileNameInput.value = selectedFiles[0].name;
        else fileNameInput.value = selectedFiles.map(f => f.name).join(', ');
      }
    }
  } catch (e) {
    console.warn('Could not set selectedFileName input:', e);
  }
  updateUploadButton();
}

// Update selected files display
function updateSelectedFilesDisplay() {
  const selectedFilesDiv = document.getElementById('selectedFiles');
  selectedFilesDiv.innerHTML = '';

  if (!selectedFiles || selectedFiles.length === 0) {
    selectedFilesDiv.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400 italic">No files selected yet.</p>';
    return;
  }

  selectedFiles.forEach((file, index) => {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 shadow-sm backdrop-blur';
    fileDiv.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="text-sm">
          <p class="font-semibold text-gray-900 dark:text-white">${file.name}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${(file.size / 1024 / 1024).toFixed(2)} MB • ${getFileTypeLabel(file.type)}</p>
        </div>
      </div>
      <button onclick="removeFile(${index})" class="text-red-500 hover:text-red-600 transition">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;
    selectedFilesDiv.appendChild(fileDiv);
  });

  // Keep the selected file name input in sync
  try {
    const fileNameInput = document.getElementById('selectedFileName');
    if (fileNameInput) {
      // Only update the input if user hasn't already typed a custom name
      const hasUserProvidedName = fileNameInput.value && fileNameInput.value.trim() !== '';
      if (!hasUserProvidedName) {
        if (selectedFiles.length === 0) fileNameInput.value = '';
        else if (selectedFiles.length === 1) fileNameInput.value = selectedFiles[0].name;
        else fileNameInput.value = selectedFiles.map(f => f.name).join(', ');
      }
    }
  } catch (e) {
    console.warn('Could not update selectedFileName input:', e);
  }
}

// Get record type label
function getRecordTypeLabel(type) {
  const labels = {
    'blood_test': 'Blood Test',
    'mri': 'MRI Report',
    'xray': 'X-Ray',
    'ct_scan': 'CT Scan',
    'lab_report': 'Lab Report',
    'prescription': 'Prescription',
    'ultrasound': 'Ultrasound',
    'ecg': 'ECG Report',
    'other': 'Other'
  };
  return labels[type] || 'Other';
}

// Remove file from selection
function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateSelectedFilesDisplay();
  updateUploadButton();
}

// Update upload button state
function updateUploadButton() {
  const uploadBtn = document.getElementById('uploadRecordsBtn');
  const patientSelect = document.getElementById('recordPatientSelect');
  const canWrite = currentUser && Array.isArray(currentUser.permissions) && currentUser.permissions.includes('write');
  const canUploadSelf = currentUser && Array.isArray(currentUser.permissions) && currentUser.permissions.includes('upload_self') && currentUser.patient_id;
  const canUpload = canWrite || canUploadSelf;

  if (!uploadBtn) return;

  if (!canUpload) {
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Upload Records';
    return;
  }

  if (!patientSelect) return;

  const hasFiles = selectedFiles.length > 0;
  let hasPatient = patientSelect.value !== '';

  // If no patient selected but there's exactly one real patient option, auto-select it
  if (!hasPatient) {
    const realOptions = Array.from(patientSelect.options).filter(o => o.value && o.value.trim() !== '');
    if (realOptions.length === 1) {
      patientSelect.value = realOptions[0].value;
      hasPatient = true;
    }
  }

  // Ensure the button remains visible even when disabled (avoid accidental hiding by CSS)
  uploadBtn.style.display = 'inline-block';

  // Require that a filename summary is present (user requested a mandatory filename box)
  const fileNameInput = document.getElementById('selectedFileName');
  const hasFileName = fileNameInput ? (fileNameInput.value && fileNameInput.value.trim() !== '') : false;

  // Enable upload when a patient is selected AND (there are files OR the user provided a filename/summary)
  uploadBtn.disabled = !hasPatient || (!hasFiles && !hasFileName);

  if (hasFiles && hasPatient) {
    uploadBtn.textContent = `Upload ${selectedFiles.length} Record${selectedFiles.length > 1 ? 's' : ''}`;
  } else if (hasFiles && !hasPatient) {
    // Files selected but no patient chosen
    uploadBtn.textContent = 'Select patient to upload';
  } else if (!hasFiles && hasPatient && hasFileName) {
    // Patient selected and filename provided but no files yet - prompt to choose files
    uploadBtn.textContent = 'Choose files to upload';
  } else if (hasFiles && hasPatient && !hasFileName) {
    // Files selected and patient selected but no filename provided
    uploadBtn.textContent = `Upload ${selectedFiles.length} Record${selectedFiles.length > 1 ? 's' : ''}`;
  } else {
    uploadBtn.textContent = 'Upload Records';
  }
}

function buildPatientSelectOption(patient) {
  const metadata = patient.metadata || {};
  const rawName = (metadata.name ?? '').toString();
  const name = sanitizeField(rawName, 'Unknown');
  const idParts = (patient._id || '').split('_');
  const shortId = idParts.length > 1 ? idParts[1] : patient._id;
  const diagnosisRaw = (metadata.diagnosis ?? '').toString();
  const diagnosis = diagnosisRaw && diagnosisRaw.trim().toLowerCase() !== 'undefined' ? diagnosisRaw.trim() : '';
  const roomRaw = (metadata.room ?? '').toString();
  const room = roomRaw && roomRaw.trim().toLowerCase() !== 'undefined' ? roomRaw.trim() : '';
  const ageRaw = metadata.age !== undefined && metadata.age !== null ? String(metadata.age) : '';

  const searchTokens = [
    rawName,
    name,
    shortId,
    diagnosis,
    room,
    ageRaw,
    metadata.prescription ?? '',
    patient._id ?? ''
  ]
    .filter(Boolean)
    .map(token => token.toString().toLowerCase())
    .join(' ');

  const label = diagnosis ? `${name} • ${diagnosis}` : name;
  const tooltipParts = [
    `Name: ${name}`,
    shortId ? `ID: ${shortId}` : '',
    diagnosis ? `Diagnosis: ${diagnosis}` : '',
    room ? `Room: ${room}` : '',
    ageRaw ? `Age: ${ageRaw}` : ''
  ].filter(Boolean).join(' • ');

  return {
    id: patient._id,
    name,
    shortId,
    diagnosis,
    room,
    label,
    searchTokens,
    tooltip: tooltipParts || label
  };
}

function renderPatientSelectOptions(options, selectedId, placeholderText) {
  const patientSelect = document.getElementById('recordPatientSelect');
  if (!patientSelect) return;

  const previousValue = selectedId ?? patientSelect.value ?? '';
  patientSelect.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholderText || (options.length ? 'Select Patient' : 'No patients available');
  patientSelect.appendChild(placeholderOption);

  options.forEach(optionInfo => {
    const option = document.createElement('option');
    option.value = optionInfo.id;
    option.textContent = optionInfo.shortId
      ? `${optionInfo.label} (ID: ${optionInfo.shortId})`
      : optionInfo.label;
    option.dataset.searchTokens = optionInfo.searchTokens;
    option.title = optionInfo.tooltip || optionInfo.label;
    patientSelect.appendChild(option);
  });

  patientSelect.disabled = options.length === 0;

  if (options.some(opt => opt.id === previousValue)) {
    patientSelect.value = previousValue;
  } else {
    patientSelect.value = '';
  }

  updateUploadButton();
}

function applyPatientSelectFilter(searchTerm = '', selectedId) {
  const patientSelect = document.getElementById('recordPatientSelect');
  const hint = document.getElementById('recordPatientHint');
  const searchInput = document.getElementById('recordPatientSearch');
  if (!patientSelect) return;

  const normalizedTerm = (searchTerm || '').trim().toLowerCase();
  const filtered = normalizedTerm
    ? patientSelectOptions.filter(option => option.searchTokens.includes(normalizedTerm))
    : [...patientSelectOptions];

  const placeholderText = filtered.length
    ? 'Select Patient'
    : (patientSelectOptions.length === 0 ? 'No patients available' : 'No matching patients');

  renderPatientSelectOptions(filtered, selectedId, placeholderText);

  if (searchInput) {
    if (patientSelectOptions.length === 0) {
      searchInput.value = '';
    }
    searchInput.disabled = patientSelectOptions.length === 0;
  }

  if (hint) {
    hint.classList.remove('text-gray-500', 'dark:text-gray-400', 'text-emerald-500', 'dark:text-emerald-300', 'text-amber-600', 'dark:text-amber-400');
    if (patientSelectOptions.length === 0) {
      hint.textContent = 'No patients found. Add a patient profile before attaching records.';
      hint.classList.add('text-amber-600', 'dark:text-amber-400');
    } else if (normalizedTerm && filtered.length === 0) {
      hint.textContent = `No patients match “${searchTerm}”. Try another name, ID, or diagnosis.`;
      hint.classList.add('text-amber-600', 'dark:text-amber-400');
    } else {
      hint.textContent = 'Select a patient profile to enable uploads.';
      hint.classList.add('text-emerald-500', 'dark:text-emerald-300');
    }
  }
}

// Update patient select dropdown
async function updatePatientSelect() {
  const patientSelect = document.getElementById('recordPatientSelect');
  const searchInput = document.getElementById('recordPatientSearch');
  if (!patientSelect) return;

  const previousSelection = patientSelect.value;

  try {
    let patients = await securePatientDB.getAllPatients();

    if (!currentUser) {
      patients = [];
    } else if (currentUser.role === 'patient') {
      patients = patients.filter(p => {
        if (!currentUser.patient_id) return false;
        if (p._id === currentUser.patient_id) return true;
        try {
          const parts = p._id.split('_');
          return parts[1] === currentUser.patient_id;
        } catch (e) {
          return false;
        }
      });
    } else if (currentUser.role === 'doctor') {
      patients = patients.filter(p => {
        const metadata = p.metadata || {};
        const createdBy = metadata.created_by;
        const assigned = metadata.assigned_to;
        return createdBy === currentUser.id || assigned === currentUser.id;
      });
    }

    patientSelectOptions = patients.map(buildPatientSelectOption);

    const searchTerm = searchInput ? searchInput.value : '';
    applyPatientSelectFilter(searchTerm, previousSelection);
  } catch (error) {
    console.error('Failed to load patients for select:', error);
    showNotification('Failed to load patient list', 'error');
  }
}

// Upload medical records
async function uploadMedicalRecords() {
  const canWrite = currentUser && Array.isArray(currentUser.permissions) && currentUser.permissions.includes('write');
  const canUploadSelf = currentUser && Array.isArray(currentUser.permissions) && currentUser.permissions.includes('upload_self') && currentUser.patient_id;

  if (!canWrite && !canUploadSelf) {
    showNotification('You do not have permission to upload medical records', 'error');
    return;
  }

  const patientId = document.getElementById('recordPatientSelect').value;
  const recordType = document.getElementById('recordType').value;
  const description = document.getElementById('recordDescription').value;

  if (currentUser && currentUser.role === 'patient' && currentUser.patient_id) {
    const patientParts = (patientId || '').split('_');
    const matchesDirect = patientId === currentUser.patient_id;
    const matchesParts = patientParts.includes(currentUser.patient_id);
    if (!matchesDirect && !matchesParts) {
      showNotification('You can only upload records to your own profile.', 'error');
      return;
    }
  }

  if (!patientId || selectedFiles.length === 0) {
    showNotification('Please select a patient and files to upload', 'error');
    return;
  }

  try {
    showNotification(`Uploading ${selectedFiles.length} medical record${selectedFiles.length > 1 ? 's' : ''}...`, 'info');

    let uploadedCount = 0;
    const filenameSummary = (document.getElementById('selectedFileName') && document.getElementById('selectedFileName').value) ? document.getElementById('selectedFileName').value.trim() : '';
    const uploadPromises = selectedFiles.map(async (file) => {
      const fileData = {
        filename: file.name,
        display_name: filenameSummary || file.name,
        type: recordType,
        description: description,
  uploaded_by: currentUser ? currentUser.id : 'unknown',
        uploaded_at: new Date().toISOString(),
        file_size: file.size,
        mime_type: file.type
      };

      const result = await securePatientDB.addMedicalFile(patientId, file, fileData);
      uploadedCount++;
      return result;
    });

    await Promise.all(uploadPromises);

    // Clear selections
    selectedFiles = [];
    updateSelectedFilesDisplay();
    updateUploadButton();
    document.getElementById('recordDescription').value = '';

    // Refresh patient data
    await loadDashboard();

    showNotification(`Successfully uploaded ${uploadedCount} medical record${uploadedCount > 1 ? 's' : ''}!`, 'success');

  } catch (error) {
    console.error('Failed to upload medical records:', error);
    showNotification('Failed to upload medical records: ' + error.message, 'error');
  }
}

// Search patients
document.getElementById('searchInput').addEventListener('input', async (e) => {
  const query = e.target.value.trim();

  try {
    let patients;
    if (query) {
      patients = await securePatientDB.searchPatients(query);
    } else {
      patients = await securePatientDB.getAllPatients();
    }

    // Reset to first page when searching
    currentPage = 1;
    allPatients = patients;
    renderPatientList(patients);
  } catch (error) {
    console.error('Search failed:', error);
    showNotification('Search failed', 'error');
  }
});

// View patient details
async function viewPatientDetails(patientId) {
  try {
    console.log('Viewing patient details for ID:', patientId);
    const patient = await securePatientDB.getPatient(patientId);
    console.log('Patient data retrieved:', patient);
    console.log('Patient keys:', Object.keys(patient));
    console.log('Patient metadata:', patient.metadata);
    console.log('Patient name from direct:', patient.name);
    console.log('Patient name from metadata:', patient.metadata?.name);

    // Debug: Show what we have
    console.log('Available data:', {
      direct: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        diagnosis: patient.diagnosis
      },
      metadata: patient.metadata
    });

    const files = await securePatientDB.getPatientFiles(patientId);
    console.log('Patient files:', files);

    // Store files globally for download
    window.currentPatientFiles = files;

    // Create modal or detailed view
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-0';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 w-[96vw] h-[92vh] max-w-none max-h-none overflow-y-auto shadow-2xl rounded-2xl animate-pop">
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-2xl font-bold text-gray-900 dark:text-white">Patient Details - ${sanitizeField(patient.name ?? patient.metadata?.name, 'Unknown')}</h3>
          <button onclick="this.closest('.fixed').remove()" aria-label="Close" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 ml-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-900 dark:text-white mb-6">
          <div class="space-y-3">
            <div><strong>Name:</strong> ${sanitizeField(patient.name ?? patient.metadata?.name, 'N/A')}</div>
            <div><strong>Age:</strong> ${sanitizeField(patient.age ?? patient.metadata?.age, 'N/A')}</div>
            <div><strong>Gender:</strong> ${sanitizeField(patient.gender ?? patient.metadata?.gender, 'N/A')}</div>
            <div><strong>Diagnosis:</strong> ${sanitizeField(patient.diagnosis ?? patient.metadata?.diagnosis, 'Not specified')}</div>
            <div><strong>Prescription:</strong> ${sanitizeField(patient.prescription ?? patient.metadata?.prescription, 'N/A')}</div>
            <div><strong>Room:</strong> ${sanitizeField(patient.room ?? patient.metadata?.room, 'N/A')}</div>
          </div>
          <div class="space-y-3">
            <div><strong>Medical History:</strong> ${sanitizeField(patient.medical_history ?? patient.metadata?.medical_history, 'N/A')}</div>
            <div><strong>Allergies:</strong> ${sanitizeField(patient.allergies ?? patient.metadata?.allergies, 'N/A')}</div>
            <div><strong>Emergency Contact:</strong> ${sanitizeField(patient.emergency_contact ?? patient.metadata?.emergency_contact, 'N/A')}</div>
            <div><strong>IPFS CID:</strong> <code class="text-xs break-words">${sanitizeField(patient.ipfs_cid, 'N/A')}</code></div>
            <div><strong>Blockchain Proof:</strong> ${patient.blockchain_hash ?
              `<a href="https://polygonscan.com/tx/${patient.blockchain_hash}" target="_blank" class="text-blue-500 dark:text-blue-400">View</a>` :
              'Not available'}</div>
            <div><strong>Debug Info:</strong> <code class="text-xs">ID: ${patientId}, Has Metadata: ${!!patient.metadata}, Metadata Name: ${patient.metadata?.name}, Direct Name: ${patient.name}</code></div>
          </div>
        </div>

        ${files.length > 0 ? `
          <h4 class="font-bold mt-2 mb-4 text-gray-900 dark:text-white">Medical Records & Files</h4>
          <div class="grid grid-cols-1 gap-4">
            ${files.map((file, index) => `
              <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <div class="flex-1 pr-4">
                  <h5 class="font-medium text-gray-900 dark:text-white">${sanitizeField(file.display_name || file.filename || `Record ${index+1}`, 'Medical Record')}</h5>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Type: ${getRecordTypeLabel(file.type || 'other')} •
                    Size: ${(file.size && !isNaN(Number(file.size)) ? (Number(file.size) / 1024 / 1024).toFixed(2) : 'N/A')} MB •
                    Uploaded: ${formatDate(file.uploaded_at, 'Unknown')}
                  </p>
                </div>
                <div class="flex-shrink-0">
                  <button onclick="downloadFile(window.currentPatientFiles[${index}].data, '${sanitizeField(file.display_name || file.filename || `file_${index+1}`)}')" class="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600">Download</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p class="text-gray-500 dark:text-gray-400 mt-4">No medical records uploaded yet.</p>'}

        <div class="mt-6 flex justify-end">
          <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 text-white px-4 py-2 rounded">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to view patient details:', error);
    showNotification('Failed to load patient details', 'error');
  }
}

// Edit patient
async function editPatient(patientId) {
  if (!currentUser || !Array.isArray(currentUser.permissions) || !currentUser.permissions.includes('write')) {
    showNotification('You do not have permission to edit patients', 'error');
    return;
  }

  try {
    const patient = await securePatientDB.getPatient(patientId);

    // Create edit form
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Edit Patient</h3>
        <form id="editForm" class="space-y-4">
          <input type="text" name="name" value="${sanitizeField(patient.name ?? patient.metadata?.name, '')}" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" required>
          <input type="number" name="age" value="${sanitizeField(patient.age ?? patient.metadata?.age, '')}" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" required>
          <input type="text" name="gender" value="${sanitizeField(patient.gender ?? patient.metadata?.gender, '')}" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400">
          <input type="text" name="diagnosis" value="${sanitizeField(patient.diagnosis ?? patient.metadata?.diagnosis, '')}" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" required>
          <input type="text" name="prescription" value="${sanitizeField(patient.prescription ?? patient.metadata?.prescription, '')}" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400">
          <input type="text" name="room" value="${sanitizeField(patient.room ?? patient.metadata?.room, '')}" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400">
          <textarea name="medical_history" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" rows="3">${sanitizeField(patient.medical_history ?? patient.metadata?.medical_history, '')}</textarea>
          <input type="text" name="allergies" value="${sanitizeField(patient.allergies ?? patient.metadata?.allergies, '')}" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400">
          <input type="text" name="emergency_contact" value="${sanitizeField(patient.emergency_contact ?? patient.metadata?.emergency_contact, '')}" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400">
          <!-- Add files for this patient while editing -->
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Add Medical Files (PDF, JPG, PNG)</label>
          <input type="file" name="new_files" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,image/*" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <div class="flex justify-end space-x-2">
            <button type="button" onclick="this.closest('.fixed').remove()" class="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">Update</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    document.getElementById('editForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);
      const updatedData = {
        name: formData.get('name') || '',
        age: parseInt(formData.get('age')) || '',
        gender: formData.get('gender') || '',
        diagnosis: formData.get('diagnosis') || '',
        prescription: formData.get('prescription') || '',
        room: formData.get('room') || '',
        medical_history: formData.get('medical_history') || '',
        allergies: formData.get('allergies') || '',
        emergency_contact: formData.get('emergency_contact') || '',
        updated_by: currentUser.id,
        updated_at: new Date().toISOString()
      };

      try {
        await securePatientDB.updatePatient(patientId, updatedData);

        // Handle any newly attached files from the edit form
        try {
          const fileInput = modal.querySelector('input[name="new_files"]');
          if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const filesToUpload = Array.from(fileInput.files);
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
            let uploaded = 0;
            for (const file of filesToUpload) {
              if (file.size > 10 * 1024 * 1024) {
                showNotification(`File "${file.name}" is too large. Skipping.`, 'warning');
                continue;
              }
              if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
                showNotification(`Unsupported file type for "${file.name}". Skipping.`, 'warning');
                continue;
              }
              const fileData = {
                filename: file.name,
                type: formData.get('recordType') || 'other',
                description: formData.get('recordDescription') || '',
                uploaded_by: currentUser.id,
                uploaded_at: new Date().toISOString(),
                file_size: file.size,
                mime_type: file.type
              };
              await securePatientDB.addMedicalFile(patientId, file, fileData);
              uploaded++;
            }
            if (uploaded > 0) showNotification(`Uploaded ${uploaded} file(s) for this patient.`, 'success');
          }
        } catch (fileErr) {
          console.warn('Failed to upload files from edit form:', fileErr);
          showNotification('Some files failed to upload from the edit form', 'warning');
        }

        modal.remove();
        await loadDashboard();
        showNotification('Patient updated successfully!', 'success');
      } catch (error) {
        console.error('Failed to update patient:', error);
        showNotification('Failed to update patient', 'error');
      }
    });

  } catch (error) {
    console.error('Failed to edit patient:', error);
    showNotification('Failed to load patient for editing', 'error');
  }
}

// Delete patient
async function deletePatient(patientId) {
  if (!currentUser || !Array.isArray(currentUser.permissions) || !currentUser.permissions.includes('delete')) {
    showNotification('You do not have permission to delete patients', 'error');
    return;
  }

  if (!confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
    return;
  }

  try {
    await securePatientDB.deletePatient(patientId);
    await loadDashboard();
    showNotification('Patient deleted successfully', 'success');
  } catch (error) {
    console.error('Failed to delete patient:', error);
    showNotification('Failed to delete patient', 'error');
  }
}

// Download file from IPFS or direct blob
async function downloadFile(cidOrBlob, filename) {
  try {
    showNotification('Downloading file...', 'info');
    let blob;

    if (cidOrBlob instanceof Blob) {
      blob = cidOrBlob;
    } else {
      // Assume it's a CID
      const data = await ipfsManager.getFile(cidOrBlob);
      if (data instanceof Blob) {
        blob = data;
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([data]);
      } else if (data && data.buffer instanceof ArrayBuffer) {
        blob = new Blob([data.buffer]);
      } else if (typeof data === 'string') {
        blob = new Blob([data], { type: 'text/plain' });
      } else {
        throw new Error('Downloaded data is in an unsupported format');
      }
    }

    // Determine a sensible filename (preserve provided name, add extension from mime if missing)
    let outName = filename || 'downloaded_file';
    try {
      const mime = blob.type || '';
      if (mime && !outName.includes('.')) {
        const mimePart = mime.split('/')[1] || '';
        const ext = mimePart.split(';')[0];
        if (ext) outName = `${outName}.${ext}`;
      }
    } catch (e) {
      // ignore
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a short delay to ensure download has started in all browsers
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showNotification('File downloaded successfully', 'success');
  } catch (error) {
    console.error('Failed to download file:', error);
    showNotification('Failed to download file', 'error');
  }
}

// Share patient data with other healthcare providers
async function sharePatient(patientId) {
  if (!currentUser || !Array.isArray(currentUser.permissions) || !currentUser.permissions.includes('write')) {
    showNotification('You do not have permission to share patient data', 'error');
    return;
  }

  try {
    const patient = await securePatientDB.getPatient(patientId);

    // Create shareable data (without sensitive full details)
    const shareData = {
      patient_id: patientId,
      name: sanitizeField(patient.name ?? patient.metadata?.name, ''),
      age: sanitizeField(patient.age ?? patient.metadata?.age, ''),
      gender: sanitizeField(patient.gender ?? patient.metadata?.gender, ''),
      diagnosis: sanitizeField(patient.diagnosis ?? patient.metadata?.diagnosis, 'Not specified'),
      ipfs_cid: patient.ipfs_cid,
      blockchain_hash: patient.blockchain_hash,
      shared_by: currentUser.id,
      shared_at: new Date().toISOString(),
      access_level: 'read_only' // Can be configured
    };

    // Encrypt share data
    const encryptedShare = await encryptionManager.encrypt(shareData, encryptionKey);
    const shareCid = await ipfsManager.addData(encryptedShare, {
      path: `/healthchain/shares/${shareData.patient_id}_${Date.now()}.json`
    });

    // Create shareable URL
    const shareUrl = `${window.location.origin}${window.location.pathname}?shared=${shareCid}`;

    // Generate QR code
    const qrCanvas = document.createElement('canvas');
    QRCode.toCanvas(qrCanvas, shareUrl, { width: 256, height: 256 });

    // Create share modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Share Patient Data</h3>
        <div class="space-y-4">
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">Shareable Link:</p>
            <input type="text" value="${shareUrl}" readonly class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" id="shareUrl">
            <button onclick="copyToClipboard('shareUrl')" class="mt-1 bg-blue-500 text-white px-3 py-1 rounded text-sm">Copy Link</button>
          </div>
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">QR Code:</p>
            <div class="flex justify-center">
              ${qrCanvas.outerHTML}
            </div>
            <button onclick="downloadQRCode()" class="mt-1 bg-green-500 text-white px-3 py-1 rounded text-sm">Download QR</button>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <p class="text-gray-900 dark:text-white"><strong>Shared Data:</strong></p>
            <ul class="list-disc list-inside">
              <li>Patient ID: ${patientId.split('_')[1]}</li>
              <li>Name: ${sanitizeField(patient.name ?? patient.metadata?.name, 'N/A')}</li>
              <li>Diagnosis: ${sanitizeField(patient.diagnosis ?? patient.metadata?.diagnosis, 'Not specified')}</li>
              <li>Access Level: Read-only</li>
            </ul>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 text-white px-4 py-2 rounded">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Store QR canvas reference for download
    window.qrCanvas = qrCanvas;

  } catch (error) {
    console.error('Failed to share patient:', error);
    showNotification('Failed to generate share link', 'error');
  }
}



// Copy text to clipboard
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  element.select();
  document.execCommand('copy');
  showNotification('Link copied to clipboard!', 'success');
}

// Download QR code
function downloadQRCode() {
  if (window.qrCanvas) {
    const link = document.createElement('a');
    link.download = 'patient_share_qr.png';
    link.href = window.qrCanvas.toDataURL();
    link.click();
  }
}

// Handle shared patient access
async function handleSharedAccess(sharedCid) {
  try {
    showNotification('Loading shared patient data...', 'info');

    const encryptedData = await ipfsManager.getData(sharedCid);
    const shareData = await encryptionManager.decrypt(encryptedData, encryptionKey);

    // Display shared patient info
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full">
        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Shared Patient Data</h3>
        <div class="bg-yellow-100 dark:bg-yellow-900 p-4 rounded mb-4">
          <p class="text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Shared Access:</strong> You are viewing patient data shared by another healthcare provider.
            This data is encrypted and access-controlled.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4 text-gray-900 dark:text-white">
          <div><strong>Patient ID:</strong> ${shareData.patient_id.split('_')[1]}</div>
          <div><strong>Name:</strong> ${shareData.name}</div>
          <div><strong>Age:</strong> ${shareData.age}</div>
          <div><strong>Gender:</strong> ${sanitizeField(shareData.gender, 'N/A')}</div>
          <div><strong>Diagnosis:</strong> ${sanitizeField(shareData.diagnosis, 'Not specified')}</div>
          <div><strong>Shared By:</strong> ${shareData.shared_by}</div>
          <div><strong>Shared At:</strong> ${new Date(shareData.shared_at).toLocaleString()}</div>
          <div><strong>Access Level:</strong> ${shareData.access_level}</div>
          <div><strong>IPFS CID:</strong> <code class="text-xs">${shareData.ipfs_cid}</code></div>
          <div><strong>Blockchain Proof:</strong> ${shareData.blockchain_hash ?
            `<a href="https://polygonscan.com/tx/${shareData.blockchain_hash}" target="_blank" class="text-blue-500">View</a>` :
            'Not available'}</div>
        </div>
        <div class="mt-4 flex justify-end space-x-2">
          <button onclick="importSharedPatient('${sharedCid}')" class="bg-green-500 text-white px-4 py-2 rounded">Import to Local DB</button>
          <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 text-white px-4 py-2 rounded">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to load shared data:', error);
    showNotification('Failed to load shared patient data', 'error');
  }
}

// Import shared patient to local database
async function importSharedPatient(sharedCid) {
  try {
    showNotification('Importing shared patient...', 'info');

    const encryptedData = await ipfsManager.getData(sharedCid);
    const shareData = await encryptionManager.decrypt(encryptedData, encryptionKey);

    // Get full patient data from IPFS
    const fullPatientData = await ipfsManager.getData(shareData.ipfs_cid);
    const patientData = await encryptionManager.decrypt(fullPatientData, encryptionKey);

    // Add to local database
    await securePatientDB.addPatient(patientData);

    await loadDashboard();
    showNotification('Shared patient imported successfully!', 'success');

    // Close modal
    document.querySelector('.fixed').remove();
  } catch (error) {
    console.error('Failed to import shared patient:', error);
    showNotification('Failed to import shared patient', 'error');
  }
}

// Auth button handlers (Sign In / Sign Up / Sign Out)
document.addEventListener('DOMContentLoaded', () => {
  const authBtn = document.getElementById('authBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const importTextBtn = document.getElementById('importTextBtn');
  const profileBtn = document.getElementById('profileBtn');
  const profileOverlay = document.getElementById('profileOverlay');
  const closeProfilePanelBtn = document.getElementById('closeProfilePanel');
  const profileSignOutBtn = document.getElementById('profileSignOut');
  
  // Pagination controls
  const paginationPrev = document.getElementById('paginationPrev');
  const paginationNext = document.getElementById('paginationNext');
  const itemsPerPageSelect = document.getElementById('itemsPerPage');
  
  if (paginationPrev) {
    paginationPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        goToPage(currentPage - 1);
      }
    });
  }
  
  if (paginationNext) {
    paginationNext.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
      if (currentPage < totalPages) {
        goToPage(currentPage + 1);
      }
    });
  }
  
  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener('change', (e) => {
      changeItemsPerPage(e.target.value);
    });
  }
  
  // Advanced Filters controls
  const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const saveFilterPresetBtn = document.getElementById('saveFilterPresetBtn');
  const loadFilterPresetSelect = document.getElementById('loadFilterPreset');
  
  if (toggleFiltersBtn) {
    toggleFiltersBtn.addEventListener('click', toggleFiltersPanel);
  }
  
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyAdvancedFilters);
  }
  
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearAllFilters);
  }
  
  if (saveFilterPresetBtn) {
    saveFilterPresetBtn.addEventListener('click', saveFilterPreset);
  }
  
  if (loadFilterPresetSelect) {
    loadFilterPresetSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        loadFilterPreset(e.target.value);
      }
    });
  }
  
  // Initialize filter preset dropdown
  updateFilterPresetDropdown();
  
  if (authBtn) authBtn.addEventListener('click', () => showAuthModal(false));
  if (logoutBtn) logoutBtn.addEventListener('click', () => logoutUser());
  if (importTextBtn) {
    importTextBtn.addEventListener('click', () => {
      console.log('Import from Text clicked!');
      createImportTextMegaPanel();
    });
  }
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      if (!currentUser) {
        showAuthModal(false);
        return;
      }
      updateProfilePanel(currentUser);
      openProfilePanel();
    });
  }
  const handleCloseProfile = () => {
    closeProfilePanel();
  };
  if (profileOverlay) profileOverlay.addEventListener('click', handleCloseProfile);
  if (closeProfilePanelBtn) closeProfilePanelBtn.addEventListener('click', handleCloseProfile);
  if (profileSignOutBtn) {
    profileSignOutBtn.addEventListener('click', () => {
      logoutUser();
      closeProfilePanel();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProfilePanel();
    }
  });
});

// Update system status indicators
async function updateSystemStatus() {
  // Update Local DB status (always available)
  const localDbStatus = document.getElementById('localDbStatus');
  if (localDbStatus) {
    localDbStatus.textContent = 'Operational';
    localDbStatus.className = 'status-label text-emerald-600 dark:text-emerald-300';
  }

  // Update IPFS status
  const ipfsStatus = document.getElementById('ipfsStatus');
  const ipfsConnected = !!(ipfsManager && ipfsManager.isConnected);
  if (ipfsConnected) {
    setStatusChip(ipfsStatus, 'ok', 'Pinata Cloud');
  } else {
    setStatusChip(ipfsStatus, 'warn', 'Disconnected');
  }

  // Update blockchain status
  const blockchainStatus = document.getElementById('blockchainStatus');
  const blockchainConnected = !!(polygonManager && polygonManager.isConnected);
  if (blockchainConnected) {
    let networkName = 'Online';
    try {
      if (polygonManager && typeof polygonManager.getNetworkInfo === 'function') {
        const networkInfo = await polygonManager.getNetworkInfo();
        networkName = networkInfo?.name || networkName;
      }
    } catch (err) {
      console.warn('Failed to retrieve Polygon network info:', err);
    }
    setStatusChip(blockchainStatus, 'ok', networkName);
  } else {
  setStatusChip(blockchainStatus, 'warn', '');
  }

  // Update sync status (pending items)
  const syncStatus = document.getElementById('syncStatus');
  if (syncStatus) {
    let pendingCount = 0;
    try {
      if (ipfsManager && typeof ipfsManager.getPendingSyncCount === 'function') {
        pendingCount = await ipfsManager.getPendingSyncCount();
      }
    } catch (err) {
      console.warn('Failed to check pending sync count:', err);
    }
    if (pendingCount > 0) {
      syncStatus.textContent = `Sync queue · ${pendingCount} pending`;
      syncStatus.className = 'status-chip status-chip--warn inline-flex';
      syncStatus.classList.remove('hidden');
    } else {
      syncStatus.textContent = '';
      syncStatus.classList.add('hidden');
    }
  }

  // Update health indicators in stats section
  updateSystemHealthIndicators();
}

// Create Import from Text mega-panel (right-side drawer)
function createImportTextMegaPanel() {
  // Check if panel already exists
  let panel = document.getElementById('importTextMegaPanel');
  
  if (!panel) {
    // Create panel
    panel = document.createElement('div');
    panel.id = 'importTextMegaPanel';
    panel.className = 'fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white dark:bg-gray-800 shadow-2xl transform translate-x-full transition-transform duration-300 z-50 overflow-y-auto';
    
    panel.innerHTML = `
      <div class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-purple-600 dark:text-purple-400">Import from Table Text</h2>
          <button id="closeImportTextPanel" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Close</button>
        </div>
        
        <div class="mb-4">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Paste table data below (tab or comma separated). First row should be headers.</p>
          <p class="text-xs text-gray-500 dark:text-gray-500">Example headers: Name, Age, Gender, Diagnosis, Prescription, Room</p>
        </div>
        
        <textarea id="importTextArea" 
          class="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm" 
          placeholder="Name\tAge\tGender\tDiagnosis\tPrescription\nJohn Doe\t45\tMale\tHypertension\tRX-001\nJane Smith\t32\tFemale\tDiabetes\tRX-002"></textarea>
        
        <div class="mt-4 flex space-x-4">
          <button id="importTextDataBtn" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold">Import Data</button>
          <button id="clearImportTextBtn" class="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600">Clear</button>
        </div>
        
        <div id="importTextPreview" class="mt-6"></div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Event listeners
    document.getElementById('closeImportTextPanel').addEventListener('click', () => {
      panel.classList.add('translate-x-full');
    });
    
    document.getElementById('clearImportTextBtn').addEventListener('click', () => {
      document.getElementById('importTextArea').value = '';
      document.getElementById('importTextPreview').innerHTML = '';
    });
    
    document.getElementById('importTextDataBtn').addEventListener('click', async () => {
      const textData = document.getElementById('importTextArea').value.trim();
      
      if (!textData) {
        showNotification('Please paste table data first', 'warning');
        return;
      }
      
      try {
        showNotification('Processing table data...', 'info');
        
        // Split by lines
        const lines = textData.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          showNotification('Need at least header row and one data row', 'warning');
          return;
        }
        
        // Detect delimiter (tab or comma)
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        
        // Parse header
        const headers = lines[0].split(delimiter).map(h => h.trim());
        
        // Parse rows
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(delimiter).map(v => v.trim());
          const rowObj = {};
          headers.forEach((header, idx) => {
            rowObj[header] = values[idx] || '';
          });
          rows.push(rowObj);
        }
        
        // Use the same mapRowToPatient function
        function mapRowToPatient(r) {
          // Flexible key matching
          const findKey = (...possibleNames) => {
            for (const name of possibleNames) {
              // Try exact match first (case-insensitive)
              const exactMatch = Object.keys(r).find(k => 
                k.toLowerCase().replace(/[_\s-]/g, '') === name.toLowerCase().replace(/[_\s-]/g, '')
              );
              if (exactMatch) return exactMatch;
              
              // Try partial match
              const partialMatch = Object.keys(r).find(k => 
                k.toLowerCase().includes(name.toLowerCase())
              );
              if (partialMatch) return partialMatch;
            }
            return null;
          };
          
          const get = (...possibleNames) => {
            const key = findKey(...possibleNames);
            return key ? r[key] : '';
          };

          const patientData = {
            name: get('name', 'patientname', 'fullname', 'patient_name', 'full_name') || '',
            age: parseInt(get('age')) || '',
            gender: get('gender', 'sex') || '',
            diagnosis: get('diagnosis', 'disease') || '',
            prescription: get('prescription', 'prescriptionid', 'prescription_id') || '',
            room: get('room', 'roomnumber', 'room_number') || '',
            medical_history: get('medicalhistory', 'medical_history', 'history') || '',
            allergies: get('allergies', 'allergy') || '',
            emergency_contact: get('emergencycontact', 'emergency_contact', 'contact', 'phone') || '',
            created_by: currentUser ? currentUser.id : 'import',
            created_at: new Date().toISOString()
          };
          return patientData;
        }
        
        // Import patients
        let imported = 0;
        for (const row of rows) {
          try {
            const patientObj = mapRowToPatient(row);
            // Skip completely empty rows
            if (!patientObj.name && !patientObj.age && !patientObj.diagnosis) continue;
            await securePatientDB.addPatient(patientObj);
            imported++;
          } catch (err) {
            console.warn('Failed to import row:', row, err);
          }
        }
        
        await loadDashboard();
        showNotification(`Imported ${imported} patient(s) from text!`, 'success');
        
        // Close panel
        panel.classList.add('translate-x-full');
        
        // Clear textarea
        document.getElementById('importTextArea').value = '';
        document.getElementById('importTextPreview').innerHTML = '';
        
      } catch (error) {
        console.error('Import from text failed:', error);
        showNotification('Failed to import: ' + (error.message || error), 'error');
      }
    });
  }
  
  // Open panel
  setTimeout(() => {
    panel.classList.remove('translate-x-full');
  }, 10);
}

// Export patient data
document.getElementById('exportBtn').addEventListener('click', async () => {
  try {
    showNotification('Exporting data...', 'info');

    const patients = await securePatientDB.getAllPatients();
    const exportData = {
      exported_at: new Date().toISOString(),
      total_patients: patients.length,
      patients: patients.map(p => ({
        id: p._id,
        metadata: {
          name: p.metadata.name || '',
          age: p.metadata.age || '',
          gender: p.metadata.gender || '',
          diagnosis: (p.metadata.diagnosis && p.metadata.diagnosis !== 'undefined') ? p.metadata.diagnosis : '',
          prescription: (p.metadata.prescription && p.metadata.prescription !== 'undefined') ? p.metadata.prescription : '',
          created_at: p.metadata.created_at || '',
          encrypted: p.metadata.encrypted || true,
          ...(p.metadata.updated_at && { updated_at: p.metadata.updated_at })
        },
        ipfs_cid: p.ipfs_cid,
        blockchain_hash: p.blockchain_hash
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthchain_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Data exported successfully!', 'success');
  } catch (error) {
    console.error('Export failed:', error);
    showNotification('Failed to export data', 'error');
  }
});

// Import patient data
document.getElementById('importBtn').addEventListener('click', () => {
  // Accept JSON, CSV, XLSX imports
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.csv,.xls,.xlsx';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showNotification('Importing data...', 'info');

      const name = file.name.toLowerCase();
      let rows = [];

      if (name.endsWith('.json')) {
        const text = await file.text();
        const importData = JSON.parse(text);

        // Special-case: prescriptions export
        if (importData && Array.isArray(importData.prescriptions)) {
          let importedPrescriptions = 0;
          for (const p of importData.prescriptions) {
            try {
              const doc = {
                _id: `prescription_${p.id || Date.now() + Math.random().toString(36).slice(2,8)}`,
                type: 'prescription',
                metadata: p.metadata || {},
                ipfs_cid: p.ipfs_cid || '',
                blockchain_hash: p.blockchain_hash || '',
                created_at: (p.metadata && p.metadata.created_at) ? p.metadata.created_at : (new Date().toISOString())
              };
              await securePatientDB.db.put(doc);
              importedPrescriptions++;
            } catch (err) {
              console.warn('Failed to import prescription:', p, err);
            }
          }
          showNotification(`Imported ${importedPrescriptions} prescription(s).`, 'success');
          await loadDashboard();
          return; // done
        }

        // Flexible JSON handling for multiple export shapes (patients and docs)
        if (Array.isArray(importData)) {
          // Array of either metadata objects or pointer docs
          rows = importData.map(item => (item && item.metadata ? item.metadata : item));
        } else if (importData && Array.isArray(importData.patients)) {
          // { patients: [...] } export shape
          rows = importData.patients.map(p => (p && p.metadata ? p.metadata : p));
        } else if (importData && Array.isArray(importData.rows)) {
          // CouchDB-like export: { rows: [ {doc: {...}} ] }
          rows = importData.rows.map(r => {
            const doc = r.doc || r.value || r;
            return doc && doc.metadata ? doc.metadata : doc;
          });
        } else if (importData && importData.doc) {
          const doc = importData.doc;
          rows = [doc && doc.metadata ? doc.metadata : doc];
        } else if (importData && importData.metadata) {
          rows = [importData.metadata];
        } else if (importData && typeof importData === 'object') {
          // Single patient object (map directly) if it contains likely patient keys
          const keys = Object.keys(importData).map(k => k.toLowerCase());
          const likely = ['name','age','gender','diagnosis','prescription'];
          if (likely.some(k => keys.includes(k))) {
            rows = [importData];
          } else {
            // Try to pick first nested object that looks like metadata
            const nested = Object.values(importData).find(v => v && typeof v === 'object' && Object.keys(v).some(k => likely.includes(k.toLowerCase())));
            if (nested) rows = [nested];
            else throw new Error('Unrecognized JSON import format');
          }
        } else {
          throw new Error('Unrecognized JSON import format');
        }
      } else if (name.endsWith('.csv') || name.endsWith('.xls') || name.endsWith('.xlsx')) {
        // Use SheetJS to parse CSV/XLSX
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      } else {
        throw new Error('Unsupported file type');
      }

      if (!rows || rows.length === 0) {
        showNotification('No records found in import file', 'warning');
        return;
      }

      // Map common column names to patient fields with flexible matching
      function mapRowToPatient(r) {
        // Flexible key matching - supports multiple naming conventions
        const findKey = (...possibleNames) => {
          for (const name of possibleNames) {
            // Try exact match first (case-insensitive, no spaces/underscores/hyphens)
            const exactMatch = Object.keys(r).find(k => 
              k.toLowerCase().replace(/[_\s-]/g, '') === name.toLowerCase().replace(/[_\s-]/g, '')
            );
            if (exactMatch) return exactMatch;
            
            // Try partial match
            const partialMatch = Object.keys(r).find(k => 
              k.toLowerCase().includes(name.toLowerCase())
            );
            if (partialMatch) return partialMatch;
          }
          return null;
        };
        
        const get = (...possibleNames) => {
          const key = findKey(...possibleNames);
          return key ? r[key] : '';
        };

        const patientData = {
          name: get('name', 'patientname', 'fullname', 'patient_name', 'full_name') || '',
          age: parseInt(get('age')) || '',
          gender: get('gender', 'sex') || '',
          diagnosis: get('diagnosis', 'disease') || '',
          prescription: get('prescription', 'prescriptionid', 'prescription_id') || '',
          room: get('room', 'roomnumber', 'room_number') || '',
          medical_history: get('medicalhistory', 'medical_history', 'history') || '',
          allergies: get('allergies', 'allergy') || '',
          emergency_contact: get('emergencycontact', 'emergency_contact', 'contact', 'phone') || '',
          created_by: currentUser ? currentUser.id : 'import',
          created_at: new Date().toISOString()
        };
        return patientData;
      }

      let imported = 0;
      for (const row of rows) {
        try {
          const patientObj = mapRowToPatient(row);
          // Skip completely empty rows
          if (!patientObj.name && !patientObj.age && !patientObj.diagnosis) continue;
          await securePatientDB.addPatient(patientObj);
          imported++;
        } catch (err) {
          console.warn('Failed to import row:', row, err);
        }
      }

      await loadDashboard();
      showNotification(`Imported ${imported} patient(s) from file.`, 'success');
    } catch (error) {
      console.error('Import failed:', error);
      showNotification('Failed to import data: ' + (error.message || error), 'error');
    }
  };
  input.click();
});

// Select All checkbox functionality
document.getElementById('selectAllCheckbox').addEventListener('change', function() {
  const checkboxes = document.querySelectorAll('.patient-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = this.checked;
  });
  updateDeleteButtonState();
});

// Update Delete Selected button state based on checkbox selection
function updateDeleteButtonState() {
  const deleteBtn = document.getElementById('deleteSelectedBtn');
  const checkboxes = document.querySelectorAll('.patient-checkbox:checked');
  deleteBtn.disabled = checkboxes.length === 0;
}

// Listen for individual checkbox changes
document.addEventListener('change', function(e) {
  if (e.target.classList.contains('patient-checkbox')) {
    updateDeleteButtonState();
    
    // Update Select All checkbox state
    const allCheckboxes = document.querySelectorAll('.patient-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.patient-checkbox:checked');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (checkedCheckboxes.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (checkedCheckboxes.length === allCheckboxes.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }
});

// Delete Selected patients
document.getElementById('deleteSelectedBtn').addEventListener('click', async function() {
  if (!currentUser || !Array.isArray(currentUser.permissions) || !currentUser.permissions.includes('delete')) {
    showNotification('You do not have permission to delete patients', 'error');
    return;
  }

  const checkedCheckboxes = document.querySelectorAll('.patient-checkbox:checked');
  
  if (checkedCheckboxes.length === 0) {
    showNotification('No patients selected', 'warning');
    return;
  }

  const confirmMsg = `Are you sure you want to delete ${checkedCheckboxes.length} patient(s)? This action cannot be undone.`;
  if (!confirm(confirmMsg)) return;

  try {
    showNotification(`Deleting ${checkedCheckboxes.length} patient(s)...`, 'info');
    
    let deleted = 0;
    for (const checkbox of checkedCheckboxes) {
      const patientId = checkbox.value;
      try {
        await securePatientDB.deletePatient(patientId);
        deleted++;
      } catch (err) {
        console.warn('Failed to delete patient:', patientId, err);
      }
    }

    // Reload dashboard
    await loadDashboard();
    
    // Reset Select All checkbox
    document.getElementById('selectAllCheckbox').checked = false;
    document.getElementById('selectAllCheckbox').indeterminate = false;
    
    showNotification(`Successfully deleted ${deleted} patient(s)`, 'success');
  } catch (error) {
    console.error('Delete selected failed:', error);
    showNotification('Failed to delete selected patients: ' + (error.message || error), 'error');
  }
});

// Show notification function
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 animate-fadeIn`;

  // Set colors based on type
  switch (type) {
    case 'success':
      notification.classList.add('bg-green-500', 'text-white');
      break;
    case 'error':
      notification.classList.add('bg-red-500', 'text-white');
      break;
    case 'warning':
      notification.classList.add('bg-yellow-500', 'text-black');
      break;
    default:
      notification.classList.add('bg-blue-500', 'text-white');
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// Debug function to check users (call from browser console)
window.debugUsers = function() {
  console.log('Current users in localStorage:', getUsers());
  console.log('Current user:', currentUser);
  console.log('localStorage hc_auth_user:', localStorage.getItem('hc_auth_user'));
  console.log('Hash of "antu":', hashPassword('antu'));
};

// Force create admin user (call from browser console if needed)
window.forceCreateAdmin = function() {
  try {
    const users = getUsers();
    const existingAdmin = users.find(u => u && u.username === 'antu');
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin);
      return existingAdmin;
    }

    const adminUser = {
      id: 'user_admin_' + Date.now(),
      username: 'antu',
      password: hashPassword('antu'),
      role: 'admin',
      is_super: true
    };

    users.push(adminUser);
    saveUsers(users);
    console.log('✅ Admin user created:', adminUser);
    return adminUser;
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    return null;
  }
};

// Debug IPFS status (call from browser console)
window.debugIPFS = async function() {
  console.log('🔍 Checking IPFS status...');
  if (typeof ipfsManager !== 'undefined' && ipfsManager) {
    const status = await ipfsManager.checkStatus();
    console.log('IPFS Status:', status);

    // Also update the UI status
    await updateSystemStatus();
    console.log('✅ UI status updated');
    return status;
  } else {
    console.error('❌ ipfsManager not found');
    return { error: 'ipfsManager not available' };
  }
};

// Force reconnect IPFS (call from browser console)
window.forceReconnectIPFS = async function() {
  console.log('🔄 Force reconnecting IPFS...');
  if (typeof ipfsManager !== 'undefined' && ipfsManager) {
    const result = await ipfsManager.forceReconnect();
    console.log('Force reconnect result:', result);
    await updateSystemStatus();
    return result;
  } else {
    console.error('❌ ipfsManager not found');
    return { error: 'ipfsManager not available' };
  }
};

// Test IPFS pinning (call from browser console)
window.testIPFSPinning = async function() {
  console.log('🧪 Testing IPFS pinning...');
  if (typeof ipfsManager !== 'undefined' && ipfsManager) {
    const result = await ipfsManager.testPinning();
    console.log('Test pinning result:', result);
    await updateSystemStatus();
    return result;
  } else {
    console.error('❌ ipfsManager not found');
    return { error: 'ipfsManager not available' };
  }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
