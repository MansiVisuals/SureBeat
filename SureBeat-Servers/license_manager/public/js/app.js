const apiUrl = '/api/licenses';
const apiBaseUrl = '/api';
let activeTab = 'licenses';
const accentColor = '#DEC091'; // MansiVisuals color
const FIXED_DATABASE_PATH = '/home/lsadmin/license_server/database.db'; // Fixed database path

// Add custom fonts and styling
document.addEventListener('DOMContentLoaded', () => {
    // Add Google Fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&family=Josefin+Sans:wght@300;400;600&display=swap';
    document.head.appendChild(fontLink);
    
    // Add custom CSS
    const customStyles = document.createElement('style');
    customStyles.textContent = `
        h1, h2, h3, h4, h5, h6, .nav-link, .sidebar-heading, .btn, .modal-title {
            font-family: 'Ubuntu', sans-serif !important;
            font-weight: 500;
        }
        
        body, p, div, table, input, .form-control, .card-text, span {
            font-family: 'Josefin Sans', sans-serif !important;
        }
        
        .btn-primary, .nav-pills .nav-link.active, .sidebar .active, 
        .badge-success, .modal-header {
            background-color: ${accentColor} !important;
            border-color: ${accentColor} !important;
            color: #333 !important;
        }
        
        .btn-primary:hover {
            background-color: #c9a976 !important;
            border-color: #c9a976 !important;
        }
        
        a, .text-primary, .sidebar-item:hover {
            color: ${accentColor} !important;
        }
        
        .badge {
            font-family: 'Josefin Sans', sans-serif !important;
            font-weight: 400;
        }
        
        .badge-success {
            background-color: ${accentColor} !important;
        }
        
        .form-control:focus {
            border-color: ${accentColor} !important;
            box-shadow: 0 0 0 0.2rem rgba(222, 192, 145, 0.25) !important;
        }
        
        .database-section {
            background: #f8f4ee;
            border-left: 4px solid ${accentColor};
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        .database-section h3 {
            color: #333;
            margin-bottom: 15px;
        }
        
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        }
        
        .toast {
            background: white;
            border-left: 4px solid ${accentColor};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin-bottom: 10px;
            width: 300px;
        }
    `;
    document.head.appendChild(customStyles);
    
    // DOM elements
    const loginContainer = document.getElementById('loginContainer');
    const appContent = document.getElementById('appContent');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const usernameDisplay = document.getElementById('username');
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarItems = document.querySelectorAll('.sidebar li');
    const contentTabs = document.querySelectorAll('.content-tab');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');

    // Initialize Bootstrap tabs
    const tabEls = document.querySelectorAll('a[data-bs-toggle="tab"]')
    tabEls.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', event => {
            activeTab = event.target.getAttribute('href').substring(1);
            
            // Load content based on active tab
            if (activeTab === 'licenses') {
                loadLicenses();
            } else if (activeTab === 'trials') {
                loadTrials();
            }
        });
    });

    // Check authentication status
    function checkAuth() {
        const token = localStorage.getItem('token');
        
        if (token) {
            // Show app content, hide login
            loginContainer.classList.add('hidden');
            appContent.classList.remove('hidden');
            
            // Display username
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.username) {
                usernameDisplay.textContent = user.username;
            } else {
                usernameDisplay.textContent = 'Admin';
            }
            
            // Initialize app data (load licenses, trials, etc.)
            initializeAppData();
        } else {
            // Show login, hide app content
            loginContainer.classList.remove('hidden');
            appContent.classList.add('hidden');
        }
    }

    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: usernameInput.value,
                    password: passwordInput.value,
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Store token and user info
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({ username: usernameInput.value }));
                
                // Reset form
                loginForm.reset();
                loginError.textContent = '';
                
                // Check auth status (will show app content)
                checkAuth();
            } else {
                loginError.textContent = data.message || 'Invalid credentials';
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'An error occurred. Please try again.';
        }
    });

    // Handle logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        checkAuth();
    });

    checkAuth();
    loadLicenses();
    document.getElementById('addLicenseForm').addEventListener('submit', addLicense);
    document.getElementById('removeLicenseForm').addEventListener('submit', removeLicense);

    // UI Event Listeners for Common Controls
    setupCommonEventListeners();

    // Load initial data
    loadLicenses();
});

function loadLicenses() {
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const licenseTable = document.getElementById('licenseTableBody');
            licenseTable.innerHTML = '';
            data.forEach(license => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${license.id}</td>
                    <td>${license.email}</td>
                    <td>${license.license_key}</td>
                    <td>${license.mac_uid || 'None'}</td>
                    <td><button onclick="expireLicense(${license.id})">Expire</button></td>
                `;
                licenseTable.appendChild(row);
            });
        })
        .catch(error => console.error('Error loading licenses:', error));
}

function addLicense(event) {
    event.preventDefault();
    const email = document.getElementById('addEmail').value;
    const licenseKey = document.getElementById('addLicenseKey').value;

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, license_key: licenseKey }),
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadLicenses();
        document.getElementById('addLicenseForm').reset();
    })
    .catch(error => console.error('Error adding license:', error));
}

function removeLicense(event) {
    event.preventDefault();
    const identifier = document.getElementById('removeIdentifier').value;

    fetch(`${apiUrl}/${identifier}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadLicenses();
        document.getElementById('removeLicenseForm').reset();
    })
    .catch(error => console.error('Error removing license:', error));
}

