require('dotenv').config();
const ShopifyScraper = require('./services/shopifyScraper');
const ProductService = require('./services/productService');

function getTargetUrl() {
  const arg = process.argv[2];
  if (!arg) {
    throw new Error('Usage: node src/index.js <shopify-domain>   e.g. node src/index.js almamia.com');
  }
  return arg;
}

async function main() {
  const targetUrl = getTargetUrl();
  const scraper = new ShopifyScraper();
  const service = new ProductService();

  const { domain, baseUrl, products } = await scraper.scrapeProducts(targetUrl, (meta) => {
    console.log(`Fetched page ${meta.page}: ${meta.count} products (total ${meta.total})`);
  });

  console.log(`\nFound ${products.length} products from ${domain}\n`);

  const job = await service.createJob(domain);
  let insertedCount = 0;
  let totalUploadedImages = 0;

  try {
    for (const product of products) {
      const { productId, created } = await service.createProduct(product, domain, job.id);
      if (!created) {
        if (await service.hasImages(productId)) {
          console.log(`Skipping existing product with images: ${product.title}`);
        } else {
          console.log(`Uploading missing images for existing product: ${product.title}`);
          totalUploadedImages += await service.saveImages(
            productId,
            product.images || [],
            product.title
          );
          await service.linkVariantImages(productId);
        }
        continue;
      }

      console.log(`Saving new product: ${product.title}`);
      await service.saveVariants(productId, product.variants || []);
      totalUploadedImages += await service.saveImages(
        productId,
        product.images || [],
        product.title
      );
      await service.linkVariantImages(productId);
      insertedCount += 1;
    }

    await service.completeJob(job.id, {
      products_found: products.length,
      products_inserted: insertedCount,
      images_uploaded: totalUploadedImages,
      status: 'completed'
    });

    console.log('\nScraping completed successfully.');
    console.log(`Products saved: ${insertedCount}`);
    console.log(`Images uploaded to R2: ${totalUploadedImages}`);
  } catch (error) {
    await service.completeJob(job.id, {
      products_found: products.length,
      products_inserted: insertedCount,
      images_uploaded: totalUploadedImages,
      status: 'failed',
      error_message: error.message
    });
    console.error('\nScraping failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
