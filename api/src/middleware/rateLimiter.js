const rateLimit = require('express-rate-limit');

// Trusted server-side callers (the Astro storefront) send a shared secret so
// bursts of SSR renders / link prefetches from a single IP aren't throttled.
const isInternalRequest = (req) => {
  const key = process.env.INTERNAL_API_KEY;
  return Boolean(key) && req.get('x-internal-key') === key;
};

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  skip: isInternalRequest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // stricter limit for sensitive endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { success: false, error: 'Too many authentication attempts, please try again later.' }
});

module.exports = { generalLimiter, strictLimiter, authLimiter };