function expireLicense(id) {
    fetch(`${apiUrl}/${id}/expire`, {
        method: 'PATCH',
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadLicenses();
    })
    .catch(error => console.error('Error expiring license:', error));
}

// Format date helper
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Show loading state
const showLoading = (isLoading) => {
    const loadingEl = document.getElementById(activeTab + 'TableLoading');
    if (loadingEl) {
        loadingEl.classList.toggle('d-none', !isLoading);
    }
};

// Show toast notification
const showToast = (title, message, type = 'info') => {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <strong>${title}</strong>
            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
};

// Show error message
const showError = (message) => {
    showToast('Error', message, 'error');
};

// Show success message
const showSuccess = (message) => {
    showToast('Success', message, 'success');
};

// Copy text to clipboard
const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
        .then(() => {
            showSuccess('Copied to clipboard');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
        });
};

// Set up common event listeners
const setupCommonEventListeners = () => {
    // Backup database
    const backupDbBtn = document.getElementById('backupDatabase');
    if (backupDbBtn) {
        backupDbBtn.addEventListener('click', () => {
            fetch(`${apiBaseUrl}/settings/backup`, {
                method: 'POST'
            })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `license-db-backup-${new Date().toISOString().slice(0, 10)}.db`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                showSuccess('Database backup downloaded successfully');
            })
            .catch(error => {
                console.error('Error backing up database:', error);
                showError('Failed to backup database');
            });
        });
    }

    // Restore database
    const restoreDbBtn = document.getElementById('restoreDatabase');
    if (restoreDbBtn) {
        restoreDbBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.db';
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('database', file);
                
                fetch(`${apiBaseUrl}/settings/restore`, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showSuccess('Database restored successfully');
                        // Reload data
                        loadLicenses();
                        loadTrials();
                    } else {
                        showError(data.message || 'Failed to restore database');
                    }
                })
                .catch(error => {
                    console.error('Error restoring database:', error);
                    showError('Failed to restore database');
                });
            };
            input.click();
        });
    }

    // Load External Database
    const loadExternalDbBtn = document.getElementById('loadExternalDatabase');
    if (loadExternalDbBtn) {
        loadExternalDbBtn.addEventListener('click', loadExternalDatabase);
    }
};

// Generate a random license key
const generateRandomLicenseKey = () => {
    const parts = [];
    for (let i = 0; i < 5; i++) {
        let part = '';
        for (let j = 0; j < 5; j++) {
            part += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)];
        }
        parts.push(part);
    }
    return parts.join('-');
};

// Helper for license status display
const getLicenseStatus = (license) => {
    if (!license.mac_uid) {
        return '<span class="badge badge-pending">Not activated</span>';
    }
    return '<span class="badge badge-success">Active</span>';
};

// Load database from fixed path
function loadExternalDatabase() {
    showLoading(true);
    fetch(`${apiBaseUrl}/settings/load-external-db`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` // Add token for authentication
        },
        body: JSON.stringify({ path: FIXED_DATABASE_PATH }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        showLoading(false);
        if (data.success) {
            showToast('Success', 'Database loaded successfully from license server', 'success');
            // Reload data
            loadLicenses();
            if (activeTab === 'trials') {
                loadTrials();
            }
        } else {
            showToast('Error', data.message || 'Failed to load database from license server', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error loading external database:', error);
        showToast('Error', 'Failed to load database from license server', 'error');
    });
}

// This should be moved to your server-side code
app.post('/api/settings/load-external-db', authenticateToken, async (req, res) => {
    try {
        const { path } = req.body;
        
        // Make sure it's our fixed path
        if (!path || path !== FIXED_DATABASE_PATH) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid database path. Only the license server database is allowed.' 
            });
        }
        
        // Check if the database exists
        try {
            // Use a filesystem check appropriate to your server environment
            // For example in Node.js:
            // const fs = require('fs');
            // if (!fs.existsSync(path)) {
            //     throw new Error('Database file does not exist at the specified path');
            // }
            
            // Implement your database loading logic here
            // const db = new Database(path);
            
            // Return success response
            res.json({ 
                success: true, 
                message: 'License server database loaded successfully' 
            });
        } catch (fsError) {
            console.error('Database file access error:', fsError);
            res.status(404).json({ 
                success: false, 
                message: 'Cannot access license server database file. Please check permissions.'
            });
        }
    } catch (error) {
        console.error('Error loading external database:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error loading database'
        });
    }
});

<div class="database-section">
    <h3>License Server Database</h3>
    <p>Load license data from the official license server at <code>/home/lsadmin/license_server/database.db</code></p>
    <button id="loadExternalDatabase" class="btn btn-primary">
        <i class="fas fa-database"></i> Load License Server Database
    </button>
    <div id="databaseLoadingIndicator" class="d-none mt-2">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <span class="ms-2">Loading database...</span>
    </div>
</div>