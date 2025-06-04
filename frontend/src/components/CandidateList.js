// src/components/CandidateList.js
import React from 'react';

function CandidateList({ candidates, totalVotes, voterInfo, isLoading, handleVote, electionActive }) {
  return (
    <div className="candidate-list p-6 bg-blue-950 rounded-xl shadow-2xl mb-8 ml-3">
      <h2 className="text-3xl font-bold mb-4 text-purple-400 border-b border-gray-700 pb-2">Candidates</h2>
      {candidates.length === 0 ? (
        <p className="text-gray-400">No candidates registered for this election yet.</p>
      ) : (
        <>
          <p className="text-gray-300 text-lg mb-4">Total Votes Cast: <span className="font-bold">{totalVotes}</span></p>
          <ul className="space-y-4">
            {candidates.map((candidate) => (
              <li key={candidate.id} className="bg-blue-900 p-4 rounded-lg shadow flex justify-between items-center">
                <div>
                  <p className="text-xl font-semibold text-white">{candidate.name}</p>
                  <p className="text-gray-400">Votes: <span className="font-bold text-lg">{candidate.voteCount}</span></p>
                </div>
                <button
                  onClick={() => handleVote(candidate.id)}
                  disabled={isLoading || !voterInfo.authorized || voterInfo.voted || !electionActive}
                  className="px-6 py-2 bg-yellow-500 hover:bg-blue-600 rounded-lg text-white font-semibold transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {voterInfo.voted && voterInfo.vote === candidate.id ? 'Voted' : 'Vote'}
                </button>
              </li>
            ))}
          </ul>
          {!voterInfo.authorized && <p className="text-sm text-yellow-300 mt-4 text-center">You must be authorized to vote.</p>}
          {voterInfo.voted && <p className="text-sm text-green-300 mt-4 text-center">You have already voted in this election.</p>}
          {!electionActive && <p className="text-sm text-red-300 mt-4 text-center">Voting is not currently active for this election.</p>}
        </>
      )}
    </div>
  );
}

export default CandidateList;