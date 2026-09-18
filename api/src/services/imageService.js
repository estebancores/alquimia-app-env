const db = require('../config/db');
const auditService = require('./auditService');

class ImageService {
  async listByProduct(productId) {
    return db('product_images').where({ product_id: productId }).orderBy('position', 'asc');
  }

  async getById(id) {
    return db('product_images').where({ id }).first();
  }

  async create(productId, payload, { userId, req }) {
    const product = await db('products').where({ id: productId }).first('id');
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    const insert = {
      product_id: productId,
      shopify_image_id: payload.shopify_image_id || null,
      original_src: payload.original_src,
      r2_key: payload.r2_key || null,
      r2_url: payload.r2_url || null,
      alt: payload.alt || null,
      position: payload.position || 0,
      width: payload.width || null,
      height: payload.height || null,
      shopify_created_at: payload.shopify_created_at ? new Date(payload.shopify_created_at) : now,
      shopify_updated_at: payload.shopify_updated_at ? new Date(payload.shopify_updated_at) : now,
      created_at: now,
      updated_at: now
    };

    const [image] = await db('product_images').insert(insert).returning('*');

    await auditService.log({
      userId,
      productId,
      imageId: image.id,
      action: 'IMAGE_UPLOAD',
      tableName: 'product_images',
      recordId: image.id,
      payload: insert,
      req
    });

    return image;
  }

  async update(id, payload, { userId, req }) {
    const image = await db('product_images').where({ id }).first();
    if (!image) {
      const error = new Error('Image not found');
      error.statusCode = 404;
      throw error;
    }

    const updates = {
      original_src: payload.original_src !== undefined ? payload.original_src : image.original_src,
      r2_key: payload.r2_key !== undefined ? payload.r2_key : image.r2_key,
      r2_url: payload.r2_url !== undefined ? payload.r2_url : image.r2_url,
      alt: payload.alt !== undefined ? payload.alt : image.alt,
      position: payload.position !== undefined ? payload.position : image.position,
      width: payload.width !== undefined ? payload.width : image.width,
      height: payload.height !== undefined ? payload.height : image.height,
      shopify_updated_at: new Date(),
      updated_at: new Date()
    };

    const [updated] = await db('product_images').where({ id }).update(updates).returning('*');

    await auditService.log({
      userId,
      productId: updated.product_id,
      imageId: updated.id,
      action: 'UPDATE',
      tableName: 'product_images',
      recordId: updated.id,
      payload: { before: image, after: updated },
      req
    });

    return updated;
  }

  async delete(id, { userId, req }) {
    const image = await db('product_images').where({ id }).first();
    if (!image) {
      const error = new Error('Image not found');
      error.statusCode = 404;
      throw error;
    }

    await auditService.log({
      userId,
      productId: image.product_id,
      imageId: id,
      action: 'IMAGE_DELETE',
      tableName: 'product_images',
      recordId: id,
      payload: image,
      req
    });

    await db('product_images').where({ id }).delete();

    return { deleted: true };
  }
}

module.exports = new ImageService();
