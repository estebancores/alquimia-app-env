const db = require('../config/db');

class AuditService {
  buildQuery(filters = {}) {
    const { productId, userId, action } = filters;
    const query = db('product_logs');

    if (productId) query.where('product_id', productId);
    if (userId) query.where('user_id', userId);
    if (action) query.where('action', action);

    return query;
  }

  async log({ userId, productId, imageId, action, tableName, recordId, payload, req }) {
    const logEntry = {
      user_id: userId || null,
      product_id: productId || null,
      image_id: imageId || null,
      action,
      table_name: tableName,
      record_id: recordId || null,
      payload: payload ? JSON.stringify(payload) : '{}',
      ip_address: req?.ip || req?.socket?.remoteAddress || null,
      user_agent: req?.headers?.['user-agent'] || null,
      created_at: new Date()
    };

    const [row] = await db('product_logs').insert(logEntry).returning('*');
    return row;
  }

  async list(filters = {}, options = {}) {
    const { page = 1, limit = 50 } = options;
    const baseQuery = this.buildQuery(filters);

    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

    const [rows, countResult] = await Promise.all([
      baseQuery.clone().orderBy('created_at', 'desc').limit(Math.max(1, Number(limit))).offset(offset),
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
}

module.exports = new AuditService();
