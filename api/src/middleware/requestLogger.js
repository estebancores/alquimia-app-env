const MAX_BODY_LOG = 400;

function truncate(str) {
  return str.length > MAX_BODY_LOG ? `${str.slice(0, MAX_BODY_LOG)}…` : str;
}

// Compact response summary: for list payloads log the count + pagination
// instead of dumping every product row.
function summarize(body) {
  if (body === undefined || body === null) return '';
  let obj = body;
  if (typeof body === 'string') {
    try {
      obj = JSON.parse(body);
    } catch {
      return truncate(body);
    }
  }
  if (obj && typeof obj === 'object' && Array.isArray(obj.data)) {
    let summary = `success=${obj.success} data=Array(${obj.data.length})`;
    if (obj.pagination) summary += ` pagination=${JSON.stringify(obj.pagination)}`;
    return summary;
  }
  try {
    return truncate(JSON.stringify(obj));
  } catch {
    return '[unserializable body]';
  }
}

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const { method, originalUrl } = req;

  console.log(`--> ${method} ${originalUrl}`);

  let responseBody;
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };
  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (responseBody === undefined) responseBody = body;
    return originalSend(body);
  };

  res.on('finish', () => {
    const ms = (Number(process.hrtime.bigint() - start) / 1e6).toFixed(1);
    const bodyLog = summarize(responseBody);
    console.log(`<-- ${method} ${originalUrl} ${res.statusCode} ${ms}ms`);
  });

  next();
}

module.exports = requestLogger;
