// simple-app.js - Simplified HealthChain app for testing
console.log('🚀 Loading simplified HealthChain...');

// Global variables
let db = null;
let isInitialized = false;

// Initialize basic system
async function initBasicSystem() {
    try {
        console.log('Initializing basic system...');

        // Create database
        db = new PouchDB('healthchain_simple');
        console.log('✅ Database created');

        // Test database
        const testDoc = {
            _id: 'test_' + Date.now(),
            type: 'system_test',
            message: 'System initialized successfully',
            timestamp: new Date().toISOString()
        };

        await db.put(testDoc);
        console.log('✅ Database test successful');

        isInitialized = true;
        document.getElementById('systemStatus').textContent = 'Ready';
        document.getElementById('systemStatus').style.color = 'green';
        return true;
    } catch (error) {
        console.error('❌ Basic initialization failed:', error);
        return false;
    }
}

// Simple patient management
class SimplePatientDB {
    async addPatient(patientData) {
        if (!isInitialized) {
            throw new Error('System not initialized');
        }

        try {
            const doc = {
                _id: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...patientData,
                type: 'patient',
                created_at: new Date().toISOString()
            };

            const result = await db.put(doc);
            console.log('✅ Patient added:', result.id);
            return result;
        } catch (error) {
            console.error('❌ Failed to add patient:', error);
            throw error;
        }
    }

    async getAllPatients() {
        try {
            const result = await db.allDocs({
                include_docs: true
            });

            return result.rows
                .filter(row => row.doc.type === 'patient')
                .map(row => row.doc);
        } catch (error) {
            console.error('❌ Failed to get patients:', error);
            throw error;
        }
    }
}

// Global instance
const simplePatientDB = new SimplePatientDB();

// UI Functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function loadDashboard() {
    try {
        const patients = await simplePatientDB.getAllPatients();
        renderPatientList(patients);
        updateStats(patients);
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showNotification('Failed to load dashboard', 'error');
    }
}

function updateStats(patients) {
    const totalPatients = patients.length;
    const avgAge = totalPatients > 0 ?
        patients.reduce((sum, p) => sum + (p.age || 0), 0) / totalPatients : 0;

    document.getElementById('totalPatients').textContent = totalPatients;
    document.getElementById('avgAge').textContent = avgAge.toFixed(1);
}

function renderPatientList(patients) {
    const patientList = document.getElementById('patientList');
    patientList.innerHTML = '';

    patients.forEach(patient => {
        const row = document.createElement('tr');
        row.className = "border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700";

        row.innerHTML = `
            <td class="border px-4 py-2">${patient._id.split('_')[1]}</td>
            <td class="border px-4 py-2">${patient.name}</td>
            <td class="border px-4 py-2">${patient.age}</td>
            <td class="border px-4 py-2">${patient.gender || 'N/A'}</td>
            <td class="border px-4 py-2">${patient.diagnosis}</td>
            <td class="border px-4 py-2">${patient.prescription || 'N/A'}</td>
            <td class="border px-4 py-2">${new Date(patient.created_at).toLocaleDateString()}</td>
            <td class="border px-4 py-2">
                <button onclick="viewPatient('${patient._id}')" class="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600 mr-1">View</button>
                <button onclick="deletePatient('${patient._id}')" class="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">Delete</button>
            </td>
        `;

        patientList.appendChild(row);
    });
}

function viewPatient(patientId) {
    // Simple alert for now
    alert('View patient functionality - Patient ID: ' + patientId);
}

async function deletePatient(patientId) {
    if (!confirm('Are you sure you want to delete this patient?')) {
        return;
    }

    try {
        const doc = await db.get(patientId);
        await db.remove(doc);
        await loadDashboard();
        showNotification('Patient deleted successfully', 'success');
    } catch (error) {
        console.error('Failed to delete patient:', error);
        showNotification('Failed to delete patient', 'error');
    }
}

// Initialize app
async function initApp() {
    const success = await initBasicSystem();

    if (success) {
        console.log('✅ Simplified HealthChain initialized');
        showNotification('System initialized successfully!', 'success');
        await loadDashboard();
    } else {
        console.error('❌ Failed to initialize system');
        showNotification('Failed to initialize system', 'error');
    }
}

// Handle form submission
document.getElementById('patientForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isInitialized) {
        showNotification('System not initialized yet', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const patientData = {
        name: formData.get('name'),
        age: parseInt(formData.get('age')),
        gender: formData.get('gender'),
        diagnosis: formData.get('diagnosis'),
        prescription: formData.get('prescription') || '',
        room: formData.get('room') || '',
        medical_history: formData.get('medical_history') || '',
        allergies: formData.get('allergies') || '',
        emergency_contact: formData.get('emergency_contact') || ''
    };

    try {
        showNotification('Adding patient...', 'info');
        await simplePatientDB.addPatient(patientData);
        e.target.reset();
        await loadDashboard();
        showNotification('Patient added successfully!', 'success');
    } catch (error) {
        console.error('Failed to add patient:', error);
        showNotification('Failed to add patient: ' + error.message, 'error');
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);