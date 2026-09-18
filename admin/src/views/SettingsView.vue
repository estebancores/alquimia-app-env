<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">Settings</h1>

    <Card class="max-w-30rem">
      <template #content>
        <form @submit.prevent="onSubmit" class="flex flex-column gap-3">
          <div class="flex flex-column gap-2">
            <label for="storeName">Store Name</label>
            <InputText id="storeName" v-model="settingsForm.storeName" :class="{ 'p-invalid': submitted && !settingsForm.storeName }" />
          </div>

          <div class="flex flex-column gap-2">
            <label for="currency">Currency</label>
            <Dropdown id="currency" v-model="settingsForm.currency" :options="currencies" option-label="label" option-value="value" />
          </div>

          <div class="flex flex-column gap-2">
            <label for="supportEmail">Support Email</label>
            <InputText id="supportEmail" v-model="settingsForm.supportEmail" type="email" :class="{ 'p-invalid': submitted && !isValidEmail }" />
          </div>

          <div class="flex flex-column gap-2">
            <label for="lowStockThreshold">Low Stock Threshold</label>
            <InputText id="lowStockThreshold" v-model.number="settingsForm.lowStockThreshold" type="number" />
          </div>

          <Button type="submit" label="Save Settings" icon="pi pi-save" :loading="settingsStore.loading" class="w-full mt-2" />
        </form>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import { useSettingsStore } from '@/stores/settings';

const toast = useToast();
const settingsStore = useSettingsStore();
const submitted = ref(false);

const currencies = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'COP', value: 'COP' }
];

const settingsForm = reactive({ ...settingsStore.settings });
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = () => emailRegex.test(settingsForm.supportEmail);

async function onSubmit() {
  submitted.value = true;
  if (!settingsForm.storeName || !isValidEmail()) return;

  await settingsStore.saveSettings({ ...settingsForm });
  toast.add({ severity: 'success', summary: 'Saved', detail: 'Settings saved successfully', life: 3000 });
}

onMounted(() => {
  Object.assign(settingsForm, settingsStore.settings);
});
</script>
