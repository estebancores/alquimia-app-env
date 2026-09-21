const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthService {
  generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }



  async findByEmail(email) {
    return db('users').whereRaw('LOWER(email) = LOWER(?)', [email]).first();
  }

  async findById(id) {
    return db('users').where({ id }).first('id', 'email', 'role', 'is_active', 'created_at', 'updated_at');
  }

  async hasUsers() {
    const result = await db('users').count('id as count').first();
    return Number(result?.count || 0) > 0;
  }

  async createUser({ email, password, role = 'admin' }) {
    const existing = await this.findByEmail(email);
    if (existing) {
      const error = new Error('Email already registered');
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        role,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning(['id', 'email', 'role', 'is_active', 'created_at']);

    return { user };
  }

  async register({ email, password, role = 'admin' }) {
    if (await this.hasUsers()) {
      const error = new Error('Registration is disabled. Use an existing admin account to create users.');
      error.statusCode = 403;
      throw error;
    }

    const result = await this.createUser({ email, password, role });
    return { user: result.user, token: this.generateToken(result.user) };
  }

  async login({ email, password }) {
    const user = await this.findByEmail(email);
    if (!user || !(await comparePassword(password, user.password_hash))) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    if (!user.is_active) {
      const error = new Error('Account is disabled');
      error.statusCode = 403;
      throw error;
    }

    const publicUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at
    };

    return { user: publicUser, token: this.generateToken(publicUser) };
  }
}

module.exports = new AuthService();
