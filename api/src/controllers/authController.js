const authService = require('../services/authService');
const { validationResult, body } = require('express-validator');

const registerValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).trim()
];

const createUserValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).trim(),
  body('role').optional().trim().isIn(['admin'])
];

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().trim()
];

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, role } = req.body;
    const result = await authService.register({ email, password, role });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, role } = req.body;
    const result = await authService.createUser({ email, password, role });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { registerValidators, loginValidators, createUserValidators, register, login, me, createUser };
