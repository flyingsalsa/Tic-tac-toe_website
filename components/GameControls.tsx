
import React from 'react';

interface GameControlsProps {
  onNewGame: () => void;
  onResetGame: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({ onNewGame, onResetGame }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg neon-border-custom">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <i className="fas fa-gamepad mr-2 text-purple-400"></i> Controls
      </h2>
      <div className="space-y-4">
        <button 
          onClick={onNewGame}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition transform hover:scale-105 duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75"
        >
          <i className="fas fa-plus mr-2"></i> New Game
        </button>
        <button 
          onClick={onResetGame}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition transform hover:scale-105 duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
        >
          <i className="fas fa-redo mr-2"></i> Reset Game
        </button>
      </div>
    </div>
  );
};

export default GameControls;
