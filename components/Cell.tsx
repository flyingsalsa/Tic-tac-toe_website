
import React from 'react';
import { CellValue } from '../types';

interface CellProps {
  value: CellValue;
  onClick: () => void;
  disabled: boolean;
}

const Cell: React.FC<CellProps> = ({ value, onClick, disabled }) => {
  let textClass = '';
  if (value === 'X') {
    textClass = 'text-pink-400';
  } else if (value === 'O') {
    textClass = 'text-indigo-400';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`cell-custom-hover bg-gray-700 rounded-lg flex items-center justify-center text-4xl sm:text-5xl md:text-6xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out ${textClass} ${value !== null ? 'occupied cursor-default' : 'cursor-pointer'} ${disabled && value === null ? 'cursor-not-allowed' : ''}`}
      aria-label={`Cell ${value ? `contains ${value}` : 'empty'}`}
    >
      {value}
    </button>
  );
};

export default Cell;
