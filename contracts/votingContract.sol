// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract votingContract {
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }
    
    struct Voter {
        bool authorized;
        bool voted;
        uint vote;
    }
    
    address public admin;
    string public electionName;
    mapping(address => Voter) public voters;
    mapping(uint => Candidate) public candidates;
    uint public candidatesCount;
    uint public totalVotes;
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    constructor(string memory _name) {
        admin = msg.sender;
        electionName = _name;
    }
    
    function addCandidate(string memory _name) public onlyAdmin {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }
    
    function authorizeVoter(address _voter) public onlyAdmin {
        voters[_voter].authorized = true;
    }
    
    function vote(uint _candidateId) public {
        require(voters[msg.sender].authorized, "Not authorized to vote");
        require(!voters[msg.sender].voted, "Already voted");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");
        
        voters[msg.sender].voted = true;
        voters[msg.sender].vote = _candidateId;
        candidates[_candidateId].voteCount++;
        totalVotes++;
    }
    
    function getCandidate(uint _candidateId) public view returns (uint, string memory, uint) {
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");
        Candidate memory c = candidates[_candidateId];
        return (c.id, c.name, c.voteCount);
    }
}