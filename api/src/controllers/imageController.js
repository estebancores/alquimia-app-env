const { body, validationResult } = require('express-validator');
const imageService = require('../services/imageService');
const productService = require('../services/productService');

const createValidators = [
  body('original_src').notEmpty().isURL(),
  body('r2_url').optional().isURL(),
  body('position').optional().isInt(),
  body('alt').optional().trim()
];

const updateValidators = [
  body('original_src').optional().isURL(),
  body('r2_url').optional().isURL(),
  body('position').optional().isInt(),
  body('alt').optional().trim()
];

function buildAuditContext(req) {
  return { userId: req.user?.id, req };
}

async function list(req, res, next) {
  try {
    const images = await imageService.listByProduct(req.params.productId);
    res.json({ success: true, data: images });
  } catch (error) {
    next(error);
  }
}

async function get(req, res, next) {
  try {
    const image = await imageService.getById(req.params.id);
    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    res.json({ success: true, data: image });
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

    const product = await productService.getById(req.params.productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const image = await imageService.create(req.params.productId, req.body, buildAuditContext(req));
    res.status(201).json({ success: true, data: image });
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

    const image = await imageService.update(req.params.id, req.body, buildAuditContext(req));
    res.json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await imageService.delete(req.params.id, buildAuditContext(req));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { createValidators, updateValidators, list, get, create, update, remove };
