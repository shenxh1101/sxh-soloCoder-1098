const App = {
  async init() {
    Renderer.init();
    DragDrop.init();
    DragDrop.setupKeyboardShortcuts();

    this.setupToolbarActions();
    this.setupModalActions();
    this.setupEventListener();

    const saved = StorageManager.load();
    if (saved) {
      const result = GameEngine.importState(saved);
      if (result.success) {
        Utils.showToast('已加载自动存档', 'info');
      } else {
        this.startNewGame();
      }
    } else {
      this.startNewGame();
    }
  },

  startNewGame() {
    GameEngine.init(10, 10);
    Renderer.updateChallengeInfo();
    Utils.showToast('新游戏已开始！点击货物选择，再点击网格放置', 'info');
  },

  setupToolbarActions() {
    document.getElementById('btn-undo')?.addEventListener('click', () => {
      const result = GameEngine.undo();
      Utils.showToast(result.message, result.success ? 'info' : 'warning');
    });

    document.getElementById('btn-expand')?.addEventListener('click', () => {
      this.showExpandModal();
    });

    document.getElementById('btn-heatmap')?.addEventListener('click', () => {
      HeatmapManager.toggle();
      Renderer.renderHeatmap(GameEngine.state);
      Utils.showToast(HeatmapManager.enabled ? '热力图已开启' : '热力图已关闭', 'info');
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.showExportModal();
    });

    document.getElementById('btn-import')?.addEventListener('click', () => {
      Utils.showModal('modal-import');
    });

    document.getElementById('btn-new-game')?.addEventListener('click', () => {
      if (confirm('确定要开始新游戏吗？当前进度将丢失。')) {
        StorageManager.clear();
        ChallengeManager.clearChallenge();
        this.startNewGame();
      }
    });

    document.getElementById('btn-upgrade')?.addEventListener('click', () => {
      Utils.showToast('请点击要升级的仓库单元格（已放置货物的单元格）', 'info');
      this._upgradeMode = true;
    });
  },

  setupModalActions() {
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) Utils.hideModal(modal.id);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        const modal = overlay.closest('.modal');
        if (modal) Utils.hideModal(modal.id);
      });
    });

    document.getElementById('btn-confirm-export')?.addEventListener('click', () => {
      const state = GameEngine.exportState();
      Utils.downloadJSON(state, `warehouse_save_${Date.now()}.json`);
      Utils.showToast('存档已导出！', 'success');
      Utils.hideModal('modal-export');
    });

    document.getElementById('btn-export-challenge')?.addEventListener('click', () => {
      const challenge = ChallengeManager.exportChallenge(GameEngine.state);
      Utils.downloadJSON(challenge, `warehouse_challenge_${Date.now()}.json`);
      Utils.showToast('挑战已导出！', 'success');
      Utils.hideModal('modal-export');
    });

    document.getElementById('btn-confirm-import')?.addEventListener('click', () => {
      const textarea = document.getElementById('import-json');
      if (!textarea) return;
      try {
        const data = JSON.parse(textarea.value);
        if (data.orders && data.incomingCargo) {
          GameEngine.initFromChallenge(data);
          Renderer.updateChallengeInfo();
          Utils.showToast(`挑战 "${data.name || '自定义'}" 已加载！`, 'success');
        } else {
          const result = GameEngine.importState(data);
          Utils.showToast(result.message, result.success ? 'success' : 'error');
        }
        Utils.hideModal('modal-import');
        textarea.value = '';
      } catch (e) {
        Utils.showToast('JSON格式错误，请检查后重试', 'error');
      }
    });

    document.getElementById('btn-file-import')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const data = await Utils.readFileAsJSON(file);
          if (data.orders && data.incomingCargo) {
            GameEngine.initFromChallenge(data);
            Renderer.updateChallengeInfo();
            Utils.showToast(`挑战 "${data.name || '自定义'}" 已加载！`, 'success');
          } else {
            const result = GameEngine.importState(data);
            Utils.showToast(result.message, result.success ? 'success' : 'error');
          }
          Utils.hideModal('modal-import');
        } catch (err) {
          Utils.showToast(err.message || '文件读取失败', 'error');
        }
      };
      input.click();
    });
  },

  setupEventListener() {
    EventBus.on('game:completed', (data) => {
      Utils.showToast(`挑战完成！最终得分: ${data.score}`, 'success');
    });
  },

  showExpandModal() {
    const state = GameEngine.state;
    if (!state) return;

    const cost = UpgradeSystem.getExpansionCost(state.gridSize.rows, state.gridSize.cols);
    const content = document.getElementById('expand-content');
    if (!content) return;

    content.innerHTML = `
      <p>当前仓库: ${state.gridSize.rows}×${state.gridSize.cols}</p>
      <p>扩容费用: <strong>${cost}💰</strong></p>
      <p>当前金币: ${state.gold}💰</p>
      <div class="expand-options">
        <button class="btn btn-amber" id="expand-row-down">向下增加一行</button>
        <button class="btn btn-amber" id="expand-row-up">向上增加一行</button>
        <button class="btn btn-teal" id="expand-col-right">向右增加一列</button>
        <button class="btn btn-teal" id="expand-col-left">向左增加一列</button>
      </div>
    `;

    const bindExpand = (id, direction) => {
      document.getElementById(id)?.addEventListener('click', () => {
        const result = GameEngine.expandGrid(direction);
        Utils.showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
          Utils.hideModal('modal-expand');
        }
      });
    };

    bindExpand('expand-row-down', 'row-down');
    bindExpand('expand-row-up', 'row-up');
    bindExpand('expand-col-right', 'col-right');
    bindExpand('expand-col-left', 'col-left');

    Utils.showModal('modal-expand');
  },

  showExportModal() {
    Utils.showModal('modal-export');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());