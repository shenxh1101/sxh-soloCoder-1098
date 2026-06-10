const UpgradeSystem = {
  EXPANSION_BASE_COST: 500,
  EXPANSION_COST_PER_SIZE: 100,
  CELL_UPGRADE_COST: 200,
  CELL_UPGRADE_MULTIPLIER: 1.5,

  getExpansionCost(gridRows, gridCols) {
    const size = Math.max(gridRows, gridCols);
    return this.EXPANSION_BASE_COST + size * this.EXPANSION_COST_PER_SIZE;
  },

  getCellUpgradeCost(upgradeLevel) {
    return this.CELL_UPGRADE_COST * (upgradeLevel + 1);
  },

  canExpand(gold, gridRows, gridCols) {
    return gold >= this.getExpansionCost(gridRows, gridCols);
  },

  canUpgradeCell(gold, upgradeLevel) {
    return gold >= this.getCellUpgradeCost(upgradeLevel);
  },

  getCellValueMultiplier(upgradeLevel) {
    return 1 + upgradeLevel * (this.CELL_UPGRADE_MULTIPLIER - 1);
  },

  getMaxUpgradeLevel() {
    return 3;
  }
};