const apiUrl = '/api/licenses';

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