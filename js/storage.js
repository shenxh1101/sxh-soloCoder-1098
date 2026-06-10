const StorageManager = {
  KEY: 'warehouse_game_save',

  save(state) {
    try {
      const data = JSON.stringify(state);
      localStorage.setItem(this.KEY, data);
      return true;
    } catch (e) {
      console.warn('自动保存失败:', e);
      return false;
    }
  },

  load() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('读取存档失败:', e);
      return null;
    }
  },

  exists() {
    return localStorage.getItem(this.KEY) !== null;
  },

  clear() {
    localStorage.removeItem(this.KEY);
  }
};