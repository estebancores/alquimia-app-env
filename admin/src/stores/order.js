import { defineStore } from 'pinia';

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    loading: false
  }),

  getters: {
    pendingDeliveries: (state) => state.orders.filter((o) => o.status !== 'delivered')
  },

  actions: {
    async fetchOrders() {
      this.loading = true;
      try {
        // TODO: connect to backend orders endpoint when available
        this.orders = [
          { id: 1, customer: 'Demo Customer', status: 'pending', total: 120, deliveryDate: null },
          { id: 2, customer: 'Demo Customer 2', status: 'shipped', total: 85, deliveryDate: '2026-09-20' }
        ];
      } finally {
        this.loading = false;
      }
    },

    async updateDelivery(orderId, deliveryInfo) {
      const index = this.orders.findIndex((o) => o.id === orderId);
      if (index !== -1) {
        this.orders[index] = { ...this.orders[index], ...deliveryInfo };
      }
    }
  }
});
