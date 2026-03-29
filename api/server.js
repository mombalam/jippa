import { createServer } from 'node:http';
import { closeWaitlistPool, createWaitlistSubmission, getWaitlistHealth } from './waitlist-service.js';

const port = Number.parseInt(process.env.PORT ?? '8787', 10);
const configuredCorsOrigins = (process.env.CORS_ALLOW_ORIGIN ?? '*')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const origin = resolveCorsOrigin(request.headers.origin);

  if (request.method === 'OPTIONS') {
    writeCorsHeaders(response, origin);
    response.writeHead(204);
    response.end();
    return;
  }

  if (requestUrl.pathname === '/health' && request.method === 'GET') {
    sendJson(response, 200, getWaitlistHealth(), origin);
    return;
  }

  if (requestUrl.pathname === '/api/waitlist' && request.method === 'POST') {
    if (!isOriginAllowed(request.headers.origin)) {
      sendJson(response, 403, { ok: false, error: 'Origin not allowed.' }, origin);
      return;
    }

    try {
      const payload = await readJsonBody(request);
      const submission = await createWaitlistSubmission(payload);

      sendJson(response, 201, { ok: true, submission }, origin);
      return;
    } catch (error) {
      const statusCode =
        error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
          ? error.statusCode
          : 500;
      const message =
        error instanceof Error ? error.message : 'We could not save the waitlist submission.';

      if (statusCode >= 500) {
        console.error('Waitlist submission failed:', error);
      }

      sendJson(response, statusCode, { ok: false, error: message }, origin);
      return;
    }
  }

  sendJson(response, 404, { ok: false, error: 'Not found.' }, origin);
});

server.listen(port, () => {
  console.log(`Jippa API listening on http://127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      closeWaitlistPool()
        .catch((error) => {
          console.error('Failed to close Postgres pool cleanly:', error);
        })
        .finally(() => {
          process.exit(0);
        });
    });
  });
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > 1_000_000) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');

  if (!rawBody) {
    const error = new Error('Request body is required.');
    error.statusCode = 400;
    throw error;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

function resolveCorsOrigin(requestOrigin) {
  if (!requestOrigin || configuredCorsOrigins.includes('*')) {
    return '*';
  }

  if (configuredCorsOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return configuredCorsOrigins[0] ?? '*';
}

function isOriginAllowed(requestOrigin) {
  if (!requestOrigin) {
    return true;
  }

  return configuredCorsOrigins.includes('*') || configuredCorsOrigins.includes(requestOrigin);
}

function writeCorsHeaders(response, origin) {
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Vary', 'Origin');
}

function sendJson(response, statusCode, payload, origin) {
  writeCorsHeaders(response, origin);
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
