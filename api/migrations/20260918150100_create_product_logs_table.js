/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('product_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.uuid('product_id').nullable().references('id').inTable('products').onDelete('SET NULL');
    table.uuid('image_id').nullable().references('id').inTable('product_images').onDelete('SET NULL');
    table.text('action').notNullable(); // CREATE, UPDATE, DELETE, IMAGE_UPLOAD, IMAGE_DELETE, etc.
    table.text('table_name').notNullable();
    table.uuid('record_id').nullable();
    table.jsonb('payload').nullable().defaultTo('{}');
    table.text('ip_address').nullable();
    table.text('user_agent').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('product_id');
    table.index('image_id');
    table.index('action');
    table.index('table_name');
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('product_logs');
};
