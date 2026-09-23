const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public: storefront checkout creates the order record.
router.post('/', orderController.createValidators, orderController.create);

// Admin endpoints
router.get('/', authenticateToken, orderController.listValidators, orderController.list);
router.get('/:id', authenticateToken, orderController.get);
router.put('/:id', authenticateToken, orderController.updateValidators, orderController.update);
router.put('/:id/delivery', authenticateToken, orderController.deliveryValidators, orderController.upsertDelivery);

module.exports = router;
