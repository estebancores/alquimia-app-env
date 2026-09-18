const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ProductRouteRegistry {
  constructor(filePath = path.resolve(__dirname, '../../data/product-routes.json')) {
    this.filePath = filePath;
    this.routes = this.load();
    this.usedCodes = new Set(Object.values(this.routes));
  }

  load() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Could not read product route registry: ${error.message}`);
      }
      return {};
    }
  }

  generateCode() {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let index = 0; index < 5; index += 1) {
      code += alphabet[crypto.randomInt(alphabet.length)];
    }
    return code;
  }

  getCode(productId) {
    if (this.routes[productId]) return this.routes[productId];

    let code;
    do {
      code = this.generateCode();
    } while (this.usedCodes.has(code));

    this.routes[productId] = code;
    this.usedCodes.add(code);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(this.routes, null, 2));
    fs.renameSync(temporaryPath, this.filePath);
    return code;
  }
}

module.exports = ProductRouteRegistry;
