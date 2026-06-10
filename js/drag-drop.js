const DragDrop = {
  init() {
    this.setupGridDropTarget();
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
  },

  setupGridDropTarget() {
    const gridContainer = document.getElementById('warehouse-grid');
    if (!gridContainer) return;

    gridContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      const cell = e.target.closest('.grid-cell');
      if (cell) {
        cell.classList.add('drag-over');
      }
    });

    gridContainer.addEventListener('dragleave', (e) => {
      const cell = e.target.closest('.grid-cell');
      if (cell) {
        cell.classList.remove('drag-over');
      }
    });

    gridContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      const cell = e.target.closest('.grid-cell');
      if (cell) {
        cell.classList.remove('drag-over');
      }

      const cargoId = e.dataTransfer.getData('text/plain');
      if (!cargoId) return;

      const cargo = GameEngine.state.pendingCargos.find(c => c.id === cargoId);
      if (!cargo) return;

      if (cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const result = GameEngine.placeCargo(cargoId, row, col);
        Utils.showToast(result.message, result.success ? 'success' : 'error');
        if (result.success && Renderer.selectedCargo && Renderer.selectedCargo.id === cargoId) {
          Renderer.selectedCargo = null;
        }
      }
    });
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        const result = GameEngine.undo();
        Utils.showToast(result.message, result.success ? 'info' : 'warning');
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        if (Renderer.selectedCargo) {
          e.preventDefault();
          GameEngine.rotatePendingCargo(Renderer.selectedCargo.id);
          Renderer.renderPendingCargos(GameEngine.state);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (App._upgradeMode) {
          App._upgradeMode = false;
          Utils.showToast('已取消升级模式', 'info');
          return;
        }
        Renderer.selectedCargo = null;
        Renderer.renderPendingCargos(GameEngine.state);
        Utils.hideModal('modal-import');
        Utils.hideModal('modal-export');
        return;
      }

      if (e.key === 'h' || e.key === 'H') {
        if (e.ctrlKey || e.metaKey) return;
        HeatmapManager.toggle();
        Renderer.renderHeatmap(GameEngine.state);
        Utils.showToast(HeatmapManager.enabled ? '热力图已开启' : '热力图已关闭', 'info');
      }
    });
  }
};