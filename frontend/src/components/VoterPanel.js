// src/components/VoterPanel.js
import React from 'react';

function VoterPanel({ voterInfo, electionName, electionId, electionStatus, startTime, endTime }) {
    const formatTimestamp = (timestamp) => {
        if (!timestamp || timestamp === 0) return 'N/A';
        // Assuming timestamp is in seconds from the contract
        return new Date(Number(timestamp) * 1000).toLocaleString();
    };

    return (
        <div className="voter-panel p-6 bg-blue-950 rounded-xl shadow-2xl mb-8 mr-3">
            <h2 className="text-3xl font-bold mb-4 text-yellow-400 border-b border-blue-700 pb-2">Your Voter Status</h2>
            <p className="text-gray-100 text-lg mb-4">
                Election: <span className="font-semibold">{electionName || 'N/A'} (ID: {electionId ? String(electionId) : 'N/A'})</span>
                {electionStatus && (
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium
                        ${electionStatus === 'Active' ? 'bg-green-600 text-white' :
                            electionStatus === 'Completed' ? 'bg-red-600 text-white' :
                                'bg-yellow-500 text-blue-950'}`}> {/* Default/Scheduled uses gold theme */}
                        {electionStatus}
                    </span>
                )}
            </p>
            <p className="text-gray-300 text-sm">
                Voting Period: {formatTimestamp(startTime)} to {formatTimestamp(endTime)}
            </p>

            {voterInfo && ( // Check if voterInfo is available
                <div className="mt-4 space-y-2">
                    <p className="text-lg text-gray-100">
                        Authorization Status: {' '}
                        <span className={`font-semibold ${voterInfo.authorized ? 'text-green-400' : 'text-red-400'}`}> {/* Adjusted shades for better harmony if needed, green-500/red-500 are also good */}
                            {voterInfo.authorized ? 'Authorized' : 'Not Authorized'}
                        </span>
                    </p>
                    <p className="text-lg text-gray-100">
                        Vote Cast: {' '}
                        <span className={`font-semibold ${voterInfo.voted ? 'text-yellow-300' : 'text-yellow-400'}`}>
                            {voterInfo.voted ? `Yes (Voted for Candidate ID: ${voterInfo.vote ? String(voterInfo.vote) : 'Unknown'})` : 'No'}
                        </span>
                    </p>
                </div>
            )}

            {voterInfo && !voterInfo.authorized && (
                <p className="text-sm text-yellow-400 mt-4">
                    Please contact the election administrator to get authorized for this election.
                </p>
            )}
             {!voterInfo && ( // Fallback if voterInfo is not yet loaded or unavailable
                <p className="text-gray-300 mt-4">Loading voter information or no election selected...</p>
            )}
        </div>
    );
}

export default VoterPanel;