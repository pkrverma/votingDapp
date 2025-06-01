import React, { useState } from 'react';
import { ethers } from 'ethers'; // Make sure ethers is imported here for address validation

function ElectionAdminPanel({
  contract,
  isLoading,
  showMessage,
  account,
  selectedElectionId,
  currentElectionDetails,
  refreshSelectedElection, // To refresh data after adding candidate/voter
  refreshAllElections      // To refresh all elections list after start/end election
}) {
  const [newCandidateName, setNewCandidateName] = useState('');
  const [voterToAuthorize, setVoterToAuthorize] = useState('');

  // Helper to format Unix timestamps
  const formatTimestamp = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'N/A';
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  // --- Election-Specific Management Functions ---

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!contract || !newCandidateName.trim() || selectedElectionId === 0) {
      showMessage('Please select an election and provide a candidate name.', 'error');
      return;
    }
    if (currentElectionDetails && (currentElectionDetails.isActive || currentElectionDetails.isCompleted)) {
      showMessage('Cannot add candidates to an active or completed election.', 'error');
      return;
    }
    try {
      const tx = await contract.addCandidate(selectedElectionId, newCandidateName.trim());
      await tx.wait();
      showMessage(`Candidate "${newCandidateName.trim()}" added successfully to Election ID ${selectedElectionId}!`, 'success');
      setNewCandidateName('');
      refreshSelectedElection(selectedElectionId); // Refresh data for the current election
    } catch (error) {
      console.error("Error adding candidate:", error);
      showMessage(`Error adding candidate: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };

  const handleAuthorizeVoter = async (e) => {
    e.preventDefault();
    if (!contract || !voterToAuthorize.trim() || selectedElectionId === 0) {
      showMessage('Please select an election and provide a voter address.', 'error');
      return;
    }
    if (!ethers.isAddress(voterToAuthorize.trim())) {
      showMessage('Invalid Ethereum address provided for voter.', 'error');
      return;
    }
    if (currentElectionDetails && (currentElectionDetails.isActive || currentElectionDetails.isCompleted)) {
      showMessage('Cannot authorize voters for an active or completed election.', 'error');
      return;
    }
    try {
      const tx = await contract.authorizeVoter(selectedElectionId, voterToAuthorize.trim());
      await tx.wait();
      showMessage(`Voter "${voterToAuthorize.trim()}" authorized successfully for Election ID ${selectedElectionId}!`, 'success');
      setVoterToAuthorize('');
      refreshSelectedElection(selectedElectionId); // Refresh data for the current election
    } catch (error) {
      console.error("Error authorizing voter:", error);
      showMessage(`Error authorizing voter: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };

  const handleStartElection = async () => {
    if (!contract || selectedElectionId === 0) return;
    try {
      const tx = await contract.startElection(selectedElectionId);
      await tx.wait();
      showMessage(`Election ID ${selectedElectionId} started successfully!`, 'success');
      refreshSelectedElection(selectedElectionId); // Refresh current election details
      refreshAllElections(); // Refresh overall list to update status
    } catch (error) {
      console.error("Error starting election:", error);
      showMessage(`Error starting election: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };

  const handleEndElection = async () => {
    if (!contract || selectedElectionId === 0) return;
    try {
      const tx = await contract.endElection(selectedElectionId);
      await tx.wait();
      showMessage(`Election ID ${selectedElectionId} ended successfully!`, 'success');
      refreshSelectedElection(selectedElectionId); // Refresh current election details
      refreshAllElections(); // Refresh overall list to update status
    } catch (error) {
      console.error("Error ending election:", error);
      showMessage(`Error ending election: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };


  return (
    <div className="election-admin-panel p-5 bg-gray-700 rounded-lg shadow-md mb-8">
      {selectedElectionId === 0 || !currentElectionDetails ? (
        <div className="text-center text-gray-400">
          <p>Please select an election from the dropdown above to manage its details.</p>
        </div>
      ) : (
        <>
          <h3 className="text-xl font-semibold mb-3 text-white">Managing Selected Election:</h3>
          <p className="text-lg text-sky-300 mb-2">
            {currentElectionDetails.name} (ID: {currentElectionDetails.id})
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium
                        ${currentElectionDetails.isActive ? 'bg-green-600 text-white' :
                currentElectionDetails.isCompleted ? 'bg-red-600 text-white' :
                  'bg-yellow-600 text-white'}`}>
              {currentElectionDetails.isActive ? 'Active' : currentElectionDetails.isCompleted ? 'Completed' : 'Scheduled'}
            </span>
          </p>
          <p className="text-md text-gray-400">
            Admin: <span className="font-mono text-sm text-gray-300 break-all">{currentElectionDetails.admin}</span>
            <br />
            Starts: {formatTimestamp(currentElectionDetails.startTime)}
            <br />
            Ends: {formatTimestamp(currentElectionDetails.endTime)}
          </p>

          <div className="mt-4 space-y-4">
            {/* Add Candidate Section */}
            <section>
              <h4 className="text-lg font-medium mb-2 text-white">Add New Candidate</h4>
              <form onSubmit={handleAddCandidate} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                  placeholder={`Candidate name for Election ID ${selectedElectionId}`}
                  className="flex-grow p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading || currentElectionDetails.isActive || currentElectionDetails.isCompleted || currentElectionDetails.admin.toLowerCase() !== account.toLowerCase()}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Candidate
                </button>
              </form>
              {(currentElectionDetails.isActive || currentElectionDetails.isCompleted) &&
                <p className="text-sm text-red-300 mt-2">Cannot add candidates to an active or completed election.</p>}
              {currentElectionDetails.admin.toLowerCase() !== account.toLowerCase() &&
                <p className="text-sm text-yellow-300 mt-2">Only this election's admin can add candidates.</p>}
            </section>

            {/* Authorize Voter Section */}
            <section>
              <h4 className="text-lg font-medium mb-2 text-white">Authorize a Voter</h4>
              <form onSubmit={handleAuthorizeVoter} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={voterToAuthorize}
                  onChange={(e) => setVoterToAuthorize(e.target.value)}
                  placeholder={`Voter address for Election ID ${selectedElectionId}`}
                  className="flex-grow p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading || currentElectionDetails.isActive || currentElectionDetails.isCompleted || currentElectionDetails.admin.toLowerCase() !== account.toLowerCase()}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Authorize Voter
                </button>
              </form>
              {(currentElectionDetails.isActive || currentElectionDetails.isCompleted) &&
                <p className="text-sm text-red-300 mt-2">Cannot authorize voters for an active or completed election.</p>}
              {currentElectionDetails.admin.toLowerCase() !== account.toLowerCase() &&
                <p className="text-sm text-yellow-300 mt-2">Only this election's admin can authorize voters.</p>}
            </section>

            {/* Start/End Election Buttons */}
            <section className="flex flex-wrap gap-4 items-center">
              <h4 className="text-lg font-medium text-white">Election Actions:</h4>
              {currentElectionDetails.admin.toLowerCase() === account.toLowerCase() ? (
                <>
                  {!currentElectionDetails.isActive && !currentElectionDetails.isCompleted && (
                    <button
                      onClick={handleStartElection} // No need to pass ID, it uses selectedElectionId state
                      disabled={isLoading}
                      className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Start Election
                    </button>
                  )}
                  {currentElectionDetails.isActive && !currentElectionDetails.isCompleted && (
                    <button
                      onClick={handleEndElection} // No need to pass ID
                      disabled={isLoading}
                      className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      End Election
                    </button>
                  )}
                  {currentElectionDetails.isCompleted && (
                    <span className="text-green-300 font-semibold text-lg">Election Concluded.</span>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">You are not the administrator for this election. Only the election admin can start/end it.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default ElectionAdminPanel;