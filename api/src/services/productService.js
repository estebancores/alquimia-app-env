const db = require('../config/db');
const auditService = require('./auditService');

class ProductService {
  normalizeTags(tags) {
    if (Array.isArray(tags)) return JSON.stringify(tags);
    if (typeof tags === 'string') return JSON.stringify(tags.split(',').map((t) => t.trim()).filter(Boolean));
    return '[]';
  }

  normalizeColor(value) {
    if (!value) return null;
    const v = String(value).trim();
    return v ? (v.startsWith('#') ? v : `#${v}`).toLowerCase() : null;
  }

  parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  buildListQuery(filters = {}) {
    const query = db('products');

    if (filters.source_domain) query.where('source_domain', filters.source_domain);
    if (filters.title) query.whereRaw('LOWER(title) LIKE LOWER(?)', [`%${filters.title}%`]);
    if (filters.vendor) query.whereRaw('LOWER(vendor) LIKE LOWER(?)', [`%${filters.vendor}%`]);
    if (filters.product_type) query.whereRaw('LOWER(product_type) LIKE LOWER(?)', [`%${filters.product_type}%`]);
    if (filters.status) query.where('status', filters.status);
    if (filters.public !== undefined && filters.public !== null && filters.public !== '') {
      query.where('public', filters.public === true || filters.public === 'true');
    }
    if (filters.min_price != null || filters.max_price != null) {
      query.whereExists(function () {
        this.select(db.raw('1'))
          .from('product_variants')
          .whereRaw('product_variants.product_id = products.id')
          .modify((q) => {
            if (filters.min_price != null) q.andWhere('price', '>=', filters.min_price);
            if (filters.max_price != null) q.andWhere('price', '<=', filters.max_price);
          });
      });
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      query.where(function () {
        this.whereRaw('LOWER(title) LIKE LOWER(?)', [term])
          .orWhereRaw('LOWER(handle) LIKE LOWER(?)', [term])
          .orWhereRaw('LOWER(body_html) LIKE LOWER(?)', [term])
          .orWhereRaw('LOWER(vendor) LIKE LOWER(?)', [term]);
      });
    }

    return query;
  }

