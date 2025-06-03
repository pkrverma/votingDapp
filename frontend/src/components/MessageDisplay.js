import React from 'react';

function MessageDisplay({ message }) {
    if (!message || !message.text) return null;

    const bgColor = message.type === 'success' ? 'bg-green-600' : (message.type === 'error' ? 'bg-red-600': 'bg-yellow-600');

    return (
        <div
            className={`fixed top-5 right-5 p-3 rounded-lg shadow-lg text-sm z-50 text-white animate-fadeInOut ${bgColor}`}
            style={{ animation: 'fadeInOut 5s forwards' }}
        >
            {message.text}
        </div>
    );
}

export default MessageDisplay;
