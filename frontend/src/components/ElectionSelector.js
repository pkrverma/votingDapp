import React from 'react';

function ElectionSelector({ elections, selectedElectionId, onSelectElection }) {
  // Ensure elections array is not empty before rendering the selector
  if (!elections || elections.length === 0) {
    return null; // Or a placeholder message like "No elections available"
  }

  return (
    <div className="mb-8 p-4 sm:p-5 bg-gray-800 rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
      <label htmlFor="election-select" className="text-lg sm:text-xl font-semibold text-white">
        Select an Election:
      </label>
      <select
        id="election-select"
        value={selectedElectionId}
        onChange={(e) => onSelectElection(Number(e.target.value))}
        className="w-full sm:w-auto p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-white text-sm sm:text-base"
      >
        <option value={0} disabled>Choose an election to view</option>
        {elections.map(election => (
          <option key={election.id} value={election.id}>
            ID {election.id}: {election.name} ({election.isActive ? 'Active' : election.isCompleted ? 'Completed' : 'Scheduled'})
          </option>
        ))}
      </select>
    </div>
  );
}

export default ElectionSelector;