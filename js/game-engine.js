const GameEngine = {
  state: null,

  init(gridRows = 10, gridCols = 10) {
    CargoManager.init();
    OrderManager.init();
    UndoManager.clear();

    this.state = {
      gridSize: { rows: gridRows, cols: gridCols },
      grid: Grid.createGrid(gridRows, gridCols),
      cargos: [],
      pendingCargos: CargoManager.generatePendingCargos(4),
      orders: [],
      gold: 200,
      score: 0,
      step: 0,
      moveCostTotal: 0,
      placementBonus: 0,
      gameOver: false,
    };

    OrderManager.generateOrders(5, 0);
    this.state.orders = [...OrderManager.orders];

    EventBus.emit('game:initialized', this.state);
    this._autoSave();
    return this.state;
  },

  initFromChallenge(challenge) {
    CargoManager.init();
    OrderManager.init();
    UndoManager.clear();

    const size = challenge.gridSize || 10;
    this.state = {
      gridSize: { rows: size, cols: size },
      grid: Grid.createGrid(size, size),
      cargos: [],
      pendingCargos: [],
      orders: [],
      gold: 300,
      score: 0,
      step: 0,
      moveCostTotal: 0,
      placementBonus: 0,
      gameOver: false,
    };

    if (challenge.initialLayout) {
      challenge.initialLayout.forEach(item => {
        const cargo = CargoManager.createCargo(item.type, item.rotation || 0);
        if (cargo) {
          this._doPlaceCargo(cargo, item.row, item.col);
        }
      });
    }

    if (challenge.incomingCargo) {
      challenge.incomingCargo.forEach(ic => {
        for (let i = 0; i < (ic.count || 0); i++) {
          const cargo = CargoManager.createCargo(ic.type, 0);
          if (cargo) {
            this.state.pendingCargos.push(cargo);
          }
        }
      });
    }

    if (this.state.pendingCargos.length < 4) {
      const extra = CargoManager.generatePendingCargos(4 - this.state.pendingCargos.length);
      this.state.pendingCargos.push(...extra);
    }

    if (challenge.orders) {
      challenge.orders.forEach(o => {
        const order = OrderManager.addOrder(o.type, o.atStep || 0);
        this.state.orders.push(order);
      });
    }

    ChallengeManager.loadChallenge(challenge);
    EventBus.emit('game:initialized', this.state);
    EventBus.emit('challenge:loaded', challenge);
    this._autoSave();
    return this.state;
  },

  selectCargo(cargoId) {
    const cargo = CargoManager.getCargoById(this.state.pendingCargos, cargoId);
    if (cargo) {
      EventBus.emit('cargo:selected', cargo);
    }
    return cargo;
  },

  rotatePendingCargo(cargoId) {
    const cargo = CargoManager.getCargoById(this.state.pendingCargos, cargoId);
    if (!cargo) return null;
    cargo.shape = CargoManager.rotateShape(cargo.shape);
    cargo.rotation = (cargo.rotation + 1) % 4;
    EventBus.emit('cargo:rotated', cargo);
    return cargo;
  },

  placeCargo(cargoId, row, col) {
    const cargo = CargoManager.getCargoById(this.state.pendingCargos, cargoId);
    if (!cargo) return { success: false, message: '货物不存在' };

    if (!Grid.canPlace(this.state.grid, cargo.shape, row, col, this.state.gridSize)) {
      const positions = Grid.findEmptyPositions(this.state.grid, cargo.shape, this.state.gridSize);
      if (positions.length === 0) {
        return { success: false, message: '没有足够空间放置此货物，请尝试扩容或移除其他货物' };
      }
      return { success: false, message: '该位置无法放置，请选择其他位置' };
    }

    const action = this._doPlaceCargo(cargo, row, col);
    UndoManager.push(action);

    const idx = this.state.pendingCargos.indexOf(cargo);
    if (idx >= 0) {
      this.state.pendingCargos.splice(idx, 1);
    }

    this.state.step++;
    this.state.score += cargo.baseValue;
    this.state.gold += cargo.baseValue;

    this._refillPendingCargos();
    this._checkOrdersAfterPlacement();

    Grid.calculateHeatScores(this.state.grid);
    EventBus.emit('cargo:placed', cargo);
    EventBus.emit('score:changed', { score: this.state.score, gold: this.state.gold });
    this._autoSave();
    return { success: true, message: `成功放置 ${cargo.name}！+${cargo.baseValue}金币` };
  },

  _doPlaceCargo(cargo, row, col) {
    const prevPosition = cargo.position ? { ...cargo.position } : null;
    const wasPlaced = cargo.placed;

    Grid.placeCargoOnGrid(this.state.grid, cargo.id, cargo.shape, row, col);
    cargo.placed = true;
    cargo.position = { row, col };
    this.state.cargos.push(cargo);

    return {
      type: 'place',
      cargoId: cargo.id,
      prevPosition: prevPosition,
      wasPlaced: wasPlaced,
      row: row,
      col: col,
      shape: Utils.cloneMatrix(cargo.shape),
    };
  },

  _refillPendingCargos() {
    while (this.state.pendingCargos.length < 4) {
      const newCargo = CargoManager.generateRandomCargo();
      if (newCargo) {
        this.state.pendingCargos.push(newCargo);
      }
    }
    const remaining = CargoManager.generatePendingCargos(0);
    if (remaining.length > 0) {
      this.state.pendingCargos = this.state.pendingCargos.slice(0, 6);
    }
  },

  _checkOrdersAfterPlacement() {
    if (!OrderManager.hasActiveOrders(this.state.step)) return;
    EventBus.emit('orders:pending', OrderManager.getActiveOrders(this.state.step));
  },

  processOrder(orderId) {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order || order.completed) return { success: false, message: '订单不存在或已完成' };

    const placedCargos = CargoManager.getPlacedCargos(this.state.cargos);
    const matching = placedCargos.filter(c => c.type === order.cargoType);

    if (matching.length === 0) {
      return { success: false, message: `仓库中没有 ${CargoManager.getTypeInfo(order.cargoType).name} 货物` };
    }

    const targetCargo = matching[0];
    const blockingCargos = Grid.getBlockingCargos(this.state.grid, targetCargo.id, this.state.cargos);

    let moveCost = 0;
    const blockingActions = [];
    let blocked = false;

    for (const blocker of blockingCargos) {
      const blockerCells = Grid.getCargoCells(this.state.grid, blocker.id);
      const emptyPositions = this._findNearestEmptyPosition(blocker, blockerCells);
      if (emptyPositions.length > 0) {
        const newPos = emptyPositions[0];
        const action = this._moveCargoInternal(blocker, newPos.row, newPos.col);
        blockingActions.push(action);
        moveCost += Math.round(blocker.baseValue * 0.3);
      } else {
        blocked = true;
      }
    }

    if (blocked) {
      for (const action of blockingActions.reverse()) {
        this._undoMoveCargo(action);
      }
      return { success: false, message: `货物被阻挡且无法移开阻挡物，请手动整理仓库` };
    }

    const placedInfo = {
      position: targetCargo.position ? { ...targetCargo.position } : null,
      shape: Utils.cloneMatrix(targetCargo.shape),
    };

    Grid.removeCargoFromGrid(this.state.grid, targetCargo.id);
    targetCargo.placed = false;
    targetCargo.position = null;
    this.state.cargos = this.state.cargos.filter(c => c.id !== targetCargo.id);

    const turnoverRate = CargoManager.getTurnoverRate(order.cargoType);
    CargoManager.incrementTurnover(order.cargoType);
    const cargoValue = CargoManager.calculateValue(order.cargoType);
    const reward = Math.round(cargoValue * (1 + turnoverRate * 0.5));
    const netReward = reward - moveCost;

    this.state.gold += netReward;
    this.state.score += reward;
    this.state.moveCostTotal += moveCost;

    OrderManager.completeOrder(orderId, reward);

    const undoAction = {
      type: 'processOrder',
      orderId: orderId,
      cargoId: targetCargo.id,
      cargoType: targetCargo.type,
      cargoName: targetCargo.name,
      placedInfo: placedInfo,
      blockingActions: blockingActions,
      moveCost: moveCost,
      reward: reward,
    };
    UndoManager.push(undoAction);

    Grid.calculateHeatScores(this.state.grid);
    EventBus.emit('order:completed', { order, reward: netReward, moveCost });
    EventBus.emit('score:changed', { score: this.state.score, gold: this.state.gold });
    this._autoSave();

    this._checkChallengeCompletion();

    return {
      success: true,
      message: `完成订单！+${reward} 收益`,
      details: moveCost > 0 ? `(含${moveCost}移动成本)` : '',
    };
  },

  _findNearestEmptyPosition(cargo, currentCells) {
    const shape = cargo.shape;
    const positions = [];
    const searchRadius = 3;

    for (let dr = -searchRadius; dr <= searchRadius; dr++) {
      for (let dc = -searchRadius; dc <= searchRadius; dc++) {
        if (dr === 0 && dc === 0) continue;
        for (const cell of currentCells) {
          const nr = cell.row + dr;
          const nc = cell.col + dc;
          if (Grid.canPlace(this.state.grid, shape, nr, nc, this.state.gridSize)) {
            positions.push({ row: nr, col: nc, dist: Math.abs(dr) + Math.abs(dc) });
          }
        }
      }
    }

    positions.sort((a, b) => a.dist - b.dist);
    return positions;
  },

  _moveCargoInternal(cargo, newRow, newCol) {
    const prevPos = cargo.position ? { ...cargo.position } : null;
    Grid.removeCargoFromGrid(this.state.grid, cargo.id);
    Grid.placeCargoOnGrid(this.state.grid, cargo.id, cargo.shape, newRow, newCol);
    cargo.position = { row: newRow, col: newCol };

    return {
      type: 'move',
      cargoId: cargo.id,
      prevPosition: prevPos,
      newPosition: { row: newRow, col: newCol },
    };
  },

  _undoMoveCargo(action) {
    const cargo = CargoManager.getCargoById(this.state.cargos, action.cargoId);
    if (!cargo) return;
    Grid.removeCargoFromGrid(this.state.grid, cargo.id);
    if (action.prevPosition) {
      Grid.placeCargoOnGrid(this.state.grid, cargo.id, cargo.shape, action.prevPosition.row, action.prevPosition.col);
      cargo.position = action.prevPosition;
    } else {
      cargo.position = null;
    }
  },

  undo() {
    if (!UndoManager.canUndo()) {
      return { success: false, message: '没有可撤销的操作' };
    }

    const action = UndoManager.pop();

    if (action.type === 'place') {
      const cargo = CargoManager.getCargoById(this.state.cargos, action.cargoId);
      if (cargo) {
        Grid.removeCargoFromGrid(this.state.grid, cargo.id);
        cargo.placed = false;
        cargo.position = null;
        this.state.cargos = this.state.cargos.filter(c => c.id !== cargo.id);
        this.state.pendingCargos.push(cargo);
        this.state.score -= cargo.baseValue;
        this.state.gold -= cargo.baseValue;
        this.state.step--;
      }
    } else if (action.type === 'processOrder') {
      const info = CargoManager.getTypeInfo(action.cargoType);
      const cargo = CargoManager.createCargo(action.cargoType, 0);
      if (cargo) {
        cargo.id = action.cargoId;
        Grid.placeCargoOnGrid(this.state.grid, cargo.id, action.placedInfo.shape, action.placedInfo.position.row, action.placedInfo.position.col);
        cargo.placed = true;
        cargo.position = action.placedInfo.position;
        cargo.shape = action.placedInfo.shape;
        this.state.cargos.push(cargo);
      }

      for (let i = action.blockingActions.length - 1; i >= 0; i--) {
        this._undoMoveCargo(action.blockingActions[i]);
      }

      const order = this.state.orders.find(o => o.id === action.orderId);
      if (order) {
        order.completed = false;
        order.reward = 0;
      }

      this.state.score -= action.reward;
      this.state.gold -= (action.reward - action.moveCost);
      this.state.moveCostTotal -= action.moveCost;
    }

    Grid.calculateHeatScores(this.state.grid);
    EventBus.emit('action:undone', action);
    EventBus.emit('score:changed', { score: this.state.score, gold: this.state.gold });
    this._autoSave();
    return { success: true, message: '已撤销上一步操作' };
  },

  expandGrid(direction) {
    const cost = UpgradeSystem.getExpansionCost(this.state.gridSize.rows, this.state.gridSize.cols);
    if (this.state.gold < cost) {
      return { success: false, message: `金币不足！需要 ${cost} 金币，当前 ${this.state.gold}` };
    }

    const result = Grid.expandGrid(this.state.grid, direction);
    this.state.grid = result.grid;

    if (direction === 'row-down' || direction === 'row-up') {
      this.state.gridSize.rows++;
    } else {
      this.state.gridSize.cols++;
    }

    this.state.cargos.forEach(cargo => {
      if (cargo.placed && cargo.position) {
        cargo.position.row += result.rowOffset;
        cargo.position.col += result.colOffset;
      }
    });

    this.state.gold -= cost;

    EventBus.emit('grid:expanded', this.state.gridSize);
    EventBus.emit('score:changed', { score: this.state.score, gold: this.state.gold });
    this._autoSave();
    return { success: true, message: `仓库已扩容！花费 ${cost} 金币` };
  },

  upgradeCell(row, col) {
    const cell = this.state.grid[row][col];
    if (!cell) return { success: false, message: '无效的单元格' };
    if (cell.upgradeLevel >= UpgradeSystem.getMaxUpgradeLevel()) {
      return { success: false, message: '已达最高升级等级' };
    }

    const cost = UpgradeSystem.getCellUpgradeCost(cell.upgradeLevel);
    if (this.state.gold < cost) {
      return { success: false, message: `金币不足！需要 ${cost} 金币` };
    }

    cell.upgradeLevel++;
    this.state.gold -= cost;

    EventBus.emit('cell:upgraded', { row, col, level: cell.upgradeLevel });
    EventBus.emit('score:changed', { score: this.state.score, gold: this.state.gold });
    this._autoSave();
    return { success: true, message: `货架升级成功！等级 ${cell.upgradeLevel}` };
  },

  removeCargo(cargoId) {
    const cargo = CargoManager.getCargoById(this.state.cargos, cargoId);
    if (!cargo || !cargo.placed) return { success: false, message: '货物不存在或未放置' };

    const prevPos = { ...cargo.position };
    const prevShape = Utils.cloneMatrix(cargo.shape);
    Grid.removeCargoFromGrid(this.state.grid, cargoId);
    cargo.placed = false;
    cargo.position = null;
    this.state.cargos = this.state.cargos.filter(c => c.id !== cargoId);

    const undoAction = {
      type: 'remove',
      cargoId: cargo.id,
      cargoType: cargo.type,
      cargoName: cargo.name,
      prevPosition: prevPos,
      shape: prevShape,
    };
    UndoManager.push(undoAction);

    EventBus.emit('cargo:removed', cargo);
    this._autoSave();
    return { success: true, message: `已移除 ${cargo.name}` };
  },

  _checkChallengeCompletion() {
    if (!ChallengeManager.hasActiveChallenge()) return;
    if (ChallengeManager.isChallengeCompleted(this.state.score)) {
      this.state.gameOver = true;
      EventBus.emit('game:completed', { score: this.state.score });
    }
  },

  exportState() {
    return {
      version: 1,
      timestamp: Date.now(),
      gridSize: this.state.gridSize,
      grid: this.state.grid,
      cargos: this.state.cargos.map(c => ({
        id: c.id,
        type: c.type,
        name: c.name,
        shape: c.shape,
        position: c.position,
        rotation: c.rotation,
        baseValue: c.baseValue,
        color: c.color,
        placed: c.placed,
      })),
      pendingCargos: this.state.pendingCargos.map(c => ({
        id: c.id,
        type: c.type,
        name: c.name,
        shape: c.shape,
        rotation: c.rotation,
        baseValue: c.baseValue,
        color: c.color,
        placed: c.placed,
      })),
      orders: this.state.orders,
      gold: this.state.gold,
      score: this.state.score,
      step: this.state.step,
      moveCostTotal: this.state.moveCostTotal,
      turnoverCounts: { ...CargoManager.turnoverCounts },
      challenge: ChallengeManager.currentChallenge,
    };
  },

  importState(data) {
    if (!data || data.version !== 1) {
      return { success: false, message: '无效的存档数据' };
    }

    CargoManager.turnoverCounts = data.turnoverCounts || {};
    CargoManager.TYPE_KEYS.forEach(type => {
      if (CargoManager.turnoverCounts[type] === undefined) {
        CargoManager.turnoverCounts[type] = 0;
      }
    });

    OrderManager.orders = [];
    OrderManager.completedOrders = [];
    UndoManager.clear();

    this.state = {
      gridSize: data.gridSize,
      grid: data.grid,
      cargos: data.cargos,
      pendingCargos: data.pendingCargos,
      orders: data.orders,
      gold: data.gold,
      score: data.score,
      step: data.step,
      moveCostTotal: data.moveCostTotal || 0,
      gameOver: false,
    };

    if (data.challenge) {
      ChallengeManager.loadChallenge(data.challenge);
    } else {
      ChallengeManager.clearChallenge();
    }

    Grid.calculateHeatScores(this.state.grid);
    EventBus.emit('game:initialized', this.state);
    EventBus.emit('score:changed', { score: this.state.score, gold: this.state.gold });
    this._autoSave();
    return { success: true, message: '存档已加载！' };
  },

  _autoSave() {
    StorageManager.save(this.exportState());
  },

  loadSave() {
    const data = StorageManager.load();
    if (data) {
      return this.importState(data);
    }
    return { success: false, message: '没有找到存档' };
  }
};