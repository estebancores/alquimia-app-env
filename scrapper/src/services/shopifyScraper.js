const axios = require('axios');

class ShopifyScraper {
  constructor() {
    this.delayMs = 500;
    this.maxPages = 10;
  }

  normalizeDomain(inputUrl) {
    let url = inputUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    return {
      domain: hostname,
      baseUrl: `${parsed.protocol}//${hostname}`
    };
  }

  getCandidateBaseUrls(baseUrl) {
    const candidates = [baseUrl];
    const parsed = new URL(baseUrl);
    if (!parsed.hostname.startsWith('www.')) {
      candidates.push(`${parsed.protocol}//www.${parsed.hostname}`);
    }
    return candidates;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchPage(baseUrl, page) {
    const url = `${baseUrl}/products.json?page=${page}&limit=250`;
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AlquimiaScraper/1.0)'
      }
    });
    return response.data.products || [];
  }

  async discoverWorkingBaseUrl(candidates) {
    let lastError = null;
    for (const candidate of candidates) {
      try {
        const products = await this.fetchPage(candidate, 1);
        return { baseUrl: candidate, products };
      } catch (error) {
        lastError = error;
        if (error.response && error.response.status === 404) {
          continue;
        }
        // Network/SSL errors: try next candidate
      }
    }
    throw lastError || new Error('Unable to reach Shopify products.json endpoint for any candidate URL');
  }

  async scrapeProducts(inputUrl, onPage = () => {}) {
    const { domain, baseUrl } = this.normalizeDomain(inputUrl);
    const candidates = this.getCandidateBaseUrls(baseUrl);

    const discovery = await this.discoverWorkingBaseUrl(candidates);
    const products = [...discovery.products];
    const workingBaseUrl = discovery.baseUrl;

    if (discovery.products.length > 0) {
      onPage({ page: 1, count: discovery.products.length, total: products.length });
    }

    let page = 2;
    let pageProducts = discovery.products;

    while (pageProducts.length === 250 && page <= this.maxPages) {
      await this.sleep(this.delayMs);
      pageProducts = await this.fetchPage(workingBaseUrl, page);
      if (pageProducts.length > 0) {
        products.push(...pageProducts);
        onPage({ page, count: pageProducts.length, total: products.length });
      }
      page += 1;
    }

    return {
      domain,
      baseUrl: workingBaseUrl,
      products
    };
  }
}

module.exports = ShopifyScraper;
