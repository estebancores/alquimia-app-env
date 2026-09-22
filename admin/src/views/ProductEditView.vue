<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import ColorPicker from 'primevue/colorpicker';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useProductStore } from '@/stores/product';
import { imageUrl } from '@/utils/image';

const route = useRoute();
const router = useRouter();
const confirm = useConfirm();
const toast = useToast();
const productStore = useProductStore();

const isNew = computed(() => !route.params.id);
const loading = ref(false);
const saving = ref(false);
const submitted = ref(false);
const previewVisible = ref(false);
const addImageVisible = ref(false);
const addingImage = ref(false);

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' }
];

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

const form = reactive({
  title: '',
  status: 'draft',
  vendor: null,
  product_type: null,
  handle: '',
  body_html: '',
  public: true,
  provider_price: null,
  source_domain: '',
  tagsText: '',
  shopify_product_id: null,
  shopify_published_at: null,
  shopify_created_at: null,
  shopify_updated_at: null
});

const variants = ref([]);
const originalVariants = ref([]);
const selectedVariantIndex = ref(0);
const selectedVariant = computed(() => variants.value[selectedVariantIndex.value] || null);

// PrimeVue ColorPicker binds a hex string WITHOUT '#'; we store '#rrggbb'.
const selectedVariantColor = computed({
  get: () => (selectedVariant.value?.color || '').replace(/^#/, '') || null,
  set: (val) => {
    if (!selectedVariant.value) return;
    selectedVariant.value.color = normalizeHexColor(val);
  }
});

function normalizeHexColor(value) {
  if (!value) return null;
  const v = String(value).trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{3,8}$/.test(v) ? `#${v.toLowerCase()}` : null;
}

const eyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

async function pickColorFromScreen() {
  if (!eyeDropperSupported || !selectedVariant.value) return;
  try {
    const { sRGBHex } = await new window.EyeDropper().open();
    selectedVariant.value.color = normalizeHexColor(sRGBHex);
  } catch {
    // User pressed Escape or the picker was cancelled — nothing to apply.
  }
}

const images = ref([]);
const selectedImageId = ref(null);
const imageSelectMode = ref(false);
const selectedImageIds = ref([]);
const deletingImages = ref(false);

const sortedImages = computed(() =>
  [...images.value].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
);
const coverImage = computed(() => sortedImages.value[0] || null);
const selectedImage = computed(() =>
  sortedImages.value.find((img) => img.id === selectedImageId.value) || coverImage.value
);
const selectedIsCover = computed(() => selectedImage.value?.id === coverImage.value?.id);

const vendorOptions = computed(() => productStore.filterMeta?.vendors || []);
const categoryOptions = computed(() => productStore.filterMeta?.product_types || []);
const sourceDomainOptions = computed(() => productStore.filterMeta?.source_domains || []);

const mergeSearch = reactive({ source_domain: '', title: '' });
const mergeResults = ref([]);
const mergeSelectedIds = ref([]);
const mergeSearching = ref(false);
const mergeSearched = ref(false);
const merging = ref(false);

const statusLabel = computed(() =>
  statusOptions.find((o) => o.value === form.status)?.label || form.status || 'Draft'
);
const statusSeverity = computed(() => ({
  active: 'success',
  draft: 'warn',
  archived: 'secondary'
}[form.status] || 'secondary'));

const addImageForm = reactive({ url: '', alt: '' });

const dragIndex = ref(null);
const dragOverIndex = ref(null);
const imagesDirty = ref(false);

function onDragStart(event, index) {
  dragIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', String(index));
}

function onDragOver(index) {
  dragOverIndex.value = index;
}

function onDragEnd() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}

function applyLocalOrder(reordered) {
  reordered.forEach((image, position) => {
    image.position = position;
  });
  imagesDirty.value = true;
}

function onDrop(index) {
  const from = dragIndex.value;
  onDragEnd();
  if (from == null || from === index) return;

  const reordered = [...sortedImages.value];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(index, 0, moved);
  applyLocalOrder(reordered);
}

function formatPrice(value) {
  return value != null ? currencyFormatter.format(Number(value)) : '—';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CO');
}

