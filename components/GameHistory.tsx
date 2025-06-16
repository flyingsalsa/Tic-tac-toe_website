
import React from 'react';
import { GameHistoryEntry } from '../types';

interface GameHistoryProps {
  history: GameHistoryEntry[];
}

const GameHistory: React.FC<GameHistoryProps> = ({ history }) => {
  const getItemClass = (type: GameHistoryEntry['type']) => {
    switch (type) {
      case 'win': return 'text-green-400 bg-green-900 bg-opacity-30 border-l-4 border-green-500';
      case 'draw': return 'text-yellow-400 bg-yellow-900 bg-opacity-30 border-l-4 border-yellow-500';
      case 'info': return 'text-blue-300 bg-blue-900 bg-opacity-30 border-l-4 border-blue-500';
      default: return 'text-gray-300 bg-gray-700';
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg neon-border-custom">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <i className="fas fa-history mr-2 text-blue-400"></i> Game History
      </h2>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2"> {/* Added pr-2 for scrollbar space */}
        {history.length === 0 ? (
          <div className="text-sm text-gray-400 italic">No games played yet. Start a new game!</div>
        ) : (
          history.map((item) => (
            <div 
              key={item.id} 
              className={`text-sm py-2 px-3 rounded-md shadow ${getItemClass(item.type)}`}
            >
              {item.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GameHistory;
