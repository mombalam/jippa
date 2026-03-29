import { getWaitlistHealth } from '../../api/waitlist-service.js';

export default async () =>
  new Response(JSON.stringify(getWaitlistHealth()), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

export const config = {
  path: '/health',
};