function plainDescription() {
  return (form.body_html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function populate(product) {
  form.title = product.title || '';
  form.status = product.status || 'draft';
  form.vendor = product.vendor || null;
  form.product_type = product.product_type || null;
  form.handle = product.handle || '';
  form.body_html = product.body_html || '';
  form.public = product.public !== false;
  form.provider_price = product.provider_price != null ? Number(product.provider_price) : null;
  form.source_domain = product.source_domain || '';
  form.tagsText = Array.isArray(product.tags)
    ? product.tags.join(', ')
    : (() => { try { return JSON.parse(product.tags || '[]').join(', '); } catch { return ''; } })();
  form.shopify_product_id = product.shopify_product_id;
  form.shopify_published_at = product.shopify_published_at;
  form.shopify_created_at = product.shopify_created_at;
  form.shopify_updated_at = product.shopify_updated_at;

  mergeSearch.source_domain = product.source_domain || '';

  variants.value = (product.variants || []).map((variant) => ({
    id: variant.id,
    title: variant.title,
    sku: variant.sku,
    price: variant.price != null ? Number(variant.price) : null,
    compare_at_price: variant.compare_at_price != null ? Number(variant.compare_at_price) : null,
    image_id: variant.image_id || null,
    color: variant.color || null
  }));
  originalVariants.value = JSON.parse(JSON.stringify(variants.value));
  if (selectedVariantIndex.value >= variants.value.length) selectedVariantIndex.value = 0;

  images.value = product.images || [];
  if (!selectedImageId.value && sortedImages.value.length) {
    selectedImageId.value = sortedImages.value[0].id;
  }
  imagesDirty.value = false;
}

async function loadProduct() {
  if (isNew.value) return;
  loading.value = true;
  try {
    const product = await productStore.fetchProduct(route.params.id);
    populate(product);
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load product', life: 5000 });
    router.push({ name: 'Products' });
  } finally {
    loading.value = false;
  }
}

async function save() {
  submitted.value = true;
  if (!form.title) return;

  saving.value = true;
  try {
    const payload = {
      title: form.title,
      status: form.status,
      vendor: form.vendor,
      product_type: form.product_type,
      handle: form.handle || slugify(form.title),
      body_html: form.body_html,
      public: form.public,
      tags: form.tagsText
    };
    if (form.provider_price != null) payload.provider_price = form.provider_price;
    if (form.source_domain) payload.source_domain = form.source_domain;
    const changedVariants = variants.value.filter((variant) => {
      const original = originalVariants.value.find((o) => o.id === variant.id);
      if (!original) return true;
      return (variant.title ?? '') !== (original.title ?? '')
        || Number(variant.price) !== Number(original.price)
        || (variant.compare_at_price ?? null) !== (original.compare_at_price ?? null)
        || (variant.image_id ?? null) !== (original.image_id ?? null)
        || normalizeHexColor(variant.color) !== (original.color ?? null);
    });
    if (changedVariants.length) {
      payload.variants = changedVariants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        price: variant.price,
        compare_at_price: variant.compare_at_price,
        image_id: variant.image_id,
        // Invalid hex is sent as-is so the API rejects it with a visible error
        color: variant.color ? (normalizeHexColor(variant.color) ?? String(variant.color).trim()) : null
      }));
    }
    if (!isNew.value && imagesDirty.value && sortedImages.value.length) {
      payload.images = sortedImages.value.map((image, position) => ({ id: image.id, position }));
    }

    if (isNew.value) {
      const created = await productStore.createProduct({
        source_domain: form.source_domain || 'manual',
        shopify_product_id: Date.now(),
        ...payload
      });
      toast.add({ severity: 'success', summary: 'Created', detail: 'Product created', life: 3000 });
      router.replace({ name: 'ProductEdit', params: { id: created.id } });
      populate(created);
    } else {
      const updated = await productStore.updateProduct(route.params.id, payload);
      populate(updated);
      toast.add({ severity: 'success', summary: 'Saved', detail: 'Product updated', life: 3000 });
    }
  } catch (error) {
    const message = error.response?.data?.error || 'Failed to save product';
    toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
  } finally {
    saving.value = false;
  }
}

function cancel() {
  router.push({ name: 'Products' });
}

async function addImage() {
  if (!addImageForm.url) return;
  addingImage.value = true;
  try {
    const nextPosition = sortedImages.value.length
      ? Math.max(...sortedImages.value.map((img) => img.position ?? 0)) + 1
      : 0;
    const image = await productStore.addImage(route.params.id, {
      original_src: addImageForm.url,
      alt: addImageForm.alt || null,
      position: nextPosition
    });
    images.value.push(image);
    selectedImageId.value = image.id;
    addImageForm.url = '';
    addImageForm.alt = '';
    addImageVisible.value = false;
    toast.add({ severity: 'success', summary: 'Image added', life: 3000 });
  } catch (error) {
    const message = error.response?.data?.error || 'Failed to add image';
    toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
  } finally {
    addingImage.value = false;
  }
}

