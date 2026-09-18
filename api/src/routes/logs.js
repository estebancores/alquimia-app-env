const express = require('express');
const auditController = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/', authenticateToken, generalLimiter, auditController.listValidators, auditController.list);

module.exports = router;
