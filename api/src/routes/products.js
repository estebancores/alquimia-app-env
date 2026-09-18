const express = require('express');
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter, strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public read endpoints
router.get('/', generalLimiter, productController.listValidators, productController.list);
router.get('/:id', generalLimiter, productController.get);

// Admin write endpoints
router.post('/', authenticateToken, strictLimiter, productController.createValidators, productController.create);
router.put('/:id', authenticateToken, strictLimiter, productController.updateValidators, productController.update);
router.delete('/:id', authenticateToken, strictLimiter, productController.remove);

module.exports = router;
