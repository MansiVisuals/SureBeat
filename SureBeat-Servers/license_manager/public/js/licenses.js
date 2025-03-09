const apiUrl = '/api/licenses';

// Function to add a license
function addLicense(event) {
    event.preventDefault();
    const email = document.getElementById('licenseEmail').value;
    const licenseKey = document.getElementById('licenseKey').value;

    fetch(apiUrl + '/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, licenseKey }),
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            document.getElementById('licenseForm').reset();
            loadLicenses();
        }
    })
    .catch(error => console.error('Error adding license:', error));
}

// Function to remove a license
function removeLicense(licenseKey) {
    fetch(apiUrl + '/remove', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ licenseKey }),
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            loadLicenses();
        }
    })
    .catch(error => console.error('Error removing license:', error));
}

// Function to expire a license
function expireLicense(licenseKey) {
    fetch(apiUrl + '/expire', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ licenseKey }),
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            loadLicenses();
        }
    })
    .catch(error => console.error('Error expiring license:', error));
}

// Function to load licenses and display them in the UI
function loadLicenses() {
    fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        const licenseTable = document.getElementById('licenseTableBody');
        licenseTable.innerHTML = '';
        data.licenses.forEach(license => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${license.email}</td>
                <td>${license.licenseKey}</td>
                <td>
                    <button onclick="removeLicense('${license.licenseKey}')">Remove</button>
                    <button onclick="expireLicense('${license.licenseKey}')">Expire</button>
                </td>
            `;
            licenseTable.appendChild(row);
        });
    })
    .catch(error => console.error('Error loading licenses:', error));
}

// Event listener for the license form submission
document.getElementById('licenseForm').addEventListener('submit', addLicense);

// Load licenses on page load
document.addEventListener('DOMContentLoaded', loadLicenses);