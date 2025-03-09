import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TrialTable = () => {
    const [trials, setTrials] = useState([]);

    useEffect(() => {
        fetchTrials();
    }, []);

    const fetchTrials = async () => {
        try {
            const response = await axios.get('/api/trials');
            setTrials(response.data);
        } catch (error) {
            console.error('Error fetching trials:', error);
        }
    };

    const removeTrial = async (macUid) => {
        try {
            await axios.delete(`/api/trials/${macUid}`);
            fetchTrials(); // Refresh the trial list after deletion
        } catch (error) {
            console.error('Error removing trial:', error);
        }
    };

    return (
        <div>
            <h2>Trial Licenses</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>MAC UID</th>
                        <th>Start Date</th>
                        <th>Remaining Days</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {trials.map((trial) => (
                        <tr key={trial.id}>
                            <td>{trial.id}</td>
                            <td>{trial.mac_uid}</td>
                            <td>{trial.start_date}</td>
                            <td>{trial.remaining_days}</td>
                            <td>
                                <button onClick={() => removeTrial(trial.mac_uid)}>Remove</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TrialTable;