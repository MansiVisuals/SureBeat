// filepath: /license-management-app/license-management-app/public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const licenseList = document.getElementById('license-list');
    const addLicenseForm = document.getElementById('add-license-form');
    const filterSelect = document.getElementById('filter-select');
    const resetLicenseButton = document.getElementById('reset-license-button');
    const expireLicenseButton = document.getElementById('expire-license-button');

    // Fetch and display licenses
    function fetchLicenses(filter = '') {
        fetch(`/api/licenses?filter=${filter}`)
            .then(response => response.json())
            .then(data => {
                licenseList.innerHTML = '';
                data.forEach(license => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `Email: ${license.email}, License Key: ${license.license_key}, Active: ${license.active}`;
                    licenseList.appendChild(listItem);
                });
            })
            .catch(error => console.error('Error fetching licenses:', error));
    }

    // Add a new license
    addLicenseForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const licenseKey = document.getElementById('license-key').value;

        fetch('/api/licenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, license_key: licenseKey }),
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            fetchLicenses(filterSelect.value);
            addLicenseForm.reset();
        })
        .catch(error => console.error('Error adding license:', error));
    });

    // Filter licenses
    filterSelect.addEventListener('change', () => {
        fetchLicenses(filterSelect.value);
    });

    // Reset a license
    resetLicenseButton.addEventListener('click', () => {
        const identifier = prompt('Enter email or license key to reset:');
        if (identifier) {
            fetch(`/api/licenses/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier }),
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                fetchLicenses(filterSelect.value);
            })
            .catch(error => console.error('Error resetting license:', error));
        }
    });

    // Expire a license
    expireLicenseButton.addEventListener('click', () => {
        const identifier = prompt('Enter email or license key to expire:');
        if (identifier) {
            fetch(`/api/licenses/expire`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier }),
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                fetchLicenses(filterSelect.value);
            })
            .catch(error => console.error('Error expiring license:', error));
        }
    });

    // Initial fetch of licenses
    fetchLicenses();
});