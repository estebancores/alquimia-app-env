import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoginView from '@/views/LoginView.vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import DashboardView from '@/views/DashboardView.vue';
import ProductsView from '@/views/ProductsView.vue';
import OrdersView from '@/views/OrdersView.vue';
import SettingsView from '@/views/SettingsView.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Dashboard', component: DashboardView },
      { path: 'products', name: 'Products', component: ProductsView },
      { path: 'orders', name: 'Orders', component: OrdersView },
      { path: 'settings', name: 'Settings', component: SettingsView }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (authStore.token && !authStore.user) {
    await authStore.fetchUser();
  }

  if (to.meta.public) {
    if (authStore.isAuthenticated) {
      return next({ name: 'Dashboard' });
    }
    return next();
  }

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return next({ name: 'Login', query: { redirect: to.fullPath } });
    }
    return next();
  }

  return next();
});

export default router;
