
import {
  GameSession, Player, PlayerSymbol, BoardState, ClientMessage,
  ServerMessage, GameStatePayload, CreateSessionResponse, JoinSessionResponse, ErrorResponse
} from './types';
import { INITIAL_BOARD, INITIAL_PLAYER, checkWin, checkDraw } from './gameLogic';
import type { ElysiaWS } from '@elysiajs/ws';

const activeSessions = new Map<string, GameSession>();

function generateUniqueId(length: number = 6): string {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

export function createNewSession(hostPlayerId: string): CreateSessionResponse {
  const sessionId = generateUniqueId();
  const session: GameSession = {
    sessionId,
    players: [],
    board: [...INITIAL_BOARD],
    currentPlayer: INITIAL_PLAYER,
    gameActive: false, // Becomes active when second player joins
    winner: null,
    isDraw: false,
    hostPlayerId: hostPlayerId,
  };
  activeSessions.set(sessionId, session);
  console.log(`Session created: ${sessionId} by host ${hostPlayerId}`);
  return { sessionId, playerSymbol: 'X', playerId: hostPlayerId };
}

export function attemptToJoinSession(sessionId: string, joiningPlayerId: string): JoinSessionResponse | ErrorResponse {
    const session = activeSessions.get(sessionId);
    if (!session) {
        return { error: 'Session not found.' };
    }
    if (session.players.length >= 2) {
        return { error: 'Session is full.' };
    }

    // Player 'O' is joining. Player 'X' is host.
    const playerSymbol: PlayerSymbol = 'O';
    
    // Note: The actual Player object with WebSocket is added in handleWebSocketConnection
    // This HTTP endpoint confirms joinability and assigns symbol.

    const gameStatePayload = getGameStatePayload(session, playerSymbol);
    console.log(`Player ${joiningPlayerId} pre-joining session ${sessionId} as ${playerSymbol}`);
    
    return { sessionId, playerSymbol, playerId: joiningPlayerId, gameState: gameStatePayload };
}


export function addPlayerToSession(ws: ElysiaWS<any,any,any>, sessionId: string, playerId: string, playerSymbol: PlayerSymbol): GameSession | null {
  const session = activeSessions.get(sessionId);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Session not found.' } }));
    ws.close();
    return null;
  }

  if (session.players.find(p => p.id === playerId)) {
     // Player is rejoining or already connected. Update ws if necessary.
     const existingPlayer = session.players.find(p => p.id === playerId)!;
     existingPlayer.ws = ws;
     ws.send(JSON.stringify({ type: 'game_state_update', payload: getGameStatePayload(session, existingPlayer.symbol) }));
     console.log(`Player ${playerId} reconnected to session ${sessionId}`);
     return session;
  }

  if (session.players.length >= 2) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Session is full.' } }));
    ws.close();
    return null;
  }

  const newPlayer: Player = { id: playerId, ws, symbol: playerSymbol };
  session.players.push(newPlayer);
  console.log(`Player ${playerId} (${playerSymbol}) connected to session ${sessionId}. Total players: ${session.players.length}`);
  
  // If this is the second player, start the game
  if (session.players.length === 2) {
    session.gameActive = true;
    session.currentPlayer = INITIAL_PLAYER; // X always starts
    broadcastGameStart(session);
    console.log(`Game started in session ${sessionId}`);
  } else if (session.players.length === 1) {
     // First player joined, waiting for opponent
     ws.send(JSON.stringify({ type: 'game_state_update', payload: getGameStatePayload(session, newPlayer.symbol, "Waiting for opponent...") }));
  }
  return session;
}


function broadcastGameStart(session: GameSession) {
    session.players.forEach(p => {
        p.ws.send(JSON.stringify({
            type: 'game_start',
            payload: getGameStatePayload(session, p.symbol)
        }));
        const opponent = session.players.find(op => op.id !== p.id);
        if (opponent) {
            p.ws.send(JSON.stringify({
                type: 'opponent_joined',
                payload: { opponentSymbol: opponent.symbol }
            }));
        }
    });
}


