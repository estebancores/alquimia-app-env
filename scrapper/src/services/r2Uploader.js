const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const path = require('path');
const UploadLog = require('./uploadLog');
const ProductRouteRegistry = require('./productRouteRegistry');

class R2Uploader {
  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME;
    this.publicUrl = process.env.R2_PUBLIC_URL || '';
    this.uploadLog = new UploadLog();
    this.productRoutes = new ProductRouteRegistry();
    this.inFlight = new Map();

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new Error(
        'Missing R2 credentials. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME'
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    });
  }

  async downloadImage(imageUrl) {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024
    });

    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || 'application/octet-stream'
    };
  }

  inferExtension(imageUrl) {
    try {
      const extension = path.extname(new URL(imageUrl).pathname).slice(1).toLowerCase();
      return extension && extension.length <= 5 ? extension : 'image';
    } catch {
      return 'image';
    }
  }

  buildProductRoute(productTitle, productId) {
    const titleSlug = productTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product';
    return `${titleSlug}-${this.productRoutes.getCode(productId)}`;
  }

  buildKey(productTitle, productId, imageId, imageUrl) {
    const productRoute = this.buildProductRoute(productTitle, productId);
    const identifier = String(imageId || Buffer.from(imageUrl).toString('base64url'));
    return `images/${productRoute}/${identifier}.${this.inferExtension(imageUrl)}`;
  }

  buildPublicUrl(key) {
    return this.publicUrl
      ? `${this.publicUrl.replace(/\/$/, '')}/${key}`
      : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.bucketName}/${key}`;
  }

  async objectExists(key) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: key }));
      return true;
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  async uploadImage(imageUrl, metadata) {
    const key = this.buildKey(metadata.productTitle, metadata.productId, metadata.imageId, imageUrl);
    const cached = this.uploadLog.get(imageUrl);
    if (cached?.key === key) return { ...cached, uploaded: false };
    if (this.inFlight.has(key)) return this.inFlight.get(key);

    const upload = this.uploadImageOnce(imageUrl, key).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, upload);
    return upload;
  }

  async uploadImageOnce(imageUrl, key) {
    const r2Url = this.buildPublicUrl(key);

    if (await this.objectExists(key)) {
      const result = { key, r2Url, uploaded: false };
      this.uploadLog.set(imageUrl, result);
      return result;
    }

    const { buffer, contentType } = await this.downloadImage(imageUrl);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: { 'original-url': imageUrl }
      })
    );

    const result = { key, r2Url, uploaded: true };
    this.uploadLog.set(imageUrl, result);
    return result;
  }
}

module.exports = R2Uploader;
