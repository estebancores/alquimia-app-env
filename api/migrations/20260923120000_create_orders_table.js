/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.specificType('order_number', 'bigint GENERATED ALWAYS AS IDENTITY').notNullable().unique(); // friendly orderId shown in admin
    table.text('email').nullable(); // filled manually from the admin orders view
    table.text('whatsapp').nullable(); // customer WhatsApp phone, filled manually
    // [{ product_id, name, quantity }]
    table.jsonb('items').notNullable().defaultTo('[]');
    table.integer('total_items').notNullable().defaultTo(0);
    table.decimal('total_amount', 14, 2).notNullable().defaultTo(0);
    table.text('status').notNullable().defaultTo('pending'); // pending, contacted, completed, cancelled
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('status');
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('orders');
};
