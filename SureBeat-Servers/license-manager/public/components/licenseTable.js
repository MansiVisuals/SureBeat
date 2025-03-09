import React, { useEffect, useState } from 'react';
import axios from 'axios';

const LicenseTable = () => {
    const [licenses, setLicenses] = useState([]);

    useEffect(() => {
        fetchLicenses();
    }, []);

    const fetchLicenses = async () => {
        try {
            const response = await axios.get('/api/licenses');
            setLicenses(response.data);
        } catch (error) {
            console.error('Error fetching licenses:', error);
        }
    };

    const removeLicense = async (licenseKey) => {
        try {
            await axios.delete(`/api/licenses/${licenseKey}`);
            fetchLicenses();
        } catch (error) {
            console.error('Error removing license:', error);
        }
    };

    const expireLicense = async (licenseKey) => {
        try {
            await axios.patch(`/api/licenses/${licenseKey}/expire`);
            fetchLicenses();
        } catch (error) {
            console.error('Error expiring license:', error);
        }
    };

    return (
        <div>
            <h2>License List</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>License Key</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {licenses.map((license) => (
                        <tr key={license.id}>
                            <td>{license.id}</td>
                            <td>{license.email}</td>
                            <td>{license.license_key}</td>
                            <td>
                                <button onClick={() => removeLicense(license.license_key)}>Remove</button>
                                <button onClick={() => expireLicense(license.license_key)}>Expire</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default LicenseTable;