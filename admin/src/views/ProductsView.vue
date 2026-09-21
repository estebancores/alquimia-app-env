<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import RadioButton from 'primevue/radiobutton';
import Slider from 'primevue/slider';
import Paginator from 'primevue/paginator';
import Skeleton from 'primevue/skeleton';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import { useProductStore } from '@/stores/product';
import { imageUrl } from '@/utils/image';

const router = useRouter();
const confirm = useConfirm();
const toast = useToast();
const productStore = useProductStore();

const filtersVisible = ref(true);
const searchQuery = ref('');

const priceBounds = reactive({ min: 0, max: 0 });

const emptyDraft = () => ({
  product_type: null,
  vendor: null,
  source_domain: null,
  priceKey: 'all',
  customRange: [priceBounds.min, priceBounds.max]
});

const draft = reactive(emptyDraft());
const applied = reactive({ ...emptyDraft(), search: '' });

const categoryOptions = computed(() => productStore.filterMeta?.product_types || []);
const vendorOptions = computed(() => productStore.filterMeta?.vendors || []);
const sourceOptions = computed(() => productStore.filterMeta?.source_domains || []);

const priceOptions = computed(() => {
  const ranges = productStore.filterMeta?.price?.ranges || [];
  return [
    { key: 'all', label: 'All Price', count: null, min: null, max: null },
    ...ranges.map((r) => ({ key: r.key, label: r.label, count: r.count, min: r.min, max: r.max }))
  ];
});

const activeCategoryLabel = computed(() => applied.product_type || 'All Price');

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

function formatPrice(value) {
  return currencyFormatter.format(value || 0);
}

function productImage(product) {
  return imageUrl(product.images?.[0]);
}

function productDescription(product) {
  const text = (product.body_html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text || product.product_type || product.vendor || '—';
}

function productPrice(product) {
  const price = product.variants?.[0]?.price;
  return price != null ? formatPrice(Number(price)) : '—';
}

function onPricePreset(option) {
  if (option.key === 'all') {
    draft.customRange = [priceBounds.min, priceBounds.max];
  } else {
    draft.customRange = [
      option.min != null ? option.min : priceBounds.min,
      option.max != null ? option.max : priceBounds.max
    ];
  }
}

function buildParams(page = 1, limit = productStore.limit) {
  const params = { page, limit };
  if (applied.search) params.search = applied.search;
  if (applied.product_type) params.product_type = applied.product_type;
  if (applied.vendor) params.vendor = applied.vendor;
  if (applied.source_domain) params.source_domain = applied.source_domain;

  const [min, max] = applied.customRange;
  if (min > priceBounds.min) params.min_price = min;
  if (max < priceBounds.max) params.max_price = max;
  return params;
}

function applyDraft() {
  applied.product_type = draft.product_type;
  applied.vendor = draft.vendor;
  applied.source_domain = draft.source_domain;
  applied.priceKey = draft.priceKey;
  applied.customRange = [...draft.customRange];
  productStore.fetchProducts(buildParams(1));
}

function clearFilters() {
  Object.assign(draft, emptyDraft());
  Object.assign(applied, emptyDraft(), { search: searchQuery.value });
  productStore.fetchProducts(buildParams(1));
}

function onPage(event) {
  productStore.fetchProducts(buildParams(event.page + 1, event.rows));
}

let searchTimeout = null;
watch(searchQuery, (value) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applied.search = value.trim();
    productStore.fetchProducts(buildParams(1));
  }, 300);
});

function openNew() {
  router.push({ name: 'ProductNew' });
}

function editProduct(product) {
  router.push({ name: 'ProductEdit', params: { id: product.id } });
}