  async list(filters = {}, options = {}) {
    const { page = 1, limit = 20 } = options;
    const baseQuery = this.buildListQuery(filters);

    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

    const [rows, countResult] = await Promise.all([
      baseQuery.clone()
        .orderBy('created_at', 'desc')
        .limit(Math.max(1, Number(limit)))
        .offset(offset),
      baseQuery.clone().count('id as count').first()
    ]);

    const productIds = rows.map((p) => p.id);
    const [variants, images] = await Promise.all([
      productIds.length ? db('product_variants').whereIn('product_id', productIds).orderBy('position', 'asc') : [],
      productIds.length ? db('product_images').whereIn('product_id', productIds).orderBy('position', 'asc') : []
    ]);

    const products = rows.map((product) => ({
      ...product,
      variants: variants.filter((v) => v.product_id === product.id),
      images: images.filter((img) => img.product_id === product.id)
    }));

    return {
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult?.count || 0)
      }
    };
  }

  async getFilterMeta() {
    const priceRanges = [
      { key: 'lt_50k', label: 'Below $50,000', min: null, max: 50000 },
      { key: '50k_100k', label: '$50,000 - $100,000', min: 50000, max: 100000 },
      { key: '100k_150k', label: '$100,000 - $150,000', min: 100000, max: 150000 },
      { key: '150k_200k', label: '$150,000 - $200,000', min: 150000, max: 200000 },
      { key: 'gte_200k', label: 'Above $200,000', min: 200000, max: null }
    ];

    const countInRange = ({ min, max }) =>
      db('products')
        .whereExists(function () {
          this.select(db.raw('1'))
            .from('product_variants')
            .whereRaw('product_variants.product_id = products.id')
            .modify((q) => {
              if (min != null) q.andWhere('price', '>=', min);
              if (max != null) q.andWhere('price', '<', max);
            });
        })
        .count('id as count')
        .first();

    const [vendors, productTypes, sourceDomains, statuses, priceBounds, rangeCounts] = await Promise.all([
      db('products').distinct('vendor').whereNotNull('vendor').orderBy('vendor'),
      db('products').distinct('product_type').whereNotNull('product_type').orderBy('product_type'),
      db('products').distinct('source_domain').whereNotNull('source_domain').orderBy('source_domain'),
      db('products').distinct('status').whereNotNull('status').orderBy('status'),
      db('product_variants').min('price as min').max('price as max').first(),
      Promise.all(priceRanges.map(countInRange))
    ]);

    return {
      vendors: vendors.map((row) => row.vendor),
      product_types: productTypes.map((row) => row.product_type),
      source_domains: sourceDomains.map((row) => row.source_domain),
      statuses: statuses.map((row) => row.status),
      price: {
        min: priceBounds?.min != null ? Number(priceBounds.min) : 0,
        max: priceBounds?.max != null ? Number(priceBounds.max) : 0,
        ranges: priceRanges.map((range, index) => ({
          ...range,
          count: Number(rangeCounts[index]?.count || 0)
        }))
      }
    };
  }

  async getById(id) {
    const product = await db('products').where({ id }).first();
    if (!product) return null;

    const [variants, images] = await Promise.all([
      db('product_variants').where({ product_id: id }).orderBy('position', 'asc'),
      db('product_images').where({ product_id: id }).orderBy('position', 'asc')
    ]);

    return { ...product, variants, images };
  }

  async create(payload, { userId, req }) {
    const now = new Date();
    const insert = {
      source_domain: payload.source_domain,
      shopify_product_id: payload.shopify_product_id,
      handle: payload.handle,
      title: payload.title,
      body_html: payload.body_html || null,
      product_type: payload.product_type || null,
      vendor: payload.vendor || null,
      status: payload.status || 'active',
      public: payload.public !== undefined ? Boolean(payload.public) : true,
      provider_price: payload.provider_price != null ? Number(payload.provider_price) : null,
      tags: this.normalizeTags(payload.tags),
      shopify_published_at: this.parseDate(payload.shopify_published_at),
      shopify_created_at: this.parseDate(payload.shopify_created_at) || now,
      shopify_updated_at: this.parseDate(payload.shopify_updated_at) || now,
      created_at: now,
      updated_at: now
    };

    const [product] = await db('products').insert(insert).returning('*');

    await auditService.log({
      userId,
      productId: product.id,
      action: 'CREATE',
      tableName: 'products',
      recordId: product.id,
      payload: insert,
      req
    });

    return product;
  }

  async update(id, payload, { userId, req }) {
    const product = await db('products').where({ id }).first();
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const updates = {
      source_domain: payload.source_domain ?? product.source_domain,
      handle: payload.handle ?? product.handle,
      title: payload.title ?? product.title,
      body_html: payload.body_html !== undefined ? payload.body_html : product.body_html,
      product_type: payload.product_type !== undefined ? payload.product_type : product.product_type,
      vendor: payload.vendor !== undefined ? payload.vendor : product.vendor,
      status: payload.status ?? product.status,
      public: payload.public !== undefined ? Boolean(payload.public) : product.public,
      provider_price: payload.provider_price !== undefined
        ? (payload.provider_price != null ? Number(payload.provider_price) : null)
        : product.provider_price,
      ...(payload.tags !== undefined && { tags: this.normalizeTags(payload.tags) }),
      shopify_published_at: payload.shopify_published_at !== undefined
        ? this.parseDate(payload.shopify_published_at)
        : product.shopify_published_at,
      shopify_updated_at: new Date(),
      updated_at: new Date()
    };

    const [updated] = await db('products').where({ id }).update(updates).returning('*');

    await auditService.log({
      userId,
      productId: updated.id,
      action: 'UPDATE',
      tableName: 'products',
      recordId: updated.id,
      payload: { before: product, after: updated },
      req
    });

    if (Array.isArray(payload.variants)) {
      for (const variantPayload of payload.variants) {
        if (!variantPayload?.id) continue;
        const variant = await db('product_variants').where({ id: variantPayload.id, product_id: id }).first();
        if (!variant) continue;

        let imageId = variant.image_id;
        if (variantPayload.image_id !== undefined) {
          if (variantPayload.image_id === null) {
            imageId = null;
          } else {
            const linkedImage = await db('product_images')
              .where({ id: variantPayload.image_id, product_id: id })
              .first('id');
            if (linkedImage) imageId = variantPayload.image_id;
          }
        }

        const variantUpdates = {
          title: variantPayload.title !== undefined ? variantPayload.title : variant.title,
          sku: variantPayload.sku !== undefined ? variantPayload.sku : variant.sku,
          price: variantPayload.price !== undefined
            ? (variantPayload.price != null ? Number(variantPayload.price) : null)
            : variant.price,
          compare_at_price: variantPayload.compare_at_price !== undefined
            ? (variantPayload.compare_at_price != null ? Number(variantPayload.compare_at_price) : null)
            : variant.compare_at_price,
          position: variantPayload.position !== undefined ? variantPayload.position : variant.position,
          image_id: imageId,
          color: variantPayload.color !== undefined
            ? this.normalizeColor(variantPayload.color)
            : variant.color,
          shopify_updated_at: new Date(),
          updated_at: new Date()
        };

        const [updatedVariant] = await db('product_variants').where({ id: variant.id }).update(variantUpdates).returning('*');

        await auditService.log({
          userId,
          productId: id,
          action: 'UPDATE',
          tableName: 'product_variants',
          recordId: variant.id,
          payload: { before: variant, after: updatedVariant },
          req
        });
      }
    }

    if (Array.isArray(payload.images)) {
      for (const imagePayload of payload.images) {
        if (!imagePayload?.id) continue;
        const image = await db('product_images').where({ id: imagePayload.id, product_id: id }).first();
        if (!image) continue;

        const imageUpdates = {
          alt: imagePayload.alt !== undefined ? imagePayload.alt : image.alt,
          position: imagePayload.position !== undefined ? imagePayload.position : image.position,
          updated_at: new Date()
        };

        const [updatedImage] = await db('product_images').where({ id: image.id }).update(imageUpdates).returning('*');

        await auditService.log({
          userId,
          productId: id,
          imageId: image.id,
          action: 'UPDATE',
          tableName: 'product_images',
          recordId: image.id,
          payload: { before: image, after: updatedImage },
          req
        });
      }
    }

    return this.getById(id);
  }

  async merge(targetId, sourceIds, { userId, req }) {
    const target = await db('products').where({ id: targetId }).first();
    if (!target) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const uniqueIds = [...new Set(sourceIds)].filter((id) => id !== targetId);
    if (!uniqueIds.length) {
      const error = new Error('No valid products to merge');
      error.statusCode = 400;
      throw error;
    }

    const sourcesById = new Map(
      (await db('products').whereIn('id', uniqueIds)).map((p) => [p.id, p])
    );
    const missing = uniqueIds.filter((id) => !sourcesById.has(id));
    if (missing.length) {
      const error = new Error(`Products not found: ${missing.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    const merged = [];

    await db.transaction(async (trx) => {
      const [variantMax, imageMax] = await Promise.all([
        trx('product_variants').where({ product_id: targetId }).max('position as max').first(),
        trx('product_images').where({ product_id: targetId }).max('position as max').first()
      ]);
      let nextVariantPos = (variantMax?.max ?? -1) + 1;
      let nextImagePos = (imageMax?.max ?? -1) + 1;

      for (const sourceId of uniqueIds) {
        const source = sourcesById.get(sourceId);

        const variants = await trx('product_variants')
          .where({ product_id: sourceId })
          .orderBy('position', 'asc');
        for (const variant of variants) {
          await trx('product_variants').where({ id: variant.id }).update({
            product_id: targetId,
            position: nextVariantPos++,
            updated_at: new Date()
          });
        }

        const images = await trx('product_images')
          .where({ product_id: sourceId })
          .orderBy('position', 'asc');
        for (const image of images) {
          await trx('product_images').where({ id: image.id }).update({
            product_id: targetId,
            position: nextImagePos++,
            updated_at: new Date()
          });
        }

        await trx('merged_products')
          .insert({
            source_domain: source.source_domain,
            shopify_product_id: source.shopify_product_id,
            merged_into: targetId,
            created_at: new Date()
          })
          .onConflict(['source_domain', 'shopify_product_id'])
          .merge(['merged_into']);

        await trx('merged_products').where({ merged_into: sourceId }).update({ merged_into: targetId });

        await trx('products').where({ id: sourceId }).delete();

        merged.push({
          id: source.id,
          title: source.title,
          shopify_product_id: source.shopify_product_id,
          variants_moved: variants.length,
          images_moved: images.length
        });
      }
    });

    await auditService.log({
      userId,
      productId: targetId,
      action: 'MERGE',
      tableName: 'products',
      recordId: targetId,
      payload: { merged_products: merged },
      req
    });

    return this.getById(targetId);
  }

  async delete(id, { userId, req }) {
    const product = await db('products').where({ id }).first();
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    await db('product_images').where({ product_id: id }).delete();
    await db('product_variants').where({ product_id: id }).delete();

    await auditService.log({
      userId,
      productId: id,
      action: 'DELETE',
      tableName: 'products',
      recordId: id,
      payload: product,
      req
    });

    await db('products').where({ id }).delete();

    return { deleted: true };
  }
}

module.exports = new ProductService();
