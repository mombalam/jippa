# Jippa Landing

Jippa is a Vite + React landing page with a Netlify DB-backed waitlist backend and a local Node API for development.

## Stack

- Frontend: Vite + React + TypeScript
- API: Netlify Functions in production, Node HTTP server locally
- Database: Netlify DB via `@netlify/neon`

## Local setup

Frontend:

```bash
npm install
cp .env.example .env.local
npm run dev
```

API:

```bash
cp api/.env.example api/.env.local
set -a
source api/.env.local
set +a
npm run api:start
```

The frontend expects the local API at `VITE_API_BASE_URL`. The default local example uses `http://127.0.0.1:8787`.

If you want local development to mirror Netlify DB more closely, run `netlify db init` first and use the generated `NETLIFY_DATABASE_URL`.

## Waitlist API

`POST /api/waitlist`

JSON payload:

```json
{
  "fullName": "Mo Mbalam",
  "email": "mo@example.com",
  "phoneOrWhatsApp": "+263...",
  "interestArea": "save",
  "source": "jippa-app-landing",
  "submittedAt": "2026-03-26T12:00:00.000Z"
}
```

Health check:

```bash
GET /health
```

## Netlify deployment

### 1. Connect the repo to Netlify

This repo includes `netlify.toml`, so Netlify will:

- build with `npm run build`
- publish `dist`
- bundle functions from `netlify/functions`

### 2. Provision Netlify DB

This project includes `@netlify/neon`, which is the package Netlify DB expects.

Provision the database with Netlify CLI:

```bash
netlify db init
```

On Netlify, this adds `NETLIFY_DATABASE_URL` for your site.

You do not need `VITE_API_BASE_URL` on Netlify because the frontend posts to the same-origin function at `/api/waitlist`.

### 3. Claim the database

Netlify DB needs to be claimed in the Netlify UI. If you leave it unclaimed, Netlify may delete it after 7 days.

The waitlist function creates the `waitlist_submissions` table automatically on first write.

## Local API

If you want a separate local API while developing:

- run `npm run api:start`
- keep `VITE_API_BASE_URL=http://127.0.0.1:8787`

That local API uses the same schema and validation as the Netlify function, and it accepts either `NETLIFY_DATABASE_URL` or a manual `DATABASE_URL`.

## Data model

The API stores submissions in `waitlist_submissions` with:

- `id`
- `full_name`
- `email`
- `phone_or_whatsapp`
- `interest_area`
- `source`
- `submitted_at`
- `created_at`
