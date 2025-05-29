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


const app = new Elysia({ adapter: node() })
	.use(staticPlugin({
        assets: 'public', // Folder with your static files
        prefix: '/',      // Serve from the root
        indexHTML: true,  // Automatically serve 'index.html' for '/' requests
    }))
	.listen(3000, ({ hostname, port }) => {
		console.log(`🦊 Cosmic Tic Tac Toe server running on Node.js 
            at http://<span class="math-inline">\{hostname\}\:</span>{port}`);
	})