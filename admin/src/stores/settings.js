import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: {
      storeName: 'Alquimia',
      currency: 'USD',
      supportEmail: 'support@alquimia.com',
      lowStockThreshold: 5
    },
    loading: false
  }),

  actions: {
    async fetchSettings() {
      this.loading = true;
      try {
        // TODO: connect to backend settings endpoint when available
      } finally {
        this.loading = false;
      }
    },

    async saveSettings(payload) {
      this.loading = true;
      try {
        this.settings = { ...this.settings, ...payload };
      } finally {
        this.loading = false;
      }
    }
  }
});
