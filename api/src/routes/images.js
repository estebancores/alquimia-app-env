const express = require('express');
const imageController = require('../controllers/imageController');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter, strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public read endpoints
router.get('/products/:productId/images', generalLimiter, imageController.list);
router.get('/images/:id', generalLimiter, imageController.get);

// Admin write endpoints
router.post('/products/:productId/images', authenticateToken, strictLimiter, imageController.createValidators, imageController.create);
router.put('/images/:id', authenticateToken, strictLimiter, imageController.updateValidators, imageController.update);
router.delete('/images/:id', authenticateToken, strictLimiter, imageController.remove);

module.exports = router;