export function handlePlayerMove(sessionId: string, playerId: string, moveIndex: number): void {
  const session = activeSessions.get(sessionId);
  if (!session || !session.gameActive) return;

  const player = session.players.find(p => p.id === playerId);
  if (!player || player.symbol !== session.currentPlayer) {
    // Not this player's turn or player not found
    player?.ws.send(JSON.stringify({ type: 'error', payload: { message: 'Not your turn or invalid move.' } }));
    return;
  }

  if (session.board[moveIndex] !== null) {
    player.ws.send(JSON.stringify({ type: 'error', payload: { message: 'Cell already occupied.' } }));
    return;
  }

  session.board[moveIndex] = player.symbol;

  if (checkWin(session.board, player.symbol)) {
    session.winner = player.symbol;
    session.gameActive = false;
  } else if (checkDraw(session.board)) {
    session.isDraw = true;
    session.gameActive = false;
  } else {
    session.currentPlayer = player.symbol === 'X' ? 'O' : 'X';
  }
  broadcastGameState(session);
}

export function removePlayerFromSession(sessionId: string, playerId: string): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  const playerIndex = session.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  const removedPlayerSymbol = session.players[playerIndex].symbol;
  session.players.splice(playerIndex, 1);
  console.log(`Player ${playerId} (${removedPlayerSymbol}) disconnected from session ${sessionId}. Remaining: ${session.players.length}`);


  if (session.players.length < 2 && session.gameActive) {
    // If a player disconnects mid-game
    session.gameActive = false;
    session.winner = null; // Or assign win to remaining player
    const remainingPlayer = session.players[0];
    if (remainingPlayer) {
        remainingPlayer.ws.send(JSON.stringify({
            type: 'opponent_disconnected',
            payload: { message: `Opponent (${removedPlayerSymbol}) disconnected. Game over.` }
        }));
         remainingPlayer.ws.send(JSON.stringify({
            type: 'game_state_update',
            payload: getGameStatePayload(session, remainingPlayer.symbol, "Opponent disconnected.")
        }));
    }
  }
  
  if (session.players.length === 0) {
    console.log(`Session ${sessionId} is empty, closing.`);
    activeSessions.delete(sessionId);
  }
}


function getGameStatePayload(session: GameSession, perspectiveOfSymbol: PlayerSymbol, statusMessageOverride?: string): GameStatePayload {
  let status = statusMessageOverride || "";
  if (!statusMessageOverride) {
    if (!session.gameActive) {
        if (session.winner) status = `Player ${session.winner} wins!`;
        else if (session.isDraw) status = "Game is a draw!";
        else if (session.players.length < 2) status = "Waiting for opponent...";
        else status = "Game Over";
    } else {
        status = `Player ${session.currentPlayer}'s turn`;
    }
  }
  
  const opponent = session.players.find(p => p.symbol !== perspectiveOfSymbol);

  return {
    board: session.board,
    currentPlayer: session.currentPlayer,
    gameActive: session.gameActive,
    winner: session.winner,
    isDraw: session.isDraw,
    mySymbol: perspectiveOfSymbol,
    opponentSymbol: opponent?.symbol,
    yourTurn: session.gameActive && session.currentPlayer === perspectiveOfSymbol,
    // status: status, // Frontend can derive this or use a dedicated status message
  };
}

function broadcastGameState(session: GameSession): void {
  session.players.forEach(player => {
    const payload = getGameStatePayload(session, player.symbol);
    const message: ServerMessage = { type: 'game_state_update', payload };
    player.ws.send(JSON.stringify(message));
  });
}

export function handleClientMessage(ws: ElysiaWS<any,any,any>, sessionId: string, playerId: string, message: ClientMessage) {
    console.log(`Received message from ${playerId} in session ${sessionId}:`, message);
    switch (message.type) {
        case 'make_move':
            handlePlayerMove(sessionId, playerId, message.payload.index);
            break;
        // case 'request_new_game':
        // TODO: Implement rematch logic
        // break;
        default:
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unknown message type' } }));
    }
}

// For debugging or admin purposes
export function getActiveSessions() {
    return Array.from(activeSessions.values()).map(s => ({
        sessionId: s.sessionId,
        playerCount: s.players.length,
        gameActive: s.gameActive,
        currentPlayer: s.currentPlayer
    }));
}
