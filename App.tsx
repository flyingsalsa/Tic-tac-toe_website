
import React, { useState, useEffect, useCallback } from 'react';
import { Player, BoardState, CellValue, GameHistoryEntry } from './types';
import Header from './components/Header';
import PlayerInfo from './components/PlayerInfo';
import SessionInfo from './components/SessionInfo';
import GameBoard from './components/GameBoard';
import GameControls from './components/GameControls';
import GameHistory from './components/GameHistory';
import Footer from './components/Footer';

const INITIAL_BOARD: BoardState = Array(9).fill(null);
const INITIAL_PLAYER: Player = 'X';

const generateUniqueId = (): string => {
  return 'xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
    return Math.floor(Math.random() * 16).toString(16);
  });
};

const App: React.FC = () => {
  const [board, setBoard] = useState<BoardState>([...INITIAL_BOARD]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(INITIAL_PLAYER);
  const [mySymbol, setMySymbol] = useState<Player | null>(null);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [opponentConnected, setOpponentConnected] = useState<boolean>(false); // Simulated
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [gameStatusMessage, setGameStatusMessage] = useState<string>("Waiting to start...");
  const [statusMessageType, setStatusMessageType] = useState<'default' | 'success' | 'warning' | 'error'>('default');

  const [joinSessionInputValue, setJoinSessionInputValue] = useState<string>('');
  const [copyButtonText, setCopyButtonText] = useState<React.ReactNode>(<i className="fas fa-copy"></i>);
  const [joinButtonText, setJoinButtonText] = useState<string>('Join');


  useEffect(() => {
    setSessionId(generateUniqueId());
  }, []);

  const addHistoryEntry = useCallback((message: string, type: GameHistoryEntry['type']) => {
    setGameHistory(prev => [{ id: generateUniqueId(), message, type }, ...prev.slice(0, 4)]); // Keep last 5 entries
  }, []);

  const checkWin = useCallback((currentBoard: BoardState, player: Player): boolean => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    return winPatterns.some(pattern => 
      pattern.every(index => currentBoard[index] === player)
    );
  }, []);

  const checkDraw = useCallback((currentBoard: BoardState): boolean => {
    return currentBoard.every(cell => cell !== null);
  }, []);

  const updateGameEndState = useCallback((message: string, historyMessage: string, type: GameHistoryEntry['type'], statusType: typeof statusMessageType) => {
    setGameActive(false);
    setGameStatusMessage(message);
    setStatusMessageType(statusType);
    addHistoryEntry(historyMessage, type);
  }, [addHistoryEntry]);
  
  const makeSimulatedOpponentMove = useCallback(() => {
    if (!gameActive || !opponentConnected || (mySymbol && currentPlayer === mySymbol)) return;

    const emptyCellsIndexes = board
      .map((cell, index) => (cell === null ? index : null))
      .filter(index => index !== null) as number[];

    if (emptyCellsIndexes.length > 0) {
      const randomIndex = Math.floor(Math.random() * emptyCellsIndexes.length);
      const moveIndex = emptyCellsIndexes[randomIndex];
      
      const newBoard = [...board];
      newBoard[moveIndex] = currentPlayer;
      setBoard(newBoard);

      if (checkWin(newBoard, currentPlayer)) {
        updateGameEndState(`Player ${currentPlayer} wins!`, `${currentPlayer} won the game!`, 'win', 'success');
        return;
      }
      if (checkDraw(newBoard)) {
        updateGameEndState("Game ended in a draw!", "Game ended in a draw!", 'draw', 'warning');
        return;
      }
      
      setCurrentPlayer(prevPlayer => (prevPlayer === 'X' ? 'O' : 'X'));
      setGameStatusMessage("Game in progress...");
      setStatusMessageType('default');
    }
  }, [board, currentPlayer, gameActive, mySymbol, opponentConnected, checkWin, checkDraw, updateGameEndState]);


  useEffect(() => {
    if (gameActive && opponentConnected && mySymbol && currentPlayer !== mySymbol) {
      setGameStatusMessage(`Opponent (${currentPlayer}) is thinking...`);
      setStatusMessageType('default');
      const timer = setTimeout(() => {
        makeSimulatedOpponentMove();
      }, 1000 + Math.random() * 500); // Add some variability
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, gameActive, opponentConnected, mySymbol]); // makeSimulatedOpponentMove is not added to prevent potential loops if not perfectly memoized. Relies on other deps to re-trigger.


  const handleCellClick = (index: number) => {
    if (!gameActive || board[index] !== null || (mySymbol && currentPlayer !== mySymbol)) {
      return;
    }

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    if (checkWin(newBoard, currentPlayer)) {
      updateGameEndState(`Player ${currentPlayer} wins!`, `${currentPlayer} won the game!`, 'win', 'success');
      return;
    }
    if (checkDraw(newBoard)) {
      updateGameEndState("Game ended in a draw!", "Game ended in a draw!", 'draw', 'warning');
      return;
    }

    setCurrentPlayer(prevPlayer => (prevPlayer === 'X' ? 'O' : 'X'));
    setGameStatusMessage("Game in progress...");
    setStatusMessageType('default');
  };

  const handleNewGame = () => {
    setBoard([...INITIAL_BOARD]);
    setCurrentPlayer(INITIAL_PLAYER);
    setGameActive(true);
    setMySymbol('X'); // Host is 'X'
    setOpponentConnected(false); // Reset opponent connection for new game, or handle rematch logic
    setGameStatusMessage("New game started! Waiting for opponent to join or make your move.");
    setStatusMessageType('default');
    addHistoryEntry("New game started by host.", 'info');
    // If this was true multiplayer, host would create a session. Player 'X' starts.
    // For simulation, we assume this client becomes 'X' and can start playing.
    // Opponent can "join" this session ID.
  };

  const handleResetGame = () => {
    setBoard([...INITIAL_BOARD]);
    setCurrentPlayer(INITIAL_PLAYER);
    setMySymbol(null);
    setGameActive(false);
    setSessionId(generateUniqueId()); // New session ID on full reset
    setOpponentConnected(false);
    setGameHistory([]);
    setGameStatusMessage("Waiting to start...");
    setStatusMessageType('default');
    setJoinSessionInputValue('');
  };

  const handleCopySessionId = async () => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopyButtonText(<i className="fas fa-check text-green-400"></i>);
      setTimeout(() => setCopyButtonText(<i className="fas fa-copy"></i>), 2000);
    } catch (err) {
      console.error('Failed to copy session ID: ', err);
      setCopyButtonText(<i className="fas fa-times text-red-400"></i>);
      setTimeout(() => setCopyButtonText(<i className="fas fa-copy"></i>), 2000);
    }
  };

  const handleJoinSession = () => {
    if (!joinSessionInputValue.trim()) return;
    
    // Simulate joining:
    setSessionId(joinSessionInputValue.trim());
    setMySymbol('O'); // Player joining is 'O'
    setOpponentConnected(true);
    setGameActive(true); // Assume game is active or will be started by host
    setCurrentPlayer('X'); // Host ('X') starts first
    setBoard([...INITIAL_BOARD]); // Reset board for the joiner

    setGameStatusMessage(`Joined session ${joinSessionInputValue.trim()}. Waiting for host's move.`);
    setStatusMessageType('default');
    addHistoryEntry(`Joined session ${joinSessionInputValue.trim()} as Player O.`, 'info');
    
    setJoinButtonText('Joined!');
    setTimeout(() => setJoinButtonText('Join'), 2000);
    setJoinSessionInputValue('');
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex flex-col lg:flex-row gap-6 md:gap-8 items-start justify-center mt-6 md:mt-10">
        <div className="w-full lg:w-1/4 space-y-6">
          <PlayerInfo 
            mySymbol={mySymbol}
            currentPlayer={currentPlayer}
            gameActive={gameActive}
            gameStatusMessage={gameStatusMessage}
            statusMessageType={statusMessageType}
          />
          <SessionInfo 
            sessionId={sessionId}
            onCopy={handleCopySessionId}
            joinSessionInputValue={joinSessionInputValue}
            onJoinSessionInputChange={(e) => setJoinSessionInputValue(e.target.value)}
            onJoin={handleJoinSession}
            copyButtonText={copyButtonText}
            joinButtonText={joinButtonText}
            isGameActive={gameActive}
            mySymbol={mySymbol}
          />
        </div>

        <div className="w-full lg:w-2/4">
          <GameBoard 
            board={board} 
            onCellClick={handleCellClick}
            disabled={!gameActive || (mySymbol !== null && currentPlayer !== mySymbol)}
          />
        </div>

        <div className="w-full lg:w-1/4 space-y-6">
          <GameControls 
            onNewGame={handleNewGame}
            onResetGame={handleResetGame}
          />
          <GameHistory history={gameHistory} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
