class Connect4 {
  constructor() {
    this.rows = 6;
    this.cols = 7;
    this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
    this.currentPlayer = 1;
    this.winner = null;
    this.winningCells = [];
  }

  makeMove(col) {
    if (this.winner || col < 0 || col >= this.cols) {
      return { success: false, message: 'Mouvement invalide' };
    }

    for (let row = this.rows - 1; row >= 0; row--) {
      if (!this.board[row][col]) {
        this.board[row][col] = this.currentPlayer;
        this.checkWinner(row, col);
        
        if (!this.winner) {
          this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        }
        
        return { success: true, row, col };
      }
    }
    
    return { success: false, message: 'Colonne pleine' };
  }

  checkWinner(row, col) {
    const player = this.board[row][col];
    const directions = [
      [[0, 1], [0, -1]],
      [[1, 0], [-1, 0]],
      [[1, 1], [-1, -1]],
      [[1, -1], [-1, 1]]
    ];

    for (const [dir1, dir2] of directions) {
      const cells = [[row, col]];
      
      for (const [dx, dy] of [dir1, dir2]) {
        let r = row + dx, c = col + dy;
        while (r >= 0 && r < this.rows && c >= 0 && c < this.cols && 
               this.board[r][c] === player) {
          cells.push([r, c]);
          r += dx;
          c += dy;
        }
      }
      
      if (cells.length >= 4) {
        this.winner = player;
        this.winningCells = cells;
        return;
      }
    }

    if (this.board.every(row => row.every(cell => cell !== null))) {
      this.winner = 'draw';
    }
  }

  reset() {
    this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
    this.currentPlayer = 1;
    this.winner = null;
    this.winningCells = [];
  }

  getState() {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      winningCells: this.winningCells
    };
  }
}

module.exports = Connect4;
