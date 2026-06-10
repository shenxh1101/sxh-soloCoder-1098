const CARGO_TYPES = {
  '1x1': { shape: [[1]], name: '小箱', baseValue: 10, color: '#ef4444', frequency: 25 },
  '1x2': { shape: [[1, 1]], name: '横条', baseValue: 25, color: '#3b82f6', frequency: 20 },
  '2x1': { shape: [[1], [1]], name: '竖条', baseValue: 25, color: '#8b5cf6', frequency: 15 },
  '2x2': { shape: [[1, 1], [1, 1]], name: '大方箱', baseValue: 60, color: '#f59e0b', frequency: 15 },
  '1x3': { shape: [[1, 1, 1]], name: '横长条', baseValue: 45, color: '#06d6a0', frequency: 10 },
  '3x1': { shape: [[1], [1], [1]], name: '竖长条', baseValue: 45, color: '#ec4899', frequency: 5 },
  'L-RD': { shape: [[1, 0], [1, 1]], name: 'L形(右下)', baseValue: 55, color: '#f97316', frequency: 5 },
  'L-LD': { shape: [[0, 1], [1, 1]], name: 'L形(左下)', baseValue: 55, color: '#14b8a6', frequency: 5 },
};

const CargoManager = {
  TYPE_KEYS: Object.keys(CARGO_TYPES),
  turnoverCounts: {},

  init() {
    this.TYPE_KEYS.forEach(type => {
      this.turnoverCounts[type] = 0;
    });
  },

  getTypeInfo(type) {
    return CARGO_TYPES[type];
  },

  rotateShape(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = [];
    for (let c = 0; c < cols; c++) {
      rotated[c] = [];
      for (let r = rows - 1; r >= 0; r--) {
        rotated[c][rows - 1 - r] = shape[r][c];
      }
    }
    return rotated;
  },

  createCargo(type, rotation = 0) {
    const info = CARGO_TYPES[type];
    if (!info) return null;
    let shape = Utils.cloneMatrix(info.shape);
    for (let i = 0; i < rotation; i++) {
      shape = this.rotateShape(shape);
    }
    return {
      id: Utils.generateId(),
      type: type,
      name: info.name,
      shape: shape,
      position: null,
      rotation: rotation,
      baseValue: info.baseValue,
      color: info.color,
      placed: false,
    };
  },

  generateRandomCargo() {
    const weightedList = [];
    this.TYPE_KEYS.forEach(type => {
      const freq = CARGO_TYPES[type].frequency;
      for (let i = 0; i < freq; i++) {
        weightedList.push(type);
      }
    });
    const type = weightedList[Math.floor(Math.random() * weightedList.length)];
    return this.createCargo(type, 0);
  },

  generatePendingCargos(count = 4) {
    const cargos = [];
    for (let i = 0; i < count; i++) {
      cargos.push(this.generateRandomCargo());
    }
    return cargos;
  },

  getCargoById(cargos, id) {
    return cargos.find(c => c.id === id);
  },

  getPlacedCargos(cargos) {
    return cargos.filter(c => c.placed);
  },

  getCargosByType(cargos, type) {
    return cargos.filter(c => c.type === type);
  },

  incrementTurnover(type) {
    if (this.turnoverCounts[type] !== undefined) {
      this.turnoverCounts[type]++;
    }
  },

  getTurnoverRate(type) {
    const count = this.turnoverCounts[type] || 0;
    const maxCount = Math.max(1, ...Object.values(this.turnoverCounts));
    return count / maxCount;
  },

  calculateValue(type) {
    const info = CARGO_TYPES[type];
    if (!info) return 0;
    const rate = this.getTurnoverRate(type);
    return Math.round(info.baseValue * (1 + rate * 0.5));
  },

  resetTurnover() {
    this.TYPE_KEYS.forEach(type => {
      this.turnoverCounts[type] = 0;
    });
  }
};