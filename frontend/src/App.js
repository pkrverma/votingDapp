import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers'; // Make sure to use ethers v5 if your code is based on it, or update to v6 for BrowserProvider
import ContractAbiJson from './votingContractAbi.json'; // Adjust path as needed

// Import new components
import AdminPanel from './components/AdminPanel';
import VoterPanel from './components/VoterPanel';
import CandidateList from './components/CandidateList';
import MessageDisplay from './components/MessageDisplay';
import LoadingOverlay from './components/LoadingOverlay';

// --- Contract Configuration ---
const CONTRACT_ADDRESS = "0x45381ec7A5A42eD6fA8F9b650Ab9D4A43dc3280e";
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
  const [message, setMessage] = useState({ text: '', type: '' });

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
        // Using ethers.BrowserProvider for ethers v6, otherwise use Web3Provider for v5
        const web3Provider = new ethers.BrowserProvider(window.ethereum); // For ethers v6
        // const web3Provider = new ethers.providers.Web3Provider(window.ethereum); // For ethers v5

        const accounts = await web3Provider.send("eth_requestAccounts", []);
        const currentAccount = accounts[0];

        const web3Signer = await web3Provider.getSigner(currentAccount);

        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(currentAccount);

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

  // Fetch data from the contract
  const fetchData = useCallback(async () => {
    if (!contract || !account) return;
    setIsLoading(true);
    try {
      const name = await contract.electionName();
      setElectionName(name);

      const adminAddress = await contract.admin();
      setIsAdmin(adminAddress.toLowerCase() === account.toLowerCase());

      const count = await contract.candidatesCount();
      const numCandidates = Number(count); // For ethers v6, BigInts are returned

      const fetchedCandidates = [];
      for (let i = 1; i <= numCandidates; i++) {
        const candidateData = await contract.getCandidate(i);
        fetchedCandidates.push({
          id: Number(candidateData[0]),
          name: candidateData[1],
          voteCount: Number(candidateData[2]),
        });
      }
      setCandidates(fetchedCandidates);

      const tv = await contract.totalVotes();
      setTotalVotes(Number(tv));

      const vInfo = await contract.voters(account);
      setVoterInfo({
        authorized: vInfo.authorized,
        voted: vInfo.voted,
        vote: Number(vInfo.vote),
      });
      showMessage('Data fetched successfully!', 'success');
    } catch (error) {
      console.error("Error fetching data:", error);
      showMessage(`Error fetching data: ${error.message || 'Contract not found or network error.'}`, 'error');
      if (CONTRACT_ADDRESS === "0x45381ec7A5A42eD6fA8F9b650Ab9D4A43dc3280e") {
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

  // Effect to handle account and chain changes in MetaMask
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          if (provider) {
            const newSigner = await provider.getSigner(accounts[0]); // Ensure signer is updated correctly
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

      const handleChainChanged = (_chainId) => {
        window.location.reload(); // Recommended to reload on chain change
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [provider]); // Depend on provider to ensure it's available for signer updates


  // --- Voter Functions (moved here as they directly affect App state and data fetch) ---
  const handleVote = async (candidateId) => {
    if (!contract) return;
    setIsLoading(true); // Set loading for the transaction
    try {
      const tx = await contract.vote(candidateId);
      await tx.wait();
      showMessage(`Successfully voted for candidate ID ${candidateId}!`, 'success');
      fetchData(); // Refresh data after vote
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
      <MessageDisplay message={message} />
      <LoadingOverlay isLoading={isLoading} />

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
            {isAdmin && (
              <AdminPanel
                contract={contract}
                isLoading={isLoading}
                showMessage={showMessage}
                fetchData={fetchData} // Pass fetchData to refresh data after admin actions
              />
            )}

            <VoterPanel voterInfo={voterInfo} />

            <CandidateList
              candidates={candidates}
              totalVotes={totalVotes}
              voterInfo={voterInfo}
              isLoading={isLoading}
              handleVote={handleVote} // Pass handleVote to the CandidateList
            />
          </main>
        )}

        {!account && (
          <div className="mt-10 text-center">
            <p className="text-xl text-gray-400">Please connect your MetaMask wallet to use the DApp.</p>
            <p className="text-sm text-gray-500 mt-2">Ensure you are on the correct network (e.g., CoreDAO Mainnet or Testnet).</p>
          </div>
        )}
        {account && CONTRACT_ADDRESS === "0x45381ec7A5A42eD6fA8F9b650Ab9D4A43dc3280e" && ( // Check for default address
          <div className="mt-10 text-center p-4 bg-yellow-700 rounded-lg">
            <p className="text-xl text-white font-semibold">Configuration Needed!</p>
            <p className="text-md text-yellow-200 mt-2">
              Please replace <code>"0x45381ec7A5A42eD6fA8F9b650Ab9D4A43dc3280e"</code> in the <code>App.js</code> file
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