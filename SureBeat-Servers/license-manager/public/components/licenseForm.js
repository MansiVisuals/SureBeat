import React, { useState } from 'react';

const LicenseForm = () => {
    const [email, setEmail] = useState('');
    const [licenseKey, setLicenseKey] = useState('');
    const [action, setAction] = useState('add'); // 'add' or 'reset'

    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await fetch(`/api/licenses/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, licenseKey }),
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            setEmail('');
            setLicenseKey('');
        } else {
            alert(data.error);
        }
    };

    return (
        <div className="license-form">
            <h2>{action === 'add' ? 'Add License' : 'Reset License'}</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                {action === 'add' && (
                    <div>
                        <label>License Key:</label>
                        <input
                            type="text"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            required
                        />
                    </div>
                )}
                <div>
                    <button type="submit">{action === 'add' ? 'Add License' : 'Reset License'}</button>
                </div>
                <div>
                    <button type="button" onClick={() => setAction(action === 'add' ? 'reset' : 'add')}>
                        Switch to {action === 'add' ? 'Reset License' : 'Add License'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LicenseForm;