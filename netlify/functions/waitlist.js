import { createWaitlistSubmission } from '../../api/waitlist-service.js';

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed.' }, request.headers.get('origin'));
  }

  try {
    const payload = await request.json();
    const submission = await createWaitlistSubmission(payload);

    return jsonResponse(201, { ok: true, submission }, request.headers.get('origin'));
  } catch (error) {
    const statusCode =
      error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    const message =
      error instanceof Error ? error.message : 'We could not save the waitlist submission.';

    if (statusCode >= 500) {
      console.error('Netlify waitlist submission failed:', error);
    }

    return jsonResponse(statusCode, { ok: false, error: message }, request.headers.get('origin'));
  }
};

export const config = {
  path: '/api/waitlist',
};

function jsonResponse(status, payload, origin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin ?? '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
      Vary: 'Origin',
    },
  });
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    Vary: 'Origin',
  };
}
