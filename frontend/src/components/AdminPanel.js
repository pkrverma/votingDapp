import React, { useState } from 'react';

function AdminPanel({ contract, isLoading, showMessage, fetchData }) {
  const [newCandidateName, setNewCandidateName] = useState('');
  const [voterToAuthorize, setVoterToAuthorize] = useState('');

  const handleAddCandidate = async () => {
    if (!contract || !newCandidateName.trim()) {
      showMessage('Candidate name cannot be empty.', 'error');
      return;
    }
    // Note: isLoading is managed by the parent App component now, pass it down for button disabling.
    try {
      const tx = await contract.addCandidate(newCandidateName.trim());
      await tx.wait();
      showMessage(`Candidate "${newCandidateName.trim()}" added successfully!`, 'success');
      setNewCandidateName('');
      fetchData(); // Refresh data in parent
    } catch (error) {
      console.error("Error adding candidate:", error);
      showMessage(`Error adding candidate: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };

  const handleAuthorizeVoter = async () => {
    if (!contract || !voterToAuthorize.trim()) {
      showMessage('Voter address cannot be empty.', 'error');
      return;
    }
    if (!contract.signer.provider.utils.isAddress(voterToAuthorize.trim())) { // Corrected check for ethers v5/v6
      showMessage('Invalid Ethereum address provided for voter.', 'error');
      return;
    }
    try {
      const tx = await contract.authorizeVoter(voterToAuthorize.trim());
      await tx.wait();
      showMessage(`Voter "${voterToAuthorize.trim()}" authorized successfully!`, 'success');
      setVoterToAuthorize('');
      fetchData(); // Refresh data in parent
    } catch (error) {
      console.error("Error authorizing voter:", error);
      showMessage(`Error authorizing voter: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };

  return (
    <section className="p-6 bg-gray-800 rounded-xl shadow-xl">
      <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2 text-sky-400">Admin Panel</h2>
      <div className="space-y-6">
        {/* Add Candidate */}
        <div>
          <h3 className="text-lg font-medium mb-2">Add Candidate</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newCandidateName}
              onChange={(e) => setNewCandidateName(e.target.value)}
              placeholder="Candidate Name"
              className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
            <button
              onClick={handleAddCandidate}
              disabled={isLoading}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50"
            >
              Add Candidate
            </button>
          </div>
        </div>
        {/* Authorize Voter */}
        <div>
          <h3 className="text-lg font-medium mb-2">Authorize Voter</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={voterToAuthorize}
              onChange={(e) => setVoterToAuthorize(e.target.value)}
              placeholder="Voter Address"
              className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
            <button
              onClick={handleAuthorizeVoter}
              disabled={isLoading}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50"
            >
              Authorize Voter
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminPanel;