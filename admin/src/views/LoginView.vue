<template>
  <div class="min-h-screen flex align-items-center justify-content-center surface-ground p-3">
    <Card class="w-full max-w-25rem shadow-2">
      <template #title>
        <div class="text-center mb-2">Alquimia Admin</div>
      </template>
      <template #subtitle>
        <div class="text-center text-color-secondary">Sign in to continue</div>
      </template>
      <template #content>
        <form @submit.prevent="onSubmit" class="flex flex-column gap-3">
          <div class="flex flex-column gap-2">
            <label for="email">Email</label>
            <InputText
              id="email"
              v-model="form.email"
              type="email"
              placeholder="admin@alquimia.com"
              :class="{ 'p-invalid': submitted && !isValidEmail }"
              autocomplete="username"
            />
            <small v-if="submitted && !isValidEmail" class="p-error">Valid email is required.</small>
          </div>

          <div class="flex flex-column gap-2">
            <label for="password">Password</label>
            <Password
              id="password"
              v-model="form.password"
              :feedback="false"
              toggle-mask
              placeholder="Enter your password"
              :class="{ 'p-invalid': submitted && !form.password }"
              input-class="w-full"
              autocomplete="current-password"
            />
            <small v-if="submitted && !form.password" class="p-error">Password is required.</small>
          </div>

          <Button type="submit" label="Sign In" icon="pi pi-sign-in" :loading="authStore.loading" class="w-full mt-2" />
        </form>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const submitted = ref(false);
const form = reactive({
  email: '',
  password: ''
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = computed(() => emailRegex.test(form.email));

async function onSubmit() {
  submitted.value = true;
  if (!isValidEmail.value || !form.password) return;

  const result = await authStore.login(form.email, form.password);
  if (result.success) {
    toast.add({ severity: 'success', summary: 'Welcome', detail: 'Login successful', life: 3000 });
    router.push({ name: 'Dashboard' });
  } else {
    toast.add({ severity: 'error', summary: 'Login failed', detail: result.message, life: 5000 });
  }
}
</script>
