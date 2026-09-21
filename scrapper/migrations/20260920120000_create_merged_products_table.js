/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('merged_products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('source_domain').notNullable();
    table.bigInteger('shopify_product_id').notNullable();
    table.uuid('merged_into').nullable().references('id').inTable('products').onDelete('SET NULL');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['source_domain', 'shopify_product_id']);
    table.index('merged_into');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('merged_products');
};
