const { query, validationResult } = require('express-validator');
const auditService = require('../services/auditService');

const listValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('productId').optional().isUUID(),
  query('userId').optional().isUUID(),
  query('action').optional().trim()
];

async function list(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const filters = {
      productId: req.query.productId,
      userId: req.query.userId,
      action: req.query.action
    };

    const options = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50
    };

    const result = await auditService.list(filters, options);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

module.exports = { listValidators, list };
