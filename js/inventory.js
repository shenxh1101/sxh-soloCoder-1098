const InventoryManager = {
  getPlacedCargoAt(grid, row, col, cargos) {
    const cell = grid[row][col];
    if (!cell || !cell.occupied) return null;
    return cargos.find(c => c.id === cell.cargoId) || null;
  },

  getMovableCargos(grid, cargos) {
    const placed = CargoManager.getPlacedCargos(cargos);
    return placed.filter(cargo => {
      const blocking = Grid.getBlockingCargos(grid, cargo.id, cargos);
      return blocking.length === 0;
    });
  },

  moveCargoToPosition(cargo, newRow, newCol, grid, gridSize) {
    const shape = cargo.shape;
    if (!Grid.canPlace(grid, shape, newRow, newCol, gridSize)) {
      return false;
    }
    Grid.removeCargoFromGrid(grid, cargo.id);
    Grid.placeCargoOnGrid(grid, cargo.id, shape, newRow, newCol);
    cargo.position = { row: newRow, col: newCol };
    return true;
  },

  getAllCellValues(grid, cargos) {
    const values = [];
    for (let r = 0; r < grid.length; r++) {
      values[r] = [];
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c].occupied) {
          const cargo = cargos.find(cg => cg.id === grid[r][c].cargoId);
          const baseVal = cargo ? CargoManager.calculateValue(cargo.type) : 0;
          const multiplier = UpgradeSystem.getCellValueMultiplier(grid[r][c].upgradeLevel);
          values[r][c] = Math.round(baseVal * multiplier);
        } else {
          values[r][c] = 0;
        }
      }
    }
    return values;
  },

  getTotalStorageValue(grid, cargos) {
    const values = this.getAllCellValues(grid, cargos);
    let total = 0;
    for (let r = 0; r < values.length; r++) {
      for (let c = 0; c < values[r].length; c++) {
        total += values[r][c];
      }
    }
    return total;
  },

  countCargoTypes(cargos) {
    const counts = {};
    cargos.filter(c => c.placed).forEach(c => {
      counts[c.type] = (counts[c.type] || 0) + 1;
    });
    return counts;
  }
};