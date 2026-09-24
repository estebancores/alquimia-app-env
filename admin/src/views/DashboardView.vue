<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">Dashboard</h1>
    <div class="grid">
      <div class="col-12 md:col-6 lg:col-3">
        <Card>
          <template #title>Products</template>
          <template #content>
            <div class="text-4xl font-bold">{{ productStore.total }}</div>
          </template>
        </Card>
      </div>
      <div class="col-12 md:col-6 lg:col-3">
        <Card>
          <template #title>Pending Deliveries</template>
          <template #content>
            <div class="text-4xl font-bold">{{ orderStore.pendingDeliveries?.length }}</div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import Card from 'primevue/card';
import { useProductStore } from '@/stores/product';
import { useOrderStore } from '@/stores/order';

const productStore = useProductStore();
const orderStore = useOrderStore();

onMounted(() => {
  productStore.fetchProducts({ limit: 1 });
  orderStore.fetchOrders();
});
</script>
