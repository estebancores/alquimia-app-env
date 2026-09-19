const db = require('../config/db');
const R2Uploader = require('./r2Uploader');

class ProductService {
  constructor() {
    this.uploader = new R2Uploader();
    this.imageConcurrency = Math.max(1, Number(process.env.IMAGE_UPLOAD_CONCURRENCY) || 5);
  }

  async createJob(domain) {
    const [job] = await db('scraping_jobs')
      .insert({ source_domain: domain, status: 'running', started_at: new Date() })
      .returning('*');
    return job;
  }

  async completeJob(jobId, updates) {
    return db('scraping_jobs')
      .where({ id: jobId })
      .update({ ...updates, completed_at: new Date(), status: updates.status || 'completed' });
  }

  async createProduct(product, domain, jobId) {
    const existing = await db('products')
      .where({ source_domain: domain, shopify_product_id: product.id })
      .first('id');

    if (existing) return { productId: existing.id, created: false };

    const payload = {
      source_domain: domain,
      shopify_product_id: product.id,
      handle: product.handle,
      title: product.title,
      body_html: product.body_html || null,
      product_type: product.product_type || null,
      vendor: product.vendor || null,
      status: product.status || null,
      tags: JSON.stringify(product.tags || []),
      shopify_published_at: product.published_at ? new Date(product.published_at) : null,
      shopify_created_at: product.created_at ? new Date(product.created_at) : null,
      shopify_updated_at: product.updated_at ? new Date(product.updated_at) : null,
      job_id: jobId,
      created_at: new Date(),
      updated_at: new Date()
    };

    const inserted = await db('products')
      .insert(payload)
      .onConflict(['source_domain', 'shopify_product_id'])
      .ignore()
      .returning('id');

    if (inserted.length > 0) return { productId: inserted[0].id, created: true };

    const concurrent = await db('products')
      .where({ source_domain: domain, shopify_product_id: product.id })
      .first('id');
    return { productId: concurrent.id, created: false };
  }

  async saveVariants(productId, variants) {
    if (!variants || variants.length === 0) return 0;

    const now = new Date();
    const payloads = variants.map((variant) => ({
      product_id: productId,
      shopify_variant_id: variant.id,
      title: variant.title || '',
      sku: variant.sku || null,
      price: variant.price ? parseFloat(variant.price) : null,
      compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
      grams: variant.grams || null,
      position: variant.position || null,
      option1: variant.option1 || null,
      option2: variant.option2 || null,
      option3: variant.option3 || null,
      shopify_image_id: variant.image_id || null,
      raw_options: JSON.stringify(variant.options || []),
      shopify_created_at: variant.created_at ? new Date(variant.created_at) : null,
      shopify_updated_at: variant.updated_at ? new Date(variant.updated_at) : null,
      created_at: now,
      updated_at: now
    }));

    const inserted = await db('product_variants')
      .insert(payloads)
      .onConflict('shopify_variant_id')
      .ignore()
      .returning('id');
    return inserted.length;
  }

  async hasImages(productId) {
    const image = await db('product_images').where({ product_id: productId }).first('id');
    return Boolean(image);
  }

  async linkVariantImages(productId) {
    return db('product_variants')
      .where({ product_id: productId })
      .whereNotNull('shopify_image_id')
      .whereNull('image_id')
      .update({
        image_id: db('product_images')
          .select('id')
          .where({ product_id: productId })
          .whereRaw('product_images.shopify_image_id = product_variants.shopify_image_id')
      });
  }

  async saveImages(productId, images, productTitle) {
    if (!images || images.length === 0 || (await this.hasImages(productId))) return 0;

    const uniqueImages = [...new Map(
      images
        .map((image) => [typeof image === 'string' ? image : image.src, image])
        .filter(([src]) => Boolean(src))
    ).values()];
    const uploaded = [];

    for (let index = 0; index < uniqueImages.length; index += this.imageConcurrency) {
      const batch = uniqueImages.slice(index, index + this.imageConcurrency);
      const results = await Promise.all(
        batch.map(async (image) => {
          const src = typeof image === 'string' ? image : image.src;
          try {
            const upload = await this.uploader.uploadImage(src, {
              productTitle,
              productId,
              imageId: image.id
            });
            return { image, src, upload };
          } catch (error) {
            console.error(`  Failed to upload image ${src}:`, error.message);
            return null;
          }
        })
      );
      uploaded.push(...results.filter(Boolean));
    }

    if (uploaded.length === 0) return 0;

    const now = new Date();
    const payloads = uploaded.map(({ image, src, upload }) => ({
      product_id: productId,
      shopify_image_id: image.id || null,
      original_src: src,
      r2_key: upload.key,
      r2_url: upload.r2Url,
      alt: image.alt || null,
      position: image.position || null,
      width: image.width || null,
      height: image.height || null,
      shopify_created_at: image.created_at ? new Date(image.created_at) : null,
      shopify_updated_at: image.updated_at ? new Date(image.updated_at) : null,
      created_at: now,
      updated_at: now
    }));

    await db('product_images').insert(payloads);
    return uploaded.filter(({ upload }) => upload.uploaded).length;
  }
}

module.exports = ProductService;
