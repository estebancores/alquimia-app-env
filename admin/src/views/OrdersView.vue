<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">Orders & Delivery</h1>

    <Card>
      <template #title>Pending Deliveries</template>
      <template #content>
        <DataTable :value="orderStore.pendingDeliveries" :loading="orderStore.loading" class="p-datatable-sm">
          <Column field="id" header="Order ID" />
          <Column field="customer" header="Customer" />
          <Column field="status" header="Status">
            <template #body="{ data }">
              <Tag :value="data.status" severity="info" />
            </template>
          </Column>
          <Column field="total" header="Total">
            <template #body="{ data }">
              ${{ data.total }}
            </template>
          </Column>
          <Column header="Delivery Date">
            <template #body="{ data }">
              {{ data.deliveryDate || 'Not scheduled' }}
            </template>
          </Column>
          <Column header="Actions" class="w-10rem">
            <template #body="{ data }">
              <Button icon="pi pi-calendar" class="p-button-sm p-button-text" label="Schedule" @click="openDeliveryDialog(data)" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Dialog v-model:visible="deliveryDialogVisible" header="Schedule Delivery" :style="{ width: '25rem' }" modal>
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="deliveryDate">Delivery Date</label>
          <InputText id="deliveryDate" v-model="deliveryForm.deliveryDate" type="date" />
        </div>
        <div class="flex flex-column gap-2">
          <label for="status">Status</label>
          <Dropdown id="status" v-model="deliveryForm.status" :options="statusOptions" option-label="label" option-value="value" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="closeDeliveryDialog" />
        <Button label="Save" icon="pi pi-check" @click="saveDelivery" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import { useOrderStore } from '@/stores/order';

const toast = useToast();
const orderStore = useOrderStore();

const deliveryDialogVisible = ref(false);
const selectedOrderId = ref(null);
const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' }
];

const deliveryForm = reactive({
  deliveryDate: '',
  status: 'shipped'
});

function openDeliveryDialog(order) {
  selectedOrderId.value = order.id;
  deliveryForm.deliveryDate = order.deliveryDate || '';
  deliveryForm.status = order.status;
  deliveryDialogVisible.value = true;
}

function closeDeliveryDialog() {
  deliveryDialogVisible.value = false;
}

async function saveDelivery() {
  if (!selectedOrderId.value) return;
  await orderStore.updateDelivery(selectedOrderId.value, { ...deliveryForm });
  toast.add({ severity: 'success', summary: 'Saved', detail: 'Delivery updated', life: 3000 });
  closeDeliveryDialog();
}

onMounted(() => {
  orderStore.fetchOrders();
});
</script>
