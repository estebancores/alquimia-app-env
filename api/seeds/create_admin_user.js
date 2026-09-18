require('dotenv').config();
const bcrypt = require('bcryptjs');

const email = process.env.ADMIN_EMAIL || 'admin@alquimia.com';
const password = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  const existing = await knex('users').whereRaw('LOWER(email) = LOWER(?)', [email]).first();
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await knex('users').insert({
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    role: 'admin',
    is_active: true,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });

  console.log(`Admin user created: ${email}`);
};
