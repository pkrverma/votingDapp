// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract votingContract is Ownable {
    address private _deployer; // The initial deployer of this contract (super admin)

    struct Election {
        uint256 id;
        string name;
        address admin; // The address that created this specific election
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isCompleted;
        uint256 candidatesCount; // Total candidates ever added (even if removed)
        uint256 totalVotesCast;
        mapping(uint256 => Candidate) candidates; // Using candidate IDs
        uint256[] candidateIds; // To keep track of active candidate IDs for iteration
        mapping(address => Voter) voters; // Mapping voter address to Voter struct
        address[] authorizedVoterAddresses; // Array to store authorized voter addresses
    }

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
        bool exists; // To mark if a candidate is still active or "removed"
    }

    struct Voter {
        bool authorized;
        bool voted;
        uint256 candidateIdVotedFor;
    }

    uint256 public nextElectionId;
    mapping(uint256 => Election) public elections;

    event ElectionCreated(uint256 indexed electionId, string name, address indexed admin, uint256 startTime, uint256 endTime);
    event ElectionStarted(uint256 indexed electionId);
    event ElectionEnded(uint256 indexed electionId, address indexed winner); // winner address, maybe candidate ID too
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name);
    event CandidateRemoved(uint256 indexed electionId, uint256 indexed candidateId);
    event VoterAuthorized(uint256 indexed electionId, address indexed voterAddress);
    event VoterVoteCast(uint256 indexed electionId, address indexed voterAddress, uint256 indexed candidateId);
    event VoterAuthorizationRevoked(uint256 indexed electionId, address indexed voterAddress);


    modifier onlyElectionAdmin(uint256 _electionId) {
        require(msg.sender == elections[_electionId].admin, "Only the election admin can perform this action.");
        _;
    }

    modifier onlySuperAdminOrElectionAdmin(uint256 _electionId) {
        require(msg.sender == owner() || msg.sender == elections[_electionId].admin, "Only super admin or election admin can perform this action.");
        _;
    }

    constructor() Ownable(msg.sender) {
        nextElectionId = 1;
        _deployer = msg.sender; // Store deployer in a private variable
    }

    function getDeployer() public view returns (address) {
        return _deployer;
    }

    function createElection(string calldata _name, uint256 _startTime, uint256 _endTime) public onlyOwner {
        require(_endTime > _startTime, "End time must be after start time");
        require(_startTime > block.timestamp, "Start time must be in the future");

        elections[nextElectionId].id = nextElectionId;
        elections[nextElectionId].name = _name;
        elections[nextElectionId].admin = msg.sender;
        elections[nextElectionId].startTime = _startTime;
        elections[nextElectionId].endTime = _endTime;
        elections[nextElectionId].isActive = false;
        elections[nextElectionId].isCompleted = false;
        elections[nextElectionId].candidatesCount = 0;
        elections[nextElectionId].totalVotesCast = 0;

        emit ElectionCreated(nextElectionId, _name, msg.sender, _startTime, _endTime);
        nextElectionId++;
    }

    function startElection(uint256 _electionId) public onlyElectionAdmin(_electionId) {
        Election storage election = elections[_electionId];
        require(!election.isActive, "Election is already active");
        require(!election.isCompleted, "Election has already ended");
        // It's generally good practice to allow an election to be started even if its startTime has passed
        // but it hasn't been explicitly started yet.
        // If you strictly want to prevent starting before startTime, keep:
        // require(block.timestamp >= election.startTime, "Election has not started yet");

        election.isActive = true;
        emit ElectionStarted(_electionId);
    }

    function endElection(uint256 _electionId) public onlyElectionAdmin(_electionId) {
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active");
        require(!election.isCompleted, "Election has already ended");
        // Removed the line: require(block.timestamp >= election.endTime, "Cannot end election before its scheduled end time.");

        election.isActive = false;
        election.isCompleted = true;

        // Optionally, calculate and emit the winner here
        address winnerAddress = address(0);
        uint256 highestVotes = 0;
        uint256 winningCandidateId = 0;

        for (uint i = 0; i < election.candidateIds.length; i++) {
            uint256 candidateId = election.candidateIds[i];
            Candidate storage candidate = election.candidates[candidateId];
            if (candidate.exists && candidate.voteCount > highestVotes) {
                highestVotes = candidate.voteCount;
                winningCandidateId = candidateId;
                // Note: If multiple candidates have the same highest votes, the one iterated last wins.
                // For tie-breaking, more complex logic would be needed.
            }
        }
        // If a winner is found, set winnerAddress to the contract address of the winning candidate, or their unique ID
        // For simplicity, let's just emit address(0) or the winning candidate's ID if found
        // If you had candidate "addresses" you could emit that.
        // For now, we'll keep emitting address(0) for simplicity unless you define candidate addresses.
        // Or, you could return the winningCandidateId and update the event to include it.

        emit ElectionEnded(_electionId, winnerAddress); // Still emitting address(0) for winner for now
    }

    function addCandidate(uint256 _electionId, string calldata _name) public onlyElectionAdmin(_electionId) {
        Election storage election = elections[_electionId];
        require(!election.isActive, "Cannot add candidates to an active election");
        require(!election.isCompleted, "Cannot add candidates to a completed election");
        require(bytes(_name).length > 0, "Candidate name cannot be empty");

        election.candidatesCount++;
        uint256 newCandidateId = election.candidatesCount;

        election.candidates[newCandidateId].id = newCandidateId;
        election.candidates[newCandidateId].name = _name;
        election.candidates[newCandidateId].voteCount = 0;
        election.candidates[newCandidateId].exists = true;

        election.candidateIds.push(newCandidateId);

        emit CandidateAdded(_electionId, newCandidateId, _name);
    }

    function removeCandidate(uint256 _electionId, uint256 _candidateId) public onlyElectionAdmin(_electionId) {
        Election storage election = elections[_electionId];
        require(!election.isActive, "Cannot remove candidates from an active election");
        require(!election.isCompleted, "Cannot remove candidates from a completed election");
        require(election.candidates[_candidateId].exists, "Candidate does not exist");

        election.candidates[_candidateId].exists = false;

        bool found = false;
        for (uint i = 0; i < election.candidateIds.length; i++) {
            if (election.candidateIds[i] == _candidateId) {
                election.candidateIds[i] = election.candidateIds[election.candidateIds.length - 1];
                election.candidateIds.pop();
                found = true;
                break;
            }
        }
        require(found, "Candidate ID not found in active list");

        emit CandidateRemoved(_electionId, _candidateId);
    }

    function authorizeVoter(uint256 _electionId, address _voterAddress) public onlyElectionAdmin(_electionId) {
        Election storage election = elections[_electionId];
        require(!election.isActive, "Cannot authorize voters for an active election");
        require(!election.isCompleted, "Cannot authorize voters for a completed election");
        require(!election.voters[_voterAddress].authorized, "Voter is already authorized");

        election.voters[_voterAddress].authorized = true;
        election.voters[_voterAddress].voted = false;
        election.voters[_voterAddress].candidateIdVotedFor = 0;

        election.authorizedVoterAddresses.push(_voterAddress);

        emit VoterAuthorized(_electionId, _voterAddress);
    }

    function revokeVoterAuthorization(uint256 _electionId, address _voterAddress) public onlyElectionAdmin(_electionId) {
        Election storage election = elections[_electionId];
        require(!election.isActive, "Cannot revoke authorization from an active election");
        require(!election.isCompleted, "Cannot revoke authorization from a completed election");
        require(election.voters[_voterAddress].authorized, "Voter is not authorized");
        require(!election.voters[_voterAddress].voted, "Cannot revoke authorization for a voter who has already voted");

        election.voters[_voterAddress].authorized = false;

        bool found = false;
        for (uint i = 0; i < election.authorizedVoterAddresses.length; i++) {
            if (election.authorizedVoterAddresses[i] == _voterAddress) {
                election.authorizedVoterAddresses[i] = election.authorizedVoterAddresses[election.authorizedVoterAddresses.length - 1];
                election.authorizedVoterAddresses.pop();
                found = true;
                break;
            }
        }
        require(found, "Voter address not found in authorized list");

        emit VoterAuthorizationRevoked(_electionId, _voterAddress);
    }

    function vote(uint256 _electionId, uint256 _candidateId) public {
        Election storage election = elections[_electionId];
        Voter storage voter = election.voters[msg.sender];

        require(election.isActive, "Election is not active or has ended");
        require(voter.authorized, "You are not authorized to vote in this election");
        require(!voter.voted, "You have already voted in this election");
        require(election.candidates[_candidateId].exists, "Candidate does not exist or has been removed");

        election.candidates[_candidateId].voteCount++;
        voter.voted = true;
        voter.candidateIdVotedFor = _candidateId;
        election.totalVotesCast++;

        emit VoterVoteCast(_electionId, msg.sender, _candidateId);
    }

    function getElectionsCount() public view returns (uint256) {
        return nextElectionId - 1;
    }

    function getElectionDetails(uint256 _electionId) public view returns (
        uint256 id,
        string memory name,
        address admin,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        bool isCompleted,
        uint256 candidatesCount,
        uint256 totalVotesCast
    ) {
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

    function getCandidate(uint256 _electionId, uint256 _candidateId) public view returns (
        uint256 id,
        string memory name,
        uint256 voteCount,
        bool exists
    ) {
        Election storage election = elections[_electionId];
        Candidate storage candidate = election.candidates[_candidateId];
        return (
            candidate.id,
            candidate.name,
            candidate.voteCount,
            candidate.exists
        );
    }

    function getElectionCandidateIds(uint256 _electionId) public view returns (uint256[] memory) {
        return elections[_electionId].candidateIds;
    }

    function getVoter(uint256 _electionId, address _voterAddress) public view returns (
        bool authorized,
        bool voted,
        uint256 candidateIdVotedFor
    ) {
        Voter storage voter = elections[_electionId].voters[_voterAddress];
        return (
            voter.authorized,
            voter.voted,
            voter.candidateIdVotedFor
        );
    }

    function getAuthorizedVoters(uint256 _electionId) public view returns (address[] memory) {
        return elections[_electionId].authorizedVoterAddresses;
    }
}