// src/components/ElectionSelector.js
import React from 'react';

function ElectionSelector({ elections, selectedElectionId, onSelectElection }) {
    if (!elections || elections.length === 0) {
        return null; // Don't render if no elections are available
    }

    const handleSelectChange = (event) => {
        onSelectElection(Number(event.target.value));
    };

    return (
        <div className="mb-8 p-4 bg-gray-800 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between">
            <label htmlFor="election-select" className="text-gray-300 font-semibold mb-2 sm:mb-0 sm:mr-4">
                Select Election:
            </label>
            <select
                id="election-select"
                value={selectedElectionId}
                onChange={handleSelectChange}
                className="w-full sm:w-auto p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            >
                {elections.map((election) => (
                    <option key={election.id} value={election.id}>
                        {election.name} (ID: {election.id}) - {election.isActive ? 'Active' : election.isCompleted ? 'Completed' : 'Scheduled'}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default ElectionSelector;