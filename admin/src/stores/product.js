import { defineStore } from 'pinia';
import api from '@/services/api';

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    total: 0,
    page: 1,
    limit: 20,
    loading: false,
    currentProduct: null,
    filterMeta: null
  }),

  actions: {
    async fetchProducts(params = {}) {
      this.loading = true;
      try {
        const { data } = await api.get('/products', { params });
        this.products = data.data || [];
        this.total = data.pagination?.total || 0;
        this.page = data.pagination?.page || 1;
        this.limit = data.pagination?.limit || 20;
      } finally {
        this.loading = false;
      }
    },

    async fetchFilterMeta() {
      if (this.filterMeta) return this.filterMeta;
      const { data } = await api.get('/products/meta');
      this.filterMeta = data.data;
      return this.filterMeta;
    },

    async fetchProduct(id) {
      this.loading = true;
      try {
        const { data } = await api.get(`/products/${id}`);
        this.currentProduct = data.data;
        return data.data;
      } finally {
        this.loading = false;
      }
    },

    async createProduct(payload) {
      const { data } = await api.post('/products', payload);
      return data.data;
    },

    async updateProduct(id, payload) {
      const { data } = await api.put(`/products/${id}`, payload);
      return data.data;
    },

    async deleteProduct(id) {
      await api.delete(`/products/${id}`);
    },

    async addImage(productId, payload) {
      const { data } = await api.post(`/products/${productId}/images`, payload);
      return data.data;
    },

    async updateImage(id, payload) {
      const { data } = await api.put(`/images/${id}`, payload);
      return data.data;
    },

    async deleteImage(id) {
      await api.delete(`/images/${id}`);
    }
  }
});
