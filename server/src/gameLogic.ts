
import { BoardState, PlayerSymbol } from './types';

export const INITIAL_BOARD: BoardState = Array(9).fill(null);
export const INITIAL_PLAYER: PlayerSymbol = 'X';

export const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];

export function checkWin(board: BoardState, player: PlayerSymbol): boolean {
  if (!player) return false;
  return WIN_PATTERNS.some(pattern =>
    pattern.every(index => board[index] === player)
  );
}

export function checkDraw(board: BoardState): boolean {
  return board.every(cell => cell !== null) && !checkWin(board, 'X') && !checkWin(board, 'O');
}
