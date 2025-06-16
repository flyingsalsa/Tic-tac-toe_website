
import React from 'react';
import { BoardState } from '../types';
import Cell from './Cell';

interface GameBoardProps {
  board: BoardState;
  onCellClick: (index: number) => void;
  disabled: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ board, onCellClick, disabled }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6 shadow-xl neon-border-custom">
      <div className="grid grid-cols-3 gap-3 md:gap-4 aspect-square">
        {board.map((value, index) => (
          <Cell 
            key={index} 
            value={value} 
            onClick={() => onCellClick(index)}
            disabled={disabled || value !== null}
          />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
