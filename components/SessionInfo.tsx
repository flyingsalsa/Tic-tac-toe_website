
import React from 'react';
import { Player } from '../types';

interface SessionInfoProps {
  sessionId: string;
  onCopy: () => void;
  joinSessionInputValue: string;
  onJoinSessionInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onJoin: () => void;
  copyButtonText: React.ReactNode;
  joinButtonText: string;
  isGameActive: boolean;
  mySymbol: Player | null;
}

const SessionInfo: React.FC<SessionInfoProps> = ({ 
  sessionId, 
  onCopy, 
  joinSessionInputValue, 
  onJoinSessionInputChange, 
  onJoin, 
  copyButtonText,
  joinButtonText,
  isGameActive,
  mySymbol
}) => {
  const canJoin = !isGameActive || !mySymbol; // Can join if no game active or this client hasn't taken a symbol

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg neon-border-custom">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <i className="fas fa-share-alt mr-2 text-pink-400"></i> Multiplayer
      </h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="sessionIdDisplay" className="block text-sm text-gray-400 mb-1">Session ID</label>
          <div className="flex">
            <input 
              id="sessionIdDisplay" 
              type="text" 
              value={sessionId} 
              readOnly 
              className="flex-1 bg-gray-700 border border-gray-600 rounded-l-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button 
              onClick={onCopy} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-r-lg transition duration-150 ease-in-out"
              aria-label="Copy session ID"
            >
              {copyButtonText}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="joinSessionInput" className="block text-sm text-gray-400 mb-1">Join Session</label>
          <div className="flex">
            <input 
              id="joinSessionInput"
              type="text" 
              placeholder="Enter session ID" 
              value={joinSessionInputValue}
              onChange={onJoinSessionInputChange}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-l-lg px-4 py-2 text-sm focus:outline-none focus:border-pink-500"
              disabled={!canJoin || joinButtonText === 'Joined!'}
            />
            <button 
              onClick={onJoin}
              className="bg-pink-600 hover:bg-pink-700 text-white font-medium px-4 py-2 rounded-r-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canJoin || !joinSessionInputValue.trim() || joinButtonText === 'Joined!'}
            >
              {joinButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionInfo;
