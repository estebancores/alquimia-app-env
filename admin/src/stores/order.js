import { defineStore } from 'pinia';
import api from '@/services/api';

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    loading: false
  }),

  actions: {
    async fetchOrders() {
      this.loading = true;
      try {
        const { data } = await api.get('/orders', { params: { limit: 100 } });
        this.orders = data.data;
      } finally {
        this.loading = false;
      }
    },

    async updateOrder(orderId, payload) {
      const { data } = await api.put(`/orders/${orderId}`, payload);
      const index = this.orders.findIndex((o) => o.id === orderId);
      if (index !== -1) {
        this.orders[index] = { ...this.orders[index], ...data.data };
      }
    },

    async updateDelivery(orderId, deliveryInfo) {
      const { data } = await api.put(`/orders/${orderId}/delivery`, {
        delivery_date: deliveryInfo.deliveryDate || null,
        status: deliveryInfo.status
      });
      const index = this.orders.findIndex((o) => o.id === orderId);
      if (index !== -1) {
        this.orders[index] = {
          ...this.orders[index],
          delivery_id: data.data.id,
          delivery_status: data.data.status,
          delivery_date: data.data.delivery_date
        };
      }
    }
  }
});
