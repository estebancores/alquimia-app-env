const db = require('../config/db');

const DELIVERY_SELECT = [
  'delivery_orders.id as delivery_id',
  'delivery_orders.status as delivery_status',
  'delivery_orders.delivery_date',
  'delivery_orders.address as delivery_address',
  'delivery_orders.notes as delivery_notes',
];

class OrderService {
  normalizeItems(items) {
    return items.map((i) => ({
      product_id: i.product_id,
      variant_id: i.variant_id || null,
      name: i.name,
      quantity: Number(i.quantity),
      price: i.price != null ? Number(i.price) : null,
    }));
  }

  async create(payload) {
    const items = this.normalizeItems(payload.items);
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalAmount = payload.total_amount != null
      ? Number(payload.total_amount)
      : items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

    const [order] = await db('orders')
      .insert({
        items: JSON.stringify(items),
        total_items: totalItems,
        total_amount: totalAmount,
        status: 'pending',
      })
      .returning('*');
    return order;
  }

  baseListQuery(status) {
    const query = db('orders');
    if (status) query.where('orders.status', status);
    return query;
  }

  async list({ page = 1, limit = 20, status } = {}) {
    const [{ count }] = await this.baseListQuery(status).count('* as count');
    const rows = await this.baseListQuery(status)
      .leftJoin('delivery_orders', 'delivery_orders.order_id', 'orders.id')
      .select('orders.*', ...DELIVERY_SELECT)
      .orderBy('orders.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data: rows,
      pagination: { page, limit, total: Number(count) },
    };
  }

  async getById(id) {
    return db('orders')
      .leftJoin('delivery_orders', 'delivery_orders.order_id', 'orders.id')
      .select('orders.*', ...DELIVERY_SELECT)
      .where('orders.id', id)
      .first();
  }

  async update(id, payload) {
    const updates = { updated_at: new Date() };
    if (payload.email !== undefined) updates.email = payload.email || null;
    if (payload.whatsapp !== undefined) updates.whatsapp = payload.whatsapp || null;
    if (payload.status !== undefined) updates.status = payload.status;

    const [updated] = await db('orders').where({ id }).update(updates).returning('*');
    return updated ?? null;
  }

  async upsertDelivery(orderId, payload) {
    const order = await db('orders').where({ id: orderId }).first('id');
    if (!order) return null;

    const data = {
      status: payload.status || 'pending',
      delivery_date: payload.delivery_date ? new Date(payload.delivery_date) : null,
      address: payload.address || null,
      notes: payload.notes || null,
      updated_at: new Date(),
    };

    const existing = await db('delivery_orders').where({ order_id: orderId }).first('id');
    if (existing) {
      const [row] = await db('delivery_orders').where({ id: existing.id }).update(data).returning('*');
      return row;
    }
    const [row] = await db('delivery_orders').insert({ order_id: orderId, ...data }).returning('*');
    return row;
  }
}

module.exports = new OrderService();
