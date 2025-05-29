import { Elysia, t } from 'elysia'
import { node } from '@elysiajs/node'
import { staticPlugin } from '@elysiajs/static';

// --- Game Logic and State Management ---
interface Player {
    ws: any; // WebSocket connection object
    symbol: 'X' | 'O';
}

interface GameSession {
    id: string;
    players: Player[];
    board: (string | null)[];
    currentPlayer: 'X' | 'O';
    gameActive: boolean;
    winner: 'X' | 'O' | 'Draw' | null;
}

// In-memory store for game sessions
const sessions = new Map<string, GameSession>();

function generateSessionId(): string {
    return 'xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
        return Math.floor(Math.random() * 16).toString(16);
    });
}

function checkWin(board: (string | null)[]): 'X' | 'O' | null {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a] as 'X' | 'O';
        }
    }
    return null;
}

function checkDraw(board: (string | null)[]): boolean {
    return !board.includes(null) && !checkWin(board);
}

function broadcast(session: GameSession, message: object) {
    const messageString = JSON.stringify(message);
    session.players.forEach(player => {
        try {
            if (player.ws.raw.readyState === 1 /* OPEN */) {
                player.ws.send(messageString);
            }
        } catch (error) {
            console.error("Failed to send message to player:", error);
            // Handle dead connections if necessary
        }
    });
}


const app = new Elysia()
	.use(staticPlugin({
        assets: 'public', // Folder with your static files
        prefix: '/',      // Serve from the root
        indexHTML: true,  // Automatically serve 'index.html' for '/' requests
        noCache: true // Disable caching for development
    }))
    // API Endpoint to create a new session (optional, can also be handled via WebSocket connection)
    .post('/session/create', () => {
        const sessionId = generateSessionId();
        const newSession: GameSession = {
            id: sessionId,
            players: [],
            board: Array(9).fill(null),
            currentPlayer: 'X',
            gameActive: false, // Game starts when 2 players are in
            winner: null,
        };
        sessions.set(sessionId, newSession);
        return { sessionId };
    })

    // WebSocket route for game communication
    .ws('/ws/game/:sessionId', {
        params: t.Object({
            sessionId: t.String()
        }),
        open(ws) {
            const { sessionId } = ws.data.params;
            let session = sessions.get(sessionId);

            if (!session) {
                // Option 1: Create session if it doesn't exist (if not using POST /session/create)
                session = {
                    id: sessionId,
                    players: [],
                    board: Array(9).fill(null),
                    currentPlayer: 'X',
                    gameActive: false,
                    winner: null,
                };
                sessions.set(sessionId, session);
                console.log(`[WS] Session ${sessionId} created by new connection.`);
            } else {
                console.log(`[WS] Player connecting to existing session ${sessionId}.`);
            }


            if (session.players.length >= 2) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Session is full.' }));
                ws.close();
                return;
            }

            const playerSymbol = session.players.length === 0 ? 'X' : 'O';
            const newPlayer: Player = { ws, symbol: playerSymbol };
            session.players.push(newPlayer);

            ws.send(JSON.stringify({
                type: 'INIT',
                playerSymbol,
                sessionId: session.id,
                board: session.board,
                currentPlayer: session.currentPlayer,
                gameActive: session.gameActive,
                opponentConnected: session.players.length === 2
            }));

            console.log(`[WS] Player ${playerSymbol} connected to session ${sessionId}. Players: ${session.players.length}`);

            if (session.players.length === 2) {
                session.gameActive = true;
                broadcast(session, {
                    type: 'GAME_START',
                    board: session.board,
                    currentPlayer: session.currentPlayer,
                    message: 'Opponent connected. Game starts!',
                    opponentConnected: true
                });
                console.log(`[WS] Game started in session ${sessionId}. Current player: ${session.currentPlayer}`);
            } else {
                 ws.send(JSON.stringify({ type: 'WAITING_FOR_OPPONENT' }));
            }
        },
        message(ws, message) {
            const { sessionId } = ws.data.params;
            const session = sessions.get(sessionId);

            if (!session || !session.gameActive) return;

            const player = session.players.find(p => p.ws === ws);
            if (!player) return; // Should not happen if connection is managed properly

            const parsedMessage = JSON.parse(message as string);

            switch (parsedMessage.type) {
                case 'MOVE':
                    if (player.symbol !== session.currentPlayer) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: "Not your turn." }));
                        return;
                    }
                    if (session.board[parsedMessage.index] !== null) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: "Cell already taken." }));
                        return;
                    }

                    session.board[parsedMessage.index] = player.symbol;
                    const winner = checkWin(session.board);
                    const draw = checkDraw(session.board);

                    if (winner) {
                        session.winner = winner;
                        session.gameActive = false;
                        broadcast(session, {
                            type: 'GAME_OVER',
                            winner: winner,
                            board: session.board,
                            message: `Player ${winner} wins!`
                        });
                    } else if (draw) {
                        session.winner = 'Draw';
                        session.gameActive = false;
                        broadcast(session, {
                            type: 'GAME_OVER',
                            winner: 'Draw',
                            board: session.board,
                            message: "Game ended in a draw!"
                        });
                    } else {
                        session.currentPlayer = session.currentPlayer === 'X' ? 'O' : 'X';
                        broadcast(session, {
                            type: 'UPDATE_STATE',
                            board: session.board,
                            currentPlayer: session.currentPlayer
                        });
                    }
                    break;

                case 'NEW_GAME': // Player requests a new game within the session
                    if (session.players.length < 2) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: "Wait for opponent to start a new game."}));
                        return;
                    }
                    session.board = Array(9).fill(null);
                    session.currentPlayer = 'X'; // Or alternate starting player
                    session.gameActive = true;
                    session.winner = null;
                    broadcast(session, {
                        type: 'GAME_START', // Or a specific NEW_GAME_STATE
                        board: session.board,
                        currentPlayer: session.currentPlayer,
                        message: 'New game started!',
                        opponentConnected: true
                    });
                    break;
            }
        },
        close(ws) {
            const { sessionId } = ws.data.params;
            const session = sessions.get(sessionId);
            if (session) {
                session.players = session.players.filter(p => p.ws !== ws);
                console.log(`[WS] Player disconnected from session ${sessionId}. Players remaining: ${session.players.length}`);

                if (session.players.length < 2) {
                    session.gameActive = false; // Stop game if a player leaves
                     // Notify remaining player
                    if (session.players.length === 1) {
                        session.players[0].ws.send(JSON.stringify({
                            type: 'OPPONENT_LEFT',
                            message: 'Your opponent has disconnected.'
                        }));
                    }
                }
                // Optional: Clean up session if no players are left after some time
                if (session.players.length === 0) {
                    sessions.delete(sessionId);
                    console.log(`[WS] Session ${sessionId} closed as no players are left.`);
                }
            }
        }
    });

app.listen(3000, ({ hostname, port }) => {
	console.log(`🦊 Cosmic Tic Tac Toe server running at http://${hostname}:${port}`);
});