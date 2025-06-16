
import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { ws } from '@elysiajs/ws';
import { 
    createNewSession, 
    attemptToJoinSession,
    addPlayerToSession,
    removePlayerFromSession,
    handleClientMessage,
    getActiveSessions
} from './gameManager';
import { ClientMessage, CreateSessionResponse, ErrorResponse, JoinSessionResponse } from './types';

const PORT = process.env.PORT || 3001;

const app = new Elysia()
  .use(cors()) // Enable CORS for all routes
  .use(ws())   // Enable WebSockets
  .onError(({ code, error, set }) => {
    console.error(`Error [${code}]: ${error.message}`);
    if (code === 'VALIDATION') {
        set.status = 400;
        return { error: "Validation Error", details: error.message };
    }
    set.status = 500;
    return { error: "Internal Server Error" };
  })
  .get("/", () => "Cosmic Tic Tac Toe Server is running!")
  .get("/api/sessions", () => { // For debugging
    return getActiveSessions();
  })
  .post("/api/sessions/create", ({ body }) => {
      // Client should send a proposed playerId or server generates one.
      // For now, let's assume client sends a self-generated unique ID.
      const { playerId } = body as { playerId: string };
      if (!playerId) {
          throw new Error("playerId is required to create a session.");
      }
      return createNewSession(playerId);
  }, {
      body: t.Object({ playerId: t.String() }),
      response: {
          200: t.Union([
              t.Object({
                  sessionId: t.String(),
                  playerSymbol: t.Union([t.Literal('X'), t.Literal('O')]),
                  playerId: t.String()
              }),
              t.Object({ error: t.String() }) // For CreateSessionResponse specifically
          ]),
          400: t.Object({ error: t.String(), details: t.Optional(t.String()) }),
          500: t.Object({ error: t.String() })
      }
  })
  .post("/api/sessions/:sessionId/join", ({ params, body }) => {
      const { sessionId } = params;
      const { playerId } = body as { playerId: string };
      if (!playerId) {
          throw new Error("playerId is required to join a session.");
      }
      const result = attemptToJoinSession(sessionId, playerId);
      if ('error' in result) {
          // set.status = 400; // Or appropriate error code
      }
      return result;
  }, {
      params: t.Object({ sessionId: t.String() }),
      body: t.Object({ playerId: t.String() }),
      response: {
          200: t.Union([
                t.Object({ // JoinSessionResponse
                    sessionId: t.String(),
                    playerSymbol: t.Union([t.Literal('X'), t.Literal('O')]),
                    playerId: t.String(),
                    gameState: t.Object({
                        board: t.Array(t.Nullable(t.Union([t.Literal('X'), t.Literal('O')]))),
                        currentPlayer: t.Union([t.Literal('X'), t.Literal('O')]),
                        gameActive: t.Boolean(),
                        winner: t.Nullable(t.Union([t.Literal('X'), t.Literal('O')])),
                        isDraw: t.Boolean(),
                        mySymbol: t.Optional(t.Union([t.Literal('X'), t.Literal('O')])),
                        opponentSymbol: t.Optional(t.Union([t.Literal('X'), t.Literal('O')])),
                        yourTurn: t.Optional(t.Boolean()),
                    })
                }),
                t.Object({ error: t.String() }) // ErrorResponse
          ]),
          400: t.Object({ error: t.String(), details: t.Optional(t.String()) }),
          500: t.Object({ error: t.String() })
      }
  })
  .ws('/ws', {
    open(ws) {
      // Query parameters: sessionId, playerId, playerSymbol (from HTTP response)
      const { sessionId, playerId, playerSymbol } = ws.data.query as { sessionId?: string, playerId?: string, playerSymbol?: 'X' | 'O' };
      
      if (!sessionId || !playerId || !playerSymbol) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Missing sessionId, playerId, or playerSymbol in connection query.' }}));
        ws.close();
        return;
      }
      
      console.log(`WS Connection open: SID=${sessionId}, PID=${playerId}, Symbol=${playerSymbol}`);
      ws.data = { ...ws.data, sessionId, playerId, playerSymbol }; // Store on ws connection context

      const session = addPlayerToSession(ws, sessionId, playerId, playerSymbol);
      if (!session) {
        // addPlayerToSession handles sending error and closing ws if needed
        return;
      }
      ws.subscribe(sessionId); // Subscribe to session-specific messages
    },
    message(ws, message) {
      const { sessionId, playerId } = ws.data as { sessionId: string, playerId: string, playerSymbol: 'X' | 'O' };
      
      try {
        const parsedMessage = (typeof message === 'string' ? JSON.parse(message) : message) as ClientMessage;
        handleClientMessage(ws, sessionId, playerId, parsedMessage);
      } catch (error) {
        console.error("Failed to parse client message or handle it:", error);
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format.' } }));
      }
    },
    close(ws) {
      const { sessionId, playerId, playerSymbol } = ws.data as { sessionId?: string, playerId?: string, playerSymbol?: 'X' | 'O' };
      if (sessionId && playerId) {
        console.log(`WS Connection close: SID=${sessionId}, PID=${playerId}, Symbol=${playerSymbol}`);
        removePlayerFromSession(sessionId, playerId);
        // app.publish(sessionId, JSON.stringify({ type: 'opponent_disconnected', payload: { message: `Player ${playerId} (${playerSymbol}) disconnected.`}})); // Might be redundant if removePlayer handles it
      } else {
        console.log("WS Connection closed by unassociated client.");
      }
    }
  })
  .listen(PORT);

console.log(
  `Backend server is running at http://${app.server?.hostname}:${app.server?.port}`
);
export type App = typeof app; // For type inference if needed elsewhere
