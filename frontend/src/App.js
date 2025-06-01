import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import ContractAbiJson from './votingContractAbi.json'; // Ensure this path is correct for your ABI

// Import components
import AdminDashboard from './components/AdminDashboard';
import VoterPanel from './components/VoterPanel';
import CandidateList from './components/CandidateList';
import MessageDisplay from './components/MessageDisplay';
import LoadingOverlay from './components/LoadingOverlay';
import ElectionSelector from './components/ElectionSelector';

// --- Contract Configuration ---
// !!! IMPORTANT: REPLACE THIS WITH YOUR DEPLOYED CONTRACT ADDRESS !!!
const CONTRACT_ADDRESS = "0x5277697271226e191dAe06753Ba3F6F250DC1913";
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
    if (!contract || !account) return; // Ensure contract and account are ready
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
      // This helps in initial load or after a new election is created
      if (fetchedElections.length > 0 && selectedElectionId === 0) {
          setSelectedElectionId(fetchedElections[fetchedElections.length - 1].id);
      }
      // Commented to reduce message spam
      // showMessage('All elections fetched!', 'info');

    } catch (error) {
      console.error("Error fetching all elections:", error);
      showMessage(`Error fetching elections: ${error.message || 'Contract not found or network error.'}`, 'error');
      // Provide a specific warning if the default address is still in use
      if (CONTRACT_ADDRESS === "0x5277697271226e191dAe06753Ba3F6F250DC1913") {
        showMessage("Please update the CONTRACT_ADDRESS in App.js with your deployed contract's address.", "error", 10000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [contract, account, showMessage, selectedElectionId]);


  // Fetch data specifically for the currently selected election ID
  const fetchDataForSelectedElection = useCallback(async (electionId) => {
    // Clear previous details if no valid electionId or prerequisites are met
    if (!contract || !account || electionId === 0) {
        setCurrentElectionDetails(null);
        setCandidates([]);
        setVoterInfo({ authorized: false, voted: false, vote: 0 });
        setTotalVotes(0);
        return;
    }

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
      // Commented to reduce message spam
      // showMessage(`Data for election "${electionDetails[1]}" (ID: ${electionId}) fetched successfully!`, 'success');

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
  }, [contract, account, fetchAllElections]); // Dependency array: re-run if contract, account, or fetchAllElections changes

  // Effect to fetch details for the selected election whenever 'selectedElectionId' changes
  useEffect(() => {
    // Only fetch if a valid election ID is selected AND contract/account are ready
    if (selectedElectionId > 0 && contract && account) {
      fetchDataForSelectedElection(selectedElectionId);
    } else if (selectedElectionId === 0 && allElections.length > 0) {
        // If no election is currently selected, but we have elections, select the most recent one
        setSelectedElectionId(allElections[allElections.length - 1].id);
    } else {
        // If no elections exist or no election is selected, clear current details
        setCurrentElectionDetails(null);
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
            showMessage(`Switched to account: ${newAccount.substring(0, 6)}...${newAccount.substring(newAccount.length - 4)}`, 'success');
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
        // A slight delay ensures the message is visible before reload
        setTimeout(() => window.location.reload(), 1000);
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        // Clean up event listeners on component unmount
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

      {/* Outer container to control overall content width and centering */}
      {/* max-w-screen-xl (1280px) is a good balance for content width. Adjust if you need more or less. */}
      {/* px-4 sm:px-6 lg:px-8 provides responsive horizontal padding for the container itself */}
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 p-4 sm:p-6 bg-gray-800 rounded-xl shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sky-400 text-center sm:text-left">CoreDAO Voting DApp</h1>
            {!account ? (
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="px-5 py-2 sm:px-6 sm:py-2 bg-sky-500 hover:bg-sky-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50 text-sm sm:text-base"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="text-center sm:text-right">
                <p className="text-xs sm:text-sm text-gray-400">Connected Account:</p>
                <p className="text-sm sm:text-base font-mono break-all">{account}</p>
              </div>
            )}
          </div>
          {/* Display current election details */}
          {currentElectionDetails && (
            <p className="mt-3 text-base sm:text-lg text-gray-300 text-center sm:text-left">
              Election: <span className="font-semibold">{currentElectionDetails.name} (ID: {currentElectionDetails.id})</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium
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
                onSelectElection={setSelectedElectionId}
            />
        )}


        {/* Main Content - Conditional Rendering based on isAdmin */}
        {account && contract ? (
          <main className="mt-8"> {/* Adjusted margin-top for spacing from header/selector */}
            {isAdmin ? (
              // Admin dashboard takes full width when active
              <AdminDashboard
                contract={contract}
                isLoading={isLoading}
                showMessage={showMessage}
                account={account}
                allElections={allElections}
                selectedElectionId={selectedElectionId}
                currentElectionDetails={currentElectionDetails}
                refreshAllElections={fetchAllElections}
                refreshSelectedElection={fetchDataForSelectedElection}
                setSelectedElectionId={setSelectedElectionId}
              />
            ) : (
              // Regular Voter/Candidate view - Use Grid for responsive two-column layout
              // Stacks on small screens (grid-cols-1), goes to 2 columns on medium screens (md:grid-cols-2)
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Voter Panel takes one column */}
                <div>
                  <VoterPanel
                    voterInfo={voterInfo}
                    electionName={currentElectionDetails ? currentElectionDetails.name : 'Loading...'}
                    electionId={selectedElectionId}
                    electionStatus={(currentElectionDetails
                      ? currentElectionDetails.isActive
                        ? 'Active'
                        : currentElectionDetails.isCompleted
                          ? 'Completed'
                          : 'Unknown'
                      : 'Unknown')}
                    startTime={currentElectionDetails ? currentElectionDetails.startTime : 0}
                    endTime={currentElectionDetails ? currentElectionDetails.endTime : 0}
                  />
                </div>
                {/* Candidate List takes the other column */}
                <div>
                  <CandidateList
                    candidates={candidates}
                    totalVotes={totalVotes}
                    voterInfo={voterInfo}
                    isLoading={isLoading}
                    handleVote={handleVote}
                    electionActive={currentElectionDetails ? currentElectionDetails.isActive : false}
                  />
                </div>
              </div>
            )}
          </main>
        ) : (
          // Display for unconnected or unconfigured state
          <div className="mt-10 text-center p-4 sm:p-6 bg-gray-800 rounded-xl shadow-2xl">
            {!account && (
              <p className="text-lg sm:text-xl text-gray-400">Please connect your MetaMask wallet to use the DApp.</p>
            )}
            <p className="text-sm sm:text-base text-gray-500 mt-2">Ensure you are on the correct network (e.g., CoreDAO Mainnet or Testnet).</p>
            {account && CONTRACT_ADDRESS === "0x5277697271226e191dAe06753Ba3F6F250DC1913" && (
              <div className="mt-6 p-3 sm:p-4 bg-yellow-700 rounded-lg">
                <p className="text-lg sm:text-xl text-white font-semibold">Configuration Needed!</p>
                <p className="text-sm sm:text-md text-yellow-200 mt-2">
                  Please update the `CONTRACT_ADDRESS` in `App.js` with your deployed smart contract's address.
                </p>
              </div>
            )}
          </div>
        )}
      </div> {/* End of main content wrapper */}

      <footer className="w-full max-w-screen-xl mx-auto mt-12 mb-6 text-center text-gray-500 text-xs sm:text-sm">
        <p>CoreDAO Voting DApp &copy; 2024</p>
        <p>Ensure your MetaMask is connected to the appropriate CoreDAO network.</p>
      </footer>
    </div>
  );
}

export default App;