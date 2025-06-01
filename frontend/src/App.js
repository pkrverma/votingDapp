import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import ContractAbiJson from './votingContractAbi.json';

// Import components
import AdminDashboard from './components/AdminDashboard';
import VoterPanel from './components/VoterPanel';
import CandidateList from './components/CandidateList';
import MessageDisplay from './components/MessageDisplay';
import LoadingOverlay from './components/LoadingOverlay';
import ElectionSelector from './components/ElectionSelector'; // New component

// --- Contract Configuration ---
const CONTRACT_ADDRESS = "0x5277697271226e191dAe06753Ba3F6F250DC1913"; // REPLACE WITH YOUR DEPLOYED CONTRACT ADDRESS
const CONTRACT_ABI = ContractAbiJson.abi;
// --- End Contract Configuration ---

function App() {
  // --- Core DApp State ---
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null); // Connected user's address

  // --- Election-Specific States ---
  const [isAdmin, setIsAdmin] = useState(false); // True if current user is the contract deployer
  const [allElections, setAllElections] = useState([]); // List of all elections on the contract
  const [selectedElectionId, setSelectedElectionId] = useState(0); // ID of the election currently being viewed/interacted with
  const [currentElectionDetails, setCurrentElectionDetails] = useState(null); // Details of the selected election

  // --- Data for the selected election ---
  const [candidates, setCandidates] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [voterInfo, setVoterInfo] = useState({ authorized: false, voted: false, vote: 0 }); // Voter info for selected election

  // --- UI States ---
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const messageTimeoutRef = useRef(null);

  // Helper function to display messages
  const showMessage = useCallback((text, type, duration = 5000) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setMessage({ text, type });
    messageTimeoutRef.current = setTimeout(() => {
      setMessage({ text: '', type: '' });
      messageTimeoutRef.current = null;
    }, duration);
  }, []);

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsLoading(true);
        // Using ethers v6 BrowserProvider
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await web3Provider.send("eth_requestAccounts", []);
        const currentAccount = accounts[0];
        const web3Signer = await web3Provider.getSigner(currentAccount);

        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(currentAccount);

        if (!CONTRACT_ABI || CONTRACT_ABI.length === 0) {
          showMessage('Contract ABI is not loaded. Check ABI import.', 'error', 10000);
          return;
        }
        const votingContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Signer);
        setContract(votingContract);

        showMessage('Wallet connected successfully!', 'success');
      } catch (error) {
        console.error("Error connecting wallet:", error);
        showMessage(`Error connecting wallet: ${error.message || 'Unknown error'}`, 'error');
        setAccount(null);
        setContract(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      showMessage('MetaMask is not installed. Please install it to use this DApp.', 'error');
    }
  }, [showMessage]);

  // Fetch all elections from the contract
  const fetchAllElections = useCallback(async () => {
    if (!contract) return;
    setIsLoading(true);
    try {
      // Check if current account is the contract deployer (super admin)
      const deployerAddress = await contract.deployer();
      setIsAdmin(deployerAddress.toLowerCase() === account.toLowerCase());

      const electionsCount = await contract.getElectionsCount();
      const fetchedElections = [];
      for (let i = 1; i <= Number(electionsCount); i++) {
        const details = await contract.getElectionDetails(i);
        fetchedElections.push({
          id: Number(details[0]),
          name: details[1],
          admin: details[2],
          startTime: Number(details[3]),
          endTime: Number(details[4]),
          isActive: details[5],
          isCompleted: details[6],
          candidatesCount: Number(details[7]),
          totalVotesCast: Number(details[8]),
        });
      }
      setAllElections(fetchedElections);

      // If no election is currently selected, default to the most recently created one
      if (fetchedElections.length > 0 && selectedElectionId === 0) {
          setSelectedElectionId(fetchedElections[fetchedElections.length - 1].id);
      }
      showMessage('All elections fetched!', 'info');

    } catch (error) {
      console.error("Error fetching all elections:", error);
      showMessage(`Error fetching elections: ${error.message || 'Contract not found or network error.'}`, 'error');
      if (CONTRACT_ADDRESS === "0x5277697271226e191dAe06753Ba3F6F250DC1913") {
        showMessage("Please update the CONTRACT_ADDRESS in App.js with your deployed contract's address.", "error", 10000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [contract, account, showMessage, selectedElectionId]);


  // Fetch data specifically for the currently selected election ID
  const fetchDataForSelectedElection = useCallback(async (electionId) => {
    if (!contract || !account || electionId === 0) return; // Ensure an election ID is provided
    setIsLoading(true);
    try {
      // Get selected election details
      const electionDetails = await contract.getElectionDetails(electionId);
      setCurrentElectionDetails({
        id: Number(electionDetails[0]),
        name: electionDetails[1],
        admin: electionDetails[2],
        startTime: Number(electionDetails[3]),
        endTime: Number(electionDetails[4]),
        isActive: electionDetails[5],
        isCompleted: electionDetails[6],
        candidatesCount: Number(electionDetails[7]),
        totalVotesCast: Number(electionDetails[8]),
      });

      // Fetch candidates for the selected election
      const numCandidates = Number(electionDetails[7]); // Use candidatesCount from electionDetails struct
      const fetchedCandidates = [];
      for (let i = 1; i <= numCandidates; i++) {
        const candidateData = await contract.getCandidate(electionId, i); // Pass electionId to getCandidate
        fetchedCandidates.push({
          id: Number(candidateData[0]),
          name: candidateData[1],
          voteCount: Number(candidateData[2]),
        });
      }
      setCandidates(fetchedCandidates);

      // Total votes for the selected election
      setTotalVotes(Number(electionDetails[8])); // Use totalVotesCast from electionDetails struct

      // Fetch voter info for the selected election for the current account
      const vInfo = await contract.getVoter(electionId, account); // Pass electionId to getVoter
      setVoterInfo({
        authorized: vInfo.authorized,
        voted: vInfo.voted,
        vote: Number(vInfo.candidateIdVotedFor), // This matches the renamed return variable in contract
      });
      showMessage(`Data for election "${electionDetails[1]}" (ID: ${electionId}) fetched successfully!`, 'success');

    } catch (error) {
      console.error(`Error fetching data for election ID ${electionId}:`, error);
      showMessage(`Error fetching election data: ${error.message || 'Unknown error.'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [contract, account, showMessage]);

  // Effect to fetch all elections when contract and account are established
  useEffect(() => {
    if (contract && account) {
      fetchAllElections();
    }
  }, [contract, account, fetchAllElections]);

  // Effect to fetch details for the selected election whenever 'selectedElectionId' changes
  // or when 'contract'/'account' changes after an election is selected
  useEffect(() => {
    if (selectedElectionId > 0 && contract && account) {
      fetchDataForSelectedElection(selectedElectionId);
    } else if (selectedElectionId === 0 && allElections.length > 0) {
        // If no election is selected yet but we have elections, select the most recent one
        setSelectedElectionId(allElections[allElections.length - 1].id);
    }
  }, [selectedElectionId, contract, account, fetchDataForSelectedElection, allElections]);


  // Effect to handle account and chain changes in MetaMask
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          const newAccount = accounts[0];
          setAccount(newAccount);
          try {
            const newProvider = new ethers.BrowserProvider(window.ethereum);
            const newSigner = await newProvider.getSigner(newAccount);
            const newContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner);
            setProvider(newProvider);
            setSigner(newSigner);
            setContract(newContract);
            showMessage(`Switched to account: ${newAccount}`, 'success');
          } catch (error) {
            console.error("Error re-initializing wallet on account change:", error);
            showMessage(`Error re-connecting wallet: ${error.message}`, 'error');
            setAccount(null);
            setContract(null);
            setSigner(null);
          }
        } else {
          // No accounts found or user disconnected
          setAccount(null);
          setContract(null);
          setSigner(null);
          setIsAdmin(false);
          setAllElections([]);
          setSelectedElectionId(0);
          setCurrentElectionDetails(null);
          setCandidates([]);
          setVoterInfo({ authorized: false, voted: false, vote: 0 });
          showMessage('Wallet disconnected or no account selected.', 'error');
        }
      };

      const handleChainChanged = (_chainId) => {
        showMessage('Network changed. Please reload the page.', 'error', 10000);
        setTimeout(() => window.location.reload(), 1000);
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [showMessage]);

  // --- Voter Function (now specific to electionId) ---
  const handleVote = async (candidateId) => {
    // Basic checks before attempting to vote
    if (!contract || !voterInfo.authorized || voterInfo.voted || selectedElectionId === 0) {
      if (!voterInfo.authorized) showMessage('You are not authorized to vote in this election.', 'error');
      else if (voterInfo.voted) showMessage('You have already voted in this election.', 'error');
      else if (selectedElectionId === 0) showMessage('Please select an election to vote in.', 'error');
      return;
    }
    // Check election status
    if (!currentElectionDetails || !currentElectionDetails.isActive) {
        showMessage('Voting is not currently active for this election. Please wait for it to start or select an active election.', 'error');
        return;
    }
    setIsLoading(true);
    try {
      const tx = await contract.vote(selectedElectionId, candidateId); // Pass selectedElectionId
      await tx.wait();
      showMessage(`Successfully voted for candidate ID ${candidateId} in election ID ${selectedElectionId}!`, 'success');
      // Refresh data for the current election only
      await fetchDataForSelectedElection(selectedElectionId);
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
          {/* Display current election details */}
          {currentElectionDetails && (
            <p className="mt-2 text-xl text-gray-300">
              Election: <span className="font-semibold">{currentElectionDetails.name} (ID: {currentElectionDetails.id})</span>
              <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium
                ${currentElectionDetails.isActive ? 'bg-green-600 text-white' :
                  currentElectionDetails.isCompleted ? 'bg-red-600 text-white' :
                  'bg-yellow-600 text-white'}`}>
                {currentElectionDetails.isActive ? 'Active' : currentElectionDetails.isCompleted ? 'Completed' : 'Scheduled'}
              </span>
            </p>
          )}
        </header>

        {/* Election Selector (always visible once elections are loaded and wallet is connected) */}
        {account && allElections.length > 0 && (
            <ElectionSelector
                elections={allElections}
                selectedElectionId={selectedElectionId}
                onSelectElection={setSelectedElectionId} // Function to update selectedElectionId
            />
        )}


        {/* Main Content - Conditional Rendering based on isAdmin */}
        {account && contract ? (
          <main className="space-y-8">
            {isAdmin ? (
              <AdminDashboard
                contract={contract}
                isLoading={isLoading}
                showMessage={showMessage}
                account={account}
                allElections={allElections} // Pass all elections to admin dashboard
                selectedElectionId={selectedElectionId}
                currentElectionDetails={currentElectionDetails} // Pass details for current selected election
                refreshAllElections={fetchAllElections} // To refresh the list of all elections
                refreshSelectedElection={fetchDataForSelectedElection} // To refresh details of the selected election
                setSelectedElectionId={setSelectedElectionId} // Allow admin to change selected election via ElectionSelector
              />
            ) : (
              // Regular Voter/Candidate view
              <>
                <VoterPanel
                  voterInfo={voterInfo}
                  electionName={currentElectionDetails ? currentElectionDetails.name : 'Loading...'}
                  electionId={selectedElectionId}
                  electionStatus={currentElectionDetails ? currentElectionDetails.isActive ? 'Active' : currentElectionDetails.isCompleted ? 'Completed' : 'Scheduled' : 'Unknown'}
                  startTime={currentElectionDetails ? currentElectionDetails.startTime : 0}
                  endTime={currentElectionDetails ? currentElectionDetails.endTime : 0}
                />
                <CandidateList
                  candidates={candidates}
                  totalVotes={totalVotes}
                  voterInfo={voterInfo}
                  isLoading={isLoading}
                  handleVote={handleVote}
                  electionActive={currentElectionDetails ? currentElectionDetails.isActive : false} // Pass active status to disable voting if not active
                />
              </>
            )}
          </main>
        ) : (
          // Display for unconnected or unconfigured state
          <>
            {!account && (
              <div className="mt-10 text-center">
                <p className="text-xl text-gray-400">Please connect your MetaMask wallet to use the DApp.</p>
                <p className="text-sm text-gray-500 mt-2">Ensure you are on the correct network (e.g., CoreDAO Mainnet or Testnet).</p>
              </div>
            )}
            {account && CONTRACT_ADDRESS === "0x5277697271226e191dAe06753Ba3F6F250DC1913" && (
              <div className="mt-10 text-center p-4 bg-yellow-700 rounded-lg">
                <p className="text-xl text-white font-semibold">Configuration Needed!</p>
                <p className="text-md text-yellow-200 mt-2">
                  Please update the <code>CONTRACT_ADDRESS</code> in <code>App.js</code> with your deployed smart contract's address.
                </p>
              </div>
            )}
          </>
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