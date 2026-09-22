const express = require('express');
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public read endpoints
router.get('/', productController.listValidators, productController.list);
router.get('/meta', productController.meta);
router.get('/:id', productController.get);

// Admin write endpoints
router.post('/', authenticateToken, productController.createValidators, productController.create);
router.put('/:id', authenticateToken, productController.updateValidators, productController.update);
router.post('/:id/merge', authenticateToken, productController.mergeValidators, productController.merge);
router.delete('/:id', authenticateToken, productController.remove);

module.exports = router;
