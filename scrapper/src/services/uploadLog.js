const fs = require('fs');
const path = require('path');

class UploadLog {
  constructor(filePath = path.resolve(__dirname, '../../data/uploaded-images.json')) {
    this.filePath = filePath;
    this.entries = this.load();
  }

  load() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Could not read image upload log: ${error.message}`);
      }
      return {};
    }
  }

  get(imageUrl) {
    return this.entries[imageUrl] || null;
  }

  set(imageUrl, upload) {
    this.entries[imageUrl] = {
      key: upload.key,
      r2Url: upload.r2Url,
      uploadedAt: new Date().toISOString()
    };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(this.entries, null, 2));
    fs.renameSync(temporaryPath, this.filePath);
  }
}

module.exports = UploadLog;
