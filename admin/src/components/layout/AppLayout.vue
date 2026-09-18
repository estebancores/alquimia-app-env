<template>
  <div class="min-h-screen flex surface-ground">
    <aside class="app-sidebar surface-card border-right-1 surface-border hidden md:flex">
      <div class="app-brand">
        <span class="brand-icon"><i class="pi pi-shopping-bag"></i></span>
        <span>Alquimia</span>
      </div>

      <nav class="app-menu flex-1 overflow-auto">
        <Menu :model="menuItems" />
      </nav>

      <div class="p-3 border-top-1 surface-border">
        <Button
          icon="pi pi-sign-out"
          label="Log Out"
          severity="secondary"
          text
          class="w-full justify-content-start"
          @click="logout"
        />
      </div>
    </aside>

    <div class="flex-1 flex flex-column min-w-0">
      <header class="surface-card border-bottom-1 surface-border px-4 py-3 flex align-items-center justify-content-between gap-3">
        <div class="min-w-0">
          <h1 class="m-0 text-xl font-bold white-space-nowrap overflow-hidden text-overflow-ellipsis">
            {{ pageInfo.title }}
          </h1>
          <p class="m-0 text-sm text-color-secondary">{{ pageInfo.subtitle }}</p>
        </div>
        <div class="flex align-items-center gap-3">
          <div class="text-right hidden sm:block">
            <div class="text-sm font-semibold">{{ authStore.user?.email }}</div>
            <div class="text-xs text-color-secondary">Admin</div>
          </div>
          <Avatar icon="pi pi-user" shape="circle" />
        </div>
      </header>

      <main class="flex-1 p-3 md:p-4 overflow-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Menu from 'primevue/menu';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const menuItems = computed(() => [
  {
    label: 'Overview',
    icon: 'pi pi-th-large',
    class: route.name === 'Dashboard' ? 'p-menu-item-active' : '',
    command: () => router.push({ name: 'Dashboard' })
  },
  {
    label: 'Products',
    icon: 'pi pi-box',
    class: route.name === 'Products' ? 'p-menu-item-active' : '',
    command: () => router.push({ name: 'Products' })
  },
  {
    label: 'Orders',
    icon: 'pi pi-shopping-cart',
    class: route.name === 'Orders' ? 'p-menu-item-active' : '',
    command: () => router.push({ name: 'Orders' })
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    class: route.name === 'Settings' ? 'p-menu-item-active' : '',
    command: () => router.push({ name: 'Settings' })
  }
]);

const pageTitles = {
  Dashboard: { title: 'Overview', subtitle: 'Summary of your store activity.' },
  Products: { title: 'Product Grid', subtitle: 'View and manage all listed products easily.' },
  Orders: { title: 'Orders & Delivery', subtitle: 'Track and schedule pending deliveries.' },
  Settings: { title: 'Settings', subtitle: 'Configure your store preferences.' }
};

const pageInfo = computed(() => pageTitles[route.name] || { title: 'Alquimia', subtitle: '' });

function logout() {
  authStore.logout();
  router.push({ name: 'Login' });
}
</script>
