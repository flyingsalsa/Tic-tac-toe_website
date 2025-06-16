
import type { ElysiaWS } from '@elysiajs/ws';

// Basic game types (mirroring frontend for consistency)
export type PlayerSymbol = 'X' | 'O';
export type CellValue = PlayerSymbol | null;
export type BoardState = CellValue[];

export interface Player {
  id: string; // Unique identifier for the player (e.g., WebSocket connection ID or a generated UUID)
  ws: ElysiaWS<any, any, any>; // WebSocket connection instance
  symbol: PlayerSymbol;
}

export interface GameSession {
  sessionId: string;
  players: Player[]; // Max 2 players
  board: BoardState;
  currentPlayer: PlayerSymbol;
  gameActive: boolean;
  winner: PlayerSymbol | null;
  isDraw: boolean;
  hostPlayerId: string | null; // ID of the player who created the session
}

// WebSocket Message Types
export interface ClientMessageBase {
  type: string;
  payload?: any;
}

export interface MakeMovePayload {
  index: number;
}
export interface ClientMakeMoveMessage extends ClientMessageBase {
  type: 'make_move';
  payload: MakeMovePayload;
}

export interface ClientNewGameRequestMessage extends ClientMessageBase {
  type: 'request_new_game'; // For rematch or starting a new game within session
}

export type ClientMessage = ClientMakeMoveMessage | ClientNewGameRequestMessage;


export interface ServerMessageBase {
  type: string;
  payload?: any;
}

export interface GameStatePayload {
  board: BoardState;
  currentPlayer: PlayerSymbol;
  gameActive: boolean;
  winner: PlayerSymbol | null;
  isDraw: boolean;
  mySymbol?: PlayerSymbol; // Tell client which symbol they are
  opponentSymbol?: PlayerSymbol;
  yourTurn?: boolean;
}
export interface ServerGameStateUpdateMessage extends ServerMessageBase {
  type: 'game_state_update';
  payload: GameStatePayload;
}

export interface ServerGameStartMessage extends ServerMessageBase {
  type: 'game_start';
  payload: GameStatePayload;
}

export interface ServerOpponentJoinedMessage extends ServerMessageBase {
  type: 'opponent_joined';
  payload: { opponentSymbol: PlayerSymbol };
}

export interface ServerOpponentDisconnectedMessage extends ServerMessageBase {
  type: 'opponent_disconnected';
  payload: { message: string };
}

export interface ServerErrorMessage extends ServerMessageBase {
  type: 'error';
  payload: { message: string };
}

export interface ServerGameCreatedMessage extends ServerMessageBase {
    type: 'game_created';
    payload: { sessionId: string; playerSymbol: PlayerSymbol; playerId: string };
}

export interface ServerGameJoinedMessage extends ServerMessageBase {
    type: 'game_joined';
    payload: { sessionId: string; playerSymbol: PlayerSymbol; playerId: string; gameState: GameStatePayload };
}


export type ServerMessage = 
  ServerGameStateUpdateMessage | 
  ServerGameStartMessage |
  ServerOpponentJoinedMessage |
  ServerOpponentDisconnectedMessage |
  ServerErrorMessage |
  ServerGameCreatedMessage |
  ServerGameJoinedMessage;

// HTTP API Response Types
export interface CreateSessionResponse {
  sessionId: string;
  playerSymbol: PlayerSymbol;
  playerId: string; // A unique ID for this player in this session
}

export interface JoinSessionResponse {
  sessionId: string;
  playerSymbol: PlayerSymbol;
  playerId: string;
  gameState: GameStatePayload; // Initial game state for the joining player
}

export interface ErrorResponse {
  error: string;
}
