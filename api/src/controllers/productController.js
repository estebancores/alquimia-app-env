const { body, query, validationResult } = require('express-validator');
const productService = require('../services/productService');

const listValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().escape(),
  query('title').optional().trim(),
  query('source_domain').optional().trim(),
  query('vendor').optional().trim(),
  query('product_type').optional().trim(),
  query('status').optional().trim(),
  query('public').optional().isBoolean(),
  query('min_price').optional().isDecimal(),
  query('max_price').optional().isDecimal()
];

const createValidators = [
  body('source_domain').notEmpty().trim(),
  body('shopify_product_id').notEmpty().isNumeric(),
  body('handle').notEmpty().trim(),
  body('title').notEmpty().trim(),
  body('provider_price').optional({ values: 'falsy' }).isDecimal(),
  body('public').optional().isBoolean().toBoolean(),
  body('status').optional().trim()
];

const updateValidators = [
  body('title').optional().trim(),
  body('handle').optional({ values: 'null' }).trim(),
  body('vendor').optional({ values: 'null' }).trim(),
  body('product_type').optional({ values: 'null' }).trim(),
  body('body_html').optional(),
  body('tags').optional(),
  body('provider_price').optional({ values: 'falsy' }).isDecimal(),
  body('public').optional().isBoolean().toBoolean(),
  body('status').optional({ values: 'null' }).trim(),
  body('variants').optional().isArray(),
  body('variants.*.id').notEmpty().isUUID(),
  body('variants.*.title').optional({ values: 'null' }).trim(),
  body('variants.*.sku').optional({ values: 'null' }).trim(),
  body('variants.*.price').optional({ values: 'null' }).isDecimal(),
  body('variants.*.compare_at_price').optional({ values: 'null' }).isDecimal(),
  body('variants.*.image_id').optional({ values: 'null' }).isUUID(),
  body('variants.*.position').optional().isInt(),
  body('images').optional().isArray(),
  body('images.*.id').notEmpty().isUUID(),
  body('images.*.alt').optional({ values: 'null' }).trim(),
  body('images.*.position').optional().isInt()
];

const mergeValidators = [
  body('product_ids').isArray({ min: 1, max: 50 }),
  body('product_ids.*').isUUID()
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
      title: req.query.title,
      vendor: req.query.vendor,
      product_type: req.query.product_type,
      status: req.query.status,
      public: req.query.public,
      search: req.query.search,
      min_price: req.query.min_price != null ? Number(req.query.min_price) : null,
      max_price: req.query.max_price != null ? Number(req.query.max_price) : null
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

async function meta(req, res, next) {
  try {
    const result = await productService.getFilterMeta();
    res.json({ success: true, data: result });
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

async function merge(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const product = await productService.merge(req.params.id, req.body.product_ids, buildAuditContext(req));
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

module.exports = { listValidators, createValidators, updateValidators, mergeValidators, list, meta, get, create, update, merge, remove };
