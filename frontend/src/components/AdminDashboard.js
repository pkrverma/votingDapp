import React, { useState } from 'react';
import { ethers } from 'ethers';

function AdminDashboard({
  contract,
  isLoading,
  showMessage,
  selectedElectionId,
  currentElectionDetails,
  refreshAllElections,
  refreshSelectedElection,
  candidates, // Added to display candidates for removal
  handleRemoveCandidate, // Added to pass down the remove function
  authorizedVoters, // NEW: Prop to receive the list of authorized voters
  handleRemoveAuthorizedVoter // NEW: Prop to handle removing an authorized voter
}) {
  // Election Management States
  const [newElectionName, setNewElectionName] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');

  // Candidate Management States
  const [newCandidateName, setNewCandidateName] = useState('');

  // Voter Authorization States
  const [voterAddressToAuth, setVoterAddressToAuth] = useState('');

  // Helper to convert datetime-local to Unix timestamp
  const datetimeToUnix = (datetimeLocal) => {
    if (!datetimeLocal) return 0;
    // Date.parse returns milliseconds, so divide by 1000 for seconds
    return Math.floor(new Date(datetimeLocal).getTime() / 1000);
  };

  // Helper to format Unix timestamp to a readable date/time string
  const formatUnixTimestamp = (timestamp) => {
    if (timestamp === 0) return "N/A";
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    return date.toLocaleString(); // Formats to local date and time
  };

  // --- Admin Actions ---

  const handleCreateElection = async (e) => {
    e.preventDefault();
    if (!contract) {
      showMessage("Contract not loaded.", "error");
      return;
    }
    const startUnix = datetimeToUnix(newStartTime);
    const endUnix = datetimeToUnix(newEndTime);

    // Basic validation
    if (!newElectionName || startUnix === 0 || endUnix === 0) {
      showMessage("Please fill all election fields.", "error");
      return;
    }
    if (startUnix <= Math.floor(Date.now() / 1000)) {
      showMessage("Start time cannot be in the past.", "error");
      return;
    }
    if (endUnix <= startUnix) {
      showMessage("End time must be after start time.", "error");
      return;
    }

    try {
      showMessage("Creating election... please confirm in MetaMask.", "info");
      const tx = await contract.createElection(newElectionName, startUnix, endUnix);
      await tx.wait();
      showMessage(`Election "${newElectionName}" created successfully!`, "success");
      setNewElectionName('');
      setNewStartTime('');
      setNewEndTime('');
      await refreshAllElections(); // Refresh the list of all elections
    } catch (error) {
      console.error("Error creating election:", error);
      showMessage(`Failed to create election: ${error.data?.message || error.reason || error.message}`, "error");
    }
  };

  const handleStartElection = async () => {
    if (!contract || selectedElectionId === 0) {
      showMessage("Please select an election.", "error");
      return;
    }
    if (!currentElectionDetails || currentElectionDetails.isActive || currentElectionDetails.isCompleted) {
      showMessage("Election cannot be started (already active or completed).", "error");
      return;
    }
    try {
      showMessage("Starting election... please confirm in MetaMask.", "info");
      const tx = await contract.startElection(selectedElectionId);
      await tx.wait();
      showMessage(`Election ID ${selectedElectionId} started!`, "success");
      await refreshSelectedElection(selectedElectionId); // Refresh details for the selected election
    } catch (error) {
      console.error("Error starting election:", error);
      showMessage(`Failed to start election: ${error.data?.message || error.reason || error.message}`, "error");
    }
  };

  const handleEndElection = async () => {
    if (!contract || selectedElectionId === 0) {
      showMessage("Please select an election.", "error");
      return;
    }
    if (!currentElectionDetails || !currentElectionDetails.isActive) {
      showMessage("Election is not active and cannot be ended.", "error");
      return;
    }
    try {
      showMessage("Ending election... please confirm in MetaMask.", "info");
      const tx = await contract.endElection(selectedElectionId);
      await tx.wait();
      showMessage(`Election ID ${selectedElectionId} ended!`, "success");
      await refreshSelectedElection(selectedElectionId); // Refresh details for the selected election
    } catch (error) {
      console.error("Error ending election:", error);
      showMessage(`Failed to end election: ${error.data?.message || error.reason || error.message}`, "error");
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!contract || selectedElectionId === 0) {
      showMessage("Please select an election.", "error");
      return;
    }
    if (!newCandidateName) {
      showMessage("Candidate name cannot be empty.", "error");
      return;
    }
    if (currentElectionDetails && currentElectionDetails.isActive) {
      showMessage("Cannot add candidates to an active election. End it first.", "error");
      return;
    }
    try {
      showMessage("Adding candidate... please confirm in MetaMask.", "info");
      const tx = await contract.addCandidate(selectedElectionId, newCandidateName);
      await tx.wait();
      showMessage(`Candidate "${newCandidateName}" added to Election ID ${selectedElectionId}!`, "success");
      setNewCandidateName('');
      await refreshSelectedElection(selectedElectionId); // Refresh candidates for the selected election
    } catch (error) {
      console.error("Error adding candidate:", error);
      showMessage(`Failed to add candidate: ${error.data?.message || error.reason || error.message}`, "error");
    }
  };

  const handleAuthorizeVoter = async (e) => {
    e.preventDefault();
    if (!contract || selectedElectionId === 0) {
      showMessage("Please select an election.", "error");
      return;
    }
    if (!voterAddressToAuth || !ethers.isAddress(voterAddressToAuth)) {
      showMessage("Please enter a valid Ethereum address.", "error");
      return;
    }
    // Check if voter is already authorized
    if (authorizedVoters.some(voter => voter.voterAddress.toLowerCase() === voterAddressToAuth.toLowerCase())) {
      showMessage("Voter is already authorized for this election.", "warning");
      return;
    }
    if (currentElectionDetails && currentElectionDetails.isActive) {
      showMessage("Cannot authorize voters for an active election. End it first.", "error");
      return;
    }

    try {
      showMessage(`Authorizing ${voterAddressToAuth}... please confirm in MetaMask.`, "info");
      const tx = await contract.authorizeVoter(selectedElectionId, voterAddressToAuth);
      await tx.wait();
      showMessage(`Voter ${voterAddressToAuth} authorized for Election ID ${selectedElectionId}!`, "success");
      setVoterAddressToAuth('');
      await refreshSelectedElection(selectedElectionId); // Refresh voter info for the selected election
    } catch (error) {
      console.error("Error authorizing voter:", error);
      showMessage(`Failed to authorize voter: ${error.data?.message || error.reason || error.message}`, "error");
    }
  };

  return (
    <div className="admin-dashboard bg-gray-800 p-6 rounded-xl shadow-2xl space-y-8">
      <h2 className="text-3xl font-bold text-sky-400 mb-6 text-center">Admin Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create Election */}
        <div className="p-6 rounded-xl shadow-lg bg-gray-900">
          <h2 className="text-xl font-semibold mb-4 text-sky-400">Create New Election</h2>
          <form onSubmit={handleCreateElection} className="space-y-4">
            <div>
              <label htmlFor="electionName" className="block text-gray-300 text-sm font-bold mb-2">Election Name</label>
              <input
                type="text"
                id="electionName"
                value={newElectionName}
                onChange={(e) => setNewElectionName(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
                placeholder="e.g., Community Council"
                required
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-gray-300 text-sm font-bold mb-2">Start Time</label>
              <input
                type="datetime-local"
                id="startTime"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
                required
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-gray-300 text-sm font-bold mb-2">End Time</label>
              <input
                type="datetime-local"
                id="endTime"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !contract}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50"
            >
              Create Election
            </button>
          </form>
        </div>

        {/* Manage Election (Start/End) */}
        <div className="p-6 rounded-xl shadow-lg bg-gray-900">
          <h2 className="text-xl font-semibold mb-4 text-sky-400">Manage Election Status</h2>
          {currentElectionDetails ? (
            <div className="space-y-4">
              <p className="text-gray-300">Selected: <span className="font-semibold">{currentElectionDetails.name} (ID: {currentElectionDetails.id})</span></p>
              <p className="text-gray-300">Status: <span className={`font-semibold ${currentElectionDetails.isActive ? 'text-green-400' : currentElectionDetails.isCompleted ? 'text-red-400' : 'text-yellow-400'}`}>
                {currentElectionDetails.isActive ? 'Active' : currentElectionDetails.isCompleted ? 'Completed' : 'Scheduled'}
              </span></p>
              {/* Display Start and End Times */}
              <p className="text-gray-300">Starts: <span className="font-semibold">{formatUnixTimestamp(currentElectionDetails.startTime)}</span></p>
              <p className="text-gray-300">Ends: <span className="font-semibold">{formatUnixTimestamp(currentElectionDetails.endTime)}</span></p>
              <button
                onClick={handleStartElection}
                disabled={isLoading || !contract || selectedElectionId === 0 || currentElectionDetails.isActive || currentElectionDetails.isCompleted} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50"
              >
                Start Election
              </button>
              <button
                onClick={handleEndElection}
                disabled={isLoading || !contract || selectedElectionId === 0 || !currentElectionDetails.isActive}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50"
              >
                End Election
              </button>
            </div>
          ) : (
            <p className="text-gray-400">Select an election to manage its status.</p>
          )}
        </div>

        {/* Add Candidate & Candidate List (Combined) */}
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-sky-400">Add & Manage Candidates</h2>
          {currentElectionDetails && currentElectionDetails.id !== 0 ? (
            <div className="flex flex-col space-y-6">
              {/* Add Candidate Form */}
              <div className="flex-grow">
                <form onSubmit={handleAddCandidate} className="space-y-4 mb-6 pb-6 border-b border-gray-700">
                  <p className="text-gray-300">Adding to: <span className="font-semibold">{currentElectionDetails.name} (ID: {currentElectionDetails.id})</span></p>
                  <div>
                    <label htmlFor="candidateName" className="block text-gray-300 text-sm font-bold mb-2">New Candidate Name</label>
                    <input
                      type="text"
                      id="candidateName"
                      value={newCandidateName}
                      onChange={(e) => setNewCandidateName(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
                      placeholder="e.g., Jane Doe"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !contract || selectedElectionId === 0 || (currentElectionDetails && currentElectionDetails.isActive)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50"
                  >
                    Add Candidate
                  </button>
                </form>
              </div>

              {/* Candidate List for Removal */}
              <div className="flex-grow">
                <h3 className="text-lg font-semibold mb-3 text-sky-300">Current Candidates for {currentElectionDetails.name}</h3>
                {candidates.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Votes</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {candidates.map((candidate) => (
                          <tr key={candidate.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">{candidate.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{candidate.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{candidate.voteCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveCandidate(candidate.id)}
                                disabled={isLoading || !contract || (currentElectionDetails && currentElectionDetails.isActive)} // Cannot remove from active election
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400">No candidates added yet for this election.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Select an election to add and manage candidates.</p>
          )}
        </div>

        {/* Authorize Voter & Authorized Voter List (Combined) */}
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-sky-400">Authorize & Manage Voters</h2>
          {currentElectionDetails && currentElectionDetails.id !== 0 ? (
            <div className="flex flex-col space-y-6">
              {/* Authorize Voter Form */}
              <div className="flex-grow">
                <form onSubmit={handleAuthorizeVoter} className="space-y-4 mb-6 pb-6 border-b border-gray-700">
                  <p className="text-gray-300">For: <span className="font-semibold">{currentElectionDetails.name} (ID: {currentElectionDetails.id})</span></p>
                  <div>
                    <label htmlFor="voterAddress" className="block text-gray-300 text-sm font-bold mb-2">Voter Address</label>
                    <input
                      type="text"
                      id="voterAddress"
                      value={voterAddressToAuth}
                      onChange={(e) => setVoterAddressToAuth(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
                      placeholder="0x..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !contract || selectedElectionId === 0 || (currentElectionDetails && currentElectionDetails.isActive)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50"
                  >
                    Authorize Voter
                  </button>
                </form>
              </div>

              {/* Authorized Voter List */}
              <div className="flex-grow">
                <h3 className="text-lg font-semibold mb-3 text-sky-300">Authorized Voters for {currentElectionDetails.name}</h3>
                {authorizedVoters && authorizedVoters.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700 table-fixed"> {/* Added table-fixed */}
                      <thead className="bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/2">Address</th> {/* You might consider a width here if addresses are consistently long */}
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Voted</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {authorizedVoters.map((voter, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 text-sm font-mono text-gray-100 break-words">{voter.voterAddress}</td> {/* Removed whitespace-nowrap and added break-words */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{voter.voted ? 'Yes' : 'No'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveAuthorizedVoter(voter.voterAddress)}
                                disabled={isLoading || !contract || (currentElectionDetails && currentElectionDetails.isActive)}
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400">No voters authorized yet for this election.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Select an election to authorize and manage voters.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;