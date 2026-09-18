/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    .createTable('scraping_jobs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.text('source_domain').notNullable();
      table.text('status').notNullable().defaultTo('running');
      table.integer('products_found').defaultTo(0);
      table.integer('products_inserted').defaultTo(0);
      table.integer('images_uploaded').defaultTo(0);
      table.text('error_message');
      table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('completed_at');
    })
    .createTable('products', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('job_id').references('id').inTable('scraping_jobs').onDelete('SET NULL');
      table.text('source_domain').notNullable();
      table.bigInteger('shopify_product_id').notNullable();
      table.text('handle').notNullable();
      table.text('title').notNullable();
      table.text('body_html');
      table.text('product_type');
      table.text('vendor');
      table.text('status');
      table.jsonb('tags').defaultTo('[]');
      table.timestamp('shopify_published_at');
      table.timestamp('shopify_created_at');
      table.timestamp('shopify_updated_at');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['source_domain', 'shopify_product_id']);
      table.index('source_domain');
      table.index('handle');
      table.index('vendor');
      table.index('product_type');
    })
    .createTable('product_variants', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.bigInteger('shopify_variant_id').notNullable().unique();
      table.text('title').notNullable();
      table.text('sku');
      table.decimal('price', 12, 2);
      table.decimal('compare_at_price', 12, 2);
      table.integer('grams');
      table.integer('position');
      table.text('option1');
      table.text('option2');
      table.text('option3');
      table.jsonb('raw_options').defaultTo('[]');
      table.timestamp('shopify_created_at');
      table.timestamp('shopify_updated_at');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index('product_id');
      table.index('sku');
    })
    .createTable('product_images', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.bigInteger('shopify_image_id');
      table.text('original_src').notNullable();
      table.text('r2_key');
      table.text('r2_url');
      table.text('alt');
      table.integer('position');
      table.integer('width');
      table.integer('height');
      table.timestamp('shopify_created_at');
      table.timestamp('shopify_updated_at');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index('product_id');
      table.index('shopify_image_id');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('product_images')
    .dropTableIfExists('product_variants')
    .dropTableIfExists('products')
    .dropTableIfExists('scraping_jobs');
};
