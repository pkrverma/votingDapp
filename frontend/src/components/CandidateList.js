import React from 'react';

function CandidateList({ candidates, totalVotes, voterInfo, isLoading, handleVote }) {
  const sortedCandidates = [...candidates].sort((a, b) => b.voteCount - a.voteCount);

  return (
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

      {/* Election Results */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2 text-sky-400">Election Results</h2>
        <p className="text-lg">Total Votes Cast: <span className="font-bold">{totalVotes}</span></p>
        <div className="mt-4 space-y-2">
          {sortedCandidates.map(candidate => (
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
      </div>
    </section>
  );
}

export default CandidateList;