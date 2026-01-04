'use client';

interface GameState {
  board: (number | null)[][];
  currentPlayer: number;
  winner: number | 'draw' | null;
  winningCells: [number, number][];
}

interface BoardProps {
  gameState: GameState | null;
  onColumnClick: (col: number) => void;
  playerNumber: number | null;
}

export const Board = ({ gameState, onColumnClick, playerNumber }: BoardProps) => {
  if (!gameState) {
    return <div className="text-gray-700 dark:text-gray-300">Chargement...</div>;
  }

  const isWinningCell = (row: number, col: number) => {
    return gameState.winningCells?.some(([r, c]) => r === row && c === col);
  };

  const getCellColor = (value: number | null, isWinning: boolean) => {
    if (!value) return 'bg-white dark:bg-gray-700';
    const baseColor = value === 1 ? 'bg-red-500' : 'bg-yellow-400';
    return isWinning ? `${baseColor} ring-4 ring-green-400` : baseColor;
  };

  return (
    <div className="inline-block p-4 bg-blue-600 dark:bg-blue-900 rounded-lg shadow-2xl">
      <div className="grid grid-cols-7 gap-2">
        {gameState.board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => onColumnClick(colIndex)}
              disabled={gameState.winner !== null || gameState.currentPlayer !== playerNumber}
              className={`w-16 h-16 rounded-full ${getCellColor(
                cell,
                isWinningCell(rowIndex, colIndex)
              )} hover:opacity-80 disabled:cursor-not-allowed transition-all transform hover:scale-105`}
            />
          ))
        )}
      </div>
    </div>
  );
};
