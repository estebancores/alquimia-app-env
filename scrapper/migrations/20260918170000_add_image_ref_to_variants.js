/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('product_variants', (table) => {
    table.bigInteger('shopify_image_id').nullable();
    table.uuid('image_id').nullable().references('id').inTable('product_images').onDelete('SET NULL');

    table.index('shopify_image_id');
    table.index('image_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('product_variants', (table) => {
    table.dropColumn('shopify_image_id');
    table.dropColumn('image_id');
  });
};
