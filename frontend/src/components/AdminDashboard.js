import React, { useState } from 'react';
import { ethers } from 'ethers'; // Make sure ethers is imported here for address validation

function AdminDashboard({ contract, isLoading, showMessage, fetchData, account }) {
  const [newCandidateName, setNewCandidateName] = useState('');
  const [voterToAuthorize, setVoterToAuthorize] = useState('');
  const [adminAddress, setAdminAddress] = useState(''); // State to display admin address

  // Fetch admin address on component mount or contract change
  React.useEffect(() => {
    const getAdminAddress = async () => {
      if (contract) {
        try {
          const address = await contract.admin();
          setAdminAddress(address);
        } catch (error) {
          console.error("Error fetching admin address:", error);
          showMessage("Could not fetch admin address.", "error");
        }
      }
    };
    getAdminAddress();
  }, [contract, showMessage]);


  const handleAddCandidate = async (e) => {
    e.preventDefault(); // Prevent page reload
    if (!contract || !newCandidateName.trim()) {
      showMessage('Candidate name cannot be empty.', 'error');
      return;
    }
    try {
      // setIsLoading is managed by the parent App component now
      const tx = await contract.addCandidate(newCandidateName.trim());
      await tx.wait();
      showMessage(`Candidate "${newCandidateName.trim()}" added successfully!`, 'success');
      setNewCandidateName('');
      fetchData(); // Refresh data in parent (App.js)
    } catch (error) {
      console.error("Error adding candidate:", error);
      showMessage(`Error adding candidate: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    }
  };

  const handleAuthorizeVoter = async (e) => {
    e.preventDefault(); // Prevent page reload
    if (!contract || !voterToAuthorize.trim()) {
      showMessage('Voter address cannot be empty.', 'error');
      return;
    }
    // Corrected check for ethers v5/v6 (using ethers.isAddress if imported globally)
    if (!ethers.isAddress(voterToAuthorize.trim())) {
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
    <div className="admin-dashboard p-6 bg-gray-800 rounded-xl shadow-2xl mb-8">
      <h2 className="text-3xl font-bold mb-4 text-sky-400 border-b border-gray-700 pb-2">Admin Dashboard</h2>
      <p className="text-gray-400 mb-6">Welcome, Administrator! Here you can manage election parameters.</p>

      {adminAddress && (
        <p className="text-md text-gray-300 mb-4">
          Contract Admin: <span className="font-mono break-all text-sm text-yellow-300">{adminAddress}</span>
        </p>
      )}
       <p className="text-md text-gray-300 mb-6">
          Your Connected Account: <span className="font-mono break-all text-sm text-yellow-300">{account}</span>
       </p>

      <div className="space-y-8">
        {/* Add Candidate Section */}
        <section className="bg-gray-700 p-5 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-3 text-white">Add New Candidate</h3>
          <form onSubmit={handleAddCandidate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newCandidateName}
              onChange={(e) => setNewCandidateName(e.target.value)}
              placeholder="Enter candidate's full name"
              className="flex-grow p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-white"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Candidate
            </button>
          </form>
        </section>

        {/* Authorize Voter Section */}
        <section className="bg-gray-700 p-5 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-3 text-white">Authorize a Voter</h3>
          <form onSubmit={handleAuthorizeVoter} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={voterToAuthorize}
              onChange={(e) => setVoterToAuthorize(e.target.value)}
              placeholder="Enter voter's wallet address (e.g., 0x...)"
              className="flex-grow p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-white"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Authorize Voter
            </button>
          </form>
        </section>

        {/* You could add more admin-specific sections here, e.g.,
            - Start/End Election buttons
            - View all authorized voters
            - Change election name
        */}
      </div>
    </div>
  );
}

export default AdminDashboard;