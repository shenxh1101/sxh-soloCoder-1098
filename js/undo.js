const UndoManager = {
  stack: [],
  maxStack: 50,

  push(action) {
    this.stack.push(action);
    if (this.stack.length > this.maxStack) {
      this.stack.shift();
    }
  },

  pop() {
    return this.stack.pop();
  },

  canUndo() {
    return this.stack.length > 0;
  },

  clear() {
    this.stack = [];
  },

  getLastAction() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }
};