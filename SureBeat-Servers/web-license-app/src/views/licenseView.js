import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LicenseView = () => {
    const [licenses, setLicenses] = useState([]);
    const [filter, setFilter] = useState('all');
    const [email, setEmail] = useState('');
    const [licenseKey, setLicenseKey] = useState('');

    useEffect(() => {
        fetchLicenses();
    }, [filter]);

    const fetchLicenses = async () => {
        const response = await axios.get(`/api/licenses?filter=${filter}`);
        setLicenses(response.data);
    };

    const handleAddLicense = async () => {
        if (email && licenseKey) {
            await axios.post('/api/licenses', { email, licenseKey });
            setEmail('');
            setLicenseKey('');
            fetchLicenses();
        }
    };

    const handleExpireLicense = async (id) => {
        await axios.delete(`/api/licenses/${id}`);
        fetchLicenses();
    };

    const handleResetLicense = async (id) => {
        await axios.put(`/api/licenses/reset/${id}`);
        fetchLicenses();
    };

    return (
        <div className="license-view">
            <h1>License Management</h1>
            <div className="filter">
                <label>Filter Licenses:</label>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="active">Activated</option>
                    <option value="inactive">Non-Activated</option>
                </select>
            </div>
            <div className="add-license">
                <h2>Add License</h2>
                <input
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Enter license key"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                />
                <button onClick={handleAddLicense}>Add License</button>
            </div>
            <div className="license-list">
                <h2>License List</h2>
                <ul>
                    {licenses.map((license) => (
                        <li key={license.id}>
                            <span>{license.email} - {license.licenseKey} - {license.active ? 'Activated' : 'Non-Activated'}</span>
                            <button onClick={() => handleExpireLicense(license.id)}>Expire</button>
                            <button onClick={() => handleResetLicense(license.id)}>Reset</button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default LicenseView;