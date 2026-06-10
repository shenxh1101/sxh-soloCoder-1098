const ChallengeManager = {
  currentChallenge: null,

  loadChallenge(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('无效的挑战数据');
    }
    if (!data.gridSize || data.gridSize < 5 || data.gridSize > 20) {
      throw new Error('网格尺寸必须在5-20之间');
    }
    this.currentChallenge = data;
    return data;
  },

  clearChallenge() {
    this.currentChallenge = null;
  },

  hasActiveChallenge() {
    return this.currentChallenge !== null;
  },

  getChallengeName() {
    return this.currentChallenge ? this.currentChallenge.name : '自由模式';
  },

  getTargetScore() {
    return this.currentChallenge ? (this.currentChallenge.targetScore || 0) : 0;
  },

  isChallengeCompleted(score) {
    if (!this.currentChallenge) return false;
    return score >= this.currentChallenge.targetScore;
  },

  exportChallenge(state) {
    return {
      name: '自定义挑战',
      gridSize: state.gridSize.rows,
      initialLayout: state.cargos.filter(c => c.placed).map(c => ({
        type: c.type,
        row: c.position.row,
        col: c.position.col,
        rotation: c.rotation,
      })),
      incomingCargo: CargoManager.TYPE_KEYS.map(type => ({
        type,
        count: state.cargos.filter(c => c.type === type && !c.placed).length,
      })).filter(t => t.count > 0),
      orders: state.orders.map(o => ({
        type: o.cargoType,
        atStep: o.atStep,
      })),
      targetScore: this.currentChallenge ? this.currentChallenge.targetScore : 500,
    };
  },

  createSampleChallenge1() {
    return {
      name: '新手入门',
      gridSize: 8,
      initialLayout: [],
      incomingCargo: [
        { type: '1x1', count: 8 },
        { type: '1x2', count: 5 },
        { type: '2x2', count: 3 },
        { type: '1x3', count: 2 },
      ],
      orders: [
        { type: '1x1', atStep: 3 },
        { type: '1x2', atStep: 5 },
        { type: '2x2', atStep: 8 },
        { type: '1x1', atStep: 10 },
      ],
      targetScore: 300,
    };
  },

  createSampleChallenge2() {
    return {
      name: '中级挑战',
      gridSize: 10,
      initialLayout: [],
      incomingCargo: [
        { type: '1x1', count: 6 },
        { type: '1x2', count: 4 },
        { type: '2x1', count: 3 },
        { type: '2x2', count: 4 },
        { type: '1x3', count: 3 },
        { type: 'L-RD', count: 2 },
        { type: 'L-LD', count: 2 },
      ],
      orders: [
        { type: '1x2', atStep: 4 },
        { type: '2x2', atStep: 6 },
        { type: 'L-RD', atStep: 8 },
        { type: '1x3', atStep: 10 },
        { type: '2x2', atStep: 12 },
        { type: '1x1', atStep: 14 },
      ],
      targetScore: 800,
    };
  },

  createSampleChallenge3() {
    return {
      name: '高级挑战',
      gridSize: 10,
      initialLayout: [],
      incomingCargo: [
        { type: '1x1', count: 4 },
        { type: '1x2', count: 3 },
        { type: '2x1', count: 3 },
        { type: '2x2', count: 3 },
        { type: '1x3', count: 4 },
        { type: '3x1', count: 2 },
        { type: 'L-RD', count: 3 },
        { type: 'L-LD', count: 3 },
      ],
      orders: [
        { type: '2x2', atStep: 3 },
        { type: '1x3', atStep: 5 },
        { type: 'L-RD', atStep: 6 },
        { type: '1x2', atStep: 7 },
        { type: 'L-LD', atStep: 9 },
        { type: '2x2', atStep: 10 },
        { type: '3x1', atStep: 12 },
        { type: '1x1', atStep: 14 },
        { type: '1x3', atStep: 15 },
      ],
      targetScore: 1500,
    };
  }
};