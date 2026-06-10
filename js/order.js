const OrderManager = {
  orders: [],
  completedOrders: [],

  init() {
    this.orders = [];
    this.completedOrders = [];
  },

  addOrder(cargoType, atStep) {
    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      cargoType: cargoType,
      atStep: atStep || 0,
      completed: false,
      reward: 0,
    };
    this.orders.push(order);
    return order;
  },

  getActiveOrders(currentStep) {
    return this.orders.filter(o => !o.completed && o.atStep <= currentStep);
  },

  getPendingOrders(currentStep) {
    return this.orders.filter(o => !o.completed && o.atStep > currentStep);
  },

  completeOrder(orderId, reward) {
    const order = this.orders.find(o => o.id === orderId);
    if (order) {
      order.completed = true;
      order.reward = reward;
      this.completedOrders.push(order);
    }
  },

  hasActiveOrders(currentStep) {
    return this.getActiveOrders(currentStep).length > 0;
  },

  getNextOrderToComplete(currentStep, placedCargos) {
    const active = this.getActiveOrders(currentStep);
    for (const order of active) {
      const matching = placedCargos.filter(c => c.type === order.cargoType);
      if (matching.length > 0) {
        return { order, cargo: matching[0] };
      }
    }
    return null;
  },

  generateOrders(count = 5, currentStep = 0) {
    for (let i = 0; i < count; i++) {
      const typeIndex = Math.floor(Math.random() * Math.min(4, CargoManager.TYPE_KEYS.length));
      const type = CargoManager.TYPE_KEYS[typeIndex];
      const atStep = currentStep + Math.floor(Math.random() * 5) + 1;
      this.addOrder(type, atStep);
    }
  }
};