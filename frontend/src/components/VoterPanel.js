import React from 'react';

function VoterPanel({ voterInfo }) {
  return (
    <section className="p-6 bg-gray-800 rounded-xl shadow-xl">
      <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2 text-sky-400">Your Voting Status</h2>
      {!voterInfo.authorized && <p className="text-yellow-400">You are not yet authorized to vote. Please contact the admin.</p>}
      {voterInfo.authorized && voterInfo.voted && <p className="text-green-400">You have successfully voted for candidate ID: {voterInfo.vote}.</p>}
      {voterInfo.authorized && !voterInfo.voted && <p className="text-blue-400">You are authorized to vote. Please select a candidate below to vote.</p>}
    </section>
  );
}

export default VoterPanel;