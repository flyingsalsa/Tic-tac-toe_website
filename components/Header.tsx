
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center mb-6 md:mb-10">
      <h1 className="text-4xl md:text-6xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500">
        Cosmic Tic Tac Toe
      </h1>
      <p className="text-lg text-gray-300">A stylish multiplayer React experience</p>
    </header>
  );
};

export default Header;
