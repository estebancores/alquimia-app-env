import { defineStore } from 'pinia';
import api from '@/services/api';

const TOKEN_KEY = 'token';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem(TOKEN_KEY) || null,
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token
  },

  actions: {
    setToken(token) {
      this.token = token;
      localStorage.setItem(TOKEN_KEY, token);
    },

    clearSession() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
    },

    async login(email, password) {
      this.loading = true;
      try {
        const { data } = await api.post('/auth/login', { email, password });
        this.setToken(data.data.token);
        this.user = data.data.user;
        return { success: true };
      } catch (error) {
        const message = error.response?.data?.error || 'Login failed. Please try again.';
        return { success: false, message };
      } finally {
        this.loading = false;
      }
    },

    async fetchUser() {
      if (!this.token) return;
      try {
        const { data } = await api.get('/auth/me');
        this.user = data.data;
      } catch {
        this.clearSession();
      }
    },

    logout() {
      this.clearSession();
    }
  }
});
