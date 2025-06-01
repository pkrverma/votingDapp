import React, { useState } from 'react';
import { ethers } from 'ethers';

// Helper for formatting Unix timestamps
const formatTimestamp = (timestamp) => {
  if (!timestamp || timestamp === 0) return 'N/A';
  const date = new Date(Number(timestamp) * 1000); // Convert to milliseconds
  return date.toLocaleString(); // Format as local date and time
};

function AdminDashboard({
  contract,
  isLoading,
  showMessage,
  account,
  allElections,
  selectedElectionId,
  currentElectionDetails,
  refreshAllElections,
  refreshSelectedElection,
  setSelectedElectionId // Added for potential direct selection
}) {
  // State for new election creation
  const [newElectionName, setNewElectionName] = useState('');
  const [newElectionStartTime, setNewElectionStartTime] = useState('');
  const [newElectionEndTime, setNewElectionEndTime] = useState('');

  // State for voter management
  const [voterAddress, setVoterAddress] = useState('');
  const [authorizeVoterAmount, setAuthorizeVoterAmount] = useState(''); // Could be used for token-gated auth

  // State for candidate management
  const [candidateName, setCandidateName] = useState('');

  // --- Admin Functions ---

  const handleCreateElection = async () => {
    if (!contract || isLoading) return;

    const startTime = new Date(newElectionStartTime).getTime() / 1000;
    const endTime = new Date(newElectionEndTime).getTime() / 1000;

    if (!newElectionName || !startTime || !endTime || startTime >= endTime) {
      showMessage('Please provide a valid name, start, and end time. End time must be after start time.', 'error');
      return;
    }

    if (isNaN(startTime) || isNaN(endTime)) {
        showMessage('Invalid date/time format. Please use a valid date and time.', 'error');
        return;
    }

    if (new Date().getTime() / 1000 > endTime) {
        showMessage('End time cannot be in the past.', 'error');
        return;
    }


    try {
      // Check if wallet is connected to the right chain
      const network = await contract.runner.provider.getNetwork();
      console.log("Connected to network:", network.name, network.chainId);

      showMessage('Creating election...', 'info');
      const tx = await contract.createElection(newElectionName, Math.floor(startTime), Math.floor(endTime));
      await tx.wait();
      showMessage(`Election "${newElectionName}" created successfully!`, 'success');
      setNewElectionName('');
      setNewElectionStartTime('');
      setNewElectionEndTime('');
      refreshAllElections(); // Refresh the list of all elections
    } catch (error) {
      console.error("Error creating election:", error);
      showMessage(`Error creating election: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };

  const handleAddCandidate = async () => {
    if (!contract || isLoading || selectedElectionId === 0) return;
    if (!candidateName) {
      showMessage('Please enter a candidate name.', 'error');
      return;
    }
    try {
      showMessage(`Adding candidate "${candidateName}" to election ID ${selectedElectionId}...`, 'info');
      const tx = await contract.addCandidate(selectedElectionId, candidateName);
      await tx.wait();
      showMessage(`Candidate "${candidateName}" added successfully!`, 'success');
      setCandidateName('');
      refreshSelectedElection(selectedElectionId); // Refresh candidates for current election
    } catch (error) {
      console.error("Error adding candidate:", error);
      showMessage(`Error adding candidate: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };

  const handleAuthorizeVoter = async () => {
    if (!contract || isLoading || selectedElectionId === 0) return;
    if (!ethers.isAddress(voterAddress)) { // Using ethers.isAddress for address validation
      showMessage('Please enter a valid Ethereum address.', 'error');
      return;
    }

    try {
      showMessage(`Authorizing voter ${voterAddress} for election ID ${selectedElectionId}...`, 'info');
      const tx = await contract.authorizeVoter(selectedElectionId, voterAddress);
      await tx.wait();
      showMessage(`Voter ${voterAddress} authorized successfully!`, 'success');
      setVoterAddress('');
      refreshSelectedElection(selectedElectionId); // Refresh voter info (though not directly visible here)
    } catch (error) {
      console.error("Error authorizing voter:", error);
      showMessage(`Error authorizing voter: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };

  const handleRemoveVoterAuthorization = async () => {
    if (!contract || isLoading || selectedElectionId === 0) return;
    if (!ethers.isAddress(voterAddress)) {
      showMessage('Please enter a valid Ethereum address to de-authorize.', 'error');
      return;
    }

    try {
      showMessage(`Revoking authorization for voter ${voterAddress} in election ID ${selectedElectionId}...`, 'info');
      const tx = await contract.removeVoterAuthorization(selectedElectionId, voterAddress);
      await tx.wait();
      showMessage(`Voter ${voterAddress} de-authorized successfully!`, 'success');
      setVoterAddress('');
      refreshSelectedElection(selectedElectionId);
    } catch (error) {
      console.error("Error revoking voter authorization:", error);
      showMessage(`Error revoking authorization: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };

  const handleEndElection = async () => {
    if (!contract || isLoading || selectedElectionId === 0 || !currentElectionDetails || currentElectionDetails.isCompleted) return;
    if (!currentElectionDetails.isActive) {
        showMessage('This election is not currently active. It cannot be ended prematurely unless active.', 'error');
        return;
    }
    const confirmEnd = window.confirm(`Are you sure you want to end election "${currentElectionDetails.name}" (ID: ${selectedElectionId})? This action is irreversible.`);
    if (!confirmEnd) return;

    try {
      showMessage(`Ending election ID ${selectedElectionId}...`, 'info');
      const tx = await contract.endElection(selectedElectionId);
      await tx.wait();
      showMessage(`Election "${currentElectionDetails.name}" ended successfully!`, 'success');
      refreshAllElections(); // Refresh to update election status
      refreshSelectedElection(selectedElectionId); // Refresh selected election details
    } catch (error) {
      console.error("Error ending election:", error);
      showMessage(`Error ending election: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };


  return (
    <div className="admin-dashboard bg-gray-800 p-6 rounded-xl shadow-2xl space-y-8">
      <h2 className="text-3xl font-bold text-sky-400 mb-6 text-center">Admin Dashboard</h2>

      {/* Admin Panel Sections - Using a responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {/* Section 1: Create New Election */}
        <div className="bg-gray-700 p-5 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-sky-300 mb-4">Create New Election</h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="electionName" className="block text-sm font-medium text-gray-300 mb-1">Election Name:</label>
              <input
                type="text"
                id="electionName"
                value={newElectionName}
                onChange={(e) => setNewElectionName(e.target.value)}
                placeholder="e.g., CoreDAO Treasury Vote"
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:ring-sky-500 focus:border-sky-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-300 mb-1">Start Time:</label>
              <input
                type="datetime-local"
                id="startTime"
                value={newElectionStartTime}
                onChange={(e) => setNewElectionStartTime(e.target.value)}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-sky-500 focus:border-sky-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-300 mb-1">End Time:</label>
              <input
                type="datetime-local"
                id="endTime"
                value={newElectionEndTime}
                onChange={(e) => setNewElectionEndTime(e.target.value)}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-sky-500 focus:border-sky-500"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleCreateElection}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out disabled:opacity-50 mt-2"
            >
              Create Election
            </button>
          </div>
        </div>

        {/* Section 2: Manage Candidates (for selected election) */}
        <div className="bg-gray-700 p-5 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-sky-300 mb-4">Manage Candidates</h3>
          {selectedElectionId === 0 ? (
            <p className="text-gray-400">Please select an election to manage candidates.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm mb-2">For: <span className="font-semibold text-sky-200">{currentElectionDetails?.name || 'N/A'} (ID: {selectedElectionId})</span></p>
              <div>
                <label htmlFor="candidateName" className="block text-sm font-medium text-gray-300 mb-1">Candidate Name:</label>
                <input
                  type="text"
                  id="candidateName"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g., Alice"
                  className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:ring-sky-500 focus:border-sky-500"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleAddCandidate}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out disabled:opacity-50 mt-2"
              >
                Add Candidate
              </button>
            </div>
          )}
        </div>

        {/* Section 3: Manage Voters (for selected election) */}
        <div className="bg-gray-700 p-5 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-sky-300 mb-4">Manage Voters</h3>
          {selectedElectionId === 0 ? (
            <p className="text-gray-400">Please select an election to manage voters.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm mb-2">For: <span className="font-semibold text-sky-200">{currentElectionDetails?.name || 'N/A'} (ID: {selectedElectionId})</span></p>
              <div>
                <label htmlFor="voterAddress" className="block text-sm font-medium text-gray-300 mb-1">Voter Address:</label>
                <input
                  type="text"
                  id="voterAddress"
                  value={voterAddress}
                  onChange={(e) => setVoterAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:ring-sky-500 focus:border-sky-500"
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAuthorizeVoter}
                  disabled={isLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out disabled:opacity-50"
                >
                  Authorize Voter
                </button>
                <button
                  onClick={handleRemoveVoterAuthorization}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out disabled:opacity-50"
                >
                  De-authorize Voter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Election Summary (for selected election) */}
        <div className="bg-gray-700 p-5 rounded-lg shadow-lg col-span-1 md:col-span-2 lg:col-span-1"> {/* This section can span wider on medium/large screens */}
          <h3 className="text-xl font-semibold text-sky-300 mb-4">Selected Election Summary</h3>
          {currentElectionDetails ? (
            <div className="text-gray-300 space-y-2">
              <p><span className="font-medium">Name:</span> {currentElectionDetails.name}</p>
              <p><span className="font-medium">ID:</span> {currentElectionDetails.id}</p>
              <p><span className="font-medium">Admin:</span> {currentElectionDetails.admin.substring(0, 6)}...{currentElectionDetails.admin.substring(currentElectionDetails.admin.length - 4)}</p>
              <p><span className="font-medium">Start:</span> {formatTimestamp(currentElectionDetails.startTime)}</p>
              <p><span className="font-medium">End:</span> {formatTimestamp(currentElectionDetails.endTime)}</p>
              <p><span className="font-medium">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium
                  ${currentElectionDetails.isActive ? 'bg-green-600 text-white' :
                    currentElectionDetails.isCompleted ? 'bg-red-600 text-white' :
                    'bg-yellow-600 text-white'}`}>
                  {currentElectionDetails.isActive ? 'Active' : currentElectionDetails.isCompleted ? 'Completed' : 'Scheduled'}
                </span>
              </p>
              <p><span className="font-medium">Candidates:</span> {currentElectionDetails.candidatesCount}</p>
              <p><span className="font-medium">Total Votes:</span> {currentElectionDetails.totalVotesCast}</p>

              <button
                onClick={handleEndElection}
                disabled={isLoading || !currentElectionDetails.isActive}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out disabled:opacity-50 mt-4"
              >
                End Election
              </button>
            </div>
          ) : (
            <p className="text-gray-400">No election selected or details loading...</p>
          )}
        </div>

        {/* Section 5: All Elections List */}
        <div className="bg-gray-700 p-5 rounded-lg shadow-lg col-span-1 md:col-span-2 lg:col-span-full"> {/* This section spans full width on larger screens */}
          <h3 className="text-xl font-semibold text-sky-300 mb-4">All Elections</h3>
          {allElections.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-600">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Votes</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-700 divide-y divide-gray-600">
                  {allElections.map((election) => (
                    <tr key={election.id} className={`${selectedElectionId === election.id ? 'bg-sky-900/30' : ''}`}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-white">{election.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-200">{election.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${election.isActive ? 'bg-green-600 text-white' :
                            election.isCompleted ? 'bg-red-600 text-white' :
                            'bg-yellow-600 text-white'}`}>
                          {election.isActive ? 'Active' : election.isCompleted ? 'Completed' : 'Scheduled'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-200">{election.totalVotesCast}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedElectionId(election.id)}
                          className={`text-sky-400 hover:text-sky-600 transition duration-150 ease-in-out
                            ${selectedElectionId === election.id ? 'font-bold' : ''}`}
                        >
                          {selectedElectionId === election.id ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No elections found. Create one above!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;