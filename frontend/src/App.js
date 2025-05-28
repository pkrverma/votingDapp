// IMPORTANT: To resolve the "Could not resolve 'ethers'" error,
// you MUST install the ethers.js library in your project.
// Open your terminal in the project root directory and run:
//
// npm install ethers
//
// or
//
// yarn add ethers
//
// After installation, your bundler (like Webpack or esbuild) should be able to find the library.

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
// --- Import ABI from JSON file ---
// Make sure 'votingContractAbi.json' is in your 'src' folder or adjust path accordingly.
import ContractAbiJson from './votingContractAbi.json'; 

// --- Contract Configuration ---
// 1. Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x4D4a47f5EB23Bf12a7174990661FEAF274325369";

// 2. ABI (Application Binary Interface) for your votingContract
// Now loaded from the imported JSON file
const CONTRACT_ABI = ContractAbiJson.abi; 
// --- End Contract Configuration ---


function App() {
  // State variables
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [electionName, setElectionName] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [voterInfo, setVoterInfo] = useState({ authorized: false, voted: false, vote: 0 });
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' or 'error'

  const [newCandidateName, setNewCandidateName] = useState('');
  const [voterToAuthorize, setVoterToAuthorize] = useState('');

  // Helper function to display messages
  const showMessage = (text, type, duration = 5000) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), duration);
  };

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsLoading(true);
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        await web3Provider.send("eth_requestAccounts", []); // Request account access
        
        const web3Signer = web3Provider.getSigner();
        const currentAccount = await web3Signer.getAddress();
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(currentAccount);
        
        // Ensure CONTRACT_ABI is correctly loaded before this step
        if (!CONTRACT_ABI || CONTRACT_ABI.length === 0) {
          showMessage('Contract ABI is not loaded. Check ABI import.', 'error', 10000);
          setIsLoading(false);
          return;
        }
        const votingContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Signer);
        setContract(votingContract);
        
        showMessage('Wallet connected successfully!', 'success');
      } catch (error) {
        console.error("Error connecting wallet:", error);
        showMessage(`Error connecting wallet: ${error.message || 'Unknown error'}`, 'error');
        setAccount(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      showMessage('MetaMask is not installed. Please install it to use this DApp.', 'error');
    }
  }, []);

  // Fetch initial data from the contract
  const fetchData = useCallback(async () => {
    if (!contract || !account) return;
    setIsLoading(true);
    try {
      // Fetch election name
      const name = await contract.electionName();
      setElectionName(name);

      // Fetch admin address and check if current user is admin
      const adminAddress = await contract.admin();
      setIsAdmin(adminAddress.toLowerCase() === account.toLowerCase());

      // Fetch candidates count
      const count = await contract.candidatesCount();
      const numCandidates = count.toNumber();

      // Fetch all candidates
      const fetchedCandidates = [];
      for (let i = 1; i <= numCandidates; i++) {
        // Make sure the getCandidate function in ABI returns named properties or adjust access accordingly
        const candidateData = await contract.getCandidate(i);
        fetchedCandidates.push({
          id: candidateData[0].toNumber ? candidateData[0].toNumber() : parseInt(candidateData[0]), // Access by index if properties are not named
          name: candidateData[1],
          voteCount: candidateData[2].toNumber ? candidateData[2].toNumber() : parseInt(candidateData[2]),
        });
      }
      setCandidates(fetchedCandidates);

      // Fetch total votes
      const tv = await contract.totalVotes();
      setTotalVotes(tv.toNumber());

      // Fetch voter info for the current account
      const vInfo = await contract.voters(account);
      setVoterInfo({
        authorized: vInfo.authorized,
        voted: vInfo.voted,
        vote: vInfo.vote.toNumber ? vInfo.vote.toNumber() : parseInt(vInfo.vote),
      });
      showMessage('Data fetched successfully!', 'success');
    } catch (error) {
      console.error("Error fetching data:", error);
      showMessage(`Error fetching data: ${error.message || 'Contract not found or network error.'}`, 'error');
       if (CONTRACT_ADDRESS === "YOUR_DEPLOYED_CONTRACT_ADDRESS") {
        showMessage("Please update the CONTRACT_ADDRESS in App.js with your deployed contract's address.", "error", 10000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [contract, account]);

  // Effect to fetch data when contract or account changes
  useEffect(() => {
    if (contract && account) {
      fetchData();
    }
  }, [contract, account, fetchData]);

  // Effect to handle account changes in MetaMask
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          // Re-initialize contract with new signer if needed, or simply re-fetch data
          if (provider) {
            const newSigner = provider.getSigner(accounts[0]);
            setSigner(newSigner);
            if (CONTRACT_ABI && CONTRACT_ABI.length > 0) {
              const newContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner);
              setContract(newContract);
            } else {
               showMessage('Contract ABI is not loaded on account change. Check ABI import.', 'error', 10000);
            }
          }
        } else {
          setAccount(null);
          setContract(null);
          setSigner(null);
          setIsAdmin(false);
          showMessage('Wallet disconnected or no account selected.', 'error');
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      // Recommended to also listen for chainChanged
      window.ethereum.on('chainChanged', (_chainId) => window.location.reload());


      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', (_chainId) => window.location.reload());
      };
    }
  }, [provider]);


  // --- Admin Functions ---
  const handleAddCandidate = async () => {
    if (!contract || !newCandidateName.trim()) {
      showMessage('Candidate name cannot be empty.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const tx = await contract.addCandidate(newCandidateName.trim());
      await tx.wait();
      showMessage(`Candidate "${newCandidateName.trim()}" added successfully!`, 'success');
      setNewCandidateName('');
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error adding candidate:", error);
      showMessage(`Error adding candidate: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthorizeVoter = async () => {
    if (!contract || !voterToAuthorize.trim()) {
      showMessage('Voter address cannot be empty.', 'error');
      return;
    }
    if (!ethers.utils.isAddress(voterToAuthorize.trim())) {
        showMessage('Invalid Ethereum address provided for voter.', 'error');
        return;
    }
    setIsLoading(true);
    try {
      const tx = await contract.authorizeVoter(voterToAuthorize.trim());
      await tx.wait();
      showMessage(`Voter "${voterToAuthorize.trim()}" authorized successfully!`, 'success');
      setVoterToAuthorize('');
      fetchData(); // Refresh data, especially if the authorized voter is the current user
    } catch (error) {
      console.error("Error authorizing voter:", error);
      showMessage(`Error authorizing voter: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Voter Functions ---
  const handleVote = async (candidateId) => {
    if (!contract) return;
    if (!voterInfo.authorized) {
      showMessage('You are not authorized to vote.', 'error');
      return;
    }
    if (voterInfo.voted) {
      showMessage('You have already voted.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const tx = await contract.vote(candidateId);
      await tx.wait();
      showMessage(`Successfully voted for candidate ID ${candidateId}!`, 'success');
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error voting:", error);
      showMessage(`Error voting: ${error.data?.message || error.message || 'Transaction failed'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI Rendering ---
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 font-sans">
      {/* Global Message Display */}
      {message.text && (
        <div className={`fixed top-5 right-5 p-3 rounded-lg shadow-lg text-sm z-50
          ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {message.text}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
          <p className="ml-3 text-xl">Processing...</p>
        </div>
      )}

      <div className="w-full max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-8 p-6 bg-gray-800 rounded-xl shadow-2xl">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold text-sky-400">CoreDAO Voting DApp</h1>
            {!account ? (
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="px-6 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="text-right">
                <p className="text-sm text-gray-400">Connected Account:</p>
                <p className="text-md font-mono break-all">{account}</p>
              </div>
            )}
          </div>
          {electionName && <p className="mt-2 text-xl text-gray-300">Election: <span className="font-semibold">{electionName}</span></p>}
        </header>

        {account && contract && (
          <main className="space-y-8">
            {/* Admin Panel */}
            {isAdmin && (
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
            )}

            {/* Voter Status */}
            <section className="p-6 bg-gray-800 rounded-xl shadow-xl">
                <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2 text-sky-400">Your Voting Status</h2>
                {!voterInfo.authorized && <p className="text-yellow-400">You are not yet authorized to vote. Please contact the admin.</p>}
                {voterInfo.authorized && voterInfo.voted && <p className="text-green-400">You have successfully voted for candidate ID: {voterInfo.vote}.</p>}
                {voterInfo.authorized && !voterInfo.voted && <p className="text-blue-400">You are authorized to vote. Please select a candidate below.</p>}
            </section>


            {/* Candidates List & Voting */}
            <section className="p-6 bg-gray-800 rounded-xl shadow-xl">
              <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2 text-sky-400">Candidates</h2>
              {candidates.length === 0 ? (
                <p className="text-gray-400">No candidates available yet.</p>
              ) : (
                <ul className="space-y-4">
                  {candidates.map((candidate) => (
                    <li key={candidate.id} className="p-4 bg-gray-700 rounded-lg flex flex-col sm:flex-row justify-between items-center shadow">
                      <div>
                        <p className="text-xl font-semibold">{candidate.name}</p>
                        <p className="text-sm text-gray-400">Votes: {candidate.voteCount}</p>
                      </div>
                      <button
                        onClick={() => handleVote(candidate.id)}
                        disabled={isLoading || !voterInfo.authorized || voterInfo.voted}
                        className="mt-3 sm:mt-0 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Vote
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Election Results */}
            <section className="p-6 bg-gray-800 rounded-xl shadow-xl">
              <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2 text-sky-400">Election Results</h2>
              <p className="text-lg">Total Votes Cast: <span className="font-bold">{totalVotes}</span></p>
              <div className="mt-4 space-y-2">
                {candidates.sort((a,b) => b.voteCount - a.voteCount).map(candidate => (
                    <div key={candidate.id} className="p-3 bg-gray-700 rounded-lg">
                        <p className="font-medium">{candidate.name}: <span className="font-bold">{candidate.voteCount} votes</span></p>
                        {totalVotes > 0 && (
                             <div className="w-full bg-gray-600 rounded-full h-2.5 mt-1">
                                <div 
                                    className="bg-sky-500 h-2.5 rounded-full" 
                                    style={{ width: `${(candidate.voteCount / totalVotes) * 100}%` }}>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
              </div>
            </section>
          </main>
        )}
         {!account && (
            <div className="mt-10 text-center">
                <p className="text-xl text-gray-400">Please connect your MetaMask wallet to use the DApp.</p>
                <p className="text-sm text-gray-500 mt-2">Ensure you are on the correct network (e.g., CoreDAO Mainnet or Testnet).</p>
            </div>
        )}
         {account && CONTRACT_ADDRESS === "YOUR_DEPLOYED_CONTRACT_ADDRESS" && (
            <div className="mt-10 text-center p-4 bg-yellow-700 rounded-lg">
                <p className="text-xl text-white font-semibold">Configuration Needed!</p>
                <p className="text-md text-yellow-200 mt-2">
                    Please replace <code>"YOUR_DEPLOYED_CONTRACT_ADDRESS"</code> in the <code>App.js</code> file
                    with the actual address of your deployed smart contract.
                </p>
            </div>
        )}
      </div>
      <footer className="w-full max-w-3xl mx-auto mt-12 mb-6 text-center text-gray-500 text-sm">
        <p>CoreDAO Voting DApp &copy; 2024</p>
        <p>Ensure your MetaMask is connected to the appropriate CoreDAO network.</p>
      </footer>
    </div>
  );
}

export default App;
