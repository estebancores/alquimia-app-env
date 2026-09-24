const { body, query, validationResult } = require('express-validator');
const orderService = require('../services/orderService');

const ORDER_STATUSES = ['pending', 'contacted', 'completed', 'cancelled'];
const DELIVERY_STATUSES = ['pending', 'shipped', 'delivered'];

const createValidators = [
  body('items').isArray({ min: 1, max: 100 }),
  body('items.*.product_id').notEmpty().isUUID(),
  body('items.*.variant_id').optional({ values: 'falsy' }).isUUID(),
  body('items.*.name').notEmpty().trim(),
  body('items.*.quantity').isInt({ min: 1, max: 999 }).toInt(),
  body('items.*.price').optional({ values: 'null' }).isDecimal(),
  body('total_amount').optional({ values: 'null' }).isDecimal(),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('whatsapp').optional({ values: 'falsy' }).trim().isLength({ max: 32 }),
  body('address').optional({ values: 'falsy' }).trim(),
  body('status').optional().isIn(ORDER_STATUSES),
];

const listValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(ORDER_STATUSES),
];

const updateValidators = [
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('whatsapp').optional({ values: 'falsy' }).trim().isLength({ max: 32 }),
  body('address').optional({ values: 'falsy' }).trim(),
  body('status').optional().isIn(ORDER_STATUSES),
  body('items').optional().isArray({ min: 1, max: 100 }),
  body('items.*.product_id').notEmpty().isUUID(),
  body('items.*.variant_id').optional({ values: 'falsy' }).isUUID(),
  body('items.*.name').notEmpty().trim(),
  body('items.*.quantity').isInt({ min: 1, max: 999 }).toInt(),
  body('items.*.price').optional({ values: 'null' }).isDecimal(),
  body('total_amount').optional({ values: 'null' }).isDecimal(),
];

const deliveryValidators = [
  body('status').optional().isIn(DELIVERY_STATUSES),
  body('delivery_date').optional({ values: 'falsy' }).isISO8601(),
  body('address').optional({ values: 'falsy' }).trim(),
  body('notes').optional({ values: 'falsy' }).trim(),
];

function hasErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

async function create(req, res, next) {
  try {
    if (hasErrors(req, res)) return;
    const order = await orderService.create(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    if (hasErrors(req, res)) return;
    const result = await orderService.list({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status: req.query.status,
    });
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

async function get(req, res, next) {
  try {
    const order = await orderService.getById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    if (hasErrors(req, res)) return;
    const order = await orderService.update(req.params.id, req.body);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

async function upsertDelivery(req, res, next) {
  try {
    if (hasErrors(req, res)) return;
    const delivery = await orderService.upsertDelivery(req.params.id, req.body);
    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: delivery });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createValidators,
  listValidators,
  updateValidators,
  deliveryValidators,
  create,
  list,
  get,
  update,
  upsertDelivery,
};
