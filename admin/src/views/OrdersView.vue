<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">Orders & Delivery</h1>

    <Card>
      <template #title>Orders</template>
      <template #content>
        <DataTable
          :value="orderStore.orders"
          :loading="orderStore.loading"
          class="p-datatable-sm"
          dataKey="id"
          v-model:expandedRows="expandedRows"
        >
          <Column expander class="w-3rem" />
          <Column field="order_number" header="Order">
            <template #body="{ data }">#{{ data.order_number }}</template>
          </Column>
          <Column header="Date">
            <template #body="{ data }">{{ formatDate(data.created_at) }}</template>
          </Column>
          <Column header="Customer">
            <template #body="{ data }">
              <div v-if="data.whatsapp || data.email">
                <div v-if="data.whatsapp">{{ data.whatsapp }}</div>
                <div v-if="data.email" class="text-sm text-color-secondary">{{ data.email }}</div>
              </div>
              <span v-else class="text-color-secondary">Sin datos</span>
            </template>
          </Column>
          <Column field="total_items" header="Items" />
          <Column header="Total">
            <template #body="{ data }">{{ formatMoney(data.total_amount) }}</template>
          </Column>
          <Column header="Status">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="orderSeverity(data.status)" />
            </template>
          </Column>
          <Column header="Delivery">
            <template #body="{ data }">
              <div v-if="data.delivery_id">
                <Tag :value="data.delivery_status" :severity="deliverySeverity(data.delivery_status)" />
                <div class="text-sm text-color-secondary mt-1">
                  {{ data.delivery_date ? formatDate(data.delivery_date) : 'Not scheduled' }}
                </div>
              </div>
              <span v-else class="text-color-secondary">—</span>
            </template>
          </Column>
          <Column header="Actions" class="w-14rem">
            <template #body="{ data }">
              <Button icon="pi pi-user" class="p-button-sm p-button-text" label="Contact" @click="openOrderDialog(data)" />
              <Button icon="pi pi-calendar" class="p-button-sm p-button-text" label="Schedule" @click="openDeliveryDialog(data)" />
            </template>
          </Column>
          <template #expansion="{ data }">
            <ul class="py-2 px-4">
              <li v-for="(item, i) in data.items" :key="i" class="flex justify-content-between py-1">
                <span>{{ item.name }} &times; {{ item.quantity }}</span>
                <span>{{ item.price != null ? formatMoney(item.price * item.quantity) : '' }}</span>
              </li>
            </ul>
          </template>
          <template #empty>No orders yet.</template>
        </DataTable>
      </template>
    </Card>

    <Dialog v-model:visible="orderDialogVisible" header="Customer & Status" :style="{ width: '25rem' }" modal>
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="email">Email</label>
          <InputText id="email" v-model="orderForm.email" type="email" />
        </div>
        <div class="flex flex-column gap-2">
          <label for="whatsapp">WhatsApp</label>
          <InputText id="whatsapp" v-model="orderForm.whatsapp" />
        </div>
        <div class="flex flex-column gap-2">
          <label for="orderStatus">Status</label>
          <Dropdown id="orderStatus" v-model="orderForm.status" :options="orderStatusOptions" option-label="label" option-value="value" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="orderDialogVisible = false" />
        <Button label="Save" icon="pi pi-check" @click="saveOrder" />
      </template>
    </Dialog>

    <Dialog v-model:visible="deliveryDialogVisible" header="Schedule Delivery" :style="{ width: '25rem' }" modal>
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="deliveryDate">Delivery Date</label>
          <InputText id="deliveryDate" v-model="deliveryForm.deliveryDate" type="date" />
        </div>
        <div class="flex flex-column gap-2">
          <label for="status">Status</label>
          <Dropdown id="status" v-model="deliveryForm.status" :options="deliveryStatusOptions" option-label="label" option-value="value" />
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

const expandedRows = ref([]);
const orderDialogVisible = ref(false);
const deliveryDialogVisible = ref(false);
const selectedOrderId = ref(null);

const orderStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' }
];

const deliveryStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' }
];

const orderForm = reactive({
  email: '',
  whatsapp: '',
  status: 'pending'
});

const deliveryForm = reactive({
  deliveryDate: '',
  status: 'shipped'
});

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

function formatMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? money.format(n) : '';
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO');
}

function orderSeverity(status) {
  return { pending: 'warn', contacted: 'info', completed: 'success', cancelled: 'danger' }[status] || 'info';
}

function deliverySeverity(status) {
  return { pending: 'warn', shipped: 'info', delivered: 'success' }[status] || 'info';
}

function openOrderDialog(order) {
  selectedOrderId.value = order.id;
  orderForm.email = order.email || '';
  orderForm.whatsapp = order.whatsapp || '';
  orderForm.status = order.status;
  orderDialogVisible.value = true;
}

async function saveOrder() {
  if (!selectedOrderId.value) return;
  try {
    await orderStore.updateOrder(selectedOrderId.value, { ...orderForm });
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Order updated', life: 3000 });
    orderDialogVisible.value = false;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not update the order', life: 3000 });
  }
}

function openDeliveryDialog(order) {
  selectedOrderId.value = order.id;
  deliveryForm.deliveryDate = order.delivery_date ? String(order.delivery_date).slice(0, 10) : '';
  deliveryForm.status = order.delivery_status || 'shipped';
  deliveryDialogVisible.value = true;
}

function closeDeliveryDialog() {
  deliveryDialogVisible.value = false;
}

async function saveDelivery() {
  if (!selectedOrderId.value) return;
  try {
    await orderStore.updateDelivery(selectedOrderId.value, { ...deliveryForm });
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Delivery updated', life: 3000 });
    closeDeliveryDialog();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not update the delivery', life: 3000 });
  }
}

onMounted(() => {
  orderStore.fetchOrders().catch(() => {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load orders', life: 3000 });
  });
});
</script>
