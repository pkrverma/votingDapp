import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ElectionAdminPanel from './ElectionAdminPanel'; // Import the new component

function AdminDashboard({
  contract,
  isLoading,
  showMessage,
  account,
  allElections,          // Passed from App.js
  selectedElectionId,    // Passed from App.js
  currentElectionDetails, // Passed from App.js
  refreshAllElections,   // Passed from App.js
  refreshSelectedElection, // Passed from App.js
  setSelectedElectionId  // Passed from App.js
}) {
  const [deployerAddress, setDeployerAddress] = useState('');

  // States for scheduling new elections (only deployer can do this)
  const [scheduledElectionName, setScheduledElectionName] = useState('');
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');

  // Fetch the contract deployer's address when the contract object changes
  useEffect(() => {
    const getDeployerAddress = async () => {
      if (contract) {
        try {
          const address = await contract.deployer();
          setDeployerAddress(address);
        } catch (error) {
          console.error("Error fetching deployer address:", error);
          showMessage("Could not fetch contract deployer address.", "error");
        }
      }
    };
    getDeployerAddress();
  }, [contract, showMessage]);

  // Helper to format Unix timestamps
  const formatTimestamp = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'N/A';
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  // --- New Election Scheduling Function (only callable by the contract deployer) ---
  const handleCreateElection = async (e) => {
    e.preventDefault();
    if (!contract || !scheduledElectionName.trim() || !scheduledStartTime || !scheduledEndTime) {
      showMessage('Please fill in all details to schedule a new election.', 'error');
      return;
    }

    const startTimestamp = Math.floor(new Date(scheduledStartTime).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(scheduledEndTime).getTime() / 1000);

    if (startTimestamp >= endTimestamp) {
      showMessage('Error: End time must be after start time.', 'error');
      return;
    }
    if (startTimestamp < Math.floor(Date.now() / 1000)) {
      showMessage('Error: Start time cannot be in the past.', 'error');
      return;
    }

    try {
      const tx = await contract.createElection(scheduledElectionName, startTimestamp, endTimestamp);
      await tx.wait();
      showMessage(`Election "${scheduledElectionName}" scheduled successfully on-chain!`, 'success');
      setScheduledElectionName('');
      setScheduledStartTime('');
      setScheduledEndTime('');
      refreshAllElections(); // Refresh the full list of elections
    } catch (error) {
      console.error("Error scheduling election:", error);
      showMessage(`Error scheduling election: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };


  return (
    <div className="admin-dashboard p-6 bg-gray-800 rounded-xl shadow-2xl mb-8">
      <h2 className="text-3xl font-bold mb-4 text-sky-400 border-b border-gray-700 pb-2">Admin Dashboard</h2>
      <p className="text-gray-400 mb-6">Welcome, Administrator! Here you can manage all elections.</p>

      {/* Display Contract Deployer Address and Current Connected Account */}
      {deployerAddress && (
        <p className="text-md text-gray-300 mb-4">
          Contract Deployer: <span className="font-mono break-all text-sm text-yellow-300">{deployerAddress}</span>
        </p>
      )}
      <p className="text-md text-gray-300 mb-6">
        Your Connected Account: <span className="font-mono break-all text-sm text-yellow-300">{account}</span>
      </p>

      {/* Render ElectionAdminPanel for the selected election */}
      <ElectionAdminPanel
        contract={contract}
        isLoading={isLoading}
        showMessage={showMessage}
        account={account}
        selectedElectionId={selectedElectionId}
        currentElectionDetails={currentElectionDetails}
        refreshSelectedElection={refreshSelectedElection}
        refreshAllElections={refreshAllElections} // Pass down for start/end actions to update overall list
      />

      {/* Section for Creating NEW Elections (only visible to the contract deployer) */}
      {account && deployerAddress && account.toLowerCase() === deployerAddress.toLowerCase() && (
        <div className="bg-gray-700 p-5 rounded-lg shadow-md mb-8">
          <h3 className="text-xl font-semibold mb-3 text-white border-b border-gray-600 pb-2">Schedule New Election (Contract Deployer Only)</h3>
          <form onSubmit={handleCreateElection} className="space-y-4">
            <div>
              <label htmlFor="newElectionName" className="block text-gray-300 text-sm font-bold mb-2">
                Election Name:
              </label>
              <input
                type="text"
                id="newElectionName"
                value={scheduledElectionName}
                onChange={(e) => setScheduledElectionName(e.target.value)}
                placeholder="e.g., 2025 Community Council Election"
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-white"
                required
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-gray-300 text-sm font-bold mb-2">
                Start Time:
              </label>
              <input
                type="datetime-local"
                id="startTime"
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-white"
                required
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-gray-300 text-sm font-bold mb-2">
                End Time:
              </label>
              <input
                type="datetime-local"
                id="endTime"
                value={scheduledEndTime}
                onChange={(e) => setScheduledEndTime(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-white"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-sky-600 hover:bg-sky-700 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create New Election
            </button>
          </form>
        </div>
      )}

      {/* Section to list ALL Elections On-Chain (summary view for super admin) */}
      <div className="bg-gray-700 p-5 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-3 text-white border-b border-gray-600 pb-2">All Elections On-Chain</h3>
        {allElections.length === 0 ? (
          <p className="text-gray-400">No elections have been created yet. The contract deployer can create one above!</p>
        ) : (
          <ul className="space-y-3">
            {allElections.map((election) => (
              <li key={election.id}
                className={`p-3 rounded-lg shadow-sm ${election.id === selectedElectionId ? 'bg-sky-800 border-2 border-sky-400' : 'bg-gray-800'}`}>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold text-white">
                    {election.name} (ID: {election.id})
                  </p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium
                                    ${election.isActive ? 'bg-green-600 text-white' :
                      election.isCompleted ? 'bg-red-600 text-white' :
                        'bg-yellow-600 text-white'}`}>
                    {election.isActive ? 'Active' : election.isCompleted ? 'Completed' : 'Scheduled'}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">Admin: <span className="font-mono break-all">{election.admin}</span></p>
                <p className="text-gray-400 text-sm">Candidates: {election.candidatesCount} | Total Votes: {election.totalVotesCast}</p>
                <p className="text-gray-400 text-sm">Starts: {formatTimestamp(election.startTime)}</p>
                <p className="text-gray-400 text-sm">Ends: {formatTimestamp(election.endTime)}</p>

                {/* Button to quickly select this election for management in the ElectionAdminPanel */}
                {election.id !== selectedElectionId && (
                  <button
                    onClick={() => setSelectedElectionId(election.id)}
                    className="px-4 py-2 mt-3 text-sm bg-blue-500 hover:bg-blue-600 rounded-lg text-white"
                  >
                    Manage This Election
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;