function onImageClick(image) {
  if (imageSelectMode.value) {
    toggleImageSelection(image.id);
  } else {
    selectedImageId.value = image.id;
  }
}

function toggleImageSelection(id) {
  if (selectedImageIds.value.includes(id)) {
    selectedImageIds.value = selectedImageIds.value.filter((selected) => selected !== id);
  } else {
    selectedImageIds.value = [...selectedImageIds.value, id];
  }
}

function cancelImageSelect() {
  imageSelectMode.value = false;
  selectedImageIds.value = [];
}

function confirmDeleteSelectedImages() {
  const count = selectedImageIds.value.length;
  if (!count) return;
  confirm.require({
    message: `Delete ${count} selected image${count > 1 ? 's' : ''}?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      deletingImages.value = true;
      try {
        await productStore.deleteImages(selectedImageIds.value);
        const deleted = new Set(selectedImageIds.value);
        images.value = images.value.filter((img) => !deleted.has(img.id));
        variants.value.forEach((variant) => {
          if (variant.image_id && deleted.has(variant.image_id)) variant.image_id = null;
        });
        if (selectedImageId.value && deleted.has(selectedImageId.value)) {
          selectedImageId.value = coverImage.value?.id || null;
        }
        cancelImageSelect();
        toast.add({ severity: 'success', summary: 'Deleted', detail: `${count} image${count > 1 ? 's' : ''} deleted`, life: 3000 });
      } catch (error) {
        const message = error.response?.data?.error || 'Failed to delete images';
        toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
      } finally {
        deletingImages.value = false;
      }
    }
  });
}

function confirmRemoveImage(image) {
  confirm.require({
    message: 'Delete this image?',
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        await productStore.deleteImage(image.id);
        images.value = images.value.filter((img) => img.id !== image.id);
        variants.value.forEach((variant) => {
          if (variant.image_id === image.id) variant.image_id = null;
        });
        if (selectedImageId.value === image.id) selectedImageId.value = coverImage.value?.id || null;
        toast.add({ severity: 'success', summary: 'Image deleted', life: 3000 });
      } catch (error) {
        const message = error.response?.data?.error || 'Failed to delete image';
        toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
      }
    }
  });
}

function selectVariant(index) {
  selectedVariantIndex.value = index;
  const variant = variants.value[index];
  if (variant?.image_id && images.value.some((img) => img.id === variant.image_id)) {
    selectedImageId.value = variant.image_id;
  }
}

function setVariantImage(imageId) {
  const variant = selectedVariant.value;
  if (!variant) return;
  variant.image_id = variant.image_id === imageId ? null : imageId;
  if (variant.image_id) selectedImageId.value = imageId;
}

async function searchMergeCandidates() {
  mergeSearching.value = true;
  mergeSearched.value = false;
  try {
    const params = { limit: 20 };
    if (mergeSearch.source_domain) params.source_domain = mergeSearch.source_domain;
    if (mergeSearch.title) params.title = mergeSearch.title;
    const results = await productStore.searchProducts(params);
    mergeResults.value = results.filter((p) => p.id !== route.params.id);
    mergeSelectedIds.value = mergeSelectedIds.value.filter((id) =>
      mergeResults.value.some((p) => p.id === id)
    );
    mergeSearched.value = true;
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to search products', life: 5000 });
  } finally {
    mergeSearching.value = false;
  }
}

function toggleMergeSelection(id) {
  if (mergeSelectedIds.value.includes(id)) {
    mergeSelectedIds.value = mergeSelectedIds.value.filter((selected) => selected !== id);
  } else {
    mergeSelectedIds.value = [...mergeSelectedIds.value, id];
  }
}

function mergeProductImage(product) {
  return imageUrl(product.images?.[0]);
}

const mergeImagePreview = reactive({ url: null, x: 0, y: 0 });

function onMergeThumbEnter(product) {
  mergeImagePreview.url = mergeProductImage(product);
}

function onMergeThumbMove(event) {
  mergeImagePreview.x = Math.min(event.clientX + 16, window.innerWidth - 270);
  mergeImagePreview.y = Math.min(event.clientY + 16, window.innerHeight - 270);
}

function onMergeThumbLeave() {
  mergeImagePreview.url = null;
}

function confirmMerge() {
  const count = mergeSelectedIds.value.length;
  if (!count) return;
  confirm.require({
    message: `Merge ${count} product${count > 1 ? 's' : ''} into "${form.title}"? Their variants and images will be moved to this product and the duplicates will be deleted.`,
    header: 'Confirm Merge',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      merging.value = true;
      try {
        const updated = await productStore.mergeProducts(route.params.id, mergeSelectedIds.value);
        populate(updated);
        mergeResults.value = mergeResults.value.filter((p) => !mergeSelectedIds.value.includes(p.id));
        mergeSelectedIds.value = [];
        toast.add({ severity: 'success', summary: 'Merged', detail: `${count} product${count > 1 ? 's' : ''} merged into this product`, life: 3000 });
      } catch (error) {
        const message = error.response?.data?.error || 'Failed to merge products';
        toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
      } finally {
        merging.value = false;
      }
    }
  });
}

function setAsCover() {
  const selected = selectedImage.value;
  if (!selected || selectedIsCover.value) return;
  const reordered = sortedImages.value.filter((img) => img.id !== selected.id);
  reordered.unshift(selected);
  applyLocalOrder(reordered);
}

onMounted(() => {
  loadProduct();
  productStore.fetchFilterMeta().catch(() => {});
});
</script>

<template>
  <div>
    <div class="flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div class="flex align-items-center gap-3">
        <Button icon="pi pi-arrow-left" text rounded @click="cancel" />
        <div>
          <div class="text-sm text-color-secondary">
            Products <i class="pi pi-angle-right text-xs"></i> {{ isNew ? 'New product' : form.title || 'Edit' }}
          </div>
          <div class="text-lg font-semibold">{{ isNew ? 'New Product' : 'Edit Product' }}</div>
        </div>
      </div>
      <div class="flex gap-2">
        <Button label="Cancel" severity="secondary" outlined @click="cancel" />
        <Button label="Save" icon="pi pi-check" :loading="saving" @click="save" />
      </div>
    </div>

    <div v-if="loading" class="grid">
      <div class="col-12 lg:col-5"><Skeleton height="30rem" /></div>
      <div class="col-12 lg:col-7"><Skeleton height="30rem" /></div>
    </div>

    <div v-else class="grid align-items-start">
      <div class="col-12 lg:col-5 flex flex-column gap-4">
        <Card>
          <template #content>
            <div class="gallery-main">
              <img v-if="imageUrl(selectedImage)" :src="imageUrl(selectedImage)" :alt="selectedImage?.alt || form.title" />
              <i v-else class="pi pi-image gallery-fallback"></i>
              <Tag v-if="selectedIsCover && selectedImage" value="Cover" class="gallery-cover-tag" />
            </div>

            <div class="gallery-grid">
              <div
                v-for="(image, index) in sortedImages"
                :key="image.id"
                class="gallery-thumb"
                :class="{
                  'gallery-thumb-active': image.id === selectedImage?.id && !imageSelectMode,
                  'gallery-thumb-selected': selectedImageIds.includes(image.id),
                  'gallery-thumb-over': dragOverIndex === index && dragIndex !== index,
                  'gallery-thumb-dragging': dragIndex === index
                }"
                :draggable="!imageSelectMode"
                @click="onImageClick(image)"
                @dragstart="onDragStart($event, index)"
                @dragover.prevent="onDragOver(index)"
                @drop.prevent="onDrop(index)"
                @dragend="onDragEnd"
              >
                <img :src="imageUrl(image)" :alt="image.alt || form.title" loading="lazy" draggable="false" />
                <span class="gallery-thumb-pos">{{ index + 1 }}</span>
                <button v-if="!imageSelectMode" class="gallery-thumb-delete" type="button" @click.stop="confirmRemoveImage(image)">
                  <i class="pi pi-trash"></i>
                </button>
                <span v-if="imageSelectMode" class="gallery-thumb-check">
                  <i class="pi" :class="selectedImageIds.includes(image.id) ? 'pi-check-circle' : 'pi-circle'"></i>
                </span>
              </div>
              <button v-if="!isNew" class="gallery-add" type="button" @click="addImageVisible = true">
                <i class="pi pi-plus"></i>
              </button>
            </div>

            <div class="text-xs text-color-secondary mt-2">
              <template v-if="isNew">Save the product first to add images.</template>
              <template v-else-if="imageSelectMode">Click images to select them for deletion.</template>
              <template v-else>
                Drag the images to reorder them. The first image is the cover.
                <span v-if="imagesDirty" class="text-orange-500 font-semibold">Unsaved order changes.</span>
              </template>
            </div>
            <div v-if="!isNew" class="flex align-items-center justify-content-between mt-1">
              <Button
                v-if="selectedImage && !selectedIsCover && !imageSelectMode"
                label="Set as cover"
                icon="pi pi-image"
                text
                size="small"
                class="p-0"
                @click="setAsCover"
              />
              <span v-else></span>
              <div class="flex align-items-center gap-2">
                <template v-if="imageSelectMode">
                  <span class="text-xs text-color-secondary">{{ selectedImageIds.length }} selected</span>
                  <Button label="Cancel" text size="small" @click="cancelImageSelect" />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    size="small"
                    :disabled="!selectedImageIds.length || deletingImages"
                    :loading="deletingImages"
                    @click="confirmDeleteSelectedImages"
                  />
                </template>
                <Button
                  v-else-if="images.length"
                  label="Select"
                  icon="pi pi-check-square"
                  text
                  size="small"
                  @click="imageSelectMode = true"
                />
              </div>
            </div>
          </template>
        </Card>

        <Card>
          <template #title>Visibility</template>
          <template #content>
            <p class="text-sm text-color-secondary mt-0 mb-3">
              You can change the visibility of this product for customers
            </p>
            <div class="flex align-items-center gap-2">
              <ToggleSwitch v-model="form.public" />
              <span class="text-sm font-semibold">{{ form.public ? 'Visible' : 'Hidden' }}</span>
            </div>
          </template>
        </Card>

        <Card>
          <template #title>Preview</template>
          <template #content>
            <p class="text-sm text-color-secondary mt-0 mb-3">
              Want to see how your product will look like?
            </p>
            <Button label="Preview" outlined class="w-full" @click="previewVisible = true" />
          </template>
        </Card>
      </div>

      <div class="col-12 lg:col-7">
        <Card>
          <template #title>
            <div class="flex align-items-start justify-content-between gap-3">
              <div>
                <div>Product Detail</div>
                <div class="text-sm font-normal text-color-secondary mt-1">
                  Key info to describe and display your product.
                </div>
              </div>
              <Tag :value="`Status: ${statusLabel}`" :severity="statusSeverity" />
            </div>
          </template>
          <template #content>
            <Tabs value="general">
              <TabList>
                <Tab value="general">General</Tab>
                <Tab value="advanced">Advanced</Tab>
                <Tab v-if="!isNew" value="merge">Merge</Tab>
              </TabList>
              <TabPanels>
                <TabPanel value="general">
                  <div class="flex flex-column gap-4 pt-3">
                    <div class="flex flex-column gap-2">
                      <label for="p-title" class="text-sm font-semibold">Product Name *</label>
                      <InputText
                        id="p-title"
                        v-model="form.title"
                        placeholder="e.g. Natural Glow Face Moisturizer"
                        :class="{ 'p-invalid': submitted && !form.title }"
                      />
                    </div>

                    <div class="grid">
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label for="p-status" class="text-sm font-semibold">Status *</label>
                        <Dropdown
                          id="p-status"
                          v-model="form.status"
                          :options="statusOptions"
                          option-label="label"
                          option-value="value"
                          placeholder="Choose product status"
                        />
                      </div>
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label for="p-vendor" class="text-sm font-semibold">Brand *</label>
                        <Dropdown
                          id="p-vendor"
                          v-model="form.vendor"
                          :options="vendorOptions"
                          editable
                          placeholder="Select the brand name"
                        />
                      </div>
                    </div>

                    <div class="grid">
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label for="p-type" class="text-sm font-semibold">Category *</label>
                        <Dropdown
                          id="p-type"
                          v-model="form.product_type"
                          :options="categoryOptions"
                          editable
                          placeholder="Select main category"
                        />
                      </div>
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label for="p-handle" class="text-sm font-semibold">Handle</label>
                        <InputText id="p-handle" v-model="form.handle" placeholder="product-url-handle" />
                      </div>
                    </div>

                    <div v-if="variants.length" class="flex flex-column gap-2">
                      <label class="text-sm font-semibold">Variants</label>
                      <div class="variant-options">
                        <button
                          v-for="(variant, index) in variants"
                          :key="variant.id"
                          type="button"
                          class="variant-chip"
                          :class="{ 'variant-chip-active': index === selectedVariantIndex }"
                          @click="selectVariant(index)"
                        >
                          <span
                            v-if="variant.color"
                            class="variant-chip-dot"
                            :style="{ background: variant.color }"
                          ></span>
                          <span class="variant-chip-title">{{ variant.title }}</span>
                          <span class="variant-chip-price">{{ formatPrice(variant.price) }}</span>
                        </button>
                      </div>
                    </div>

                    <div v-if="selectedVariant" class="flex flex-column gap-2">
                      <label for="p-variant-title" class="text-sm font-semibold">Variant Name</label>
                      <InputText
                        id="p-variant-title"
                        v-model="selectedVariant.title"
                        placeholder="e.g. 100ml / Blue"
                      />
                    </div>

                    <div v-if="selectedVariant" class="flex flex-column gap-2">
                      <label for="p-variant-color" class="text-sm font-semibold">Variant Color</label>
                      <div class="flex align-items-center gap-3">
                        <ColorPicker v-model="selectedVariantColor" format="hex" />
                        <Button
                          v-if="eyeDropperSupported"
                          icon="pi pi-palette"
                          severity="secondary"
                          outlined
                          title="Pick a color from anywhere on screen (e.g. the product image)"
                          aria-label="Pick color from screen"
                          @click="pickColorFromScreen"
                        />
                        <InputText
                          id="p-variant-color"
                          v-model="selectedVariant.color"
                          placeholder="#FF5733"
                          class="w-8rem"
                        />
                        <span
                          v-if="normalizeHexColor(selectedVariant.color)"
                          class="variant-color-preview"
                          :style="{ background: normalizeHexColor(selectedVariant.color) }"
                        ></span>
                      </div>
                      <small class="text-color-secondary">
                        Pick a color, use the eyedropper to grab it from the product image, or type the HEX value. Leave empty for no color.
                      </small>
                    </div>

                    <div v-if="selectedVariant" class="flex flex-column gap-2">
                      <label class="text-sm font-semibold">Variant Image</label>
                      <div v-if="sortedImages.length" class="variant-image-options">
                        <button
                          v-for="image in sortedImages"
                          :key="image.id"
                          type="button"
                          class="variant-image-thumb"
                          :class="{ 'variant-image-thumb-active': selectedVariant.image_id === image.id }"
                          @click="setVariantImage(image.id)"
                        >
                          <img :src="imageUrl(image)" :alt="image.alt || selectedVariant.title" loading="lazy" />
                        </button>
                      </div>
                      <small class="text-color-secondary">
                        <template v-if="sortedImages.length">
                          Click an image to link it to "{{ selectedVariant.title }}". Click again to unlink.
                        </template>
                        <template v-else>No images available to assign.</template>
                      </small>
                    </div>

                    <div v-if="selectedVariant" class="grid">
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label for="p-price" class="text-sm font-semibold">Price *</label>
                        <InputNumber
                          id="p-price"
                          v-model="selectedVariant.price"
                          mode="currency"
                          currency="COP"
                          locale="es-CO"
                          placeholder="e.g. 29.99"
                        />
                      </div>
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label for="p-compare" class="text-sm font-semibold">Compare at Price</label>
                        <InputNumber
                          id="p-compare"
                          v-model="selectedVariant.compare_at_price"
                          mode="currency"
                          currency="COP"
                          locale="es-CO"
                          placeholder="e.g. 39.99"
                        />
                      </div>
                    </div>
                    <div v-else class="text-sm text-color-secondary">
                      No variants available for this product.
                    </div>

                    <div class="flex flex-column gap-2">
                      <label for="p-desc" class="text-sm font-semibold">Description</label>
                      <Textarea
                        id="p-desc"
                        v-model="form.body_html"
                        rows="6"
                        auto-resize
                        placeholder="Write a short description highlighting key benefits and features"
                      />
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value="advanced">
                  <div class="flex flex-column gap-4 pt-3">
                    <div class="grid">
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label for="p-source" class="text-sm font-semibold">Source Domain</label>
                        <InputText id="p-source" v-model="form.source_domain" placeholder="e.g. almamia.com" />
                      </div>
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label for="p-provider" class="text-sm font-semibold">Provider Price</label>
                        <InputNumber
                          id="p-provider"
                          v-model="form.provider_price"
                          mode="currency"
                          currency="COP"
                          locale="es-CO"
                        />
                      </div>
                    </div>

                    <div class="flex flex-column gap-2">
                      <label for="p-tags" class="text-sm font-semibold">Tags</label>
                      <InputText id="p-tags" v-model="form.tagsText" placeholder="Comma separated tags" />
                    </div>

                    <div class="grid">
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label class="text-sm font-semibold">Shopify Product ID</label>
                        <InputText :model-value="form.shopify_product_id?.toString() || '—'" disabled />
                      </div>
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label class="text-sm font-semibold">Shopify Published At</label>
                        <InputText :model-value="formatDate(form.shopify_published_at)" disabled />
                      </div>
                    </div>

                    <div class="grid">
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label class="text-sm font-semibold">Shopify Created At</label>
                        <InputText :model-value="formatDate(form.shopify_created_at)" disabled />
                      </div>
                      <div class="col-12 md:col-6 flex flex-column gap-2">
                        <label class="text-sm font-semibold">Shopify Updated At</label>
                        <InputText :model-value="formatDate(form.shopify_updated_at)" disabled />
                      </div>
                    </div>
                  </div>
                </TabPanel>

                <TabPanel v-if="!isNew" value="merge">
                  <div class="flex flex-column gap-4 pt-3">
                    <p class="text-sm text-color-secondary m-0">
                      Some sources save each variant as its own product. Find those duplicates and merge them
                      here — their variants and images will be moved to this product and the duplicates deleted.
                    </p>

                    <div class="grid">
                      <div class="col-12 md:col-5 flex flex-column gap-2">
                        <label for="m-source" class="text-sm font-semibold">Source Domain</label>
                        <Dropdown
                          id="m-source"
                          v-model="mergeSearch.source_domain"
                          :options="sourceDomainOptions"
                          editable
                          show-clear
                          placeholder="e.g. almamia.com"
                        />
                      </div>
                      <div class="col-12 md:col-4 flex flex-column gap-2">
                        <label for="m-title" class="text-sm font-semibold">Title</label>
                        <InputText
                          id="m-title"
                          v-model="mergeSearch.title"
                          placeholder="Search by title"
                          @keyup.enter="searchMergeCandidates"
                        />
                      </div>
                      <div class="col-12 md:col-3 flex align-items-end">
                        <Button
                          label="Search"
                          icon="pi pi-search"
                          class="w-full"
                          :loading="mergeSearching"
                          @click="searchMergeCandidates"
                        />
                      </div>
                    </div>

                    <div v-if="mergeSearching" class="flex flex-column gap-2">
                      <Skeleton v-for="n in 3" :key="n" height="3.5rem" />
                    </div>

                    <div v-else-if="mergeResults.length" class="merge-results">
                      <button
                        v-for="product in mergeResults"
                        :key="product.id"
                        type="button"
                        class="merge-row"
                        :class="{ 'merge-row-active': mergeSelectedIds.includes(product.id) }"
                        @click="toggleMergeSelection(product.id)"
                      >
                        <span
                          class="merge-thumb"
                          @mouseenter="onMergeThumbEnter(product)"
                          @mousemove="onMergeThumbMove"
                          @mouseleave="onMergeThumbLeave"
                        >
                          <img v-if="mergeProductImage(product)" :src="mergeProductImage(product)" :alt="product.title" loading="lazy" />
                          <i v-else class="pi pi-image"></i>
                        </span>
                        <span class="merge-row-info">
                          <span class="merge-row-title">{{ product.title }}</span>
                          <span class="merge-row-meta">
                            {{ product.source_domain }} · {{ product.variants?.length || 0 }} variant{{ (product.variants?.length || 0) === 1 ? '' : 's' }}
                            <template v-if="product.variants?.[0]?.price != null"> · {{ formatPrice(product.variants[0].price) }}</template>
                          </span>
                        </span>
                        <i
                          class="pi merge-row-check"
                          :class="mergeSelectedIds.includes(product.id) ? 'pi-check-circle' : 'pi-circle'"
                        ></i>
                      </button>
                    </div>

                    <div v-else-if="mergeSearched" class="text-sm text-color-secondary">
                      No matching products found.
                    </div>

                    <img
                      v-if="mergeImagePreview.url"
                      :src="mergeImagePreview.url"
                      class="merge-image-preview"
                      :style="{ left: mergeImagePreview.x + 'px', top: mergeImagePreview.y + 'px' }"
                      alt=""
                    />

                    <div v-if="mergeResults.length" class="flex justify-content-end">
                      <Button
                        :label="`Merge selected (${mergeSelectedIds.length})`"
                        icon="pi pi-clone"
                        severity="warning"
                        :disabled="!mergeSelectedIds.length || merging"
                        :loading="merging"
                        @click="confirmMerge"
                      />
                    </div>
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </template>
        </Card>
      </div>
    </div>

    <Dialog v-model:visible="addImageVisible" header="Add Image" :style="{ width: '26rem' }" modal>
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="img-url">Image URL *</label>
          <InputText id="img-url" v-model="addImageForm.url" placeholder="https://..." />
        </div>
        <div class="flex flex-column gap-2">
          <label for="img-alt">Alt text</label>
          <InputText id="img-alt" v-model="addImageForm.alt" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="addImageVisible = false" />
        <Button label="Add" icon="pi pi-plus" :loading="addingImage" @click="addImage" />
      </template>
    </Dialog>

    <Dialog v-model:visible="previewVisible" header="Product Preview" :style="{ width: '22rem' }" modal>
      <div class="product-card">
        <div class="product-image">
          <img v-if="imageUrl(selectedImage)" :src="imageUrl(selectedImage)" :alt="form.title" />
          <i v-else class="pi pi-image p-image-fallback"></i>
        </div>
        <div class="p-3">
          <div class="product-title mb-1">{{ form.title || 'Untitled product' }}</div>
          <div class="product-desc mb-2">{{ plainDescription() || form.product_type || '—' }}</div>
          <div class="flex align-items-center justify-content-between">
            <span class="product-price">{{ formatPrice(selectedVariant?.price) }}</span>
            <Tag v-if="!form.public" value="Hidden" severity="secondary" />
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.gallery-main {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--p-surface-100);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-main img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.gallery-fallback {
  font-size: 3rem;
  color: var(--p-surface-400);
}

.gallery-cover-tag {
  position: absolute;
  left: 0.75rem;
  bottom: 0.75rem;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
  gap: 0.6rem;
  margin-top: 0.75rem;
}

.gallery-thumb {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 0.6rem;
  overflow: hidden;
  cursor: grab;
  border: 2px solid transparent;
  background: var(--p-surface-100);
  transition: transform 0.12s ease, border-color 0.12s ease, opacity 0.12s ease;
}

.gallery-thumb:active {
  cursor: grabbing;
}

.gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.15rem;
}

.gallery-thumb-active {
  border-color: var(--p-primary-color);
}

.gallery-thumb-over {
  border-color: var(--p-primary-color);
  transform: scale(1.05);
}

.gallery-thumb-dragging {
  opacity: 0.45;
}

.gallery-thumb-pos {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.2rem;
  border-radius: 0.55rem;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 0.65rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-thumb-delete {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 0.7rem;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
}

.gallery-thumb:hover .gallery-thumb-delete {
  display: inline-flex;
}

.gallery-thumb-selected {
  border-color: var(--p-primary-color);
}

.gallery-thumb-check {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  font-size: 1rem;
  color: var(--p-primary-color);
  background: var(--p-content-background);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.gallery-add {
  aspect-ratio: 1 / 1;
  border-radius: 0.6rem;
  border: 2px dashed var(--p-content-border-color);
  background: transparent;
  color: var(--p-text-muted-color);
  font-size: 1.25rem;
  cursor: pointer;
}

.gallery-add:hover {
  border-color: var(--p-primary-color);
  color: var(--p-primary-color);
}

.variant-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.variant-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.5rem 0.9rem;
  border-radius: 0.6rem;
  border: 1.5px solid var(--p-content-border-color);
  background: var(--p-content-background);
  cursor: pointer;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.variant-chip:hover {
  border-color: var(--p-primary-color);
}

.variant-chip-active {
  border-color: var(--p-primary-color);
  background: var(--p-highlight-background);
  color: var(--p-highlight-color);
}

.variant-chip-title {
  font-weight: 600;
  font-size: 0.8rem;
}

.variant-chip-price {
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
}

.variant-chip-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 9999px;
  border: 1px solid var(--p-content-border-color);
}

.variant-color-preview {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  border: 1px solid var(--p-content-border-color);
  display: inline-block;
  flex-shrink: 0;
}

.variant-image-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.variant-image-thumb {
  width: 3.5rem;
  aspect-ratio: 1 / 1;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 2px solid var(--p-content-border-color);
  background: var(--p-surface-100);
  cursor: pointer;
  padding: 0;
  transition: border-color 0.12s ease, transform 0.12s ease;
}

.variant-image-thumb:hover {
  border-color: var(--p-primary-color);
}

.variant-image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.variant-image-thumb-active {
  border-color: var(--p-primary-color);
  transform: scale(1.05);
}

.merge-results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 20rem;
  overflow-y: auto;
}

.merge-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.6rem;
  border: 1.5px solid var(--p-content-border-color);
  background: var(--p-content-background);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.merge-row:hover {
  border-color: var(--p-primary-color);
}

.merge-row-active {
  border-color: var(--p-primary-color);
  background: var(--p-highlight-background);
  color: var(--p-highlight-color);
}

.merge-thumb {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border-radius: 0.4rem;
  overflow: hidden;
  background: var(--p-surface-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--p-surface-400);
}

.merge-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.merge-row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.merge-row-title {
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.merge-row-meta {
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
}

.merge-row-check {
  font-size: 1.1rem;
  color: var(--p-primary-color);
  flex-shrink: 0;
}

.merge-image-preview {
  position: fixed;
  width: 15rem;
  height: 15rem;
  object-fit: contain;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.75rem;
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.25);
  padding: 0.5rem;
  pointer-events: none;
  z-index: 1100;
}
</style>
