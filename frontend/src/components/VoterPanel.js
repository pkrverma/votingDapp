// src/components/VoterPanel.js
import React from 'react';

function VoterPanel({ voterInfo, electionName, electionId, electionStatus, startTime, endTime }) {
    const formatTimestamp = (timestamp) => {
        if (!timestamp || timestamp === 0) return 'N/A';
        // Assuming timestamp is in seconds from the contract
        return new Date(Number(timestamp) * 1000).toLocaleString();
    };

    return (
        <div className="voter-panel p-6 bg-gray-900 rounded-xl shadow-2xl mb-8 mr-3">
            <h2 className="text-3xl font-bold mb-4 text-emerald-400 border-b border-gray-700 pb-2">Your Voter Status</h2>
            <p className="text-gray-300 text-lg mb-4">
                Election: <span className="font-semibold">{electionName} (ID: {electionId})</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium
                    ${electionStatus === 'Active' ? 'bg-green-600 text-white' :
                        electionStatus === 'Completed' ? 'bg-red-600 text-white' :
                            'bg-yellow-600 text-white'}`}>
                    {electionStatus}
                </span>
            </p>
            <p className="text-gray-400 text-sm">
                Voting Period: {formatTimestamp(startTime)} to {formatTimestamp(endTime)}
            </p>
            <div className="mt-4 space-y-2">
                <p className="text-lg">
                    Authorization Status: {' '}
                    <span className={`font-semibold ${voterInfo.authorized ? 'text-green-500' : 'text-red-500'}`}>
                        {voterInfo.authorized ? 'Authorized' : 'Not Authorized'}
                    </span>
                </p>
                <p className="text-lg">
                    Vote Cast: {' '}
                    <span className={`font-semibold ${voterInfo.voted ? 'text-blue-400' : 'text-yellow-400'}`}>
                        {voterInfo.voted ? `Yes (Voted for Candidate ID: ${voterInfo.vote})` : 'No'}
                    </span>
                </p>
            </div>
            {!voterInfo.authorized && (
                <p className="text-sm text-yellow-300 mt-4">
                    Please contact the election administrator to get authorized for this election.
                </p>
            )}
        </div>
    );
}

export default VoterPanel;