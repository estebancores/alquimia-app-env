const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// First admin setup only; disabled once any user exists
router.post('/register', authLimiter, authController.registerValidators, authController.register);
router.post('/login', authController.loginValidators, authController.login);
router.get('/me', authenticateToken, authController.me);
router.post('/users', authenticateToken, strictLimiter, authController.createUserValidators, authController.createUser);

module.exports = router;


