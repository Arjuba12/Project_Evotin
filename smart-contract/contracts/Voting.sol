// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

contract Voting {
    struct Candidate {
        string name;
        uint votes;
    }

    Candidate[] public candidates;
    mapping(address => bool) public hasVoted;

    function addCandidate(string memory _name) public {
        candidates.push(Candidate(_name, 0));
    }

    function vote(uint _candidateIndex) public {
        require(!hasVoted[msg.sender], "You already voted");
        require(_candidateIndex < candidates.length, "Invalid candidate");

        candidates[_candidateIndex].votes += 1;
        hasVoted[msg.sender] = true;
    }

    function getVotes(uint _candidateIndex) public view returns (uint) {
        require(_candidateIndex < candidates.length, "Invalid candidate");
        return candidates[_candidateIndex].votes;
    }

    function getCandidates() public view returns (string[] memory) {
        string[] memory names = new string[](candidates.length);
        for (uint i = 0; i < candidates.length; i++) {
            names[i] = candidates[i].name;
        }
        return names;
    }
}