function confirmDelete(product) {
  confirm.require({
    message: `Are you sure you want to delete "${product.title}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        await productStore.deleteProduct(product.id);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Product deleted', life: 3000 });
        productStore.fetchProducts(buildParams(productStore.page));
      } catch (error) {
        const message = error.response?.data?.error || 'Failed to delete product';
        toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
      }
    }
  });
}

onMounted(async () => {
  productStore.fetchProducts(buildParams(1, 24));
  try {
    const meta = await productStore.fetchFilterMeta();
    priceBounds.min = Math.floor(Number(meta.price?.min || 0));
    priceBounds.max = Math.ceil(Number(meta.price?.max || 0));
    draft.customRange = [priceBounds.min, priceBounds.max];
    applied.customRange = [priceBounds.min, priceBounds.max];
  } catch {
    // Filter metadata unavailable; filters panel still works with manual inputs.
  }
});
</script>

<template>
  <div>
    <div class="flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <div class="text-sm text-color-secondary mb-1">
          Categories <i class="pi pi-angle-right text-xs"></i> {{ activeCategoryLabel }}
        </div>
        <div class="text-sm font-semibold">Showing all {{ productStore.total }} items results</div>
      </div>
      <div class="flex flex-wrap align-items-center gap-2">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search..." class="w-14rem" />
        </IconField>
        <Button
          icon="pi pi-filter"
          label="Filter"
          severity="secondary"
          outlined
          @click="filtersVisible = !filtersVisible"
        />
        <Button icon="pi pi-plus" label="New Product" @click="openNew" />
      </div>
    </div>

    <div class="flex flex-column lg:flex-row gap-4 align-items-start">
      <!-- Filtros -->
      <aside v-show="filtersVisible" class="filter-panel">
        <Card>
          <template #content>
            <div class="flex flex-column gap-4">
              <div>
                <div class="filter-section-label">Categories</div>
                <Dropdown
                  v-model="draft.product_type"
                  :options="categoryOptions"
                  placeholder="All categories"
                  class="w-full"
                  show-clear
                />
              </div>

              <div>
                <div class="filter-section-label">Product Price</div>
                <div class="flex flex-column gap-2">
                  <div v-for="option in priceOptions" :key="option.key" class="flex align-items-center gap-2">
                    <RadioButton v-model="draft.priceKey" :input-id="`price-${option.key}`" :value="option.key" @change="onPricePreset(option)" />
                    <label :for="`price-${option.key}`" class="text-sm cursor-pointer">
                      {{ option.label }}<span v-if="option.count != null" class="text-color-secondary"> ({{ option.count }})</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <div class="filter-section-label">Custom Price Range : {{ formatPrice(draft.customRange[1]) }}</div>
                <Slider v-model="draft.customRange" range :min="priceBounds.min" :max="priceBounds.max" class="mb-3" @slideend="draft.priceKey = 'custom'" />
                <div class="flex gap-2">
                  <InputNumber v-model="draft.customRange[0]" :min="priceBounds.min" :max="priceBounds.max" input-class="w-full" class="flex-1" @input="draft.priceKey = 'custom'" />
                  <InputNumber v-model="draft.customRange[1]" :min="priceBounds.min" :max="priceBounds.max" input-class="w-full" class="flex-1" @input="draft.priceKey = 'custom'" />
                </div>
              </div>

              <div>
                <div class="filter-section-label">Source</div>
                <Dropdown
                  v-model="draft.source_domain"
                  :options="sourceOptions"
                  placeholder="All sources"
                  class="w-full"
                  show-clear
                />
              </div>

              <div class="flex flex-column gap-2">
                <Button label="Apply" class="w-full" @click="applyDraft" />
                <Button label="Clear filters" icon="pi pi-filter-slash" text class="w-full" @click="clearFilters" />
              </div>
            </div>
          </template>
        </Card>
      </aside>

      <!-- products skeleton -->
      <div class="flex-1 min-w-0 w-full">
        <div v-if="productStore.loading" class="grid">
          <div v-for="n in 8" :key="n" class="col-12 sm:col-6 md:col-4 xl:col-3">
            <div class="product-card p-0">
              <Skeleton height="12rem" class="border-noround" />
              <div class="p-3">
                <Skeleton width="70%" class="mb-2" />
                <Skeleton width="40%" />
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="productStore.products.length" class="grid">
          <div v-for="product in productStore.products" :key="product.id" class="col-12 sm:col-6 md:col-4 xl:col-3">
            <div class="product-card">
              <div class="product-image">
                <img v-if="productImage(product)" :src="productImage(product)" :alt="product.title" loading="lazy" />
                <i v-else class="pi pi-image p-image-fallback"></i>
              </div>
              <div class="p-3 flex-1 flex flex-column">
                <div class="product-title mb-1" :title="product.title">{{ product.title }}</div>
                <div class="product-desc mb-3">{{ product.source_domain }}</div>
                <div class="mt-auto flex align-items-center justify-content-between">
                  <span class="product-price">{{ productPrice(product) }}</span>
                  <div class="flex gap-1">
                    <Button icon="pi pi-pencil" text rounded size="small" @click="editProduct(product)" />
                    <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(product)" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card v-else>
          <template #content>
            <div class="text-center py-6 text-color-secondary">
              <i class="pi pi-inbox text-4xl mb-3"></i>
              <div>No products match the current filters.</div>
            </div>
          </template>
        </Card>

        <Paginator
          :rows="productStore.limit"
          :first="(productStore.page - 1) * productStore.limit"
          :total-records="productStore.total"
          :rows-per-page-options="[12, 24, 48, 96]"
          class="mt-3"
          @page="onPage"
        />
      </div>
    </div>
  </div>
</template>
