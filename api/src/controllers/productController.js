const { body, query, validationResult } = require('express-validator');
const productService = require('../services/productService');

const listValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().escape(),
  query('source_domain').optional().trim(),
  query('vendor').optional().trim(),
  query('product_type').optional().trim(),
  query('status').optional().trim()
];

const createValidators = [
  body('source_domain').notEmpty().trim(),
  body('shopify_product_id').notEmpty().isNumeric(),
  body('handle').notEmpty().trim(),
  body('title').notEmpty().trim(),
  body('provider_price').optional().isDecimal(),
  body('status').optional().trim()
];

const updateValidators = [
  body('title').optional().trim(),
  body('provider_price').optional().isDecimal(),
  body('status').optional().trim()
];

function buildAuditContext(req) {
  return { userId: req.user?.id, req };
}

async function list(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const filters = {
      source_domain: req.query.source_domain,
      vendor: req.query.vendor,
      product_type: req.query.product_type,
      status: req.query.status,
      search: req.query.search
    };

    const options = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20
    };

    const result = await productService.list(filters, options);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

async function get(req, res, next) {
  try {
    const product = await productService.getById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const product = await productService.create(req.body, buildAuditContext(req));
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const product = await productService.update(req.params.id, req.body, buildAuditContext(req));
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await productService.delete(req.params.id, buildAuditContext(req));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { listValidators, createValidators, updateValidators, list, get, create, update, remove };
