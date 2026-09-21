const express = require('express');
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter, strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public read endpoints
router.get('/', generalLimiter, productController.listValidators, productController.list);
router.get('/meta', generalLimiter, productController.meta);
router.get('/:id', generalLimiter, productController.get);

// Admin write endpoints
router.post('/', authenticateToken, productController.createValidators, productController.create);
router.put('/:id', authenticateToken, productController.updateValidators, productController.update);
router.post('/:id/merge', authenticateToken, productController.mergeValidators, productController.merge);
router.delete('/:id', authenticateToken, productController.remove);

module.exports = router;
