const Grid = {
  createGrid(rows, cols) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = {
          occupied: false,
          cargoId: null,
          upgradeLevel: 0,
          accessCount: 0,
          heatScore: 0
        };
      }
    }
    return grid;
  },

  canPlace(grid, shape, startRow, startCol, gridSize) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gr = startRow + r;
        const gc = startCol + c;
        if (gr < 0 || gr >= gridSize.rows || gc < 0 || gc >= gridSize.cols) {
          return false;
        }
        if (grid[gr][gc].occupied) {
          return false;
        }
      }
    }
    return true;
  },

  findEmptyPositions(grid, shape, gridSize) {
    const positions = [];
    for (let r = 0; r < gridSize.rows; r++) {
      for (let c = 0; c < gridSize.cols; c++) {
        if (this.canPlace(grid, shape, r, c, gridSize)) {
          positions.push({ row: r, col: c });
        }
      }
    }
    return positions;
  },

  placeCargoOnGrid(grid, cargoId, shape, startRow, startCol) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gr = startRow + r;
        const gc = startCol + c;
        grid[gr][gc].occupied = true;
        grid[gr][gc].cargoId = cargoId;
        grid[gr][gc].accessCount++;
      }
    }
  },

  removeCargoFromGrid(grid, cargoId) {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c].cargoId === cargoId) {
          grid[r][c].occupied = false;
          grid[r][c].cargoId = null;
          grid[r][c].accessCount++;
        }
      }
    }
  },

  getCargoCells(grid, cargoId) {
    const cells = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c].cargoId === cargoId) {
          cells.push({ row: r, col: c });
        }
      }
    }
    return cells;
  },

  getBlockingCargos(grid, cargoId, cargos) {
    const targetCells = this.getCargoCells(grid, cargoId);
    if (targetCells.length === 0) return [];

    const targetTopRow = Math.min(...targetCells.map(c => c.row));
    const blockingIds = new Set();

    for (let r = 0; r < targetTopRow; r++) {
      for (const cell of targetCells) {
        if (grid[r][cell.col].occupied && grid[r][cell.col].cargoId !== cargoId) {
          blockingIds.add(grid[r][cell.col].cargoId);
        }
      }
    }

    return [...blockingIds].map(id => cargos.find(c => c.id === id)).filter(Boolean);
  },

  expandGrid(oldGrid, direction) {
    const oldRows = oldGrid.length;
    const oldCols = oldGrid[0].length;
    let newRows = oldRows;
    let newCols = oldCols;

    if (direction === 'row-down') newRows++;
    else if (direction === 'row-up') newRows++;
    else if (direction === 'col-right') newCols++;
    else if (direction === 'col-left') newCols++;

    const newGrid = this.createGrid(newRows, newCols);

    let rowOffset = 0;
    let colOffset = 0;
    if (direction === 'row-up') rowOffset = 1;
    if (direction === 'col-left') colOffset = 1;

    for (let r = 0; r < oldRows; r++) {
      for (let c = 0; c < oldCols; c++) {
        const nr = r + rowOffset;
        const nc = c + colOffset;
        newGrid[nr][nc] = oldGrid[r][c];
      }
    }

    return { grid: newGrid, rowOffset, colOffset };
  },

  calculateUsage(grid) {
    let occupied = 0;
    const total = grid.length * grid[0].length;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c].occupied) occupied++;
      }
    }
    return { occupied, total, percentage: Math.round((occupied / total) * 100) };
  },

  calculateHeatScores(grid) {
    let maxAccess = 0;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c].accessCount > maxAccess) {
          maxAccess = grid[r][c].accessCount;
        }
      }
    }
    if (maxAccess === 0) return;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        grid[r][c].heatScore = maxAccess > 0 ? grid[r][c].accessCount / maxAccess : 0;
      }
    }
  }
};