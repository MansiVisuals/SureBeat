const apiUrl = '/api/trials';

document.addEventListener('DOMContentLoaded', () => {
    loadTrials();
    document.getElementById('addTrialForm').addEventListener('submit', addTrial);
});

function loadTrials() {
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const trialTable = document.getElementById('trialTableBody');
            trialTable.innerHTML = '';
            data.forEach(trial => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${trial.id}</td>
                    <td>${trial.mac_uid}</td>
                    <td>${trial.start_date}</td>
                    <td>${getRemainingDays(trial.start_date)}</td>
                    <td><button onclick="removeTrial(${trial.id})">Remove</button></td>
                `;
                trialTable.appendChild(row);
            });
        })
        .catch(error => console.error('Error loading trials:', error));
}

function addTrial(event) {
    event.preventDefault();
    const macUid = document.getElementById('macUidInput').value;

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mac_uid: macUid }),
    })
    .then(response => {
        if (response.ok) {
            loadTrials();
            document.getElementById('addTrialForm').reset();
        } else {
            console.error('Error adding trial:', response.statusText);
        }
    })
    .catch(error => console.error('Error adding trial:', error));
}

function removeTrial(id) {
    fetch(`${apiUrl}/${id}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (response.ok) {
            loadTrials();
        } else {
            console.error('Error removing trial:', response.statusText);
        }
    })
    .catch(error => console.error('Error removing trial:', error));
}

function getRemainingDays(startDate) {
    const trialDuration = 7; 
    const start = new Date(startDate);
    const now = new Date();
    const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return Math.max(trialDuration - elapsed, 0);
}