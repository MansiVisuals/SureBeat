// Licenses management

// DOM Elements
let licenseTableBody;
let licenseSearch;
let clearLicenseSearch;
let licenseTableEmpty;
let addLicenseForm;
let generateLicenseForm;
let addLicenseSubmitBtn;
let generateLicenseSubmitBtn;
let generateKeyBtn;

// License data
let licenses = [];
let filteredLicenses = [];
let currentFilter = 'all';

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    licenseTableBody = document.getElementById('licenseTableBody');
    licenseSearch = document.getElementById('licenseSearch');
    clearLicenseSearch = document.getElementById('clearLicenseSearch');
    licenseTableEmpty = document.getElementById('licenseTableEmpty');
    addLicenseForm = document.getElementById('addLicenseForm');
    generateLicenseForm = document.getElementById('generateLicenseForm');
    addLicenseSubmitBtn = document.getElementById('addLicenseSubmitBtn');
    generateLicenseSubmitBtn = document.getElementById('generateLicenseSubmitBtn');
    generateKeyBtn = document.getElementById('generateKeyBtn');
    
    // Set up event listeners
    setupLicenseEventListeners();
    
    // Load licenses
    loadLicenses();
});

// Setup event listeners for license management
const setupLicenseEventListeners = () => {
    // Search functionality
    if (licenseSearch) {
        licenseSearch.addEventListener('input', filterLicenses);
    }
    
    if (clearLicenseSearch) {
        clearLicenseSearch.addEventListener('click', () => {
            licenseSearch.value = '';
            filterLicenses();
        });
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            filterLicenses();
        });
    });
    
    // Add license form
    if (addLicenseSubmitBtn) {
        addLicenseSubmitBtn.addEventListener('click', addLicenseManually);
    }
    
    // Generate license form
    if (generateLicenseSubmitBtn) {
        generateLicenseSubmitBtn.addEventListener('click', generateAndAddLicense);
    }
    
    // Generate random license key button
    if (generateKeyBtn) {
        generateKeyBtn.addEventListener('click', () => {
            document.getElementById('addLicenseKey').value = generateRandomLicenseKey();
        });
    }
};

// Load all licenses
const loadLicenses = async () => {
    try {
        showLoading(true);
        licenseTableEmpty.classList.add('d-none');
        
        const response = await fetch('/api/licenses');
        if (!response.ok) {
            throw new Error('Failed to fetch licenses');
        }
        
        const data = await response.json();
        licenses = data.licenses || [];
        
        filterLicenses();
    } catch (error) {
        console.error('Error loading licenses:', error);
        showError('Failed to load licenses');
        licenses = [];
        renderLicenses();
    } finally {
        showLoading(false);
    }
};

// Filter licenses based on search and filter criteria
const filterLicenses = () => {
    const searchTerm = (licenseSearch?.value || '').toLowerCase();
    
    filteredLicenses = licenses.filter(license => {
        // Apply search filter
        const matchesSearch = 
            !searchTerm || 
            (license.email && license.email.toLowerCase().includes(searchTerm)) ||
            (license.license_key && license.license_key.toLowerCase().includes(searchTerm));
        
        // Apply status filter
        let matchesFilter = true;
        if (currentFilter === 'active') {
            matchesFilter = !!license.mac_uid;
        } else if (currentFilter === 'inactive') {
            matchesFilter = !license.mac_uid;
        }
        
        return matchesSearch && matchesFilter;
    });
    
    renderLicenses();
};

// Render licenses to table
const renderLicenses = () => {
    if (!licenseTableBody) return;
    
    if (filteredLicenses.length === 0) {
        licenseTableBody.innerHTML = '';
        licenseTableEmpty.classList.remove('d-none');
        return;
    }
    
    licenseTableEmpty.classList.add('d-none');
    
    licenseTableBody.innerHTML = filteredLicenses.map(license => `
        <tr>
            <td>${license.id || ''}</td>
            <td>${license.email || ''}</td>
            <td class="text-truncate">${license.license_key || ''}</td>
            <td>${formatDate(license.issue_date)}</td>
            <td>${license.mac_uid || 'Not activated'}</td>
            <td>${getLicenseStatus(license)}</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-primary" onclick="viewLicense(${license.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="resetLicense(${license.id})">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="removeLicense(${license.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

// Add license manually
const addLicenseManually = async () => {
    try {
        const email = document.getElementById('addEmail').value;
        const licenseKey = document.getElementById('addLicenseKey').value;
        
        if (!email || !licenseKey) {
            showError('Email and license key are required');
            return;
        }
        
        const response = await fetch('/api/licenses/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, licenseKey })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('License added successfully');
            document.getElementById('addLicenseForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('addLicenseModal')).hide();
            loadLicenses();
        } else {
            showError(data.message || 'Failed to add license');
        }
    } catch (error) {
        console.error('Error adding license:', error);
        showError('Failed to add license');
    }
};

// Generate and add a license
const generateAndAddLicense = async () => {
    try {
        const email = document.getElementById('generateEmail').value;
        
        if (!email) {
            showError('Email is required');
            return;
        }
        
        const response = await fetch('/api/licenses/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(`License generated successfully: ${data.licenseKey}`);
            document.getElementById('generateLicenseForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('generateLicenseModal')).hide();
            loadLicenses();
        } else {
            showError(data.message || 'Failed to generate license');
        }
    } catch (error) {
        console.error('Error generating license:', error);
        showError('Failed to generate license');
    }
};