const HeatmapManager = {
  enabled: false,

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  },

  getHeatColor(heatScore) {
    if (heatScore <= 0) return 'rgba(59, 130, 246, 0.05)';
    if (heatScore <= 0.2) return 'rgba(59, 130, 246, 0.2)';
    if (heatScore <= 0.4) return 'rgba(16, 185, 129, 0.3)';
    if (heatScore <= 0.6) return 'rgba(245, 158, 11, 0.4)';
    if (heatScore <= 0.8) return 'rgba(249, 115, 22, 0.5)';
    return 'rgba(239, 68, 68, 0.55)';
  },

  getHeatLabel(heatScore) {
    if (heatScore <= 0) return '空闲';
    if (heatScore <= 0.2) return '低频';
    if (heatScore <= 0.4) return '中低频';
    if (heatScore <= 0.6) return '中频';
    if (heatScore <= 0.8) return '高频';
    return '极高频';
  },

  renderOverlay(grid, container) {
    if (!container) return;
    container.innerHTML = '';
    if (!this.enabled) return;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.style.backgroundColor = this.getHeatColor(grid[r][c].heatScore);
        cell.style.gridRow = r + 1;
        cell.style.gridColumn = c + 1;
        cell.title = `${this.getHeatLabel(grid[r][c].heatScore)} (访问: ${grid[r][c].accessCount})`;
        container.appendChild(cell);
      }
    }
  }
};