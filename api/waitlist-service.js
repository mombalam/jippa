import { neon } from '@netlify/neon';

const allowedInterestAreas = new Set(['borrow', 'save', 'spend', 'all']);

let schemaPromise;
let sql;

export async function createWaitlistSubmission(payload) {
  const submission = validateSubmission(payload);
  await ensureSchema();

  const result = await getSql()(
    `
      INSERT INTO waitlist_submissions (
        full_name,
        email,
        phone_or_whatsapp,
        interest_area,
        source,
        submitted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `,
    [
      submission.fullName,
      submission.email,
      submission.phoneOrWhatsApp,
      submission.interestArea,
      submission.source,
      submission.submittedAt,
    ],
  );
  const row = result[0];

  return {
    id: row.id,
    createdAt: row.created_at,
  };
}

export function getWaitlistHealth() {
  return {
    ok: true,
    databaseConfigured: Boolean(getDatabaseConnectionString()),
  };
}

export async function closeWaitlistPool() {
  sql = undefined;
  schemaPromise = undefined;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const activeSql = getSql();

      await activeSql(`
        CREATE TABLE IF NOT EXISTS waitlist_submissions (
          id BIGSERIAL PRIMARY KEY,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone_or_whatsapp TEXT,
          interest_area TEXT NOT NULL CHECK (interest_area IN ('borrow', 'save', 'spend', 'all')),
          source TEXT NOT NULL DEFAULT 'jippa-app-landing',
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await activeSql(`
        CREATE INDEX IF NOT EXISTS waitlist_submissions_created_at_idx
          ON waitlist_submissions (created_at DESC);
      `);

      await activeSql(`
        CREATE INDEX IF NOT EXISTS waitlist_submissions_email_idx
          ON waitlist_submissions ((LOWER(email)));
      `);
    })();
  }

  await schemaPromise;
}

function getSql() {
  if (!sql) {
    const databaseUrl = getDatabaseConnectionString();

    if (!databaseUrl) {
      throwServerError('NETLIFY_DATABASE_URL is not configured.');
    }

    sql = neon(databaseUrl);
  }

  return sql;
}

function getDatabaseConnectionString() {
  return process.env.NETLIFY_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || '';
}

function validateSubmission(payload) {
  const fullName = normalizeText(payload?.fullName);
  const email = normalizeText(payload?.email).toLowerCase();
  const phoneOrWhatsApp = normalizeText(payload?.phoneOrWhatsApp);
  const interestArea = normalizeText(payload?.interestArea);
  const source = normalizeText(payload?.source) || 'jippa-app-landing';
  const submittedAt = normalizeTimestamp(payload?.submittedAt);

  if (!fullName) {
    throwValidationError('Full name is required.');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throwValidationError('A valid email address is required.');
  }

  if (phoneOrWhatsApp && phoneOrWhatsApp.replace(/[^\d]/g, '').length < 7) {
    throwValidationError('Enter a valid phone or WhatsApp number.');
  }

  if (!allowedInterestAreas.has(interestArea)) {
    throwValidationError('Interest area must be borrow, save, spend, or all.');
  }

  if (fullName.length > 120) {
    throwValidationError('Full name is too long.');
  }

  if (email.length > 320) {
    throwValidationError('Email address is too long.');
  }

  if (phoneOrWhatsApp.length > 32) {
    throwValidationError('Phone or WhatsApp number is too long.');
  }

  if (source.length > 80) {
    throwValidationError('Source is too long.');
  }

  return {
    fullName,
    email,
    phoneOrWhatsApp: phoneOrWhatsApp || null,
    interestArea,
    source,
    submittedAt,
  };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTimestamp(value) {
  if (typeof value !== 'string') {
    return new Date().toISOString();
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
}

function throwValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function throwServerError(message) {
  const error = new Error(message);
  error.statusCode = 500;
  throw error;
}
