// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract votingContract {

    // --- Structs ---

    // Struct to represent a candidate within a specific election
    struct Candidate {
        uint id;
        string name; // Name is included for display
        uint voteCount;
        bool exists; // Added: To track if candidate is currently active/not removed
    }

    // Struct to represent a voter's status within a specific election
    struct Voter {
        bool authorized; // True if the admin authorized this address for the election
        bool voted;      // True if this address has already voted in this election
        uint vote;       // The ID of the candidate voted for (0 if not voted)
    }

    // Struct to represent an entire election
    struct Election {
        uint id;
        string name;
        address admin; // The admin who created this specific election (can be the contract deployer or another admin)
        uint startTime; // Timestamp when voting starts
        uint endTime;    // Timestamp when voting ends
        bool isActive;   // True if voting is currently open
        bool isCompleted; // True if voting has officially ended
        uint candidatesCount; // Total candidates (including removed ones, represents highest ID assigned)
        uint totalVotesCast;  // Total votes cast in THIS election
        // Mappings for candidates and voters within this specific election
        mapping(uint => Candidate) candidates;
        uint[] candidateIds; // Added: Array to hold IDs of currently active candidates for iteration
        mapping(address => Voter) voters;
    }

    // --- State Variables ---

    address public deployer; // The original deployer of this contract, who is the super admin
    uint public nextElectionId; // Counter for unique election IDs

    // Mapping to store all elections by their ID
    mapping(uint => Election) public elections;

    // --- Modifiers ---

    // Only the deployer of the contract can call this (super admin)
    modifier onlyDeployer() {
        require(msg.sender == deployer, "Only contract deployer can perform this action");
        _;
    }

    // Only the admin of a specific election can call this
    modifier onlyElectionAdmin(uint _electionId) {
        require(elections[_electionId].admin == msg.sender, "Only election admin can perform this action");
        _;
    }

    // Checks if an election exists
    modifier electionExists(uint _electionId) {
        require(_electionId > 0 && _electionId < nextElectionId, "Election does not exist");
        _;
    }

    // Checks if voting is currently active for an election
    modifier votingIsActive(uint _electionId) {
        require(elections[_electionId].isActive == true, "Voting is not active for this election");
        require(block.timestamp >= elections[_electionId].startTime, "Voting has not started yet");
        require(block.timestamp <= elections[_electionId].endTime, "Voting has already ended");
        _;
    }

    // --- Events (Highly Recommended for Frontend Interaction) ---
    event ElectionCreated(uint indexed electionId, string name, address indexed admin, uint startTime, uint endTime);
    event ElectionStarted(uint indexed electionId, string name, uint timestamp);
    event ElectionEnded(uint indexed electionId, string name, uint timestamp);
    event CandidateAdded(uint indexed electionId, uint indexed candidateId, string name);
    event CandidateRemoved(uint indexed electionId, uint indexed candidateId, string candidateName); // Added: Event for candidate removal
    event VoterAuthorized(uint indexed electionId, address indexed voterAddress);
    event Voted(uint indexed electionId, address indexed voterAddress, uint indexed candidateId);


    // --- Constructor ---

    // The deployer becomes the super admin
    constructor() {
        deployer = msg.sender;
        nextElectionId = 1; // Start election IDs from 1
    }

    // --- Admin Functions (Accessible by Deployer) ---

    function createElection(string memory _name, uint _startTime, uint _endTime) public onlyDeployer {
        require(bytes(_name).length > 0, "Election name cannot be empty");
        require(_startTime >= block.timestamp, "Start time cannot be in the past");
        require(_endTime > _startTime, "End time must be after start time");

        uint newId = nextElectionId;
        elections[newId].id = newId;
        elections[newId].name = _name;
        elections[newId].admin = msg.sender; // The deployer is also the admin of this election
        elections[newId].startTime = _startTime;
        elections[newId].endTime = _endTime;
        elections[newId].isActive = false; // Not active until explicitly started
        elections[newId].isCompleted = false;
        elections[newId].candidatesCount = 0;
        elections[newId].totalVotesCast = 0;
        // elections[newId].candidateIds will be empty initially

        nextElectionId++; // Increment for the next election

        emit ElectionCreated(newId, _name, msg.sender, _startTime, _endTime);
    }

    function startElection(uint _electionId) public onlyElectionAdmin(_electionId) electionExists(_electionId) {
        Election storage election = elections[_electionId];
        require(!election.isActive, "Election is already active");
        require(!election.isCompleted, "Election is already completed");
        require(block.timestamp < election.endTime, "Election end time has passed");
        require(block.timestamp >= election.startTime, "Election has not reached start time yet"); // Can only start if time has reached

        election.isActive = true;
        emit ElectionStarted(_electionId, election.name, block.timestamp);
    }

    function endElection(uint _electionId) public onlyElectionAdmin(_electionId) electionExists(_electionId) {
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active or already ended");

        election.isActive = false;
        election.isCompleted = true; // Mark as completed
        emit ElectionEnded(_electionId, election.name, block.timestamp);
    }

    function addCandidate(uint _electionId, string memory _name) public onlyElectionAdmin(_electionId) electionExists(_electionId) {
        Election storage election = elections[_electionId];
        require(!election.isActive, "Cannot add candidates to an active election. End it first.");
        require(bytes(_name).length > 0, "Candidate name cannot be empty");

        election.candidatesCount++; // Increment total candidates ever added
        uint newCandidateId = election.candidatesCount;

        // Initialize Candidate with name and exists = true
        election.candidates[newCandidateId] = Candidate(newCandidateId, _name, 0, true);
        election.candidateIds.push(newCandidateId); // Add to the array of active candidate IDs

        emit CandidateAdded(_electionId, newCandidateId, _name);
    }

    // New Function: removeCandidate
    function removeCandidate(uint _electionId, uint _candidateId)
        public
        onlyElectionAdmin(_electionId)
        electionExists(_electionId)
    {
        Election storage election = elections[_electionId];
        require(!election.isActive, "Cannot remove candidates from an active election. End it first.");
        require(election.candidates[_candidateId].exists, "Candidate does not exist or already removed.");
        require(_candidateId != 0, "Invalid candidate ID (ID 0 is reserved/unused).");

        string memory removedCandidateName = election.candidates[_candidateId].name; // Get name before marking as removed

        // Mark the candidate as non-existent
        election.candidates[_candidateId].exists = false;
        // Note: We don't delete the entire struct in the mapping as that might clear vote history
        // if you ever needed it for auditing, but marking 'exists' is enough for current use case.

        // Remove the candidate's ID from the 'candidateIds' array
        // This is a common pattern to remove an element from an array in Solidity efficiently:
        // Swap the element to be removed with the last element, then pop the last element.
        uint indexToRemove = 0;
        bool found = false;
        for (uint i = 0; i < election.candidateIds.length; i++) {
            if (election.candidateIds[i] == _candidateId) {
                indexToRemove = i;
                found = true;
                break;
            }
        }
        require(found, "Candidate ID not found in active list."); // Should always be found if .exists was true

        // Swap with the last element
        election.candidateIds[indexToRemove] = election.candidateIds[election.candidateIds.length - 1];
        // Remove the last element
        election.candidateIds.pop();

        emit CandidateRemoved(_electionId, _candidateId, removedCandidateName);
    }


    function authorizeVoter(uint _electionId, address _voterAddress) public onlyElectionAdmin(_electionId) electionExists(_electionId) {
        Election storage election = elections[_electionId];
        require(!election.isActive, "Cannot authorize voters for an active election. End it first.");
        require(!election.voters[_voterAddress].authorized, "Voter already authorized for this election");

        election.voters[_voterAddress].authorized = true;
        emit VoterAuthorized(_electionId, _voterAddress);
    }

    function vote(uint _electionId, uint _candidateId) public electionExists(_electionId) votingIsActive(_electionId) {
        Election storage election = elections[_electionId];
        require(election.voters[msg.sender].authorized, "Not authorized to vote in this election");
        require(!election.voters[msg.sender].voted, "Already voted in this election");
        require(_candidateId > 0 && _candidateId <= election.candidatesCount, "Invalid candidate ID for this election");
        require(election.candidates[_candidateId].exists, "Candidate does not exist or has been removed."); // Only vote for existing candidates

        election.voters[msg.sender].voted = true;
        election.voters[msg.sender].vote = _candidateId;
        election.candidates[_candidateId].voteCount++;
        election.totalVotesCast++;

        emit Voted(_electionId, msg.sender, _candidateId);
    }

    // --- View Functions ---

    function getElectionDetails(uint _electionId)
        public
        view
        electionExists(_electionId)
        returns (
            uint id,
            string memory name,
            address adminAddr,
            uint startTime,
            uint endTime,
            bool isActive,
            bool isCompleted,
            uint candidatesCount,
            uint totalVotesCast
        )
    {
        Election storage election = elections[_electionId];
        return (
            election.id,
            election.name,
            election.admin,
            election.startTime,
            election.endTime,
            election.isActive,
            election.isCompleted,
            election.candidatesCount,
            election.totalVotesCast
        );
    }

    // getCandidate now explicitly returns 'exists' status for clarity
    function getCandidate(uint _electionId, uint _candidateId)
        public
        view
        electionExists(_electionId)
        returns (uint id, string memory name, uint voteCount, bool exists)
    {
        Election storage election = elections[_electionId];
        // While we check 'exists' here, the frontend should primarily use getCandidateIds to iterate
        require(_candidateId > 0 && _candidateId <= election.candidatesCount, "Invalid candidate ID for this election");
        Candidate storage c = election.candidates[_candidateId];
        return (c.id, c.name, c.voteCount, c.exists);
    }

    // New View Function: To get the IDs of all currently active candidates
    function getElectionCandidateIds(uint _electionId)
        public
        view
        electionExists(_electionId)
        returns (uint[] memory)
    {
        Election storage election = elections[_electionId];
        return election.candidateIds;
    }


    function getVoter(uint _electionId, address _voterAddress)
        public
        view
        electionExists(_electionId)
        returns (bool authorized, bool voted, uint candidateIdVotedFor)
    {
        Election storage election = elections[_electionId];
        Voter storage v = election.voters[_voterAddress];
        return (v.authorized, v.voted, v.vote);
    }

    function getElectionsCount() public view returns (uint) {
        return nextElectionId - 1; // nextElectionId starts at 1, so count is one less
    }
}