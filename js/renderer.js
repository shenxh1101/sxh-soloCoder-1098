const Renderer = {
  gridContainer: null,
  pendingPanel: null,
  orderPanel: null,
  heatmapOverlay: null,
  selectedCargo: null,
  cellSize: 48,

  init() {
    this.gridContainer = document.getElementById('warehouse-grid');
    this.pendingPanel = document.getElementById('pending-cargos');
    this.orderPanel = document.getElementById('order-list');
    this.heatmapOverlay = document.getElementById('heatmap-overlay');
    this.setupEventListeners();
  },

  setupEventListeners() {
    EventBus.on('game:initialized', (state) => this.renderAll(state));
    EventBus.on('cargo:placed', () => this.refreshRender(GameEngine.state));
    EventBus.on('cargo:removed', () => this.refreshRender(GameEngine.state));
    EventBus.on('cargo:rotated', () => this.renderPendingCargos(GameEngine.state));
    EventBus.on('cargo:selected', (cargo) => {
      this.selectedCargo = cargo;
      this.renderPendingCargos(GameEngine.state);
    });
    EventBus.on('order:completed', () => this.refreshRender(GameEngine.state));
    EventBus.on('grid:expanded', () => this.refreshRender(GameEngine.state));
    EventBus.on('score:changed', (data) => this.updateScoreDisplay(data));
    EventBus.on('action:undone', () => this.refreshRender(GameEngine.state));
    EventBus.on('cell:upgraded', () => this.refreshRender(GameEngine.state));
    EventBus.on('challenge:loaded', () => this.refreshRender(GameEngine.state));
  },

  renderAll(state) {
    if (!state) return;
    this.renderGrid(state);
    this.renderPendingCargos(state);
    this.renderOrders(state);
    this.renderHeatmap(state);
    this.renderStats(state);
  },

  refreshRender(state) {
    this.renderAll(state);
  },

  renderGrid(state) {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = '';

    this.gridContainer.style.gridTemplateColumns = `repeat(${state.gridSize.cols}, ${this.cellSize}px)`;
    this.gridContainer.style.gridTemplateRows = `repeat(${state.gridSize.rows}, ${this.cellSize}px)`;

    for (let r = 0; r < state.gridSize.rows; r++) {
      for (let c = 0; c < state.gridSize.cols; c++) {
        const cell = state.grid[r][c];
        const cellEl = document.createElement('div');
        cellEl.className = 'grid-cell';
        cellEl.dataset.row = r;
        cellEl.dataset.col = c;

        if (cell.upgradeLevel > 0) {
          cellEl.classList.add(`upgrade-lv${cell.upgradeLevel}`);
        }

        if (cell.occupied) {
          cellEl.classList.add('occupied');
          const cargo = state.cargos.find(cg => cg.id === cell.cargoId);
          if (cargo) {
            cellEl.style.backgroundColor = cargo.color;
            cellEl.style.boxShadow = `inset 0 0 8px ${cargo.color}44, 0 2px 4px rgba(0,0,0,0.3)`;
            cellEl.title = `${cargo.name} (价值: ${CargoManager.calculateValue(cargo.type)})`;
          }
        }

        cellEl.addEventListener('click', () => this._handleGridClick(r, c, cell));
        cellEl.addEventListener('mouseenter', () => this._handleGridHover(r, c, cell));
        cellEl.addEventListener('mouseleave', () => this._clearHoverPreview());

        this.gridContainer.appendChild(cellEl);
      }
    }
  },

  _handleGridClick(row, col, cellEl) {
    const state = GameEngine.state;
    if (!state) return;
    const cell = state.grid[row][col];

    if (cell.occupied) {
      this._handleOccupiedCellClick(cell, row, col);
    } else if (this.selectedCargo) {
      this._handlePlacementClick(row, col);
    }
  },

  _handleOccupiedCellClick(cell, row, col) {
    const cargo = GameEngine.state.cargos.find(c => c.id === cell.cargoId);
    if (!cargo) return;

    const blockingCargos = Grid.getBlockingCargos(GameEngine.state.grid, cargo.id, GameEngine.state.cargos);

    if (blockingCargos.length === 0 && OrderManager.hasActiveOrders(GameEngine.state.step)) {
      const matchingOrders = OrderManager.getActiveOrders(GameEngine.state.step)
        .filter(o => o.cargoType === cargo.type);
      if (matchingOrders.length > 0) {
        const result = GameEngine.processOrder(matchingOrders[0].id);
        Utils.showToast(result.message, result.success ? 'success' : 'error');
        return;
      }
    }

    if (blockingCargos.length > 0) {
      Utils.showToast(`该货物被 ${blockingCargos.length} 个货物遮挡，需要先移开`, 'warning');
    } else {
      Utils.showToast('点击未遮挡货物可处理订单, 或使用右键移除', 'info');
    }
  },

  _handlePlacementClick(row, col) {
    const cargo = this.selectedCargo;
    if (!cargo) return;

    const result = GameEngine.placeCargo(cargo.id, row, col);
    Utils.showToast(result.message, result.success ? 'success' : 'error');

    if (result.success) {
      this.selectedCargo = null;
    }
  },

  _handleGridHover(row, col, cellEl) {
    if (!this.selectedCargo) return;

    const state = GameEngine.state;
    const cargo = this.selectedCargo;
    const canPlace = Grid.canPlace(state.grid, cargo.shape, row, col, state.gridSize);

    const previewCells = [];
    for (let r = 0; r < cargo.shape.length; r++) {
      for (let c = 0; c < cargo.shape[r].length; c++) {
        if (!cargo.shape[r][c]) continue;
        const gr = row + r;
        const gc = col + c;
        const cells = this.gridContainer.querySelectorAll(`[data-row="${gr}"][data-col="${gc}"]`);
        cells.forEach(cell => {
          cell.classList.add(canPlace ? 'preview-valid' : 'preview-invalid');
          previewCells.push(cell);
        });
      }
    }

    cellEl._previewCells = previewCells;
  },

  _clearHoverPreview() {
    const cells = this.gridContainer.querySelectorAll('.preview-valid, .preview-invalid');
    cells.forEach(cell => {
      cell.classList.remove('preview-valid', 'preview-invalid');
    });
  },

  renderPendingCargos(state) {
    if (!this.pendingPanel) return;

    this.pendingPanel.innerHTML = '';
    state.pendingCargos.forEach(cargo => {
      const card = document.createElement('div');
      card.className = 'cargo-card';
      if (this.selectedCargo && this.selectedCargo.id === cargo.id) {
        card.classList.add('selected');
      }

      card.draggable = true;
      card.dataset.cargoId = cargo.id;

      const preview = this._createShapePreview(cargo);
      card.appendChild(preview);

      const info = document.createElement('div');
      info.className = 'cargo-info';
      const value = CargoManager.calculateValue(cargo.type);
      info.innerHTML = `
        <span class="cargo-name">${cargo.name}</span>
        <span class="cargo-value">${value}💰</span>
      `;
      card.appendChild(info);

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedCargo && this.selectedCargo.id === cargo.id) {
          GameEngine.rotatePendingCargo(cargo.id);
        } else {
          this.selectedCargo = GameEngine.selectCargo(cargo.id);
          if (this.selectedCargo) {
            Utils.showToast(`已选择 ${this.selectedCargo.name}，点击网格放置（按R旋转）`, 'info');
          }
        }
        this.renderPendingCargos(state);
      });

      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', cargo.id);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });

      this.pendingPanel.appendChild(card);
    });
  },

  _createShapePreview(cargo) {
    const container = document.createElement('div');
    container.className = 'shape-preview';

    const rows = cargo.shape.length;
    const cols = cargo.shape[0].length;
    const miniSize = Math.max(14, Math.min(20, 60 / Math.max(rows, cols)));

    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${cols}, ${miniSize}px)`;
    container.style.gridTemplateRows = `repeat(${rows}, ${miniSize}px)`;
    container.style.gap = '1px';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const block = document.createElement('div');
        if (cargo.shape[r][c]) {
          block.style.backgroundColor = cargo.color;
          block.style.borderRadius = '2px';
        }
        container.appendChild(block);
      }
    }

    return container;
  },

  renderOrders(state) {
    if (!this.orderPanel) return;

    const activeOrders = OrderManager.getActiveOrders(state.step);
    const pendingOrders = OrderManager.getPendingOrders(state.step);

    this.orderPanel.innerHTML = '';

    if (activeOrders.length === 0 && pendingOrders.length === 0) {
      this.orderPanel.innerHTML = '<div class="order-empty">暂无订单</div>';
      return;
    }

    const renderOrderItem = (order, isActive) => {
      const item = document.createElement('div');
      item.className = `order-item ${isActive ? 'active' : 'pending'}`;
      const typeInfo = CargoManager.getTypeInfo(order.cargoType);

      const dot = document.createElement('span');
      dot.className = 'order-dot';
      dot.style.backgroundColor = typeInfo ? typeInfo.color : '#666';
      item.appendChild(dot);

      const details = document.createElement('div');
      details.className = 'order-details';
      details.innerHTML = `
        <span class="order-type">${typeInfo ? typeInfo.name : order.cargoType}</span>
        <span class="order-step">第${order.atStep}步</span>
      `;
      item.appendChild(details);

      if (isActive) {
        item.addEventListener('click', () => {
          const result = GameEngine.processOrder(order.id);
          Utils.showToast(result.message, result.success ? 'success' : 'error');
        });
        item.classList.add('clickable');
      }

      return item;
    };

    if (activeOrders.length > 0) {
      const header = document.createElement('div');
      header.className = 'order-section-header';
      header.textContent = '进行中';
      this.orderPanel.appendChild(header);
      activeOrders.forEach(o => this.orderPanel.appendChild(renderOrderItem(o, true)));
    }

    if (pendingOrders.length > 0) {
      const header = document.createElement('div');
      header.className = 'order-section-header';
      header.textContent = '待激活';
      this.orderPanel.appendChild(header);
      pendingOrders.forEach(o => this.orderPanel.appendChild(renderOrderItem(o, false)));
    }
  },

  renderHeatmap(state) {
    if (!this.heatmapOverlay) return;
    this.heatmapOverlay.style.gridTemplateColumns = `repeat(${state.gridSize.cols}, ${this.cellSize}px)`;
    this.heatmapOverlay.style.gridTemplateRows = `repeat(${state.gridSize.rows}, ${this.cellSize}px)`;
    HeatmapManager.renderOverlay(state.grid, this.heatmapOverlay);
  },

  updateScoreDisplay(data) {
    const goldEl = document.getElementById('stat-gold');
    const scoreEl = document.getElementById('stat-score');
    if (goldEl) goldEl.textContent = data.gold;
    if (scoreEl) scoreEl.textContent = data.score;

    this.renderStats(GameEngine.state);
  },

  renderStats(state) {
    const usage = Grid.calculateUsage(state.grid);
    const usageEl = document.getElementById('stat-usage');
    const turnoverEl = document.getElementById('stat-turnover');
    const stepEl = document.getElementById('stat-step');

    if (usageEl) usageEl.textContent = `${usage.percentage}%`;

    const usageBar = document.getElementById('usage-bar');
    if (usageBar) {
      usageBar.style.width = `${usage.percentage}%`;
      if (usage.percentage >= 80) {
        usageBar.classList.add('warning');
      } else {
        usageBar.classList.remove('warning');
      }
    }

    if (stepEl) stepEl.textContent = state.step;

    let maxRate = 0;
    let maxType = '';
    Object.keys(CargoManager.turnoverCounts).forEach(type => {
      const rate = CargoManager.getTurnoverRate(type);
      if (rate > maxRate) {
        maxRate = rate;
        maxType = type;
      }
    });

    if (turnoverEl) {
      if (maxRate > 0) {
        const info = CargoManager.getTypeInfo(maxType);
        turnoverEl.textContent = `${info ? info.name : maxType} ${Math.round(maxRate * 100)}%`;
      } else {
        turnoverEl.textContent = '暂无';
      }
    }

    const goldEl = document.getElementById('stat-gold');
    const scoreEl = document.getElementById('stat-score');
    if (goldEl) goldEl.textContent = state.gold;
    if (scoreEl) scoreEl.textContent = state.score;
  },

  updateChallengeInfo() {
    const challengeInfoEl = document.getElementById('challenge-info');
    if (!challengeInfoEl) return;

    if (ChallengeManager.hasActiveChallenge()) {
      const name = ChallengeManager.getChallengeName();
      const target = ChallengeManager.getTargetScore();
      challengeInfoEl.innerHTML = `
        <span class="challenge-badge">${name}</span>
        <span class="challenge-target">目标: ${target}分</span>
      `;
      challengeInfoEl.style.display = 'flex';
    } else {
      challengeInfoEl.style.display = 'none';
    }
  }
};