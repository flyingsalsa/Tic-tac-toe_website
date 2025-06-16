
import React from 'react';
import { Player } from '../types';

interface PlayerInfoProps {
  mySymbol: Player | null;
  currentPlayer: Player;
  gameActive: boolean;
  gameStatusMessage: string;
  statusMessageType: 'default' | 'success' | 'warning' | 'error';
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ mySymbol, currentPlayer, gameActive, gameStatusMessage, statusMessageType }) => {
  
  let turnText = "";
  let turnTextColor = "text-gray-300";

  if (gameActive) {
    if (mySymbol) {
      if (currentPlayer === mySymbol) {
        turnText = "(Your turn)";
        turnTextColor = "text-green-400 animate-pulse";
      } else {
        turnText = "(Opponent's turn)";
        turnTextColor = "text-yellow-400";
      }
    } else {
       turnText = `Player ${currentPlayer}'s turn`;
       turnTextColor = "text-indigo-300";
    }
  } else if (mySymbol) {
     turnText = "Game not active";
  }


  let statusColor = "text-indigo-300";
  if (statusMessageType === 'success') statusColor = "text-green-400";
  else if (statusMessageType === 'warning') statusColor = "text-yellow-400";
  else if (statusMessageType === 'error') statusColor = "text-red-400";
  
  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg neon-border-custom">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <i className="fas fa-user-astronaut mr-2 text-indigo-400"></i> Player Info
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Your Symbol</label>
          <div className="flex items-center">
            <div className={`w-10 h-10 flex items-center justify-center text-2xl font-bold rounded-full ${mySymbol ? (mySymbol === 'X' ? 'bg-pink-700 text-pink-300' : 'bg-indigo-700 text-indigo-300') : 'bg-gray-700 text-gray-400'}`}>
              {mySymbol || '?'}
            </div>
            {gameActive && mySymbol && <span className={`ml-3 text-sm ${turnTextColor}`}>{turnText}</span>}
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Game Status</label>
          <div className={`text-lg font-medium ${statusColor}`}>
            {gameStatusMessage}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerInfo;
