const db = require('../config/db');
const auditService = require('./auditService');

class ProductService {
  normalizeTags(tags) {
    if (Array.isArray(tags)) return JSON.stringify(tags);
    if (typeof tags === 'string') return JSON.stringify(tags.split(',').map((t) => t.trim()).filter(Boolean));
    return '[]';
  }

  parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  buildListQuery(filters = {}) {
    const query = db('products');

    if (filters.source_domain) query.where('source_domain', filters.source_domain);
    if (filters.vendor) query.where('vendor', filters.vendor);
    if (filters.product_type) query.where('product_type', filters.product_type);
    if (filters.status) query.where('status', filters.status);
    if (filters.search) {
      query.where(function () {
        this.whereILike('title', `%${filters.search}%`)
          .orWhereILike('handle', `%${filters.search}%`)
          .orWhereILike('body_html', `%${filters.search}%`);
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

    return {
      data: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult?.count || 0)
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

    return updated;
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
