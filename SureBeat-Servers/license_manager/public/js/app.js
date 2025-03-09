const apiUrl = '/api/licenses';
const apiBaseUrl = '/api';
let activeTab = 'licenses';

document.addEventListener('DOMContentLoaded', () => {
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

// Show error message
const showError = (message) => {
    // Create a toast notification or alert
    alert(message);
};

// Show success message
const showSuccess = (message) => {
    // Create a toast notification or alert
    alert(message);
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