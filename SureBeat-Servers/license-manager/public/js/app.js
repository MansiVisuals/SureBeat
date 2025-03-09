const apiUrl = '/api/licenses';

document.addEventListener('DOMContentLoaded', () => {
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